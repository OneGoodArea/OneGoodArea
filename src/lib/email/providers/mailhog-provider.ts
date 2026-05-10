import net from "node:net";
import type { EmailMessage, EmailProvider } from "./types";

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

async function sendSmtpMessage(message: EmailMessage): Promise<void> {
  const socket = net.createConnection({ host: "127.0.0.1", port: 1025 });

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
  async send(message: EmailMessage): Promise<void> {
    await sendSmtpMessage(message);
  }
}
