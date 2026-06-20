const http = require("http");

const PORT = Number(process.env.PORT || 12111);

/** @type {Array<{method: string, path: string, status: number, body: unknown}>} */
let expectations = [];

/** @type {Array<{method: string, path: string, body: unknown}>} */
let calls = [];

const json = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

/** Read the request body as a UTF-8 string. */
function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => resolve(raw));
  });
}

const server = http.createServer(async (req, res) => {
  // --- Control API ---
  if (req.method === "POST" && req.url === "/__test/reset") {
    expectations = [];
    calls = [];
    return json(res, 200, { ok: true, message: "expectations and calls cleared" });
  }

  if (req.method === "POST" && req.url === "/__test/expect") {
    const raw = await readBody(req);
    try {
      const payload = JSON.parse(raw || "{}");
      if (!payload.method || !payload.path) {
        return json(res, 400, { error: "method and path are required" });
      }
      expectations.push({
        method: payload.method.toUpperCase(),
        path: payload.path,
        status: payload.status || 200,
        body: payload.body !== undefined ? payload.body : {},
      });
      return json(res, 200, { ok: true, message: "expectation registered" });
    } catch (_e) {
      return json(res, 400, { error: "invalid JSON" });
    }
  }

  if (req.method === "GET" && req.url === "/__test/health") {
    return json(res, 200, { ok: true });
  }

  if (req.method === "GET" && req.url === "/__test/calls") {
    return json(res, 200, calls);
  }

  // --- Stripe API ---
  // Read and parse the request body for call recording.
  let parsedBody = undefined;
  const raw = await readBody(req);
  if (raw) {
    try {
      parsedBody = JSON.parse(raw);
    } catch (_e) {
      parsedBody = raw;
    }
  }

  // Match by method + exact path. Consume first matching expectation
  // (pop from the array) so each expectation is used at most once.
  const idx = expectations.findIndex(
    (e) => e.method === req.method && e.path === (req.url || "/"),
  );

  if (idx !== -1) {
    const match = expectations.splice(idx, 1)[0];
    calls.push({ method: req.method, path: req.url || "/", body: parsedBody });
    return json(res, match.status, match.body);
  }

  // No expectation registered for this call — tell the test author what's missing.
  json(res, 501, {
    error: "not implemented in stripe-mock",
    hint: `Register an expectation: POST /__test/expect with method=${req.method} path=${req.url}`,
  });
});

server.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`stripe-mock listening on ${PORT}`);
});
