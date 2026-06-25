"use client";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserData } from "@/lib/userStore";
import { onSSE } from "@/lib/sseClient";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";
import { heartBump, buzz } from "@/lib/haptics";

interface QuizQuestion { id: string; text: string; options: string[] }
interface CatalogItem { id: string; title: string; emoji: string; blurb: string; total: number; myComplete: boolean; partnerComplete: boolean; revealed: boolean; score: number | null; generated?: boolean }
interface QuizView {
  quizId: string; title: string; emoji: string; blurb: string;
  questions: QuizQuestion[];
  mine: Record<string, number>;
  myComplete: boolean; partnerComplete: boolean; revealed: boolean;
  partnerName: string | null;
  partnerPicks: Record<string, number> | null;
  matchPerQuestion: Record<string, boolean> | null;
  score: number | null; total: number;
}

const CARD: React.CSSProperties = {
  background: "var(--cream)",
  border: "1.5px solid rgba(var(--pink-rgb), .35)",
  borderRadius: 22,
  padding: "clamp(1.3rem, 4vw, 2rem)",
  boxShadow: "0 12px 40px rgba(var(--pink-deep-rgb), .1)",
};
const BTN: React.CSSProperties = {
  fontFamily: SANS, fontSize: "0.84rem", fontWeight: 700,
  border: "none", borderRadius: 50, padding: "0.6rem 1.4rem", cursor: "pointer",
};
const SKEL: React.CSSProperties = { background: "rgba(var(--pink-rgb), .16)", borderRadius: 8 };

/** Pulsing placeholder shown while the quiz catalog loads, so cards don't pop
 *  in abruptly. */
function QuizSkeleton() {
  return (
    <motion.div animate={{ opacity: [0.55, 1, 0.55] }} transition={{ repeat: Infinity, duration: 1.4 }}
      style={{ ...CARD, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ ...SKEL, width: 34, height: 34, borderRadius: 10 }} />
      <div style={{ ...SKEL, width: "70%", height: 16 }} />
      <div style={{ ...SKEL, width: "90%", height: 11 }} />
      <div style={{ ...SKEL, width: "45%", height: 20, borderRadius: 50, marginTop: "0.3rem" }} />
    </motion.div>
  );
}

function scoreLine(score: number, total: number): string {
  const pct = total ? score / total : 0;
  if (pct >= 0.85) return "practically one mind 💞";
  if (pct >= 0.6) return "seriously in sync ✨";
  if (pct >= 0.4) return "wonderfully your own people 🌷";
  return "opposites attract, clearly 😄";
}

export default function CoupleQuiz() {
  const user = useUserData();
  const [catalog, setCatalog] = useState<CatalogItem[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<QuizView | null>(null);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [redo, setRedo] = useState(false);
  const [generating, setGenerating] = useState(false);

  const loadCatalog = useCallback(async () => {
    try {
      const r = await fetch("/api/quiz", { cache: "no-store" });
      const d = await r.json();
      if (Array.isArray(d)) setCatalog(d);
    } catch {}
  }, []);

  const loadQuiz = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/quiz?quiz=${encodeURIComponent(id)}`, { cache: "no-store" });
      const d = (await r.json()) as QuizView;
      if (d && Array.isArray(d.questions)) {
        setView(d);
        setPicks(d.mine ?? {});
        if (d.revealed) heartBump();
      }
    } catch {}
  }, []);

  useEffect(() => { if (user?.partnerName) loadCatalog(); }, [user?.partnerName, loadCatalog]);

  // Live: refresh the open quiz + the catalog when either side plays.
  useEffect(() => {
    if (!user?.partnerName) return;
    return onSSE((d) => {
      if (!d.type.startsWith("quiz:")) return;
      loadCatalog();
      if (activeId && (d as { quizId?: string }).quizId === activeId) loadQuiz(activeId);
    });
  }, [user?.partnerName, activeId, loadCatalog, loadQuiz]);

  const open = (id: string) => { setActiveId(id); setRedo(false); setView(null); loadQuiz(id); };
  const back = () => { setActiveId(null); setView(null); setRedo(false); loadCatalog(); };

  const makeNew = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const r = await fetch("/api/quiz/generate", { method: "POST" });
      const d = await r.json();
      if (r.ok && d?.id) { buzz("double"); await loadCatalog(); open(d.id); }
    } catch {}
    finally { setGenerating(false); }
  };

  const submit = async () => {
    if (!view || saving) return;
    if (view.questions.some((q) => typeof picks[q.id] !== "number")) return;
    setSaving(true);
    try {
      const r = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: view.quizId, picks }),
      });
      const d = (await r.json()) as QuizView;
      if (r.ok && d?.questions) {
        setView(d); setRedo(false);
        buzz("double");
        if (d.revealed) heartBump();
        loadCatalog();
      }
    } catch {}
    finally { setSaving(false); }
  };

  const playAgain = async () => {
    if (!view) return;
    await fetch("/api/quiz", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId: view.quizId }),
    }).catch(() => {});
    setPicks({}); setRedo(true);
    loadQuiz(view.quizId); loadCatalog();
  };

  if (!user?.partnerName) {
    return (
      <div style={{ ...CARD, maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🧩</div>
        <p style={{ fontFamily: SCRIPT, fontSize: "1.15rem", color: "var(--pink-deep)", margin: 0 }}>
          quizzes unlock once your partner joins 💞
        </p>
      </div>
    );
  }

  // ── Pack picker ──
  if (!activeId) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.1rem" }}>
          <motion.button onClick={makeNew} disabled={generating} whileTap={{ scale: 0.96 }}
            style={{ ...BTN, background: "linear-gradient(135deg, var(--pink), var(--pink-deep))", color: "#fff", opacity: generating ? 0.6 : 1 }}>
            {generating ? "making your quiz…" : "✨ make us a new quiz"}
          </motion.button>
        </div>
        <div style={{ display: "grid", gap: "0.9rem", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
        {!catalog && [0, 1, 2].map((i) => <QuizSkeleton key={`s${i}`} />)}
        {(catalog ?? []).map((c) => (
          <motion.button key={c.id} onClick={() => open(c.id)}
            whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
            style={{ ...CARD, textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "1.6rem" }}>{c.emoji}</div>
              {c.generated && <span style={pill()}>✨ made for you</span>}
            </div>
            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1.15rem", color: "var(--pink-deep)", margin: 0 }}>
              {c.title}
            </p>
            <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: "var(--muted)", margin: 0, lineHeight: 1.4 }}>
              {c.blurb}
            </p>
            <div style={{ marginTop: "0.3rem" }}>
              {c.revealed && c.score != null ? (
                <span style={pill()}>💞 you matched {c.score}/{c.total}</span>
              ) : c.myComplete ? (
                <span style={pill()}>⏳ waiting for {user.partnerName}</span>
              ) : c.partnerComplete ? (
                <span style={pill()}>💌 {user.partnerName} played — your turn</span>
              ) : (
                <span style={pill()}>{c.total} questions · play together</span>
              )}
            </div>
          </motion.button>
        ))}
        {catalog && catalog.length === 0 && (
          <p style={{ fontFamily: SANS, color: "var(--muted)" }}>no quizzes yet — check back soon 🌸</p>
        )}
        </div>
      </div>
    );
  }

  // ── Single quiz ──
  if (!view) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <button onClick={back} style={{ ...linkBtn(), marginBottom: "0.8rem" }}>← all quizzes</button>
        <motion.div animate={{ opacity: [0.55, 1, 0.55] }} transition={{ repeat: Infinity, duration: 1.4 }} style={CARD}>
          <div style={{ ...SKEL, width: 60, height: 60, borderRadius: "50%", margin: "0 auto 0.9rem" }} />
          <div style={{ ...SKEL, width: "55%", height: 18, margin: "0 auto 0.7rem" }} />
          <div style={{ ...SKEL, width: "75%", height: 12, margin: "0 auto 1.4rem" }} />
          <div style={{ display: "grid", gap: "0.9rem" }}>
            {[0, 1, 2].map((i) => <div key={i} style={{ ...SKEL, height: 54, borderRadius: 12 }} />)}
          </div>
        </motion.div>
      </div>
    );
  }

  const showResults = view.revealed && !redo;
  const waiting = view.myComplete && !view.revealed && !redo;
  const answering = !view.myComplete || redo;
  // view.partnerName only exists once the partner has answered; before that it's
  // null, so fall back to the partner's name from the session (always set here).
  const partnerName = view.partnerName ?? user.partnerName;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <button onClick={back} style={{ ...linkBtn(), marginBottom: "0.8rem" }}>← all quizzes</button>

      <div style={CARD}>
        <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
          <div style={{ fontSize: "1.8rem" }}>{view.emoji}</div>
          <h3 style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1.5rem", color: "var(--pink-deep)", margin: "0.2rem 0 0.2rem" }}>
            {view.title}
          </h3>
          <p style={{ fontFamily: SCRIPT, fontSize: "0.98rem", color: "var(--muted)", margin: 0 }}>
            {showResults ? "here's how you matched 💞" : waiting ? `waiting for ${partnerName} to play` : view.blurb}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {showResults ? (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
                <div style={{ fontFamily: SERIF, fontSize: "2.6rem", color: "var(--pink-deep)", fontWeight: 700 }}>
                  {view.score}/{view.total}
                </div>
                <p style={{ fontFamily: SCRIPT, fontSize: "1.15rem", color: "var(--pink-deep)", margin: 0 }}>
                  {scoreLine(view.score ?? 0, view.total)}
                </p>
              </div>
              <div style={{ display: "grid", gap: "0.7rem" }}>
                {view.questions.map((q) => {
                  const matched = view.matchPerQuestion?.[q.id];
                  const mineIdx = view.mine[q.id];
                  const theirsIdx = view.partnerPicks?.[q.id];
                  return (
                    <div key={q.id} style={{
                      background: matched ? "rgba(var(--pink-rgb), .12)" : "rgba(var(--pink-deep-rgb), .06)",
                      border: `1px solid rgba(var(--pink-${matched ? "" : "deep-"}rgb), .28)`,
                      borderRadius: 14, padding: "0.7rem 0.85rem",
                    }}>
                      <p style={{ fontFamily: SANS, fontSize: "0.82rem", fontWeight: 700, color: "var(--text)", margin: "0 0 0.45rem" }}>
                        {matched ? "💞 " : "🌗 "}{q.text}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                        <span style={tag()}>{user.name}: {q.options[mineIdx] ?? "—"}</span>
                        <span style={tag()}>{partnerName}: {typeof theirsIdx === "number" ? q.options[theirsIdx] : "—"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "center", marginTop: "1.2rem" }}>
                <motion.button whileTap={{ scale: 0.96 }} onClick={playAgain}
                  style={{ ...BTN, background: "rgba(var(--pink-deep-rgb), .08)", color: "var(--pink-deep)" }}>
                  play again 🔁
                </motion.button>
              </div>
            </motion.div>
          ) : waiting ? (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>⏳</div>
              <p style={{ fontFamily: SCRIPT, fontSize: "1.1rem", color: "var(--muted)", margin: "0 0 1rem" }}>
                you&apos;re done! it reveals the moment {partnerName} finishes 💌
              </p>
              <button onClick={() => setRedo(true)} style={linkBtn()}>change my answers</button>
            </motion.div>
          ) : (
            <motion.div key="answering" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {view.partnerComplete && (
                <p style={{ fontFamily: SCRIPT, fontSize: "1rem", color: "var(--pink-deep)", textAlign: "center", margin: "0 0 1rem" }}>
                  {partnerName} already played — finish to reveal your score 💞
                </p>
              )}
              <div style={{ display: "grid", gap: "1.1rem" }}>
                {view.questions.map((q, qi) => (
                  <div key={q.id}>
                    <p style={{ fontFamily: SANS, fontSize: "0.9rem", fontWeight: 700, color: "var(--text)", margin: "0 0 0.5rem" }}>
                      {qi + 1}. {q.text}
                    </p>
                    <div style={{ display: "grid", gap: "0.4rem", gridTemplateColumns: "1fr 1fr" }}>
                      {q.options.map((opt, oi) => {
                        const sel = picks[q.id] === oi;
                        return (
                          <button key={oi} onClick={() => { setPicks((p) => ({ ...p, [q.id]: oi })); buzz("tap"); }}
                            style={{
                              fontFamily: SANS, fontSize: "0.82rem", textAlign: "left", cursor: "pointer",
                              padding: "0.6rem 0.7rem", borderRadius: 12, lineHeight: 1.3,
                              background: sel ? "linear-gradient(135deg, var(--pink), var(--pink-deep))" : "rgba(var(--pink-rgb), .08)",
                              color: sel ? "#fff" : "var(--text)",
                              border: `1px solid rgba(var(--pink-rgb), ${sel ? ".6" : ".25"})`,
                              fontWeight: sel ? 700 : 500, transition: "background .15s",
                            }}>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "center", marginTop: "1.3rem" }}>
                <motion.button whileTap={{ scale: 0.96 }} onClick={submit}
                  disabled={saving || view.questions.some((q) => typeof picks[q.id] !== "number")}
                  style={{
                    ...BTN, background: "linear-gradient(135deg, var(--pink), var(--pink-deep))", color: "#fff",
                    opacity: saving || view.questions.some((q) => typeof picks[q.id] !== "number") ? 0.55 : 1,
                  }}>
                  {saving ? "saving…" : redo ? "save my answers" : "lock in my answers 💞"}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function pill(): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: "0.3rem",
    background: "rgba(var(--pink-rgb), .14)", border: "1px solid rgba(var(--pink-rgb), .35)",
    borderRadius: 50, padding: "0.25rem 0.7rem",
    fontFamily: SANS, fontSize: "0.7rem", fontWeight: 600, color: "var(--pink-deep)",
  };
}
function tag(): React.CSSProperties {
  return {
    fontFamily: SANS, fontSize: "0.74rem", color: "var(--text)",
    background: "rgba(255,255,255,0.5)", border: "1px solid rgba(var(--pink-rgb), .25)",
    borderRadius: 10, padding: "0.3rem 0.55rem",
  };
}
function linkBtn(): React.CSSProperties {
  return {
    fontFamily: SANS, fontSize: "0.78rem", fontWeight: 600, color: "rgba(var(--pink-deep-rgb), .65)",
    background: "none", border: "none", cursor: "pointer", padding: "0.2rem 0", textDecoration: "underline",
  };
}
