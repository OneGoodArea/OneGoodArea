import net from "net";

/**
 * Control-API client for the stripe-mock Docker service.
 *
 * Uses **raw TCP sockets** (`net` module) instead of `fetch` or Node's `http`
 * module because MSW (configured with `onUnhandledRequest: "error"`) intercepts
 * both fetch *and* Node http outgoing connections.  Raw TCP is invisible to
 * MSW's interceptor stack.
 */

/** Base URL of the stripe-mock service, from the env injected by compose. */
const MOCK_URL = process.env.STRIPE_API_BASE_URL || "http://localhost:12111";
const MOCK_HOST = new URL(MOCK_URL).hostname;
const MOCK_PORT = Number(new URL(MOCK_URL).port);

// ---------------------------------------------------------------------------

/** Thin wrapper around the raw response so callers don't touch HTTP plumbing. */
interface MockResponse {
  status: number;
  data: unknown;
}

/**
 * Minimal raw-HTTP/1.1 request helper.
 *
 * Connects via `net.createConnection`, sends a complete HTTP/1.1 request, then
 * reads status-line, headers, and body (driven by Content-Length or
 * Connection: close).
 */
function rawHttpRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<MockResponse> {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const headers = [
      `${method} ${path} HTTP/1.1`,
      `Host: ${MOCK_HOST}:${MOCK_PORT}`,
      ...(payload
        ? [
            `Content-Type: application/json`,
            `Content-Length: ${Buffer.byteLength(payload)}`,
          ]
        : []),
      "Connection: close",
    ].join("\r\n");

    const rawRequest = payload
      ? `${headers}\r\n\r\n${payload}`
      : `${headers}\r\n\r\n`;

    const socket = net.createConnection({ host: MOCK_HOST, port: MOCK_PORT });

    // ── Timeout guard, match existing test pattern ──────────────────────
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("stripe-mock control API timeout"));
    }, 5000);

    // ── Accumulated response data ───────────────────────────────────────
    let raw = "";
    let headersDone = false;
    let statusLine = "";
    let headerLines: string[] = [];
    let contentLength = 0;
    let bodyRead = "";

    socket.on("data", (chunk: Buffer) => {
      raw += chunk.toString();

      if (!headersDone) {
        const headerEnd = raw.indexOf("\r\n\r\n");
        if (headerEnd === -1) return; // headers not yet complete

        const headerBlock = raw.substring(0, headerEnd);
        bodyRead = raw.substring(headerEnd + 4); // everything after \r\n\r\n

        const lines = headerBlock.split("\r\n");
        statusLine = lines[0];
        headerLines = lines.slice(1);

        // Extract Content-Length
        for (const line of headerLines) {
          const match = line.match(/^content-length:\s*(\d+)/i);
          if (match) contentLength = parseInt(match[1], 10);
        }

        headersDone = true;

        // Check if body is already fully received
        if (contentLength > 0 && Buffer.byteLength(bodyRead) >= contentLength) {
          finish();
        } else if (contentLength === 0) {
          // No Content-Length — body is whatever was after headers.
          // For 204 / 304 / etc this is fine; for others we'll get the rest
          // on "end" or "close".
          // If Connection: close is set, we can also finish on "end".
          finish();
        }
      } else {
        bodyRead += chunk.toString();
      }

      // Check for complete body if Content-Length is known
      if (headersDone && contentLength > 0 && Buffer.byteLength(bodyRead) >= contentLength) {
        finish();
      }
    });

    socket.on("end", () => {
      // For chunked or connection-close without Content-Length
      if (headersDone && Buffer.byteLength(bodyRead) < contentLength) {
        // still missing data, but stream ended — use what we have
      }
      finish();
    });

    socket.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    // ── Write the raw HTTP request ──────────────────────────────────────
    socket.write(rawRequest);

    // ── Finish once we have complete headers + body ────────────────────
    function finish() {
      clearTimeout(timeout);

      if (!statusLine) {
        socket.destroy();
        reject(new Error("stripe-mock control API: no response"));
        return;
      }

      // Parse status code: "HTTP/1.1 200 OK"
      const parts = statusLine.split(" ");
      const status = parseInt(parts[1], 10) || 0;

      let data: unknown = bodyRead;
      try {
        data = JSON.parse(bodyRead);
      } catch {
        /* keep as string */
      }

      socket.end();
      resolve({ status, data });
    }
  });
}

// ── Public helpers ──────────────────────────────────────────────────────

/** Reset all expectations and recorded calls in the stripe-mock service. */
export async function mockReset(): Promise<void> {
  await rawHttpRequest("POST", "/__test/reset");
}

/** Register one expected Stripe API call with its response. */
export async function mockExpect(
  method: string,
  path: string,
  status = 200,
  body: unknown = {},
): Promise<void> {
  await rawHttpRequest("POST", "/__test/expect", { method, path, status, body });
}

/** Fetch the list of Stripe API calls made since the last reset. */
export async function getCalls(): Promise<
  Array<{ method: string; path: string; body: unknown }>
> {
  const res = await rawHttpRequest("GET", "/__test/calls");
  return (res.data as Array<{ method: string; path: string; body: unknown }>) || [];
}
