/**
 * Higher-order function for authenticated API routes.
 * Handles auth check, error catching, and logging in one place.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

interface AuthContext {
  userId: string;
  userEmail: string | null;
}

/**
 * Wrap a route handler that requires authentication.
 * Handles 401 responses and catches unhandled errors.
 */
export function withAuth(
  handler: (req: NextRequest, ctx: AuthContext) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const session = await auth();
      const userId = session?.user?.id;
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return await handler(req, {
        userId,
        userEmail: session?.user?.email ?? null,
      });
    } catch (error) {
      logger.error(`${req.method} ${req.nextUrl.pathname} failed:`, error);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }
  };
}

/**
 * Wrap a route handler that requires authentication AND has dynamic params.
 */
export function withAuthParams<P extends Record<string, string>>(
  handler: (
    req: NextRequest,
    ctx: AuthContext & { params: P }
  ) => Promise<NextResponse>
) {
  return async (
    req: NextRequest,
    { params: paramsPromise }: { params: Promise<P> }
  ): Promise<NextResponse> => {
    try {
      const session = await auth();
      const userId = session?.user?.id;
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const params = await paramsPromise;
      return await handler(req, {
        userId,
        userEmail: session?.user?.email ?? null,
        params,
      });
    } catch (error) {
      logger.error(`${req.method} ${req.nextUrl.pathname} failed:`, error);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }
  };
}
