"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserData } from "@/lib/userStore";
import { onSSE } from "@/lib/sseClient";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";
import { heartBump, buzz } from "@/lib/haptics";

interface DailyView {
  date: string;
  question: string;
  questionId: number;
  mine: string | null;
  answeredAt: string | null;
  partnerAnswered: boolean;
  revealed: boolean;
  partner: { name: string; text: string } | null;
  streak: number;
}

const CARD: React.CSSProperties = {
  background: "var(--cream)",
  border: "1.5px solid rgba(var(--pink-rgb), .35)",
  borderRadius: 22,
  padding: "clamp(1.3rem, 4vw, 2rem)",
  boxShadow: "0 12px 40px rgba(var(--pink-deep-rgb), .1)",
};

export default function DailyQuestion() {
  const user = useUserData();
  const [view, setView] = useState<DailyView | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const wasRevealed = useRef(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/daily", { cache: "no-store" });
      const d = (await r.json()) as DailyView;
      if (d && typeof d.question === "string") {
        setView(d);
        if (d.revealed && !wasRevealed.current) { wasRevealed.current = true; heartBump(); }
        if (!d.revealed) wasRevealed.current = false;
      }
    } catch {}
    finally { setLoaded(true); }
  }, []);

  useEffect(() => { if (user?.partnerName) load(); }, [user?.partnerName, load]);

  // Honor a #daily hash (the top "today's question" nudge scrolls here). Fires
  // once on load if landing on /#daily, and again on later hash changes.
  const scrolledTo = useRef(false);
  useEffect(() => {
    if (!loaded || !view) return;
    const scroll = () => {
      if (window.location.hash !== "#daily") return;
      document.getElementById("daily")?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    if (!scrolledTo.current) { scrolledTo.current = true; scroll(); }
    window.addEventListener("hashchange", scroll);
    return () => window.removeEventListener("hashchange", scroll);
  }, [loaded, view]);

  // Refresh on any daily event (partner answered / both revealed).
  useEffect(() => {
    if (!user?.partnerName) return;
    return onSSE((d) => { if (d.type.startsWith("daily:")) load(); });
  }, [user?.partnerName, load]);

  const submit = async () => {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      const r = await fetch("/api/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: text }),
      });
      const d = (await r.json()) as DailyView;
      if (r.ok && d?.question) {
        setView(d);
        setEditing(false);
        buzz("double");
        if (d.revealed) heartBump();
      }
    } catch {}
    finally { setSaving(false); }
  };

  // Solo couple (no partner joined yet) — nothing to reveal against.
  if (!user?.partnerName) return null;
  if (!loaded || !view) return null;

  const partnerName = user.partnerName;
  const showEditor = !view.mine || editing;

  return (
    <section id="daily" style={{
      width: "100%", minHeight: "100dvh",
      padding: "clamp(2.5rem, 6vh, 4rem) clamp(1rem, 4vw, 2rem)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 640 }}>
        {/* Heading */}
        <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
          <p style={{ fontFamily: SANS, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.18em",
            textTransform: "uppercase", color: "rgba(var(--pink-deep-rgb), .5)", margin: "0 0 0.3rem" }}>
            question of the day
          </p>
          <p style={{ fontFamily: SCRIPT, fontSize: "0.95rem", color: "var(--muted)", margin: 0 }}>
            {view.revealed ? "you both answered 💞" : "answer privately — it unlocks when you both do"}
          </p>
          {view.streak > 0 && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "0.35rem", marginTop: "0.55rem",
              background: "rgba(var(--pink-rgb), .14)", border: "1px solid rgba(var(--pink-rgb), .4)",
              borderRadius: 50, padding: "0.28rem 0.8rem",
            }}>
              <span aria-hidden style={{ fontSize: "0.95rem" }}>🔥</span>
              <span style={{ fontFamily: SANS, fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.02em",
                color: "var(--pink-deep)" }}>
                {view.streak}-day answer streak
              </span>
            </div>
          )}
        </div>

        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5 }} style={CARD}>
          <h3 style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400,
            fontSize: "clamp(1.3rem, 3.6vw, 1.8rem)", color: "var(--pink-deep)",
            margin: "0 0 1.1rem", lineHeight: 1.35 }}>
            {view.question}
          </h3>

          <AnimatePresence mode="wait">
            {view.revealed ? (
              /* ── Both answered → reveal ── */
              <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: "grid", gap: "0.8rem" }}>
                <AnswerBubble who={`${user.name || "you"}`} text={view.mine || ""} mine />
                <AnswerBubble who={view.partner?.name || partnerName} text={view.partner?.text || ""} />
                <button onClick={() => { setDraft(view.mine || ""); setEditing(true); }}
                  style={{ ...LINK_BTN, justifySelf: "start" }}>
                  edit my answer
                </button>
              </motion.div>
            ) : showEditor ? (
              /* ── Editor (not yet answered, or editing) ── */
              <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {view.partnerAnswered && (
                  <p style={{ fontFamily: SCRIPT, fontSize: "1rem", color: "var(--pink-deep)", margin: "0 0 0.7rem" }}>
                    {partnerName} already answered — add yours to reveal both 💌
                  </p>
                )}
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="write it just for them…"
                  rows={3}
                  autoFocus={editing}
                  style={{
                    width: "100%", boxSizing: "border-box", resize: "vertical",
                    fontFamily: SANS, fontSize: "0.92rem", color: "var(--text)", lineHeight: 1.5,
                    background: "rgba(var(--pink-rgb), .08)",
                    border: "1px solid rgba(var(--pink-rgb), .3)", borderRadius: 12,
                    padding: "0.75rem 0.9rem", outline: "none",
                  }}
                />
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.8rem" }}>
                  {editing && (
                    <button onClick={() => { setEditing(false); setDraft(""); }}
                      style={{ ...BTN, background: "rgba(var(--pink-deep-rgb), .08)", color: "var(--pink-deep)" }}>
                      cancel
                    </button>
                  )}
                  <motion.button whileTap={{ scale: 0.96 }} onClick={submit} disabled={saving || !draft.trim()}
                    style={{ ...BTN, background: "linear-gradient(135deg, var(--pink), var(--pink-deep))",
                      color: "#fff", opacity: saving || !draft.trim() ? 0.55 : 1 }}>
                    {saving ? "saving…" : "save my answer"}
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              /* ── Answered, waiting for partner ── */
              <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AnswerBubble who={user.name || "you"} text={view.mine || ""} mine />
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.9rem" }}>
                  <span aria-hidden style={{ fontSize: "1.1rem" }}>⏳</span>
                  <p style={{ fontFamily: SCRIPT, fontSize: "1.05rem", color: "var(--muted)", margin: 0 }}>
                    saved — waiting for {partnerName} to answer, then it reveals 💞
                  </p>
                </div>
                <button onClick={() => { setDraft(view.mine || ""); setEditing(true); }}
                  style={{ ...LINK_BTN, marginTop: "0.6rem" }}>
                  edit my answer
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

function AnswerBubble({ who, text, mine }: { who: string; text: string; mine?: boolean }) {
  return (
    <div style={{
      background: mine ? "rgba(var(--pink-rgb), .12)" : "rgba(var(--pink-deep-rgb), .1)",
      border: `1px solid rgba(var(--pink-${mine ? "" : "deep-"}rgb), .28)`,
      borderRadius: 14, padding: "0.7rem 0.9rem",
    }}>
      <p style={{ fontFamily: SANS, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "var(--pink-deep)", margin: "0 0 0.3rem" }}>
        {who}
      </p>
      <p style={{ fontFamily: SCRIPT, fontSize: "1.1rem", color: "var(--text)", margin: 0, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
        {text}
      </p>
    </div>
  );
}

const BTN: React.CSSProperties = {
  fontFamily: SANS, fontSize: "0.82rem", fontWeight: 700,
  border: "none", borderRadius: 50, padding: "0.55rem 1.3rem", cursor: "pointer",
};
const LINK_BTN: React.CSSProperties = {
  fontFamily: SANS, fontSize: "0.74rem", fontWeight: 600, color: "rgba(var(--pink-deep-rgb), .6)",
  background: "none", border: "none", cursor: "pointer", padding: "0.2rem 0", textDecoration: "underline",
};
