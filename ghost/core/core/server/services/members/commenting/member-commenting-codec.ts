import {MemberCommenting} from './member-commenting';

/**
 * Shape of MemberCommenting data as stored in the database (JSON format).
 */
interface MemberCommentingData {
    disabled: boolean;
    disabledReason: string | null;
    disabledUntil: string | null;
}

/**
 * Codec for bidirectional serialization of MemberCommenting.
 * Handles conversion between domain objects and persistence format.
 *
 * This will be replaced with a Zod 4.x codec in the future.
 */
export const MemberCommentingCodec = {
    /**
     * Parse a raw JSON string from storage into a MemberCommenting domain object.
     * Invalid data fails open to enabled state.
     */
    parse(raw: string | null): MemberCommenting {
        try {
            const data: MemberCommentingData = JSON.parse(raw ?? '');

            if (!data.disabled) {
                return MemberCommenting.enabled();
            }

            if (!data.disabledReason) {
                throw undefined;
            }

            const disabledUntil = data.disabledUntil ? new Date(data.disabledUntil) : null;
            if (disabledUntil && isNaN(disabledUntil.getTime())) {
                throw undefined;
            }

            return MemberCommenting.disabled(data.disabledReason, disabledUntil);
        } catch {
            return MemberCommenting.enabled();
        }
    },

    /**
     * Format a MemberCommenting domain object into a JSON string for storage.
     */
    format(commenting: MemberCommenting): string {
        return JSON.stringify({
            disabled: commenting.disabled,
            disabledReason: commenting.disabledReason,
            disabledUntil: commenting.disabledUntil?.toISOString() ?? null
        });
    }
};
