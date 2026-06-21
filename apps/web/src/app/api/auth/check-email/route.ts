import { type NextRequest } from "next/server";
import { proxyPublic } from "@/lib/server/proxy";

export const POST = (req: NextRequest) => proxyPublic(req, "/auth/check-email");
