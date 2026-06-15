import { type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* GET /api/me/is-superuser — proxied to apps/api GET /me/is-superuser.
   Returns { is_superuser: boolean }. Session-authed via bridge token.
   Used by the /admin server component to gate the page. */
export const GET = (req: NextRequest) => proxySession(req, "/me/is-superuser");
