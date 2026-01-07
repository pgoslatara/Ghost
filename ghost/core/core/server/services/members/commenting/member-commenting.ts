import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';

const messages = {
    reasonRequired: 'A reason is required when disabling commenting for a member'
};

export class MemberCommenting {
    readonly disabled: boolean;
    readonly disabledReason: string | null;
    readonly disabledUntil: Date | null;
    readonly canComment: boolean;

    private constructor(data: {
        disabled: boolean;
        disabledReason: string | null;
        disabledUntil: Date | null;
    }) {
        if (data.disabled && !data.disabledReason) {
            throw new errors.ValidationError({
                message: tpl(messages.reasonRequired)
            });
        }

        this.disabled = data.disabled;
        this.disabledReason = data.disabledReason;
        this.disabledUntil = data.disabledUntil;

        this.canComment = true;
        if (this.disabled) {
            this.canComment = this.disabledUntil ? this.disabledUntil <= new Date() : false;
        }
    }

    static enabled(): MemberCommenting {
        return new MemberCommenting({
            disabled: false,
            disabledReason: null,
            disabledUntil: null
        });
    }

    static disabled(reason: string, until: Date | null): MemberCommenting {
        return new MemberCommenting({
            disabled: true,
            disabledReason: reason,
            disabledUntil: until
        });
    }

    enable(): MemberCommenting {
        return MemberCommenting.enabled();
    }

    disable(reason: string, until: Date | null): MemberCommenting {
        return MemberCommenting.disabled(reason, until);
    }
}
