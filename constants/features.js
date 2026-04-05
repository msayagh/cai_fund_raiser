/**
 * Feature flags for the frontend.
 * Set NEXT_PUBLIC_FEATURE_VOLUNTEERING=true in .env.local to enable the volunteering module.
 */
export const FEATURES = {
  VOLUNTEERING: process.env.NEXT_PUBLIC_FEATURE_VOLUNTEERING === 'true',
  // Set NEXT_PUBLIC_FEATURE_DONATIONS=false to hide the whole donations section
  DONATIONS: process.env.NEXT_PUBLIC_FEATURE_DONATIONS !== 'false',
};
