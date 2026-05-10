const http = require("http");

const req = http.request(
  {
    host: "127.0.0.1",
    port: Number(process.env.PORT || 55433),
    path: "/health",
    method: "GET",
    timeout: 3000,
  },
  (res) => {
    process.exit(res.statusCode === 200 ? 0 : 1);
  },
);

req.on("error", () => process.exit(1));
req.on("timeout", () => {
  req.destroy();
  process.exit(1);
});
req.end();
