import { describe, it, expect, vi } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";
import { requireCredential } from "@/shared/require-credential";

function mockReply() {
  const reply = {
    code: vi.fn(() => reply),
    send: vi.fn(() => reply),
  };
  return reply as unknown as FastifyReply;
}

function mockRequest(opts: {
  method: string;
  url: string;
  security?: Array<Record<string, unknown>>;
  authorization?: string;
}): FastifyRequest {
  return {
    method: opts.method,
    url: opts.url,
    headers: { authorization: opts.authorization },
    routeOptions: {
      url: opts.url,
      schema: opts.security ? { security: opts.security } : undefined,
    },
  } as unknown as FastifyRequest;
}

describe("requireCredential", () => {
  it("passes through routes with no security schema declared", async () => {
    const reply = mockReply();
    await requireCredential(mockRequest({ method: "GET", url: "/health" }), reply);
    expect(reply.code).not.toHaveBeenCalled();
  });

  it("passes through when a valid Bearer header is present", async () => {
    const reply = mockReply();
    await requireCredential(
      mockRequest({
        method: "POST",
        url: "/v1/query",
        security: [{ bearerAuth: [] }, {}],
        authorization: "Bearer oga_something",
      }),
      reply,
    );
    expect(reply.code).not.toHaveBeenCalled();
  });

  it("401s a secured route with no header and not on the anonymous allow-list", async () => {
    const reply = mockReply();
    await requireCredential(
      mockRequest({ method: "GET", url: "/v1/area", security: [{ bearerAuth: [] }] }),
      reply,
    );
    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: "Missing API key. Use: Authorization: Bearer oga_..." });
  });

  it("401s /me with no header (bearerToken family, non-bearerAuth message)", async () => {
    const reply = mockReply();
    await requireCredential(
      mockRequest({ method: "GET", url: "/me", security: [{ bearerToken: [] }] }),
      reply,
    );
    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("lets an allow-listed route (POST /v1/query) through with no header", async () => {
    const reply = mockReply();
    await requireCredential(
      mockRequest({ method: "POST", url: "/v1/query", security: [{ bearerAuth: [] }, {}] }),
      reply,
    );
    expect(reply.code).not.toHaveBeenCalled();
  });

  it("still 401s a non-allow-listed route even if it happens to share a method with an allow-listed one", async () => {
    const reply = mockReply();
    await requireCredential(
      mockRequest({ method: "POST", url: "/v1/portfolios", security: [{ bearerAuth: [] }] }),
      reply,
    );
    expect(reply.code).toHaveBeenCalledWith(401);
  });
});
