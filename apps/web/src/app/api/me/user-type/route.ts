import { type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* GET /api/me/user-type — proxied to apps/api GET /me/user-type.
   Returns { user_type: UserType }. Session-authed via bridge token.
   Replaces the deprecated /api/me/is-superuser BFF. */
export const GET = (req: NextRequest) => proxySession(req, "/me/user-type");
