import { type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* DELETE /api/me/webhooks/:id — proxied to apps/api DELETE /me/webhooks/:id.
   apps/api soft-deletes via status = 'revoked'; the row stays for
   delivery audit history. AR-350 (epic AR-343): converted from the
   legacy direct-SQL BFF. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxySession(req, `/me/webhooks/${id}`);
}
