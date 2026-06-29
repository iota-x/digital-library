/**
 * Server-side helpers for persisting the E2EE key blobs.
 *
 * There is NO cryptography here — the server never derives a key or reads
 * content. These functions only validate the *shape* of the opaque blobs the
 * client uploads, so routes store the expected fields and nothing else.
 */

export interface WrappedBlob { c: string; iv: string }

function isWrapped(v: unknown): v is WrappedBlob {
  return !!v && typeof v === "object"
    && typeof (v as Record<string, unknown>).c === "string"
    && typeof (v as Record<string, unknown>).iv === "string";
}

const STR_FIELDS = ["kdfSalt", "publicKey", "recoverySalt"] as const;
const BLOB_FIELDS = ["wrappedCDK", "wrappedPrivateKey", "recoveryWrappedCDK", "recoveryWrappedPrivateKey"] as const;

/** Whitelist a user's key-material fields from arbitrary input. */
export function pickUserCrypto(input: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!input || typeof input !== "object") return out;
  const o = input as Record<string, unknown>;
  for (const f of STR_FIELDS) if (typeof o[f] === "string") out[f] = o[f];
  for (const f of BLOB_FIELDS) if (isWrapped(o[f])) out[f] = o[f];
  return out;
}

/** Whitelist the couple's invite-wrapped data key (used so a partner can join). */
export function pickInviteCrypto(input: unknown): { inviteSalt: string; inviteWrappedCDK: WrappedBlob } | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  if (typeof o.inviteSalt === "string" && isWrapped(o.inviteWrappedCDK)) {
    return { inviteSalt: o.inviteSalt, inviteWrappedCDK: o.inviteWrappedCDK as WrappedBlob };
  }
  return null;
}
