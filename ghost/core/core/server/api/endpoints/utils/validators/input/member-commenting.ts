// @ts-expect-error - JS module without types
import jsonSchema from '../utils/json-schema';
import tpl from '@tryghost/tpl';
import errors from '@tryghost/errors';

const messages = {
    invalidExpiresAt: 'expires_at must be a valid ISO 8601 date string'
};

interface Frame {
    data: {
        expires_at?: string | Date;
    };
}

// module.exports required - using `export` causes the module to fail to register
// with the validation layer as it's loaded via require()
module.exports = {
    async disable(apiConfig: unknown, frame: Frame): Promise<void> {
        await jsonSchema.validate(apiConfig, frame);

        // Parse and validate expires_at if provided
        if (frame.data.expires_at) {
            const parsed = new Date(frame.data.expires_at);
            if (isNaN(parsed.getTime())) {
                throw new errors.ValidationError({
                    message: tpl(messages.invalidExpiresAt)
                });
            }
            // Replace string with parsed Date for downstream consumers
            frame.data.expires_at = parsed;
        }
    }
};
