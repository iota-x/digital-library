"use client";
import { useEffect, useState } from "react";
import { useUserData, displayName } from "@/lib/userStore";
import { useToast } from "@/components/Toaster";
import { buzz } from "@/lib/haptics";
import { SANS, SERIF } from "@/lib/typography";

/**
 * The partner-activation surface — the single most important conversion point in
 * a two-person app. Bundles three things the inviter needs in one place:
 *   1. a personal NOTE the joining partner sees on the invite landing (#1)
 *   2. one-tap SHARE to the channels couples actually use — native share sheet,
 *      WhatsApp, SMS — with a pre-written sweet message (#2)
 *   3. the raw code, for the "type it in" path.
 * Reused on the home solo card, the post-signup screen, and Settings.
 */
export default function InvitePartner({ compact = false }: { compact?: boolean }) {
  const user = useUserData();
  const toaster = useToast();
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [saving, setSaving] = useState(false);

  const code = user?.inviteCode ?? "";
  const inviterName = displayName(user);

  // Prefill any note already set (so editing shows the current value).
  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    fetch(`/api/couples/invite-info?code=${encodeURIComponent(code)}`)
      .then(r => r.json())
      .then(d => { if (!cancelled && typeof d?.note === "string") { setNote(d.note); setSavedNote(d.note); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [code]);

  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/?invite=${code}` : "";

  // The message every channel sends. Folds the personal note in when present so
  // the partner gets warmth, not just a link.
  const shareMessage = () => {
    const base = `join me on Us 💗 — our own private little world, just the two of us`;
    const withNote = note.trim() ? `${base}\n\n"${note.trim()}" — ${inviterName}` : `${base} 🌷`;
    return `${withNote}\n\ntap to come in 👉 ${inviteUrl}`;
  };

  const saveNote = async () => {
    if (saving || note.trim() === savedNote.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/couples/invite-note", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const d = await res.json();
      if (res.ok && d.ok) {
        setSavedNote(d.note ?? "");
        setNote(d.note ?? "");
        toaster.toast({ variant: "success", message: "saved — they'll see this when they join 💌", durationMs: 3000 });
      } else {
        toaster.toast({ variant: "error", message: d.error || "couldn't save note", durationMs: 3500 });
      }
    } catch {
      toaster.toast({ variant: "error", message: "couldn't save note", durationMs: 3500 });
    } finally { setSaving(false); }
  };

  const nativeShare = async () => {
    buzz("tap");
    const text = shareMessage();
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Us 💗", text });
        return;
      }
    } catch { return; /* user dismissed */ }
    navigator.clipboard?.writeText(text).catch(() => {});
    toaster.toast({ variant: "success", message: "invite copied — paste it to your person 💗", durationMs: 3000 });
  };

  const openWhatsApp = () => { buzz("tap"); window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage())}`, "_blank", "noopener"); };
  const openSMS = () => { buzz("tap"); window.location.href = `sms:?&body=${encodeURIComponent(shareMessage())}`; };
  const copyCode = () => { navigator.clipboard?.writeText(code).catch(() => {}); toaster.toast({ variant: "success", message: `code ${code} copied`, durationMs: 2500 }); };

  if (!code) return null;

  const btn: React.CSSProperties = {
    flex: 1, minWidth: 0, padding: "0.7rem 0.6rem", borderRadius: 14, border: "none",
    fontFamily: SANS, fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      {!compact && (
        <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <span style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", fontWeight: 600 }}>
            add a little note — they&apos;ll see it the moment they open your invite
          </span>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value.slice(0, 240))}
            onBlur={saveNote}
            rows={2}
            placeholder="hurry up and join, i miss you already 🥺"
            style={{
              fontFamily: SERIF, fontStyle: "italic", fontSize: "0.95rem", resize: "none",
              padding: "0.7rem 0.8rem", borderRadius: 14, lineHeight: 1.4,
              border: "1px solid rgba(var(--pink-mid-rgb,249,168,212),0.5)",
              background: "var(--card-bg, rgba(255,255,255,0.6))", color: "var(--text)",
            }}
          />
          <button onClick={saveNote} disabled={saving || note.trim() === savedNote.trim()} style={{
            alignSelf: "flex-start", fontFamily: SANS, fontSize: "0.72rem", fontWeight: 700,
            color: note.trim() === savedNote.trim() ? "var(--muted)" : "var(--pink-deep)",
            background: "none", border: "none", cursor: note.trim() === savedNote.trim() ? "default" : "pointer",
            textDecoration: note.trim() === savedNote.trim() ? "none" : "underline", padding: 0,
          }}>
            {saving ? "saving…" : note.trim() === savedNote.trim() ? (savedNote ? "note saved ✓" : "") : "save note"}
          </button>
        </label>
      )}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button onClick={nativeShare} style={{ ...btn, background: "linear-gradient(135deg,var(--pink),var(--pink-deep))", color: "#fff", flexBasis: "100%" }}>
          💌 send to my partner
        </button>
        <button onClick={openWhatsApp} style={{ ...btn, background: "rgba(37,211,102,0.14)", color: "#128C4B" }}>WhatsApp</button>
        <button onClick={openSMS} style={{ ...btn, background: "rgba(var(--pink-rgb),0.12)", color: "var(--pink-deep)" }}>iMessage / SMS</button>
        <button onClick={copyCode} style={{ ...btn, background: "rgba(var(--pink-rgb),0.12)", color: "var(--pink-deep)" }}>
          copy code · <span style={{ letterSpacing: "0.12em", fontWeight: 800 }}>{code}</span>
        </button>
      </div>
    </div>
  );
}
