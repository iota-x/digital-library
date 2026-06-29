import { describe, it, expect, beforeEach } from "vitest";
import {
  createIdentity, joinIdentity, wrapCDKForInvite, loadIdentity,
  unlockWithRecovery, rewrapForPassword,
  startRegrant, grantToPartner, loadPrivateKeyForRegrant, completeRegrant,
  encryptField, decryptField, isEnvelope, generateRecoveryKey, clearKeys,
} from "@/lib/crypto";

const PW = "correct horse battery staple";

beforeEach(() => clearKeys());

describe("content envelope", () => {
  it("encrypts then decrypts a round-trip", async () => {
    await createIdentity(PW);
    const ct = await encryptField("our first kiss 🌸");
    expect(isEnvelope(ct)).toBe(true);
    expect(ct).not.toContain("kiss");
    expect(await decryptField(ct)).toBe("our first kiss 🌸");
  });

  it("passes through empty + already-encrypted + legacy plaintext", async () => {
    await createIdentity(PW);
    expect(await encryptField("")).toBe("");
    expect(await encryptField(null)).toBe(null);
    const ct = await encryptField("x");
    expect(await encryptField(ct)).toBe(ct);          // not double-encrypted
    expect(await decryptField("legacy plaintext")).toBe("legacy plaintext");
  });
});

describe("login", () => {
  it("re-derives the key from password and decrypts old ciphertext", async () => {
    const { blobs } = await createIdentity(PW);
    const ct = await encryptField("secret note");
    clearKeys();
    await loadIdentity(PW, blobs);
    expect(await decryptField(ct)).toBe("secret note");
  });

  it("fails with the wrong password", async () => {
    const { blobs } = await createIdentity(PW);
    clearKeys();
    await expect(loadIdentity("wrong password", blobs)).rejects.toBeTruthy();
  });
});

describe("partner join via invite", () => {
  it("shares the same data key so the partner reads the creator's content", async () => {
    await createIdentity(PW);
    const ct = await encryptField("a memory we share");
    const { inviteSalt, inviteWrappedCDK } = await wrapCDKForInvite("ABC123");

    clearKeys();
    await joinIdentity("partner pw long enough", "ABC123", inviteSalt, inviteWrappedCDK);
    expect(await decryptField(ct)).toBe("a memory we share");
  });
});

describe("recovery key", () => {
  it("is human-shaped and unlocks after a password reset, then re-wraps", async () => {
    const rk = generateRecoveryKey();
    expect(rk).toMatch(/^[A-Z2-7]{4}(-[A-Z2-7]+)+$/);

    const { blobs, recoveryKey } = await createIdentity(PW);
    const ct = await encryptField("recover me");

    // Lost password — unlock with the recovery key, then set a new password.
    clearKeys();
    await unlockWithRecovery(recoveryKey, blobs);
    expect(await decryptField(ct)).toBe("recover me");

    const { blobs: fresh } = await rewrapForPassword("brand new password");
    clearKeys();
    await loadIdentity("brand new password", {
      kdfSalt: fresh.kdfSalt, wrappedCDK: fresh.wrappedCDK, wrappedPrivateKey: fresh.wrappedPrivateKey,
    });
    expect(await decryptField(ct)).toBe("recover me");
  });
});

describe("partner re-grant (lost password AND recovery key)", () => {
  it("the partner re-delivers the data key to the reset user", async () => {
    // Original account holds the couple data key.
    const { blobs: original } = await createIdentity(PW);
    const ct = await encryptField("our whole story");

    // Reset user starts over with a brand-new password + keypair.
    clearKeys();
    const regrant = await startRegrant("a totally new password");

    // Partner (still holding the data key) grants it to the reset user's pubkey.
    await loadIdentity(PW, original); // stand-in for the partner's live session
    const blob = await grantToPartner(regrant.publicKey);

    // Reset user logs in (private key only), completes the re-grant.
    clearKeys();
    await loadPrivateKeyForRegrant("a totally new password", {
      kdfSalt: regrant.kdfSalt, wrappedPrivateKey: regrant.wrappedPrivateKey,
    });
    const done = await completeRegrant(blob);

    // Next login uses the now-complete blobs and reads the original content.
    clearKeys();
    await loadIdentity("a totally new password", {
      kdfSalt: regrant.kdfSalt, wrappedCDK: done.blobs.wrappedCDK, wrappedPrivateKey: regrant.wrappedPrivateKey,
    });
    expect(await decryptField(ct)).toBe("our whole story");
  });
});
