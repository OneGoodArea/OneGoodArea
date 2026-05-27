import { NextResponse, type NextRequest } from "next/server";

const TESTING_AUTH_HEADER = "x-test-auth-token";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function isTestingAuthEnabled(): boolean {
  return process.env.OGA_ENABLE_TESTING_AUTH_ROUTES === "true";
}

export function resolveTestingRouteAccess(request: Pick<NextRequest, "headers">): {
  status: number;
  body: { error: string };
} | null {
  if (isProduction()) {
    return { status: 404, body: { error: "Not found" } };
  }

  if (!isTestingAuthEnabled()) {
    return { status: 403, body: { error: "Testing auth routes are disabled" } };
  }

  const expectedToken = process.env.OGA_TESTING_AUTH_TOKEN?.trim();
  if (expectedToken) {
    const providedToken = request.headers.get(TESTING_AUTH_HEADER);
    if (providedToken !== expectedToken) {
      return { status: 401, body: { error: "Invalid testing auth token" } };
    }
  }

  return null;
}

export function requireTestingRouteAccess(request: Pick<NextRequest, "headers">): NextResponse | null {
  const accessError = resolveTestingRouteAccess(request);
  return accessError ? NextResponse.json(accessError.body, { status: accessError.status }) : null;
}
