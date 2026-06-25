/* AR-251 [AR-248-D / -E] POST /api/onboarding/complete

   Called at the end of the /welcome flow (Finish button on Step 3).
   Coordinates two apps/api calls in one request:
   - PATCH /me/profile with intents (writes users.intent)
   - POST  /v1/orgs with workspace_name (provisions an org owned by the caller)

   Both fields are optional. Skipping a step leaves the corresponding
   action skipped. Tolerant by design — partial Finish from any state
   still lands the user in /dashboard cleanly.

   AR-346 (epic AR-343): the inline UPDATE users SET intent ... was
   replaced with a apps/api PATCH /me/profile call. Validation (allowed
   slugs, dedup, csv assembly) now lives on apps/api as the single
   source of truth. This BFF only forwards the array; apps/api rejects
   unknown slugs with 400. */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callApi } from "@/lib/server/api-client";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    /* Preview / unauthed path: in production the only path to /welcome
       is post-register so a session always exists. But for design
       previews (Pedro testing the flow directly, marketing-side
       walkthroughs of how onboarding looks before sign-up) we return
       ok WITHOUT writing anything rather than 401. The UI still
       advances to /dashboard, which Next-Auth's middleware will then
       send to /get-started on its own. */
    return NextResponse.json({ ok: true, preview: true });
  }

  const body = (await req.json().catch(() => ({}))) as {
    intents?: unknown;
    workspace_name?: unknown;
  };

  /* Step 1: persist intents via apps/api. Forward the array as-is;
     apps/api validates each slug and rejects with 400 on bad input. */
  if (body.intents !== undefined && body.intents !== null) {
    try {
      const profileRes = await callApi<{ ok: true } | { error: string }>(
        "/me/profile",
        {
          userId: session.user.id,
          method: "PATCH",
          body: { intents: body.intents },
        },
      );
      if (!profileRes.ok) {
        /* 400 from apps/api = invalid intent slug. Surface to the UI
           with the same message so the welcome step can correct it. */
        const error = (profileRes.data as { error?: string })?.error ?? "Couldn't save your intent. Try again.";
        return NextResponse.json({ error }, { status: profileRes.status });
      }
    } catch (e) {
      logger.error("Failed to PATCH /me/profile during onboarding:", e);
      return NextResponse.json(
        { error: "Couldn't save your intent. Try again." },
        { status: 500 },
      );
    }
  }

  /* Step 2: provision org via apps/api POST /v1/orgs. Tolerance: 409 (already
     exists) is treated as success; other 4xx logged but not surfaced (intent
     already persisted, user proceeds and can rename their org later). */
  let workspaceName: string | null = null;
  if (body.workspace_name !== undefined && body.workspace_name !== null) {
    if (typeof body.workspace_name !== "string") {
      return NextResponse.json({ error: "Invalid workspace name." }, { status: 400 });
    }
    const trimmed = body.workspace_name.trim();
    if (trimmed.length > 0 && trimmed.length <= 80) {
      workspaceName = trimmed;
    }
  }

  if (workspaceName) {
    try {
      const orgRes = await callApi<{ id: string }>("/v1/orgs", {
        userId: session.user.id,
        method: "POST",
        body: { name: workspaceName },
      });
      if (!orgRes.ok && orgRes.status !== 409) {
        logger.error("Onboarding org creation returned non-ok:", orgRes.status);
      }
    } catch (e) {
      logger.error("Failed to provision org during onboarding:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
