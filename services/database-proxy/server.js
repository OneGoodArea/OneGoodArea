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
  // Add CORS headers for local development if needed
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    try {
      await pool.query("SELECT 1");
      return json(res, 200, { ok: true, message: "Proxy is healthy and connected to Postgres" });
    } catch (error) {
      return json(res, 503, { ok: false, error: error instanceof Error ? error.message : "healthcheck failed" });
    }
  }

  // Neon HTTP SQL endpoint is usually /sql
  if (req.method === "POST" && req.url === "/sql") {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", async () => {
      try {
        const payload = raw ? JSON.parse(raw) : {};
        const query = payload.query;
        const params = Array.isArray(payload.params) ? payload.params : [];

        if (!query || typeof query !== "string") {
          return json(res, 400, { error: "query must be a non-empty string" });
        }

        // Execute query
        const result = await pool.query(query, params);

        // Neon's HTTP response format includes 'rows' and 'metadata'
        // Our client uses result directly if we are using the neon() wrapper
        // The @neondatabase/serverless driver expects a specific structure if used via fetch
        return json(res, 200, {
          command: result.command,
          rowCount: result.rowCount,
          rows: result.rows,
          fields: result.fields.map((field) => ({
            name: field.name,
            dataTypeID: field.dataTypeID,
          })),
        });
      } catch (error) {
        console.error("[neon-proxy] Query error:", error);
        return json(res, 500, {
          error: error instanceof Error ? error.message : "query execution failed",
          code: error.code // Include PG error codes for better debugging
        });
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
