/**
 * Client-side end-to-end encryption core.
 *
 * Design (see plan / privacy policy):
 *  - CDK  — one random AES-GCM key per couple; encrypts all text content.
 *  - KEK  — per-user key derived from their password (PBKDF2); wraps the CDK and
 *           the user's private key. Never leaves the device; never persisted.
 *  - Recovery key — a savable code that wraps a *second* copy of the CDK so a
 *           user can self-recover after a password reset.
 *  - Per-user RSA keypair — public key stored plaintext server-side; used by the
 *           partner to securely re-grant the CDK if someone loses both their
 *           password and recovery key.
 *
 * The server only ever stores opaque base64 blobs. It never derives a key or
 * sees plaintext content. This module runs in the browser (Web Crypto); it is
 * also import-safe under Node 18+ (vitest) since `globalThis.crypto.subtle` and
 * the base64 helpers work in both. Do NOT import it from server route handlers.
 */

/* ── low-level helpers ────────────────────────────────────────────────────── */

const PBKDF2_ITERATIONS = 310_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const ENVELOPE_PREFIX = "enc:1:";

function sub(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) throw new Error("Web Crypto unavailable in this environment");
  return c.subtle;
}

function randomBytes(n: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(n));
}

// Base64 that works in browsers (no Buffer) and Node (no btoa quirks).
function bytesToB64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(b64, "base64"));
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// TS 5.7 typed Uint8Array as generic over ArrayBufferLike, but Web Crypto wants
// an ArrayBuffer-backed BufferSource. Copy into a fresh ArrayBuffer to satisfy
// the types (and guarantee no SharedArrayBuffer backing).
function ab(bytes: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(out).set(bytes);
  return out;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

/* ── shapes persisted server-side ─────────────────────────────────────────── */

/** A wrapped CryptoKey: ciphertext + the IV used to wrap it. */
export interface WrappedBlob { c: string; iv: string }

/** The full per-user key material the server stores (all opaque blobs). */
export interface IdentityBlobs {
  kdfSalt: string;
  wrappedCDK: WrappedBlob;
  publicKey: string;                    // spki, base64
  wrappedPrivateKey: WrappedBlob;
  recoverySalt: string;
  recoveryWrappedCDK: WrappedBlob;
  recoveryWrappedPrivateKey: WrappedBlob;
}

/** Re-wrap result that omits the (unchanged) public key. */
export type RewrapBlobs = Omit<IdentityBlobs, "publicKey">;

/* ── key derivation / generation ──────────────────────────────────────────── */

function genSalt(): string {
  return bytesToB64(randomBytes(SALT_BYTES));
}

/** PBKDF2-SHA256 → an AES-GCM key used only to wrap/unwrap other keys. */
async function deriveKEK(passphrase: string, saltB64: string): Promise<CryptoKey> {
  const baseKey = await sub().importKey("raw", ab(enc.encode(passphrase)), "PBKDF2", false, ["deriveKey"]);
  return sub().deriveKey(
    { name: "PBKDF2", salt: ab(b64ToBytes(saltB64)), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

/** A fresh random data key (the CDK). Extractable so it can be wrapped. */
async function randomCDK(): Promise<CryptoKey> {
  return sub().generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

async function genKeyPair(): Promise<CryptoKeyPair> {
  return sub().generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"],
  );
}

/* ── wrap / unwrap ────────────────────────────────────────────────────────── */

async function wrapKey(key: CryptoKey, kek: CryptoKey, format: "raw" | "pkcs8"): Promise<WrappedBlob> {
  const iv = randomBytes(IV_BYTES);
  const wrapped = await sub().wrapKey(format, key, kek, { name: "AES-GCM", iv: ab(iv) });
  return { c: bytesToB64(new Uint8Array(wrapped)), iv: bytesToB64(iv) };
}

async function unwrapCDK(blob: WrappedBlob, kek: CryptoKey): Promise<CryptoKey> {
  return sub().unwrapKey(
    "raw", ab(b64ToBytes(blob.c)), kek,
    { name: "AES-GCM", iv: ab(b64ToBytes(blob.iv)) },
    { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"],
  );
}

async function unwrapPrivateKey(blob: WrappedBlob, kek: CryptoKey): Promise<CryptoKey> {
  return sub().unwrapKey(
    "pkcs8", ab(b64ToBytes(blob.c)), kek,
    { name: "AES-GCM", iv: ab(b64ToBytes(blob.iv)) },
    { name: "RSA-OAEP", hash: "SHA-256" }, true, ["decrypt"],
  );
}

async function exportPublicKey(key: CryptoKey): Promise<string> {
  return bytesToB64(new Uint8Array(await sub().exportKey("spki", key)));
}
async function importPublicKey(spkiB64: string): Promise<CryptoKey> {
  return sub().importKey("spki", ab(b64ToBytes(spkiB64)), { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"]);
}

/* ── recovery key ─────────────────────────────────────────────────────────── */

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; // RFC 4648, no padding
function base32(bytes: Uint8Array): string {
  let bits = 0, value = 0, out = "";
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

/** A human-savable recovery code, e.g. "K3MQ-7Z2A-...". 20 bytes of entropy. */
export function generateRecoveryKey(): string {
  const raw = base32(randomBytes(20));
  return (raw.match(/.{1,4}/g) ?? [raw]).join("-");
}
function normalizeRecovery(key: string): string {
  return key.toUpperCase().replace(/[^A-Z2-7]/g, "");
}
function normalizeInvite(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/* ── in-memory (+ sessionStorage) key holder ──────────────────────────────── */

let _cdk: CryptoKey | null = null;
let _privateKey: CryptoKey | null = null;
let _kek: CryptoKey | null = null; // memory-only; never persisted
let _hydrated = false;

const SS_CDK = "ann_cdk_v1";
const SS_PK = "ann_pk_v1";

// Mirror the CDK + private key (not the KEK) to sessionStorage so a reload
// inside the same tab keeps content readable without re-deriving from password.
// Trade-off noted in the privacy policy: an XSS could read these — but it could
// equally read the password as it's typed, so this doesn't change the threat model.
async function persistSession(): Promise<void> {
  if (typeof window === "undefined" || !_cdk || !_privateKey) return;
  try {
    const cdkRaw = bytesToB64(new Uint8Array(await sub().exportKey("raw", _cdk)));
    const pkRaw = bytesToB64(new Uint8Array(await sub().exportKey("pkcs8", _privateKey)));
    sessionStorage.setItem(SS_CDK, cdkRaw);
    sessionStorage.setItem(SS_PK, pkRaw);
  } catch {}
}

async function hydrateSession(): Promise<void> {
  if (_hydrated || typeof window === "undefined") return;
  _hydrated = true;
  try {
    const cdkRaw = sessionStorage.getItem(SS_CDK);
    const pkRaw = sessionStorage.getItem(SS_PK);
    if (cdkRaw) {
      _cdk = await sub().importKey("raw", ab(b64ToBytes(cdkRaw)), { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    }
    if (pkRaw) {
      _privateKey = await sub().importKey("pkcs8", ab(b64ToBytes(pkRaw)), { name: "RSA-OAEP", hash: "SHA-256" }, true, ["decrypt"]);
    }
  } catch {}
}

function setSession(cdk: CryptoKey | null, privateKey: CryptoKey | null, kek: CryptoKey | null) {
  _cdk = cdk; _privateKey = privateKey; _kek = kek;
  void persistSession();
}

/** Forget all key material (call on logout). */
export function clearKeys(): void {
  _cdk = null; _privateKey = null; _kek = null;
  if (typeof window !== "undefined") {
    try { sessionStorage.removeItem(SS_CDK); sessionStorage.removeItem(SS_PK); } catch {}
  }
}

/** True once the CDK is loaded and content can be encrypted/decrypted. */
export async function hasKeys(): Promise<boolean> {
  await hydrateSession();
  return _cdk !== null;
}

/* ── identity lifecycle (used by the auth flows) ──────────────────────────── */

// Wrap a given CDK + keypair under a fresh password-KEK and a fresh recovery key.
async function wrapIdentity(
  cdk: CryptoKey, keyPair: CryptoKeyPair, password: string,
): Promise<{ blobs: IdentityBlobs; recoveryKey: string }> {
  const kdfSalt = genSalt();
  const kek = await deriveKEK(password, kdfSalt);

  const recoveryKey = generateRecoveryKey();
  const recoverySalt = genSalt();
  const rkek = await deriveKEK(normalizeRecovery(recoveryKey), recoverySalt);

  const blobs: IdentityBlobs = {
    kdfSalt,
    wrappedCDK: await wrapKey(cdk, kek, "raw"),
    publicKey: await exportPublicKey(keyPair.publicKey),
    wrappedPrivateKey: await wrapKey(keyPair.privateKey, kek, "pkcs8"),
    recoverySalt,
    recoveryWrappedCDK: await wrapKey(cdk, rkek, "raw"),
    recoveryWrappedPrivateKey: await wrapKey(keyPair.privateKey, rkek, "pkcs8"),
  };
  setSession(cdk, keyPair.privateKey, kek);
  return { blobs, recoveryKey };
}

/** Brand-new couple creator: mint a CDK + keypair + recovery key. */
export async function createIdentity(password: string): Promise<{ blobs: IdentityBlobs; recoveryKey: string }> {
  return wrapIdentity(await randomCDK(), await genKeyPair(), password);
}

/** Creator wraps the in-session CDK under the invite code so the partner can
 *  obtain it on join. Returns blobs to store on the couple. */
export async function wrapCDKForInvite(inviteCode: string): Promise<{ inviteSalt: string; inviteWrappedCDK: WrappedBlob }> {
  if (!_cdk) throw new Error("No data key in session");
  const inviteSalt = genSalt();
  const ikek = await deriveKEK(normalizeInvite(inviteCode), inviteSalt);
  return { inviteSalt, inviteWrappedCDK: await wrapKey(_cdk, ikek, "raw") };
}

/** Joining partner: recover the CDK from the invite blob, then mint their own
 *  password-KEK, keypair and recovery key around it. */
export async function joinIdentity(
  password: string, inviteCode: string, inviteSalt: string, inviteWrappedCDK: WrappedBlob,
): Promise<{ blobs: IdentityBlobs; recoveryKey: string }> {
  const ikek = await deriveKEK(normalizeInvite(inviteCode), inviteSalt);
  const cdk = await unwrapCDK(inviteWrappedCDK, ikek);
  return wrapIdentity(cdk, await genKeyPair(), password);
}

/** Normal login: derive the KEK and unlock the CDK + private key into memory. */
export async function loadIdentity(
  password: string,
  blobs: { kdfSalt: string; wrappedCDK: WrappedBlob; wrappedPrivateKey: WrappedBlob },
): Promise<void> {
  const kek = await deriveKEK(password, blobs.kdfSalt);
  const privateKey = await unwrapPrivateKey(blobs.wrappedPrivateKey, kek);
  const cdk = await unwrapCDK(blobs.wrappedCDK, kek);
  setSession(cdk, privateKey, kek);
}

/** After a password reset, unlock using the saved recovery key. */
export async function unlockWithRecovery(
  recoveryKey: string,
  blobs: { recoverySalt: string; recoveryWrappedCDK: WrappedBlob; recoveryWrappedPrivateKey: WrappedBlob },
): Promise<void> {
  const rkek = await deriveKEK(normalizeRecovery(recoveryKey), blobs.recoverySalt);
  const privateKey = await unwrapPrivateKey(blobs.recoveryWrappedPrivateKey, rkek);
  const cdk = await unwrapCDK(blobs.recoveryWrappedCDK, rkek);
  setSession(cdk, privateKey, null);
}

/** Re-wrap the in-session CDK + private key under a new password + fresh
 *  recovery key (after recovery or re-grant). Public key is unchanged. */
export async function rewrapForPassword(newPassword: string): Promise<{ blobs: RewrapBlobs; recoveryKey: string }> {
  if (!_cdk || !_privateKey) throw new Error("No keys in session to re-wrap");
  const kdfSalt = genSalt();
  const kek = await deriveKEK(newPassword, kdfSalt);
  const recoveryKey = generateRecoveryKey();
  const recoverySalt = genSalt();
  const rkek = await deriveKEK(normalizeRecovery(recoveryKey), recoverySalt);

  const blobs: RewrapBlobs = {
    kdfSalt,
    wrappedCDK: await wrapKey(_cdk, kek, "raw"),
    wrappedPrivateKey: await wrapKey(_privateKey, kek, "pkcs8"),
    recoverySalt,
    recoveryWrappedCDK: await wrapKey(_cdk, rkek, "raw"),
    recoveryWrappedPrivateKey: await wrapKey(_privateKey, rkek, "pkcs8"),
  };
  _kek = kek;
  void persistSession();
  return { blobs, recoveryKey };
}

/* ── partner re-grant (lost password AND recovery key) ────────────────────── */

/** Reset user with no recovery key: mint a fresh keypair under the new
 *  password. Server should clear the stale wrappedCDK/recovery blobs and set a
 *  pending-regrant flag. The partner then delivers the CDK to `publicKey`. */
export async function startRegrant(newPassword: string): Promise<{ kdfSalt: string; publicKey: string; wrappedPrivateKey: WrappedBlob }> {
  const keyPair = await genKeyPair();
  const kdfSalt = genSalt();
  const kek = await deriveKEK(newPassword, kdfSalt);
  const wrappedPrivateKey = await wrapKey(keyPair.privateKey, kek, "pkcs8");
  setSession(null, keyPair.privateKey, kek);
  return { kdfSalt, publicKey: await exportPublicKey(keyPair.publicKey), wrappedPrivateKey };
}

/** Partner side: encrypt the in-session CDK to the reset user's public key. */
export async function grantToPartner(partnerPublicKeySpki: string): Promise<string> {
  if (!_cdk) throw new Error("No data key in session to grant");
  const pub = await importPublicKey(partnerPublicKeySpki);
  const cdkRaw = await sub().exportKey("raw", _cdk);
  const ct = await sub().encrypt({ name: "RSA-OAEP" }, pub, cdkRaw as ArrayBuffer);
  return bytesToB64(new Uint8Array(ct));
}

/** Reset user logging in while a re-grant is pending: they have no wrappedCDK
 *  yet, so unlock only the private key (under the new password) into session.
 *  Then `completeRegrant` can run once the partner's blob is available. */
export async function loadPrivateKeyForRegrant(
  password: string,
  blobs: { kdfSalt: string; wrappedPrivateKey: WrappedBlob },
): Promise<void> {
  const kek = await deriveKEK(password, blobs.kdfSalt);
  const privateKey = await unwrapPrivateKey(blobs.wrappedPrivateKey, kek);
  setSession(null, privateKey, kek);
}

/** Reset user: decrypt the partner's re-grant blob with the in-session private
 *  key to recover the CDK, wrap it under the current password-KEK, and mint a
 *  fresh recovery key. The password/kdfSalt are unchanged (set in startRegrant),
 *  so only these blobs need re-uploading. */
export async function completeRegrant(
  regrantBlob: string,
): Promise<{ blobs: Omit<RewrapBlobs, "kdfSalt" | "wrappedPrivateKey">; recoveryKey: string }> {
  if (!_privateKey || !_kek) throw new Error("Private key + KEK required to complete re-grant");
  const cdkRaw = await sub().decrypt({ name: "RSA-OAEP" }, _privateKey, ab(b64ToBytes(regrantBlob)));
  _cdk = await sub().importKey("raw", cdkRaw, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);

  const recoveryKey = generateRecoveryKey();
  const recoverySalt = genSalt();
  const rkek = await deriveKEK(normalizeRecovery(recoveryKey), recoverySalt);

  void persistSession();
  return {
    blobs: {
      wrappedCDK: await wrapKey(_cdk, _kek, "raw"),
      recoverySalt,
      recoveryWrappedCDK: await wrapKey(_cdk, rkek, "raw"),
      recoveryWrappedPrivateKey: await wrapKey(_privateKey, rkek, "pkcs8"),
    },
    recoveryKey,
  };
}

/* ── content encryption (the everyday API for stores/components) ───────────── */

/** True if a string is one of our content envelopes. */
export function isEnvelope(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(ENVELOPE_PREFIX);
}

async function encryptWith(cdk: CryptoKey, plaintext: string): Promise<string> {
  const iv = randomBytes(IV_BYTES);
  const ct = await sub().encrypt({ name: "AES-GCM", iv: ab(iv) }, cdk, ab(enc.encode(plaintext)));
  return ENVELOPE_PREFIX + bytesToB64(iv) + ":" + bytesToB64(new Uint8Array(ct));
}

async function decryptWith(cdk: CryptoKey, envelope: string): Promise<string> {
  const parts = envelope.split(":"); // ["enc","1",iv,ct]
  const iv = b64ToBytes(parts[2]);
  const ct = b64ToBytes(parts[3]);
  const pt = await sub().decrypt({ name: "AES-GCM", iv: ab(iv) }, cdk, ab(ct));
  return dec.decode(pt);
}

/**
 * Encrypt a user-text field before sending to the server. Empty values and
 * already-encrypted values pass through unchanged. If keys aren't loaded yet
 * (rare — only before first key setup), it passes the value through rather than
 * breaking a save; once keys exist, all writes are encrypted.
 */
export async function encryptField(value: string | null | undefined): Promise<string | null | undefined> {
  if (value == null || value === "" || isEnvelope(value)) return value;
  await hydrateSession();
  if (!_cdk) return value;
  return encryptWith(_cdk, value);
}

/**
 * Decrypt a field coming back from the server. Legacy plaintext (anything not in
 * our envelope shape) passes through unchanged so pre-migration data still
 * renders. If decryption fails, returns the raw value rather than throwing.
 */
export async function decryptField(value: string | null | undefined): Promise<string | null | undefined> {
  if (!isEnvelope(value)) return value;
  await hydrateSession();
  if (!_cdk) return value;
  try { return await decryptWith(_cdk, value); } catch { return value; }
}
