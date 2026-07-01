/* Cloudflare Turnstile verification.

   Optional. When TURNSTILE_SECRET_KEY is unset, verification is a
   no-op that returns { ok: true, verified: false }. This lets us ship
   the plumbing before the operator has finished the Cloudflare setup
   without hard-failing every playground token issue. The client-side
   widget also degrades: no NEXT_PUBLIC_TURNSTILE_SITE_KEY means the
   widget doesn't render.

   Once secrets are set, we hit siteverify per Cloudflare's spec:
   https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ */

import { logger } from "../tracking/structured-logger";

export interface TurnstileVerifyResult {
  /** Whether the operation completed (no network / config failure). */
  ok: boolean;
  /** Whether the token was cryptographically valid AND Turnstile passed
      the user. False when the secret is unconfigured (stub mode) OR the
      token is bad. */
  verified: boolean;
  /** Error-code list from Cloudflare when a verify actually happened. */
  errorCodes?: string[];
  /** Whether we ran in stub mode (secret not configured). */
  stub: boolean;
}

/** Verify a Turnstile token from the browser widget.

    - token: the cf-turnstile-response field the widget submits
    - remoteIp: caller's IP, optional (improves Turnstile accuracy)

    Never throws. */
export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp: string | null,
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    /* Stub mode: not configured. Return not-verified so downstream can
       decide what to do (usually: still issue the cookie but flag
       tv:false so we can see the coverage gap in logs). */
    return { ok: true, verified: false, stub: true };
  }
  if (!token) {
    return { ok: true, verified: false, stub: false, errorCodes: ["missing-input-response"] };
  }

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (remoteIp) form.set("remoteip", remoteIp);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      logger.warn(`[turnstile] siteverify HTTP ${res.status}`);
      return { ok: false, verified: false, stub: false };
    }
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    return {
      ok: true,
      verified: Boolean(data.success),
      stub: false,
      errorCodes: data["error-codes"],
    };
  } catch (err) {
    logger.warn("[turnstile] siteverify threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, verified: false, stub: false };
  }
}
