import { Resend } from "resend";
import { getConfig } from "../../config";
import type { EmailMessage, EmailProvider } from "./types";

/* Production email provider (Resend). Migrated VERBATIM from the legacy
   src/lib/email/providers/resend-provider.ts. Reads RESEND_API_KEY from
   centralised config; throws on construction if unset so a misconfigured
   deploy fails loudly the first time email is needed. */

export class ResendEmailProvider implements EmailProvider {
  private readonly client: Resend;

  constructor() {
    const config = getConfig();
    const apiKey = config.resendApiKey;

    if (!apiKey) {
      throw new Error("Missing RESEND_API_KEY");
    }

    this.client = new Resend(apiKey);
  }

  async send(message: EmailMessage): Promise<void> {
    await this.client.emails.send(message);
  }
}
