"use client";
/**
 * Client orchestration for end-to-end encryption: ties the crypto primitives in
 * lib/crypto.ts to the auth endpoints. Keeps LandingPage / PasswordGate thin.
 */
import {
  createIdentity, joinIdentity, wrapCDKForInvite, loadIdentity,
  loadPrivateKeyForRegrant, completeRegrant, grantToPartner, startRegrant,
  unlockWithRecovery, rewrapForPassword, hasKeys,
  type IdentityBlobs, type WrappedBlob,
} from "@/lib/crypto";

/** The key blobs /api/auth/me returns for the signed-in user. */
export interface ServerKeys {
  kdfSalt: string;
  wrappedCDK: WrappedBlob | null;
  wrappedPrivateKey: WrappedBlob | null;
  recoverySalt: string | null;
  recoveryWrappedCDK: WrappedBlob | null;
  recoveryWrappedPrivateKey: WrappedBlob | null;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

async function postKeys(body: unknown): Promise<void> {
  await fetch("/api/auth/keys", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(body) });
}

/* ── sign-up / join ───────────────────────────────────────────────────────── */

/** New creator: mint key material to POST with /register. Keys go into session. */
export async function buildCreatorKeys(password: string): Promise<{ blobs: IdentityBlobs; recoveryKey: string }> {
  return createIdentity(password);
}

/** After /register returns the invite code, wrap the CDK under it so the partner
 *  can join, and store it on the couple. */
export async function uploadInviteWrap(inviteCode: string): Promise<void> {
  const invite = await wrapCDKForInvite(inviteCode);
  await postKeys({ invite });
}

/** Joining partner: fetch the invite-wrapped CDK, unwrap it, and re-wrap under
 *  their own password. Returns null for legacy couples that have no E2EE set up
 *  (caller then joins without encryption). */
export async function buildPartnerKeys(
  password: string, inviteCode: string,
): Promise<{ blobs: IdentityBlobs; recoveryKey: string } | null> {
  const r = await fetch(`/api/couples/invite-info?code=${encodeURIComponent(inviteCode)}`);
  const d = await r.json().catch(() => null);
  if (!d?.valid || !d.inviteSalt || !d.inviteWrappedCDK) return null;
  return joinIdentity(password, inviteCode, d.inviteSalt, d.inviteWrappedCDK);
}

/* ── login / unlock ───────────────────────────────────────────────────────── */

export type UnlockResult =
  | { status: "ok" }                                   // keys unlocked into session
  | { status: "none" }                                 // legacy account, no E2EE
  | { status: "locked-waiting" }                       // re-grant pending; partner must act
  | { status: "regranted"; recoveryKey: string };      // partner delivered the key; new recovery key issued

/** Given the password (in hand at login/unlock) and the /me payload, unlock the
 *  data key into session — completing a partner re-grant if one was delivered. */
export async function unlockKeys(
  password: string,
  me: { keys?: ServerKeys | null; hasRegrantBlob?: boolean },
): Promise<UnlockResult> {
  const keys = me?.keys;
  if (!keys || !keys.kdfSalt) return { status: "none" };

  if (keys.wrappedCDK && keys.wrappedPrivateKey) {
    await loadIdentity(password, { kdfSalt: keys.kdfSalt, wrappedCDK: keys.wrappedCDK, wrappedPrivateKey: keys.wrappedPrivateKey });
    return { status: "ok" };
  }

  // No data key for us yet → a re-grant is in progress.
  if (keys.wrappedPrivateKey) {
    await loadPrivateKeyForRegrant(password, { kdfSalt: keys.kdfSalt, wrappedPrivateKey: keys.wrappedPrivateKey });
    if (me.hasRegrantBlob) {
      const rr = await (await fetch("/api/auth/regrant")).json().catch(() => null);
      if (rr?.incoming?.regrantBlob) {
        const done = await completeRegrant(rr.incoming.regrantBlob);
        await postKeys({ user: done.blobs, needsRegrant: false });
        return { status: "regranted", recoveryKey: done.recoveryKey };
      }
    }
    return { status: "locked-waiting" };
  }
  return { status: "none" };
}

/** Partner side: if the other member is waiting for a re-grant, deliver the CDK
 *  encrypted to their public key. Safe to call on every authenticated load. */
export async function maybeGrantToPartner(): Promise<boolean> {
  if (!(await hasKeys())) return false;
  try {
    const rr = await (await fetch("/api/auth/regrant")).json();
    if (rr?.request?.publicKey && rr?.request?.targetUserId) {
      const regrantBlob = await grantToPartner(rr.request.publicKey);
      await fetch("/api/auth/regrant", {
        method: "POST", headers: JSON_HEADERS,
        body: JSON.stringify({ targetUserId: rr.request.targetUserId, regrantBlob }),
      });
      return true;
    }
  } catch {}
  return false;
}

/* ── password reset recovery ──────────────────────────────────────────────── */

/** Reset flow, path 1: unlock with the saved recovery key, then re-wrap the
 *  data key under the new password + a fresh recovery key. Returns the new
 *  recovery key to show. Requires the user to be signed in (reset sets a cookie). */
export async function recoverWithRecoveryKey(
  recoveryKey: string, keys: ServerKeys, newPassword: string,
): Promise<string> {
  if (!keys.recoverySalt || !keys.recoveryWrappedCDK || !keys.recoveryWrappedPrivateKey) {
    throw new Error("This account has no recovery key on file.");
  }
  await unlockWithRecovery(recoveryKey, {
    recoverySalt: keys.recoverySalt,
    recoveryWrappedCDK: keys.recoveryWrappedCDK,
    recoveryWrappedPrivateKey: keys.recoveryWrappedPrivateKey,
  });
  const { blobs, recoveryKey: fresh } = await rewrapForPassword(newPassword);
  await postKeys({ user: blobs });
  return fresh;
}

/** Reset flow, path 2: recovery key lost too — start a partner re-grant. The
 *  user is left signed in but locked until their partner opens the app. */
export async function startResetRegrant(newPassword: string): Promise<void> {
  const r = await startRegrant(newPassword);
  await postKeys({ user: r, needsRegrant: true, clearCDK: true });
}
