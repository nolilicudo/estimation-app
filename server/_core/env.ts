export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Zapier webhook for email estimate (legacy)
  zapierWebhookUrl: process.env.ZAPIER_WEBHOOK_URL ?? "",
  // Zapier webhook for pre-approval referral emails
  zapierPreApprovalWebhookUrl: process.env.ZAPIER_PRE_APPROVAL_WEBHOOK_URL ?? "",
  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  // SerpApi — Home Depot price sync
  serpapiKey: process.env.SERPAPI_KEY ?? "",
  // GoHighLevel CRM
  ghlApiKey: process.env.GHL_API_KEY ?? "",
  ghlLocationId: process.env.GHL_LOCATION_ID ?? "",
  // Admin PIN (falls back to hardcoded default if not set)
  adminPin: process.env.ADMIN_PIN ?? "3694",
  // Jobtread CRM
  jobtreadGrantKey: process.env.JOBTREAD_GRANT_KEY ?? "",
  jobtreadOrgId: process.env.JOBTREAD_ORG_ID ?? "",
  jobtreadSourceCustomFieldId: process.env.JOBTREAD_SOURCE_CUSTOM_FIELD_ID ?? "",
  // RentCast — property data and comparable sales
  rentcastApiKey: process.env.RENTCAST_API_KEY ?? "",
};
