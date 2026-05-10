import { Resend } from "resend";
import type { EmailMessage, EmailProvider } from "./types";

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
