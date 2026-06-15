import { type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* GET /api/admin/usage — proxied to apps/api GET /admin/usage.
   Superuser-gated on the API side. Thin proxy. */
export const GET = (req: NextRequest) => proxySession(req, "/admin/usage");
