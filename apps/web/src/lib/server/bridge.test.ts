import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { jwtVerify } from "jose";
import { mintBridgeToken } from "./bridge";

const SECRET = "test-auth-secret-0123456789";

beforeEach(() => {
  process.env.AUTH_SECRET = SECRET;
});

afterAll(() => {
  delete process.env.AUTH_SECRET;
});

describe("bridge minting", () => {
  it("mints an HS256 token that verifies to the userId (apps/api verify contract)", async () => {
    const token = await mintBridgeToken("user_123");
    const { payload, protectedHeader } = await jwtVerify(token, new TextEncoder().encode(SECRET), {
      algorithms: ["HS256"],
    });
    expect(protectedHeader.alg).toBe("HS256");
    expect(payload.sub).toBe("user_123");
    expect(typeof payload.exp).toBe("number");
    expect(typeof payload.iat).toBe("number");
  });

  it("sets a short expiry by default (~5 minutes)", async () => {
    const token = await mintBridgeToken("user_123");
    const { payload } = await jwtVerify(token, new TextEncoder().encode(SECRET), { algorithms: ["HS256"] });
    const ttl = (payload.exp ?? 0) - (payload.iat ?? 0);
    expect(ttl).toBe(300); // 5m
  });

  it("honours a custom expiry", async () => {
    const token = await mintBridgeToken("user_123", { expiresIn: "30s" });
    const { payload } = await jwtVerify(token, new TextEncoder().encode(SECRET), { algorithms: ["HS256"] });
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(30);
  });

  it("a token minted with a different secret fails verification", async () => {
    const token = await mintBridgeToken("user_123");
    await expect(
      jwtVerify(token, new TextEncoder().encode("a-different-secret"), { algorithms: ["HS256"] }),
    ).rejects.toThrow();
  });

  it("throws (fails loud) when AUTH_SECRET is unset", async () => {
    delete process.env.AUTH_SECRET;
    await expect(mintBridgeToken("user_123")).rejects.toThrow("AUTH_SECRET is not configured");
  });
});
