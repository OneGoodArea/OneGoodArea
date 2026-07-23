import { describe, it, expect, vi, beforeEach } from "vitest";

/* AR-603: this route's whole purpose is "always reflect what's deployed"
   (docs/API-REFERENCE/README.md). Without cache: "no-store", Next.js
   cached the upstream fetch (and could statically optimize the whole
   route at build time), so it kept serving a frozen build-time snapshot
   of apps/api's spec — including a stale `servers` URL — no matter what
   apps/api returned afterward. */

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
});

describe("GET /api/openapi-spec (AR-603)", () => {
  it("fetches the upstream spec with cache: no-store", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ servers: [{ url: "https://onegoodarea.onrender.com" }] }) });
    const { GET, dynamic } = await import("@/app/api/openapi-spec/route");

    expect(dynamic).toBe("force-dynamic");

    await GET();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://onegoodarea.onrender.com/docs/json",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("responds with Cache-Control: no-store so nothing downstream caches it either", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ servers: [] }) });
    const { GET } = await import("@/app/api/openapi-spec/route");

    const res = await GET();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("still surfaces upstream failure as a JSON error with the same status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });
    const { GET } = await import("@/app/api/openapi-spec/route");

    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Failed to fetch OpenAPI spec" });
  });
});
