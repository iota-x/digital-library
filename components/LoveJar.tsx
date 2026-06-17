"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserData } from "@/lib/userStore";
import { LoveJarStore, type LoveNote } from "@/lib/resourceStores";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";
import { buzz, heartBump } from "@/lib/haptics";
import EmptyState from "@/components/EmptyState";

/**
 * "Reasons I love you" jar. Each partner drops in little notes; tapping the
 * jar draws one at random — a tiny, repeatable hit of affection. Notes sync
 * via the shared resource store (SSE-invalidated), so a reason your partner
 * adds shows up on your next draw.
 */
export default function LoveJar() {
  const user = useUserData();
  const { data: notes } = LoveJarStore.useResource();
  const [drawn, setDrawn] = useState<LoveNote | null>(null);
  const [shaking, setShaking] = useState(false);
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [manage, setManage] = useState(false);

  if (!user) return null;

  const draw = () => {
    if (notes.length === 0 || shaking) return;
    setShaking(true);
    buzz("double");
    // Pick a random note, preferring one different from the last draw.
    const pool = notes.length > 1 && drawn ? notes.filter((n) => n._id !== drawn._id) : notes;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setTimeout(() => {
      setDrawn(pick);
      setShaking(false);
      heartBump();
    }, 650);
  };

  const add = async () => {
    const clean = text.trim();
    if (!clean || saving) return;
    setSaving(true);
    try {
      const r = await fetch("/api/lovejar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
      });
      if (r.ok) {
        const note = (await r.json()) as LoveNote;
        if (note?._id) LoveJarStore.addItem(note);
        LoveJarStore.refresh();
        setText("");
        setComposing(false);
        buzz("double");
      }
    } catch {}
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    LoveJarStore.removeWhere((n) => n._id === id);
    if (drawn?._id === id) setDrawn(null);
    try {
      await fetch("/api/lovejar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: id }),
      });
    } catch {}
    LoveJarStore.refresh();
  };

  return (
    <section id="love-jar" style={{
      width: "100%", padding: "clamp(3rem,7vh,5rem) clamp(1rem,4vw,2rem)",
      display: "flex", justifyContent: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 560, textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginBottom: "0.7rem" }}>
          <div style={{ width: 45, height: 1, background: "linear-gradient(90deg,transparent,rgba(var(--pink-rgb),.4))" }} />
          <span style={{ fontSize: "1.4rem" }}>🫙</span>
          <div style={{ width: 45, height: 1, background: "linear-gradient(90deg,rgba(var(--pink-rgb),.4),transparent)" }} />
        </div>
        <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400,
          fontSize: "clamp(1.8rem,5vw,2.6rem)", color: "var(--pink-deep)", margin: "0 0 0.3rem" }}>
          reasons I love you
        </h2>
        <p style={{ fontFamily: SCRIPT, fontSize: "clamp(1rem,2.5vw,1.2rem)", color: "var(--muted)", margin: "0 0 1.6rem" }}>
          drop a reason in · draw one whenever you need it 💗
        </p>

        {notes.length === 0 ? (
          <EmptyState emoji="🫙" title="the jar's empty" hint="add the first reason you love them — they'll find it later" size="inline" />
        ) : (
          <>
            {/* The jar */}
            <motion.button
              onClick={draw}
              animate={shaking ? { rotate: [0, -9, 9, -7, 7, -4, 4, 0], y: [0, -4, 0, -3, 0] } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.6 }}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
              aria-label="draw a reason from the jar"
              style={{
                fontSize: "clamp(3.5rem,14vw,5.5rem)", lineHeight: 1,
                background: "none", border: "none", cursor: notes.length ? "pointer" : "default",
                filter: "drop-shadow(0 8px 22px rgba(var(--pink-deep-rgb),.28))",
                marginBottom: "0.5rem",
              }}
            >
              🫙
            </motion.button>
            <p style={{ fontFamily: SANS, fontSize: "0.74rem", color: "var(--muted)", letterSpacing: "0.12em",
              textTransform: "uppercase", margin: "0 0 1.3rem" }}>
              {notes.length} reason{notes.length !== 1 ? "s" : ""} inside · tap to draw
            </p>

            {/* Drawn note */}
            <AnimatePresence mode="wait">
              {drawn && !shaking && (
                <motion.div key={drawn._id}
                  initial={{ opacity: 0, y: 18, rotate: -2, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 240, damping: 20 }}
                  style={{
                    background: "var(--cream)",
                    border: "1.5px solid rgba(var(--pink-rgb), .4)",
                    borderRadius: 20, padding: "1.4rem 1.5rem", marginBottom: "1.4rem",
                    boxShadow: "0 12px 36px rgba(var(--pink-deep-rgb), .14)",
                  }}>
                  <p style={{ fontFamily: SCRIPT, fontSize: "1.4rem", color: "var(--text)", margin: "0 0 0.6rem", lineHeight: 1.45 }}>
                    “{drawn.text}”
                  </p>
                  <p style={{ fontFamily: SANS, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: "var(--pink-deep)", margin: 0 }}>
                    — {drawn.from}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Composer */}
        <AnimatePresence mode="wait">
          {composing ? (
            <motion.div key="composer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: "grid", gap: "0.6rem", maxWidth: 440, margin: "0 auto" }}>
              <textarea
                value={text} onChange={(e) => setText(e.target.value)} autoFocus rows={2}
                placeholder="a reason you love them…"
                style={{
                  width: "100%", boxSizing: "border-box", resize: "vertical",
                  fontFamily: SANS, fontSize: "0.92rem", color: "var(--text)", lineHeight: 1.5,
                  background: "rgba(var(--pink-rgb), .08)", border: "1px solid rgba(var(--pink-rgb), .3)",
                  borderRadius: 12, padding: "0.7rem 0.9rem", outline: "none",
                }}
              />
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                <button onClick={() => { setComposing(false); setText(""); }}
                  style={{ ...BTN, background: "rgba(var(--pink-deep-rgb), .08)", color: "var(--pink-deep)" }}>
                  cancel
                </button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={add} disabled={saving || !text.trim()}
                  style={{ ...BTN, background: "linear-gradient(135deg, var(--pink), var(--pink-deep))",
                    color: "#fff", opacity: saving || !text.trim() ? 0.55 : 1 }}>
                  {saving ? "saving…" : "add to jar 💗"}
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.button key="add-cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => setComposing(true)}
              style={{ ...BTN, background: "rgba(var(--pink-rgb), .14)", color: "var(--pink-deep)",
                border: "1px solid rgba(var(--pink-rgb), .35)" }}>
              ＋ add a reason
            </motion.button>
          )}
        </AnimatePresence>

        {/* Manage / remove */}
        {notes.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <button onClick={() => setManage((m) => !m)}
              style={{ fontFamily: SANS, fontSize: "0.72rem", color: "rgba(var(--pink-deep-rgb), .55)",
                background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
              {manage ? "done" : "manage the jar"}
            </button>
            <AnimatePresence>
              {manage && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden", display: "grid", gap: "0.4rem", marginTop: "0.7rem", textAlign: "left" }}>
                  {notes.map((n) => (
                    <div key={n._id} style={{
                      display: "flex", alignItems: "center", gap: "0.6rem",
                      background: "rgba(var(--pink-rgb), .06)", border: "1px solid rgba(var(--pink-rgb), .18)",
                      borderRadius: 10, padding: "0.5rem 0.7rem",
                    }}>
                      <span style={{ flex: 1, fontFamily: SANS, fontSize: "0.82rem", color: "var(--text)" }}>
                        {n.text} <span style={{ color: "var(--muted)", fontSize: "0.72rem" }}>· {n.from}</span>
                      </span>
                      <button onClick={() => remove(n._id)} aria-label="remove reason"
                        style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer",
                          color: "rgba(var(--pink-deep-rgb), .4)", fontSize: "0.9rem" }}>✕</button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}

const BTN: React.CSSProperties = {
  fontFamily: SANS, fontSize: "0.82rem", fontWeight: 700,
  border: "none", borderRadius: 50, padding: "0.6rem 1.4rem", cursor: "pointer",
};
