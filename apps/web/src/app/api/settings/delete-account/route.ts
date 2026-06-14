import { type NextRequest, NextResponse } from "next/server";
import { proxySession } from "@/lib/server/proxy";

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  return proxySession(req, "/settings/delete-account");
}
