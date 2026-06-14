import { type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

export const GET = (req: NextRequest) => proxySession(req, "/v1/orgs");

export const POST = (req: NextRequest) =>
  proxySession(req, "/v1/orgs", { forwardBody: true });
