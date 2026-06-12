import { type NextRequest, NextResponse } from "next/server";
import { proxySession } from "@/lib/server/proxy";

export async function POST(req: NextRequest): Promise<NextResponse> {
  return proxySession(req, "/stripe/addon-checkout", { forwardBody: true });
}
