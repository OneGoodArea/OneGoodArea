/**
 * Centralised application configuration.
 * All magic numbers, hardcoded strings, and environment-dependent values live here.
 */

export const APP_URL = process.env.NEXTAUTH_URL || "https://www.onegoodarea.com";

export const SUPERUSER_EMAILS = ["ptengelmann@gmail.com"];

export const EMAIL_FROM = "OneGoodArea <noreply@onegoodarea.com>";

export const RATE_LIMITS = {
  report: { max: 10, windowSeconds: 60 },
  apiReport: { max: 30, windowSeconds: 60 },
  widget: { max: 60, windowSeconds: 3600 },
  authRegister: { max: 5, windowSeconds: 60 },
  authSignIn: { max: 10, windowSeconds: 60 },
} as const;

export const PLAN_PRICES_GBP: Record<string, number> = {
  starter: 29,
  pro: 79,
  developer: 49,
  business: 249,
  growth: 499,
};
