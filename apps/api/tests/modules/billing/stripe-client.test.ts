import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

/* The Stripe SDK is mocked with a controllable constructor so we can assert the
   lazy-init proxy without a real key or network. resetModules() between tests
   gives each scenario a fresh module-level singleton. */

let lastArgs: unknown[] = [];
let instanceCount = 0;

class MockStripe {
  marker = "mock-stripe-instance";
  someMethod() {
    return this.marker;
  }
  constructor(...args: unknown[]) {
    lastArgs = args;
    instanceCount++;
  }
}

vi.mock("stripe", () => ({ default: MockStripe }));

type StripeShape = { marker: string; someMethod: () => string };

beforeEach(() => {
  vi.resetModules();
  instanceCount = 0;
  lastArgs = [];
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_API_BASE_URL;
});

afterAll(() => {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_API_BASE_URL;
});

describe("stripe client proxy", () => {
  it("throws when STRIPE_SECRET_KEY is missing (only on first property access)", async () => {
    const { stripe } = await import("@/modules/billing/stripe-client");
    expect(() => (stripe as unknown as StripeShape).marker).toThrow(
      "Neither apiKey nor config.authenticator provided",
    );
    expect(instanceCount).toBe(0);
  });

  it("lazily constructs the client once with the secret key + typescript flag", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    const { stripe } = await import("@/modules/billing/stripe-client");

    expect((stripe as unknown as StripeShape).marker).toBe("mock-stripe-instance");
    // A second access reuses the cached client (no re-construction).
    void (stripe as unknown as StripeShape).marker;

    expect(instanceCount).toBe(1);
    expect(lastArgs).toEqual(["sk_test_123", { typescript: true }]);
  });

  it("binds methods to the underlying client instance", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    const { stripe } = await import("@/modules/billing/stripe-client");

    const method = (stripe as unknown as StripeShape).someMethod;
    expect(typeof method).toBe("function");
    // Called detached from the proxy, it still resolves `this` to the client.
    expect(method()).toBe("mock-stripe-instance");
  });
});
