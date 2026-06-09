/* AR-251 [AR-248-F] /api/onboarding/area-lookup
   --------------------------------------------
   Backs the /welcome step 3 first-signal AHA. Forwards a postcode to
   apps/api's GET /v1/area via the BFF client when the user is signed
   in. Returns a normalized AreaResult shape the welcome client renders
   as a score card + signals list.

   Graceful fallback: when the call fails or no session exists, returns
   a static demo result so the UI still shows the AHA experience. This
   keeps /welcome demoable without auth (relevant during dev + when
   the user pre-auth previews via marketing-side links) while
   delivering real data once they're signed in.

   Rate-limited 10/min per IP — this is an outbound API call, not just
   a DB write. */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callApi } from "@/lib/server/api-client";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

const RATE_LIMIT = { max: 10, windowSeconds: 60 } as const;

interface ApiAreaResponse {
  area_name?: string;
  postcode?: string;
  score?: number;
  signals?: Array<{ key: string; label: string; value_text?: string; value?: string }>;
  headline?: string;
}

interface NormalizedAreaResult {
  area_name: string;
  postcode: string;
  score: number;
  signals: Array<{ key: string; label: string; value_text: string }>;
  headline?: string;
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await rateLimit(`onboarding-area:${ip}`, RATE_LIMIT);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a moment." },
      { status: 429, headers: rateLimitHeaders(RATE_LIMIT.max, rl) },
    );
  }

  const rawPostcode = req.nextUrl.searchParams.get("postcode") ?? "";
  const postcode = rawPostcode.trim().toUpperCase();
  if (!postcode || postcode.length < 2) {
    return NextResponse.json(
      { error: "Postcode required" },
      { status: 400 },
    );
  }

  /* Try the real BFF path first — needs a session. */
  try {
    const session = await auth();
    if (session?.user?.id) {
      const apiRes = await callApi<ApiAreaResponse>(
        `/v1/area?postcode=${encodeURIComponent(postcode)}`,
        { userId: session.user.id },
      );
      if (apiRes.ok && apiRes.data) {
        return NextResponse.json(normalize(apiRes.data, postcode));
      }
    }
  } catch {
    /* Fall through to the demo result. The /welcome client doesn't
       need to know whether the data is live or staged — the AHA UI
       is the point of step 3. */
  }

  /* Demo fallback — used when no session OR when the BFF call fails
     (apps/api down, network blip, signals_api flag off). Static but
     plausible; lets a curious unauthed visitor or a dev with a half-
     up stack still see what Step 3 renders. */
  return NextResponse.json(demoResult(postcode));
}

function normalize(raw: ApiAreaResponse, fallbackPostcode: string): NormalizedAreaResult {
  return {
    area_name: raw.area_name ?? "Unknown area",
    postcode: raw.postcode ?? fallbackPostcode,
    score: typeof raw.score === "number" ? raw.score : 0,
    signals: (raw.signals ?? []).map((s) => ({
      key: s.key,
      label: s.label,
      value_text: s.value_text ?? s.value ?? "—",
    })),
    headline: raw.headline,
  };
}

function demoResult(postcode: string): NormalizedAreaResult {
  return {
    area_name: "Manchester city centre (demo)",
    postcode,
    score: 67,
    signals: [
      { key: "deprivation", label: "Deprivation (IMD decile)", value_text: "7 of 10" },
      { key: "crime", label: "Crime percentile", value_text: "62nd" },
      { key: "property_growth", label: "Price growth (YoY)", value_text: "+5.4%" },
      { key: "transport", label: "Transport access", value_text: "Strong" },
    ],
    headline: "Strong fundamentals with moderate price growth. Demo data while you preview onboarding.",
  };
}
