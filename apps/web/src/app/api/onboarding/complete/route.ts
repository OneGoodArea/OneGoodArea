/* AR-251 [AR-248-D / -E] POST /api/onboarding/complete
   --------------------------------------------
   Called at the end of the /welcome flow (Finish button on Step 3).
   Persists the accumulated state in one atomic request:
   - intent: writes users.intent (column shipped AR-218)
   - workspace_name: provisions an org with that name via the existing
     /v1/orgs POST endpoint (BFF forwards as the signed-in user)

   Both fields are optional. Skipping a step leaves the corresponding
   field null/absent in the request, and the endpoint just doesn't
   write that piece. Tolerant by design so the user can hit Finish
   from any partial state and still land in /dashboard cleanly.

   Returns 200 with {ok: true} on success; user is then redirected
   client-side to /dashboard. */

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { auth } from "@/lib/auth";
import { callApi } from "@/lib/server/api-client";
import { logger } from "@/lib/logger";

const ALLOWED_INTENTS = new Set([
  "moving",
  "business",
  "investing",
  "research",
]);

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

  /* Validate intents — accept an array of canonical slugs. Each must
     be one of the four allowed values. Empty array = no intent
     persisted (skippable). Stored as comma-separated TEXT in
     users.intent (column shape from AR-218) — schema migration to
     TEXT[] is a follow-up. */
  let intentCsv: string | null = null;
  if (body.intents !== undefined && body.intents !== null) {
    if (!Array.isArray(body.intents)) {
      return NextResponse.json(
        { error: "intents must be an array." },
        { status: 400 },
      );
    }
    const validated: string[] = [];
    for (const slug of body.intents) {
      if (typeof slug !== "string" || !ALLOWED_INTENTS.has(slug)) {
        return NextResponse.json(
          { error: `Invalid intent slug: ${String(slug)}` },
          { status: 400 },
        );
      }
      if (!validated.includes(slug)) validated.push(slug);
    }
    if (validated.length > 0) {
      intentCsv = validated.join(",");
    }
  }

  /* Validate workspace name — optional but if present must be non-
     empty + length-capped to keep DB rows sane. */
  let workspaceName: string | null = null;
  if (body.workspace_name !== undefined && body.workspace_name !== null) {
    if (typeof body.workspace_name !== "string") {
      return NextResponse.json(
        { error: "Invalid workspace name." },
        { status: 400 },
      );
    }
    const trimmed = body.workspace_name.trim();
    if (trimmed.length > 0 && trimmed.length <= 80) {
      workspaceName = trimmed;
    }
  }

  /* Step 1: persist intent (comma-separated multi-select). */
  if (intentCsv !== null) {
    try {
      await sql`
        UPDATE users SET intent = ${intentCsv} WHERE id = ${session.user.id}
      `;
    } catch (e) {
      logger.error("Failed to persist users.intent during onboarding:", e);
      return NextResponse.json(
        { error: "Couldn't save your intent. Try again." },
        { status: 500 },
      );
    }
  }

  /* Step 2: provision org via BFF. The /v1/orgs POST endpoint owns
     org creation + assigning the caller as owner. If the user already
     has an org with this name we just continue — the BFF returns the
     existing row. */
  if (workspaceName) {
    try {
      const orgRes = await callApi<{ id: string }>("/v1/orgs", {
        userId: session.user.id,
        method: "POST",
        body: { name: workspaceName },
      });
      /* 200, 201, 409 (already exists) all considered acceptable
         outcomes — the user proceeds either way. 4xx other than 409
         signals an input bug we want to surface. */
      if (!orgRes.ok && orgRes.status !== 409) {
        logger.error("Onboarding org creation returned non-ok:", orgRes.status);
        /* Don't fail the whole flow — intent already persisted. The
           user can rename / create their org later. */
      }
    } catch (e) {
      logger.error("Failed to provision org during onboarding:", e);
      /* Same tolerance: log + continue. */
    }
  }

  return NextResponse.json({ ok: true });
}
