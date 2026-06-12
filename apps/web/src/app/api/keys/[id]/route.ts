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
