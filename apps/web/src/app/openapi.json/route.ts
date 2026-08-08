// AR-773: clean, crawlable public alias for the OpenAPI spec at the web root
// (/openapi.json), the conventional path agent tooling and readiness scanners
// probe for. The existing spec BFF lives under /api/openapi-spec, which robots
// disallows, so it is invisible to crawlers. This mirrors that route
// (apps/web/src/app/api/openapi-spec/route.ts): always reflect what apps/api
// has actually deployed, with the internal-only tags filtered out.
export const dynamic = "force-dynamic";

import { filterSpec } from "@/modules/developer-surface/filter";

export async function GET() {
  try {
    const response = await fetch("https://onegoodarea.onrender.com/docs/json", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json(
        { error: "Failed to fetch OpenAPI spec" },
        { status: response.status },
      );
    }

    const spec = await response.json();
    const filtered = filterSpec(spec);

    return Response.json(filtered, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=600",
      },
    });
  } catch (error) {
    return Response.json(
      { error: "Failed to load OpenAPI spec", details: String(error) },
      { status: 500 },
    );
  }
}
