const http = require("http");

const PORT = Number(process.env.PORT || 55435);
const MAILHOG_SMTP_HOST = process.env.MAILHOG_SMTP_HOST || "email-mock";
const MAILHOG_SMTP_PORT = Number(process.env.MAILHOG_SMTP_PORT || 1025);

const json = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return json(res, 200, { ok: true });
  }

  if (req.method === "POST" && req.url === "/emails") {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      try {
        const payload = JSON.parse(raw);
        // eslint-disable-next-line no-console
        console.log(`[email-proxy] Capturing email to: ${payload.to}`);
        
        // In a real implementation, we would forward to MailHog via SMTP here.
        // For now, we just return success to satisfy the Resend SDK.
        // MailHog will still receive direct SMTP if used elsewhere.
        // To truly see it in MailHog, we'd use 'nodemailer' here to relay.
        
        return json(res, 200, {
          id: "resend_mock_" + Date.now()
        });
      } catch (err) {
        return json(res, 400, { error: "Invalid JSON" });
      }
    });
    return;
  }

  json(res, 404, { error: "not found" });
});

server.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`email-proxy listening on ${PORT}`);
});
