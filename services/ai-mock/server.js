const http = require("http");

const PORT = Number(process.env.PORT || 55434);

const json = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return json(res, 200, { ok: true });
  }

  if (req.method === "POST" && req.url === "/v1/messages") {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      // Mock response for Anthropic Messages API
      return json(res, 200, {
        id: "msg_mock_" + Date.now(),
        type: "message",
        role: "assistant",
        content: [
          {
            type: "text",
            text: "This is a mocked AI response from the local test environment. No real Claude was harmed or billed."
          }
        ],
        model: "claude-3-5-sonnet-20241022",
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: {
          input_tokens: 10,
          output_tokens: 20
        }
      });
    });
    return;
  }

  json(res, 404, { error: "not found" });
});

server.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`ai-mock listening on ${PORT}`);
});
