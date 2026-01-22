/**
 * This module is heavily modified from [Buttondown's Sniper Link project][0].
 * Its license is copied below.
 *
 * [0]: https://github.com/buttondown/sniper-link
 *
 * MIT License
 *
 * Copyright (c) 2024 Buttondown
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

type GetLinkFn = (options: Readonly<{recipient: string; sender: string}>) => string;

type Provider = {
    domains: ReadonlyArray<string>;
    getDesktopLink: GetLinkFn;
    getAndroidLink: GetLinkFn;
};

const PROVIDERS: ReadonlyArray<Provider> = [
    {
        domains: ['gmail.com', 'googlemail.com', 'google.com'],
        getDesktopLink: ({recipient, sender}) => (
            `https://mail.google.com/mail/u/${encodeURIComponent(
                recipient
            )}/#search/from%3A(${encodeURIComponent(
                sender
            )})+in%3Aanywhere+newer_than%3A1h`
        ),
        getAndroidLink: () => (
            `intent://open/#Intent;scheme=googlegmail;package=com.google.android.gm;S.browser_fallback_url=https%3A%2F%2Fmail.google.com%2Fmail%2F;end`
        )
    }
];

const PROVIDER_BY_DOMAIN = new Map<string, Provider>();
for (const provider of PROVIDERS) {
    for (const domain of provider.domains) {
        PROVIDER_BY_DOMAIN.set(domain, provider);
    }
}

/**
 * Extract the domain from an email address. Returns `null` if it can't be extracted.
 *
 * This is naïve — it doesn't fully respect RFC 5321 — but covers most normal emails.
 *
 * See <https://github.com/TryGhost/Ghost/pull/25920>, which may replace most of this function.
 *
 * @example
 * parseEmailDomain('foo@example.com');
 * // => 'example.com'
 */
function parseEmailDomain(email: string): null | string {
    // Add a simple limit to avoid someone causing significant performance
    // issues. SMTP's max email length is 986 octets. 1000 UTF-16 units should
    // be fine.
    if (email.length > 1000) {
        return null;
    }

    const atIndex = email.lastIndexOf('@');
    if (atIndex === -1) {
        return null;
    }

    return email.slice(atIndex + 1).toLowerCase();
}

const getProvider = async (domain: string): Promise<undefined | Provider> => (
    PROVIDER_BY_DOMAIN.get(domain)
);

/**
 * Given an email address, return "sniper links" to open the email app/inbox.
 *
 * NOTE: This currently returns a Promise even though it has nothing async.
 * This is because we plan to add async soon (see NY-945).
 */
export const getSniperLinks = async (
    options: Readonly<{recipient: string; sender: string;}>
): Promise<undefined | {android: string; desktop: string}> => {
    const {recipient} = options;

    const domain = parseEmailDomain(recipient);
    if (!domain) {
        return;
    }

    const provider = await getProvider(domain);
    if (!provider) {
        return;
    }

    return {
        android: provider.getAndroidLink(options),
        desktop: provider.getDesktopLink(options)
    };
};