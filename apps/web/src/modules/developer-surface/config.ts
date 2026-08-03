/**
 * Developer Surface — Playground configuration.
 *
 * OpenAPI tags hidden from the public playground sidebar.
 * These routes are internal (auth, billing, admin, contact, cron)
 * and should not appear in the developer surface at /playground.
 *
 * To hide additional tags, add the tag name here.
 * To unhide, remove it. The BFF proxy reads this on every request.
 */
export const HIDDEN_TAGS = [
  "Auth",
  "Stripe",
  "Admin",
  "Contact",
  "Cron",
] as const
