"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";
import { unlockKeys, type ServerKeys } from "@/lib/e2ee";
import { getHasRegrantBlob, clearUserData } from "@/lib/userStore";

/**
 * Shown when the session is valid but the encryption keys aren't loaded — e.g.
 * after reopening the browser (the in-memory/session keys are gone). The user
 * re-enters their password to unlock their content; the password never leaves
 * the device. Also drives the two recovery end-states (re-grant completed /
 * still waiting on the partner).
 */
export default function UnlockModal({ serverKeys, onUnlocked }: { serverKeys: ServerKeys; onUnlocked: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);

  const submit = async () => {
    setError("");
    if (!password) { setError("Enter your password"); return; }
    setLoading(true);
    try {
      const r = await unlockKeys(password, { keys: serverKeys, hasRegrantBlob: getHasRegrantBlob() });
      if (r.status === "ok") { onUnlocked(); return; }
      if (r.status === "regranted") { setRecoveryKey(r.recoveryKey); return; }
      if (r.status === "locked-waiting") { setWaiting(true); return; }
      // "none" — nothing to unlock; just let them in.
      onUnlocked();
    } catch {
      setError("That password didn't unlock your data. Try again.");
    } finally { setLoading(false); }
  };

  const signOut = async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    clearUserData();
    if (typeof window !== "undefined") window.location.reload();
  };

  const card: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center",
    padding: "1.5rem", background: "linear-gradient(135deg,#fff1f2 0%,#fce7f3 50%,#fdf2f8 100%)",
  };
  const btn: React.CSSProperties = {
    width: "100%", padding: "0.9rem", borderRadius: 50, border: "none",
    background: "linear-gradient(135deg,#f9a8d4,#ec4899)", color: "#fff",
    fontFamily: SCRIPT, fontSize: "1.15rem", cursor: loading ? "wait" : "pointer",
    boxShadow: "0 4px 20px rgba(236,72,153,0.35)", opacity: loading ? 0.7 : 1,
  };

  return (
    <div style={card}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: "rgba(255,255,255,0.8)", WebkitBackdropFilter: "blur(20px)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(249,168,212,0.4)", borderRadius: 24, padding: "2rem 1.6rem",
          width: "100%", maxWidth: 400, textAlign: "center", boxShadow: "0 20px 60px rgba(244,114,182,0.18)",
        }}
      >
        <div style={{ fontSize: "2.4rem", marginBottom: "0.4rem" }} aria-hidden>🔒</div>

        {recoveryKey ? (
          <>
            <h2 style={{ fontFamily: SERIF, fontStyle: "italic", color: "#be185d", fontSize: "1.3rem", margin: "0 0 0.5rem" }}>
              Access restored 💗
            </h2>
            <p style={{ fontFamily: SANS, fontSize: "0.82rem", color: "rgba(190,24,93,0.65)", margin: "0 0 1rem", lineHeight: 1.5 }}>
              Your partner restored your access. Here&apos;s a <strong>new recovery key</strong> — save it somewhere safe.
            </p>
            <p style={{ fontFamily: SERIF, fontWeight: 700, color: "#be185d", letterSpacing: "0.1em", wordBreak: "break-all", margin: "0 0 1.2rem" }}>
              {recoveryKey}
            </p>
            <button onClick={onUnlocked} style={btn}>continue 🌸</button>
          </>
        ) : waiting ? (
          <>
            <h2 style={{ fontFamily: SERIF, fontStyle: "italic", color: "#be185d", fontSize: "1.3rem", margin: "0 0 0.5rem" }}>
              Waiting on your partner
            </h2>
            <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: "rgba(190,24,93,0.65)", margin: "0 0 1.2rem", lineHeight: 1.55 }}>
              Ask your partner to open the app — it&apos;ll restore your access to your encrypted
              memories automatically. Then come back and unlock.
            </p>
            <button onClick={() => { setWaiting(false); setPassword(""); }} style={btn}>try again</button>
            <button onClick={signOut} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: SANS, fontSize: "0.8rem", color: "rgba(190,24,93,0.6)", marginTop: "0.9rem", textDecoration: "underline" }}>
              sign out
            </button>
          </>
        ) : (
          <>
            <h2 style={{ fontFamily: SERIF, fontStyle: "italic", color: "#be185d", fontSize: "1.3rem", margin: "0 0 0.4rem" }}>
              Unlock your space
            </h2>
            <p style={{ fontFamily: SCRIPT, fontSize: "0.95rem", color: "rgba(190,24,93,0.6)", margin: "0 0 1.2rem" }}>
              enter your password to open your private world
            </p>
            <input
              type="password" value={password} autoFocus autoComplete="current-password"
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submit(); }}
              placeholder="your password"
              style={{
                width: "100%", padding: "0.75rem 1rem", borderRadius: 10, border: "1.5px solid rgba(249,168,212,0.6)",
                outline: "none", background: "rgba(255,255,255,0.8)", fontFamily: SANS, fontSize: "0.92rem",
                color: "#4a1628", boxSizing: "border-box", marginBottom: "0.9rem",
              }}
            />
            {error && <p style={{ fontFamily: SANS, color: "#f43f5e", fontSize: "0.85rem", margin: "-0.3rem 0 0.8rem" }}>{error}</p>}
            <button onClick={submit} disabled={loading} style={btn}>{loading ? "unlocking…" : "unlock 🔑"}</button>
            <button onClick={signOut} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: SANS, fontSize: "0.8rem", color: "rgba(190,24,93,0.6)", marginTop: "0.9rem", textDecoration: "underline" }}>
              sign out instead
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
