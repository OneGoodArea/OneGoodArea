import { type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* GET /api/admin/audience — proxied to apps/api GET /admin/audience.
   Superuser-gated on the API side (AR-312 column). Thin proxy: no
   business logic, no SQL. */
export const GET = (req: NextRequest) => proxySession(req, "/admin/audience");
