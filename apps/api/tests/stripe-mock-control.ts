/**
 * Control-API client for the local stripe-mock service.
 *
 * Plain `fetch`: the Stripe route suites close MSW in their `beforeAll`, so
 * outbound requests are no longer intercepted and reach the mock directly.
 * The mock lives at STRIPE_API_BASE_URL (injected by compose.test.yml) and is
 * a project-controlled double that never leaves the local network.
 */

const MOCK_URL = process.env.STRIPE_API_BASE_URL || "http://localhost:12111";

/** Reset all expectations and recorded calls in the stripe-mock service. */
export async function mockReset(): Promise<void> {
  await fetch(`${MOCK_URL}/__test/reset`, { method: "POST" });
}

/** Register one expected Stripe API call with its canned response. */
export async function mockExpect(
  method: string,
  path: string,
  status = 200,
  body: unknown = {},
): Promise<void> {
  await fetch(`${MOCK_URL}/__test/expect`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method, path, status, body }),
  });
}

/** Fetch the list of Stripe API calls recorded since the last reset. */
export async function getCalls(): Promise<
  Array<{ method: string; path: string; body: unknown }>
> {
  const res = await fetch(`${MOCK_URL}/__test/calls`);
  return (await res.json()) as Array<{
    method: string;
    path: string;
    body: unknown;
  }>;
}
