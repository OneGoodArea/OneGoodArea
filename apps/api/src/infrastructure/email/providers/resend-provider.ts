import { Resend } from "resend";
import type { EmailMessage, EmailProvider } from "./types";

/* Production email provider (Resend). Migrated VERBATIM from the legacy
   src/lib/email/providers/resend-provider.ts. Reads RESEND_API_KEY from
   process.env (container-injected); throws on construction if unset so a
   misconfigured deploy fails loudly the first time email is needed. */

export class ResendEmailProvider implements EmailProvider {
  private readonly client: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error("Missing RESEND_API_KEY");
    }

    this.client = new Resend(apiKey);
  }

  async send(message: EmailMessage): Promise<void> {
    await this.client.emails.send(message);
  }
}
