import {CommentFactory, MemberFactory, PostFactory, createCommentFactory, createMemberFactory, createPostFactory} from '@/data-factory';
import {CommentsPage} from '@/helpers/pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {expect, test} from '@/helpers/playwright';

const useReactShell = process.env.USE_REACT_SHELL === 'true';

test.describe('Ghost Admin - Disable Commenting', () => {
    test.skip(!useReactShell, 'Skipping: requires USE_REACT_SHELL=true');
    test.use({labs: {disableMemberCommenting: true}});

    let postFactory: PostFactory;
    let memberFactory: MemberFactory;
    let commentFactory: CommentFactory;

    test.beforeEach(async ({page}) => {
        postFactory = createPostFactory(page.request);
        memberFactory = createMemberFactory(page.request);
        commentFactory = createCommentFactory(page.request);

        const settingsService = new SettingsService(page.request);
        await settingsService.setCommentsEnabled('all');
    });

    test('disable commenting menu item appears in comment menu', async ({page}) => {
        const post = await postFactory.create({status: 'published'});
        const member = await memberFactory.create();
        await commentFactory.create({
            post_id: post.id,
            member_id: member.id,
            html: '<p>Test comment for disable menu</p>'
        });

        const commentsPage = new CommentsPage(page);
        await commentsPage.goto();
        await commentsPage.waitForComments();

        const commentRow = commentsPage.getCommentRowByText('Test comment for disable menu');
        await commentsPage.openMoreMenu(commentRow);

        await expect(commentsPage.getDisableCommentingMenuItem()).toBeVisible();
    });

    test('clicking disable commenting opens confirmation modal', async ({page}) => {
        const post = await postFactory.create({status: 'published'});
        const member = await memberFactory.create({name: 'Test Member'});
        await commentFactory.create({
            post_id: post.id,
            member_id: member.id,
            html: '<p>Test comment for modal</p>'
        });

        const commentsPage = new CommentsPage(page);
        await commentsPage.goto();
        await commentsPage.waitForComments();

        const commentRow = commentsPage.getCommentRowByText('Test comment for modal');
        await commentsPage.openMoreMenu(commentRow);
        await commentsPage.clickDisableCommenting();

        await expect(commentsPage.getDisableCommentsModalTitle()).toBeVisible();
        await expect(commentsPage.getDisableCommentsModal()).toContainText('Test Member');
        await expect(commentsPage.getDisableCommentsModal()).toContainText('won\'t be able to comment');
        await expect(commentsPage.getDisableCommentsButton()).toBeVisible();
        await expect(commentsPage.getCancelButton()).toBeVisible();
    });

    test('cancel button closes the modal and restores UI interactivity', async ({page}) => {
        const post = await postFactory.create({status: 'published'});
        const member = await memberFactory.create();
        await commentFactory.create({
            post_id: post.id,
            member_id: member.id,
            html: '<p>Test comment for cancel</p>'
        });

        const commentsPage = new CommentsPage(page);
        await commentsPage.goto();
        await commentsPage.waitForComments();

        const commentRow = commentsPage.getCommentRowByText('Test comment for cancel');
        await commentsPage.openMoreMenu(commentRow);
        await commentsPage.clickDisableCommenting();

        await expect(commentsPage.getDisableCommentsModal()).toBeVisible();
        await commentsPage.getCancelButton().click();

        await expect(commentsPage.getDisableCommentsModal()).toBeHidden();

        // Verify UI is still interactive by opening menu again
        await commentsPage.openMoreMenu(commentRow);
        await expect(commentsPage.getDisableCommentingMenuItem()).toBeVisible();
    });

    // Note: These tests require backend support for can_comment field on member
    // They will pass once the backend API is merged

    test.describe('with backend support', () => {
        test.skip(true, 'Requires backend API for can_comment field - unskip when backend is merged');

        test('disabling commenting shows disabled indicator and changes menu', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();
            await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Test comment for disable flow</p>'
            });

            const commentsPage = new CommentsPage(page);
            await commentsPage.goto();
            await commentsPage.waitForComments();

            const commentRow = commentsPage.getCommentRowByText('Test comment for disable flow');
            await commentsPage.openMoreMenu(commentRow);
            await commentsPage.clickDisableCommenting();
            await commentsPage.confirmDisableCommenting();

            await expect(commentsPage.getDisableCommentsModal()).toBeHidden();
            await expect(commentsPage.getCommentingDisabledIndicator(commentRow)).toBeVisible();

            await commentsPage.openMoreMenu(commentRow);
            await expect(commentsPage.getEnableCommentingMenuItem()).toBeVisible();
            await expect(commentsPage.getDisableCommentingMenuItem()).toBeHidden();
        });

        test('banned member shows indicator icon next to name', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();
            await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Comment from banned member</p>'
            });

            const commentsPage = new CommentsPage(page);
            await commentsPage.goto();
            await commentsPage.waitForComments();

            const commentRow = commentsPage.getCommentRowByText('Comment from banned member');
            await expect(commentsPage.getCommentingDisabledIndicator(commentRow)).toBeVisible();
        });

        test('enable commenting menu item appears for banned members', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();
            await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Comment from banned member for menu</p>'
            });

            const commentsPage = new CommentsPage(page);
            await commentsPage.goto();
            await commentsPage.waitForComments();

            const commentRow = commentsPage.getCommentRowByText('Comment from banned member for menu');
            await commentsPage.openMoreMenu(commentRow);

            await expect(commentsPage.getEnableCommentingMenuItem()).toBeVisible();
            await expect(commentsPage.getDisableCommentingMenuItem()).toBeHidden();
        });

        test('enabling commenting removes indicator and changes menu', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();
            await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Comment from banned member for enable</p>'
            });

            const commentsPage = new CommentsPage(page);
            await commentsPage.goto();
            await commentsPage.waitForComments();

            const commentRow = commentsPage.getCommentRowByText('Comment from banned member for enable');
            await commentsPage.openMoreMenu(commentRow);
            await commentsPage.clickEnableCommenting();

            await expect(commentsPage.getCommentingDisabledIndicator(commentRow)).toBeHidden();

            await commentsPage.openMoreMenu(commentRow);
            await expect(commentsPage.getDisableCommentingMenuItem()).toBeVisible();
            await expect(commentsPage.getEnableCommentingMenuItem()).toBeHidden();
        });
    });
});
