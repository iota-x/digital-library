import { serverEnv } from "@/lib/env";

/**
 * Cloudflare Turnstile server-side verification.
 *
 * Bot-protection for the open registration endpoint. The client solves a
 * Turnstile challenge and posts the resulting token; we verify it here against
 * Cloudflare's siteverify API before doing any real work.
 *
 * Fail-OPEN when `TURNSTILE_SECRET` is unset — so local dev and any deploy that
 * hasn't configured Turnstile keeps working exactly as before (same pattern as
 * the other optional integrations in this app). Protection activates the moment
 * the secret is set. When enabled, a missing/invalid token is rejected.
 */

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** True when Turnstile is configured and should be enforced. */
export function turnstileEnabled(): boolean {
  return serverEnv.TURNSTILE_SECRET.length > 0;
}

/**
 * Verify a Turnstile token. Returns true when the challenge passed (or when
 * Turnstile is disabled). `remoteip` is optional but improves Cloudflare's
 * scoring when available.
 */
export async function verifyTurnstile(token: unknown, remoteip?: string): Promise<boolean> {
  if (!turnstileEnabled()) return true; // not configured → don't block
  if (typeof token !== "string" || token.length === 0) return false;

  try {
    const form = new URLSearchParams();
    form.set("secret", serverEnv.TURNSTILE_SECRET);
    form.set("response", token);
    if (remoteip) form.set("remoteip", remoteip);

    const res = await fetch(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      // Cloudflare is fast; don't let a hung verify hang a signup forever.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    // Network error / timeout reaching Cloudflare. Fail closed: a configured
    // Turnstile that can't verify shouldn't silently wave traffic through.
    return false;
  }
}
