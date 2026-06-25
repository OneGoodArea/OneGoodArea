import { type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* DELETE /api/watchlist/:id — proxied to apps/api DELETE /watchlist/:id.
   apps/api uses authenticateSession (same NextAuth cookie pattern).
   AR-345 (epic AR-343): converted from the legacy direct-SQL BFF. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxySession(req, `/watchlist/${id}`);
}
