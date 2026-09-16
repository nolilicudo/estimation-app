export const ENV = {
  get appId() { return process.env.VITE_APP_ID ?? ""; },
  get cookieSecret() { return process.env.JWT_SECRET ?? ""; },
  get databaseUrl() { return process.env.DATABASE_URL ?? ""; },
  get oAuthServerUrl() { return process.env.OAUTH_SERVER_URL ?? ""; },
  get ownerOpenId() { return process.env.OWNER_OPEN_ID ?? ""; },
  get isProduction() { return process.env.NODE_ENV === "production"; },
  get forgeApiUrl() { return process.env.BUILT_IN_FORGE_API_URL ?? ""; },
  get forgeApiKey() { return process.env.BUILT_IN_FORGE_API_KEY ?? ""; },
  // Zapier webhook for email estimate (legacy)
  get zapierWebhookUrl() { return process.env.ZAPIER_WEBHOOK_URL ?? ""; },
  // Zapier webhook for pre-approval referral emails
  get zapierPreApprovalWebhookUrl() { return process.env.ZAPIER_PRE_APPROVAL_WEBHOOK_URL ?? ""; },
  // Stripe
  get stripeSecretKey() { return process.env.STRIPE_SECRET_KEY ?? ""; },
  get stripeWebhookSecret() { return process.env.STRIPE_WEBHOOK_SECRET ?? ""; },
  // SerpApi — Home Depot price sync
  get serpapiKey() { return process.env.SERPAPI_KEY ?? ""; },
  // GoHighLevel CRM
  get ghlApiKey() { return process.env.GHL_API_KEY ?? ""; },
  get ghlLocationId() { return process.env.GHL_LOCATION_ID ?? ""; },
  // Admin PIN (falls back to hardcoded default if not set)
  get adminPin() { return process.env.ADMIN_PIN ?? "3694"; },
  // Jobtread CRM
  get jobtreadGrantKey() { return process.env.JOBTREAD_GRANT_KEY ?? ""; },
  get jobtreadOrgId() { return process.env.JOBTREAD_ORG_ID ?? ""; },
  get jobtreadSourceCustomFieldId() { return process.env.JOBTREAD_SOURCE_CUSTOM_FIELD_ID ?? ""; },
  // RentCast — property data and comparable sales
  get rentcastApiKey() { return process.env.RENTCAST_API_KEY ?? ""; },
};
