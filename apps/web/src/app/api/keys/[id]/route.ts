import { type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* DELETE /api/keys/[id] — proxied to apps/api DELETE /keys/:id
   The API container handles session auth + revokeApiKey internally. */

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxySession(req, `/keys/${id}`, { method: "DELETE" });
}

/* AR-385: PATCH /api/keys/[id] — proxied to apps/api PATCH /keys/:id.
   Body shape: { training_optout: boolean }. Owner-scoped server-side. */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxySession(req, `/keys/${id}`, {
    method: "PATCH",
    forwardBody: true,
  });
}
