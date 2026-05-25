import { getConfig } from "../../config";
import { MailhogEmailProvider } from "./mailhog-provider";
import { ResendEmailProvider } from "./resend-provider";
import type { EmailProvider } from "./types";

/* Pluggable email provider selector. Migrated from the legacy
   src/lib/email/providers/index.ts, but selects via getConfig() (process.env)
   instead of the Next runtime/env loader — same adaptation made for the AI
   provider. Sync (the legacy was async only because getRuntimeConfig was);
   the provider is constructed lazily + cached on first send. */

let cachedProvider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!cachedProvider) {
    cachedProvider =
      getConfig().emailProvider === "mailhog"
        ? new MailhogEmailProvider()
        : new ResendEmailProvider();
  }
  return cachedProvider;
}
