import { NextRequest, NextResponse } from "next/server";
import { getRuntimeConfig, getRuntimeDiagnostics } from "@/lib/runtime/env";
import { requireTestingRouteAccess } from "@/lib/runtime/testing/guards";

type ServiceProbeStatus = "up" | "down";

async function probeService(url: string): Promise<{ status: ServiceProbeStatus; statusCode: number | null }> {
  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });

    return {
      status: response.ok ? "up" : "down",
      statusCode: response.status,
    };
  } catch {
    return {
      status: "down",
      statusCode: null,
    };
  }
}

export async function GET(req: NextRequest) {
  const forbidden = requireTestingRouteAccess(req);
  if (forbidden) {
    return forbidden;
  }

  const config = await getRuntimeConfig();
  if (!config.localRuntimeEnabled) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const diagnostics = await getRuntimeDiagnostics();
  const [app, neonProxy, mailhog] = await Promise.all([
    probeService(`${diagnostics.debug.serviceUrls.app}/api/health`),
    probeService(`${diagnostics.debug.serviceUrls.neonProxy}/health`),
    probeService(`${diagnostics.debug.serviceUrls.mailhogUi}/api/v2/messages`),
  ]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    runtime: diagnostics,
    services: {
      app,
      neonProxy,
      mailhog,
    },
  });
}

