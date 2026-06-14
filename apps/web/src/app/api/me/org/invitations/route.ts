import { type NextRequest } from "next/server";
import { proxyOrgRoute } from "@/lib/server/proxy";

export const GET = (req: NextRequest) =>
  proxyOrgRoute(req, (orgId) => `/v1/orgs/${orgId}/invitations`);

export const POST = (req: NextRequest) =>
  proxyOrgRoute(req, (orgId) => `/v1/orgs/${orgId}/invitations`);
