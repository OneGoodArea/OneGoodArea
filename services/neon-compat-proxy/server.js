const http = require("http");
const { Pool } = require("pg");

const PORT = Number(process.env.PORT || 55433);

const pool = new Pool({
  user: process.env.POSTGRES_USER || "oga_user",
  password: process.env.POSTGRES_PASSWORD || "oga_test_password_local",
  database: process.env.POSTGRES_DB || "oga_local",
  host: process.env.POSTGRES_HOST || "postgres",
  port: Number(process.env.POSTGRES_PORT || 5432),
});

const json = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    try {
      await pool.query("SELECT 1");
      return json(res, 200, { ok: true });
    } catch (error) {
      return json(res, 503, { ok: false, error: error instanceof Error ? error.message : "healthcheck failed" });
    }
  }

  if (req.method === "POST" && req.url === "/sql") {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", async () => {
      try {
        const payload = raw ? JSON.parse(raw) : {};
        const text = payload.query;
        const values = Array.isArray(payload.params) ? payload.params : [];

        if (!text || typeof text !== "string") {
          return json(res, 400, { error: "query must be a non-empty string" });
        }

        const result = await pool.query(text, values);
        return json(res, 200, {
          command: result.command,
          rowCount: result.rowCount,
          rows: result.rows,
          fields: result.fields.map((field) => ({ name: field.name, dataTypeID: field.dataTypeID })),
        });
      } catch (error) {
        return json(res, 500, { error: error instanceof Error ? error.message : "query execution failed" });
      }
    });
    return;
  }

  json(res, 404, { error: "not found" });
});

server.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`neon-compat-proxy listening on ${PORT}`);
});
