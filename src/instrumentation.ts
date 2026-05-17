export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Redirect fetch calls to local mocks in test environment
    if (process.env.OGA_LOCAL_RUNTIME_ENABLED === "true") {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
        let url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

        if (url.includes("api.postcodes.io")) {
          url = url.replace("https://api.postcodes.io", "http://api-mock:4010");
        } else if (url.includes("api.anthropic.com")) {
          url = url.replace("https://api.anthropic.com", "http://ai-mock:55434");
        } else if (url.includes("api.resend.com")) {
          url = url.replace("https://api.resend.com", "http://email-proxy:55435");
        }

        return originalFetch(url, init);
      }) as typeof fetch;
    }

    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = async (
  err: { digest: string } & Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  },
  context: { routerKind: string; routePath: string; routeType: string; renderSource: string }
) => {
  const { captureRequestError } = await import("@sentry/nextjs");
  captureRequestError(err, request, context);
};
