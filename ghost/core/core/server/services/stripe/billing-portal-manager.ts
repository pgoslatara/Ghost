import type Stripe from 'stripe';

const CONFIGURATION_ID_SETTING = 'stripe_billing_portal_configuration_id';

interface BillingPortalConfigurationOptions {
    business_profile: {
        headline: string;
    };
    features?: {
        invoice_history: {
            enabled: boolean;
        };
        payment_method_update: {
            enabled: boolean;
        };
        subscription_cancel: {
            enabled: boolean;
        };
    };
    default_return_url?: string;
}

interface StripeAPIInterface {
    createBillingPortalConfiguration(options: BillingPortalConfigurationOptions): Promise<Stripe.BillingPortal.Configuration>;
    updateBillingPortalConfiguration(id: string, options: BillingPortalConfigurationOptions): Promise<Stripe.BillingPortal.Configuration>;
}

interface SettingsModel {
    edit(settings: Array<{key: string; value: string}>): Promise<void>;
}

interface SettingsCache {
    get(key: string): string | null;
}

interface BillingPortalConfig {
    siteUrl: string;
}

interface BillingPortalManagerDeps {
    api: StripeAPIInterface;
    models: {
        Settings: SettingsModel;
    };
    settingsCache: SettingsCache;
}

export class BillingPortalManager {
    private SettingsModel: SettingsModel;
    private settingsCache: SettingsCache;
    private api: StripeAPIInterface;
    private siteUrl: string | null = null;
    private configured: boolean = false;

    constructor({api, models, settingsCache}: BillingPortalManagerDeps) {
        this.SettingsModel = models.Settings;
        this.settingsCache = settingsCache;
        this.api = api;
        this.configured = false;
    }

    /**
     * Configures the billing portal manager, passing in additional dependencies
     * in a different stage of the Stripe service lifecycle.
     */
    configure(config: BillingPortalConfig): void {
        this.siteUrl = config.siteUrl;
        this.configured = true;
    }

    /**
     * Starts the Billing Portal Manager by ensuring a configuration exists in Stripe.
     */
    async start(): Promise<void> {
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
     */
    async createOrUpdateConfiguration(id: string | null): Promise<string> {
        if (!id) {
            const configuration = await this.api.createBillingPortalConfiguration(this.getConfigurationOptions());
            return configuration.id;
        }

        try {
            const configuration = await this.api.updateBillingPortalConfiguration(id, this.getConfigurationOptions(true));
            return configuration.id;
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'code' in err && err.code === 'resource_missing') {
                const configuration = await this.api.createBillingPortalConfiguration(this.getConfigurationOptions());
                return configuration.id;
            }
            throw err;
        }
    }

    /**
     * Get the configuration options for the Stripe Billing Portal.
     */
    getConfigurationOptions(updateOnly: boolean = false): BillingPortalConfigurationOptions {
        const defaultOptions: BillingPortalConfigurationOptions = {
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
            default_return_url: this.siteUrl!
        };

        if (updateOnly) {
            return {
                business_profile: defaultOptions.business_profile
            };
        } else {
            return defaultOptions;
        }
    }
}
