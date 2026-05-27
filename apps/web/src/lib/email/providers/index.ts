import { getRuntimeConfig } from "@/lib/runtime/env";
import { MailhogEmailProvider } from "./mailhog-provider";
import { ResendEmailProvider } from "./resend-provider";
import type { EmailProvider } from "./types";

let cachedProvider: Promise<EmailProvider> | null = null;

export function getEmailProvider(): Promise<EmailProvider> {
  if (!cachedProvider) {
    cachedProvider = getRuntimeConfig().then((config) => {
      return config.emailProvider === "mailhog" ? new MailhogEmailProvider() : new ResendEmailProvider();
    });
  }

  return cachedProvider;
}
