const http = require("http");
const crypto = require("crypto");
const { Pool } = require("pg");

const PORT = Number(process.env.PORT || 55433);
const DEBUG = process.env.DEBUG === "true" || process.env.DEBUG === "1" || process.env.DEBUG === "sql";

const pool = new Pool({
  user: process.env.POSTGRES_USER || "oga_user",
  password: process.env.POSTGRES_PASSWORD || "oga_test_password_local",
  database: process.env.POSTGRES_DB || "oga_local",
  host: process.env.POSTGRES_HOST || "postgres",
  port: Number(process.env.POSTGRES_PORT || 5432),
});

const interpolateSQL = (text, values) => {
  if (!Array.isArray(values) || values.length === 0) return text;
  return text.replace(/\$(\d+)/g, (_, idx) => {
    const i = parseInt(idx, 10) - 1;
    if (i < 0 || i >= values.length) return `$${idx}`;
    const val = values[i];
    if (val === null || val === undefined) return "NULL";
    if (typeof val === "string") return `%{${JSON.stringify(val)}}`;
    if (typeof val === "number") return `%{${val}}`;
    if (typeof val === "boolean") return `%{${val}}`;
    return `%{${JSON.stringify(val)}}`;
  });
};

const truncate = (str, n = 100) => {
  if (!str || str.length <= n * 2) return str;
  return str.slice(0, n) + "..." + str.slice(-n);
};

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
      const start = Date.now();
      const reqId = crypto.randomUUID().slice(0, 8);
      try {
        const payload = raw ? JSON.parse(raw) : {};
        const text = payload.query;
        const values = Array.isArray(payload.params) ? payload.params : [];

        if (!text || typeof text !== "string") {
          return json(res, 400, { error: "query must be a non-empty string" });
        }

        if (DEBUG) {
          console.log(`[neon-proxy] [${reqId}] SQL: ${truncate(interpolateSQL(text, values))}`);
        }

        // rowMode: "array" returns rows as arrays of positional values
        // (e.g. [1, "x"]) matching Neon's HTTP protocol contract. The
        // @neondatabase/serverless driver expects this shape and converts
        // to objects client-side using the fields metadata. Returning
        // pg's default object rows (e.g. {col: 1}) trips the driver's
        // processQueryResult with "c.map is not a function". (AR-247)
        const result = await pool.query({ text, values, rowMode: "array" });
        if (DEBUG) {
          const resultStr = JSON.stringify(result.rows);
          console.log(`[neon-proxy] [${reqId}] rows: ${result.rowCount}, duration: ${Date.now() - start}ms, result: ${truncate(resultStr)}`);
        }
        // Convert pg-native booleans (true/false) to "t"/"f" strings so the
        // @neondatabase/serverless driver's pg-types parser gets the string
        // format it expects. Without this, the parser receives a JS boolean,
        // fails all its string comparisons, and returns undefined → falsy
        // for any true value. (AR-653)
        //
        // Also re-encode types the driver expects as strings but that the
        // pg client hands back as live values:
        //  - JSON/JSONB (114/3802): pg returns a parsed JS object; the driver
        //    runs JSON.parse on the cell, so a JS object becomes "[object
        //    Object]" → JSON.parse throws → 500 on any route returning JSONB
        //    (e.g. /me/activity, /admin/analytics). Stringify it back so the
        //    driver's JSON.parse produces the object. (AR-844)
        //  - DATE (1082): pg returns a JS Date; the driver's DATE parser
        //    (xt) expects "YYYY-MM-DD" and returns null for anything else,
        //    silently nulling date cells (e.g. /admin/traffic-analytics day).
        //    Format the local date to "YYYY-MM-DD". (AR-845)
        const BOOL_OID = 16;
        const JSON_OID = 114;
        const JSONB_OID = 3802;
        const DATE_OID = 1082;
        const toDateString = (d) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${day}`;
        };
        const rows = result.rows.map((row) =>
          row.map((val, i) => {
            const field = result.fields[i];
            const oid = field && field.dataTypeID;
            if (oid === BOOL_OID && typeof val === "boolean") return val ? "t" : "f";
            if ((oid === JSON_OID || oid === JSONB_OID) && val !== null) return JSON.stringify(val);
            if (oid === DATE_OID && val instanceof Date) return toDateString(val);
            return val;
          }),
        );
        return json(res, 200, {
          command: result.command,
          rowCount: result.rowCount,
          rows,
          fields: result.fields.map((field) => ({ name: field.name, dataTypeID: field.dataTypeID })),
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "query execution failed";
        console.error(`[neon-proxy] [${reqId}] SQL error after ${Date.now() - start}ms: ${msg}`);
        return json(res, 500, { error: msg });
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
