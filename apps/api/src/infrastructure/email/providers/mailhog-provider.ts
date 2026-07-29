import net from "node:net";
import type { EmailMessage, EmailProvider } from "./types";

/* Local-dev email provider: speaks minimal SMTP to MailHog.
   Selected via OGA_EMAIL_PROVIDER=mailhog (see ./index). The Resend provider is
   the default for prod. Host/port configurable via OGA_EMAIL_HOST / OGA_EMAIL_PORT
   (defaults: 127.0.0.1:1025). Inside Docker Compose, set OGA_EMAIL_HOST=mailhog. */

function writeCommand(socket: net.Socket, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let response = "";

    const onData = (chunk: Buffer) => {
      response += chunk.toString("utf8");
      if (response.endsWith("\r\n")) {
        socket.off("data", onData);
        resolve(response);
      }
    };

    socket.on("data", onData);
    socket.once("error", reject);
    socket.write(`${command}\r\n`);
  });
}

async function sendSmtpMessage(message: EmailMessage, host: string, port: number): Promise<void> {
  const socket = net.createConnection({ host, port });

  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("error", reject);
  });

  socket.once("data", () => {});
  await writeCommand(socket, `HELO localhost`);
  await writeCommand(socket, `MAIL FROM:<${message.from}>`);
  await writeCommand(socket, `RCPT TO:<${message.to}>`);
  await writeCommand(socket, "DATA");
  await writeCommand(
    socket,
    [
      `From: ${message.from}`,
      `To: ${message.to}`,
      `Subject: ${message.subject}`,
      "Content-Type: text/html; charset=UTF-8",
      "",
      message.html,
      ".",
    ].join("\r\n"),
  );
  await writeCommand(socket, "QUIT");
  socket.end();
}

export class MailhogEmailProvider implements EmailProvider {
  private host: string;
  private port: number;

  constructor(host = "127.0.0.1", port = 1025) {
    this.host = host;
    this.port = port;
  }

  async send(message: EmailMessage): Promise<void> {
    await sendSmtpMessage(message, this.host, this.port);
  }
}
