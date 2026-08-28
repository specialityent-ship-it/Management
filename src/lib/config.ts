export const clinic = {
  name: process.env.CLINIC_NAME || "Speciality ENT",
  tagline: process.env.CLINIC_TAGLINE || "OPD & Operation Theatre care, end to end",
  phone: process.env.CLINIC_PHONE || "+91 00000 00000",
  email: process.env.CLINIC_EMAIL || "hello@example.com",
  address: process.env.CLINIC_ADDRESS || "123 Example Road, City 000000",
  timezone: process.env.CLINIC_TIMEZONE || "Asia/Kolkata",
};

export const appUrl = process.env.APP_URL || "http://localhost:3000";

/// Integrations are optional at build time so the app boots with an empty
/// .env; each feature reports itself as unconfigured instead of crashing.
export const integrations = {
  razorpay: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
  instagram: Boolean(
    process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
  ),
  youtube: Boolean(
    process.env.YOUTUBE_CLIENT_ID &&
      process.env.YOUTUBE_CLIENT_SECRET &&
      process.env.YOUTUBE_REFRESH_TOKEN,
  ),
};
