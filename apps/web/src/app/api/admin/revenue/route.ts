import { type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* GET /api/admin/revenue — proxied to apps/api GET /admin/revenue.
   Superuser-gated on the API side. Thin proxy. */
export const GET = (req: NextRequest) => proxySession(req, "/admin/revenue");
