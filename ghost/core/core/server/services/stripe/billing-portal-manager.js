/**
 * @typedef {import('./stripe-api')} StripeAPI
 */

/**
 * @typedef {object} BillingPortalConfig
 * @prop {string} siteUrl - The URL to return to after the portal session
 */

const CONFIGURATION_ID_SETTING = 'stripe_billing_portal_configuration_id';

module.exports = class BillingPortalManager {
    /**
     * @param {object} deps
     * @param {StripeAPI} deps.api
     * @param {object} deps.models
     * @param {any} deps.models.Settings
     * @param {any} deps.settingsCache
     */
    constructor({
        api,
        models,
        settingsCache
    }) {
        /** @private */
        this.SettingsModel = models.Settings;
        /** @private */
        this.settingsCache = settingsCache;
        /** @private */
        this.api = api;
    }

    /**
     * Configures the billing portal manager, passing in additional dependencies
     * in a different stage of the Stripe service lifecycle.
     *
     * @param {BillingPortalConfig} config
     */
    configure(config) {
        this.siteUrl = config.siteUrl;
        this.configured = true;
    }

    /**
     * Starts the Billing Portal Manager by ensuring a configuration exists in Stripe.
     *
     * @returns {Promise<void>}
     */
    async start() {
        if (!this.configured) {
            // Must be called after configure(config)
            return;
        }

        const existingId = this.settingsCache.get(CONFIGURATION_ID_SETTING);
        const configurationId = await this.createOrUpdateConfiguration(existingId);

        if (configurationId !== existingId) {
            await this.SettingsModel.edit([{
                key: 'stripe_billing_portal_configuration_id',
                value: configurationId
            }]);
        }
    }

    /**
     * Setup the Stripe Billing Portal Configuration.
     * - If no configuration exists, create a new one
     * - If a configuration exists, update it with current settings
     * - If update fails (resource_missing), create a new one
     *
     * @param {string} [id] - Existing configuration ID
     *
     * @returns {Promise<string>}
     */
    async createOrUpdateConfiguration(id) {
        if (!id) {
            const configuration = await this.api.createBillingPortalConfiguration(this.getConfigurationOptions());
            return configuration.id;
        }

        try {
            const configuration = await this.api.updateBillingPortalConfiguration(id, this.getConfigurationOptions(true));
            return configuration.id;
        } catch (err) {
            if (err.code === 'resource_missing') {
                const configuration = await this.api.createBillingPortalConfiguration(this.getConfigurationOptions());
                return configuration.id;
            }
            throw err;
        }
    }

    /**
     * Get the configuration options for the Stripe Billing Portal.
     *
     * @param {boolean} [updateOnly]
     * @returns {object}
     */
    getConfigurationOptions(updateOnly = false) {
        const defaultOptions = {
            business_profile: {
                headline: `Manage your ${this.settingsCache.get('title')} subscription`
            },
            features: {
                invoice_history: {
                    enabled: true
                },
                payment_method_update: {
                    enabled: true
                },
                subscription_cancel: {
                    enabled: true
                }
            },
            default_return_url: this.siteUrl
        };

        if (updateOnly) {
            return {
                business_profile: defaultOptions.business_profile
            };
        } else {
            return defaultOptions;
        }
    }
};
