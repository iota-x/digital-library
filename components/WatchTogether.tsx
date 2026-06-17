"use client";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserData } from "@/lib/userStore";
import { onSSE } from "@/lib/sseClient";
import { WatchlistStore, type WatchItem } from "@/lib/resourceStores";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";
import { buzz, heartBump } from "@/lib/haptics";

interface SessionView {
  active: boolean;
  itemId: string | null;
  title: string | null;
  status: "watching" | "done" | null;
  iAmIn: boolean;
  partnerIn: boolean;
  partnerName: string | null;
  startedByName: string | null;
  myRating: number | null;
  partnerRating: number | null;
  bothRated: boolean;
}

async function post(body: Record<string, unknown>): Promise<SessionView | null> {
  try {
    const r = await fetch("/api/watch-together", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await r.json()) as SessionView;
  } catch { return null; }
}

export default function WatchTogether() {
  const user = useUserData();
  const { data: items } = WatchlistStore.useResource() as { data: WatchItem[]; loading: boolean };
  const [view, setView] = useState<SessionView | null>(null);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/watch-together", { cache: "no-store" });
      setView((await r.json()) as SessionView);
    } catch {}
  }, []);

  useEffect(() => { if (user?.partnerName) load(); }, [user?.partnerName, load]);
  useEffect(() => {
    if (!user?.partnerName) return;
    return onSSE((d) => {
      if (d.type.startsWith("watch:")) {
        if (d.type === "watch:reveal") heartBump();
        load();
      }
    });
  }, [user?.partnerName, load]);

  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    const v = await post(body);
    if (v) setView(v);
    setBusy(false);
  };

  if (!user?.partnerName) return null;

  const partnerName = user.partnerName;
  // Items not yet completed make the best "start watching" candidates, so
  // surface those first — but any title can still be picked.
  const startable = [...items].sort((a, b) =>
    (a.status === "completed" ? 1 : 0) - (b.status === "completed" ? 1 : 0));
  const picked = startable.find((x) => x._id === pick) ?? null;

  return (
    <section id="watch-together" style={{
      width: "100%", padding: "clamp(2rem, 5vh, 3.2rem) clamp(1rem, 4vw, 2rem) 0",
      display: "flex", justifyContent: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 620 }}>
        <motion.div
          initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5 }}
          style={{
            background: "var(--cream)",
            border: "1.5px solid rgba(var(--pink-rgb), .35)",
            borderRadius: 22, padding: "clamp(1.2rem, 4vw, 1.8rem)",
            boxShadow: "0 12px 40px rgba(var(--pink-deep-rgb), .1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.9rem" }}>
            <span style={{ fontSize: "1.4rem" }}>🍿</span>
            <div>
              <h3 style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400,
                fontSize: "1.3rem", color: "var(--pink-deep)", margin: 0, lineHeight: 1 }}>
                watch together
              </h3>
              <p style={{ fontFamily: SANS, fontSize: "0.68rem", color: "var(--muted)", margin: "0.2rem 0 0" }}>
                hit play at the same time · rate it after
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!view?.active ? (
              /* ── Idle: start a session ── */
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {startable.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "0.6rem 0 0.2rem" }}>
                    <div aria-hidden style={{ fontSize: "1.9rem", marginBottom: "0.5rem", letterSpacing: "0.1em" }}>🎬 🍿 💞</div>
                    <p style={{ fontFamily: SCRIPT, fontSize: "1.05rem", color: "var(--muted)", margin: 0 }}>
                      add something to your watchlist below, then start it here together 🌸
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontFamily: SANS, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em",
                      textTransform: "uppercase", color: "rgba(var(--pink-deep-rgb), .5)", margin: "0 0 0.65rem" }}>
                      pick one to start together
                    </p>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.1rem" }}>
                      {startable.slice(0, 8).map((it) => {
                        const sel = pick === it._id;
                        return (
                          <motion.button key={it._id} whileTap={{ scale: 0.95 }}
                            onClick={() => { buzz("tap"); setPick(sel ? "" : it._id); }}
                            style={{
                              fontFamily: SANS, fontSize: "0.8rem", fontWeight: 600,
                              color: sel ? "#fff" : "var(--pink-deep)",
                              background: sel ? "linear-gradient(135deg, var(--pink), var(--pink-deep))" : "rgba(var(--pink-rgb), .1)",
                              border: sel ? "none" : "1px solid rgba(var(--pink-rgb), .3)",
                              borderRadius: 50, padding: "0.42rem 0.95rem", cursor: "pointer",
                              display: "inline-flex", alignItems: "center", gap: "0.4rem",
                              maxWidth: "100%",
                            }}>
                            <span aria-hidden>{sel ? "🍿" : "🎬"}</span>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                    <motion.button whileTap={{ scale: 0.97 }} disabled={!picked || busy}
                      onClick={() => {
                        if (picked) { buzz("double"); act({ action: "start", itemId: picked._id, title: picked.title }); }
                      }}
                      style={{ ...BTN, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem",
                        padding: "0.7rem 1.3rem",
                        background: "linear-gradient(135deg, var(--pink), var(--pink-deep))",
                        color: "#fff", opacity: !picked || busy ? 0.55 : 1 }}>
                      ▶ start watching {picked ? "now" : "together"}
                    </motion.button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1.15rem", color: "var(--text)", margin: "0 0 0.7rem" }}>
                  {view.title}
                </p>

                {/* Who's in */}
                {!view.bothRated && (
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.9rem" }}>
                    <Pill on={view.iAmIn}>{user.name || "you"} {view.iAmIn ? "✓" : "—"}</Pill>
                    <Pill on={view.partnerIn}>{partnerName} {view.partnerIn ? "✓" : "—"}</Pill>
                  </div>
                )}

                {/* Join CTA when partner started and I'm not in */}
                {!view.iAmIn && view.partnerIn && (
                  <div>
                    <p style={{ fontFamily: SCRIPT, fontSize: "1.05rem", color: "var(--pink-deep)", margin: "0 0 0.7rem" }}>
                      {view.startedByName || partnerName} is watching — jump in 💞
                    </p>
                    <motion.button whileTap={{ scale: 0.96 }} disabled={busy}
                      onClick={() => { buzz("double"); act({ action: "join" }); }}
                      style={{ ...BTN, background: "linear-gradient(135deg, var(--pink), var(--pink-deep))", color: "#fff" }}>
                      🍿 join them
                    </motion.button>
                  </div>
                )}

                {/* Waiting for partner to join */}
                {view.iAmIn && !view.partnerIn && (
                  <p style={{ fontFamily: SCRIPT, fontSize: "1.05rem", color: "var(--muted)", margin: 0 }}>
                    waiting for {partnerName} to join… they just got a nudge ✨
                  </p>
                )}

                {/* Both in → rate */}
                {view.iAmIn && view.partnerIn && !view.bothRated && (
                  <div style={{ marginTop: "0.4rem" }}>
                    {view.myRating == null ? (
                      <>
                        <p style={{ fontFamily: SANS, fontSize: "0.8rem", color: "var(--muted)", margin: "0 0 0.5rem" }}>
                          watching together — rate it when you&apos;re done:
                        </p>
                        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                            <button key={n} disabled={busy} onClick={() => { buzz("tap"); act({ action: "rate", value: n }); }}
                              style={RATING_BTN}>
                              {n}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p style={{ fontFamily: SCRIPT, fontSize: "1.05rem", color: "var(--muted)", margin: 0 }}>
                        you rated it <b style={{ color: "var(--pink-deep)" }}>{view.myRating}/10</b> — waiting for {partnerName}&apos;s score to reveal 💞
                      </p>
                    )}
                  </div>
                )}

                {/* Reveal */}
                {view.bothRated && (
                  <div>
                    <div style={{ display: "flex", gap: "0.6rem", marginBottom: "0.9rem" }}>
                      <ScoreCard who={user.name || "you"} score={view.myRating} />
                      <ScoreCard who={partnerName} score={view.partnerRating} />
                    </div>
                    <p style={{ fontFamily: SCRIPT, fontSize: "1.05rem", color: "var(--pink-deep)", margin: "0 0 0.9rem" }}>
                      {view.myRating === view.partnerRating
                        ? "you rated it exactly the same — soulmates 💞"
                        : `average: ${(((view.myRating ?? 0) + (view.partnerRating ?? 0)) / 2).toFixed(1)}/10`}
                    </p>
                    <button onClick={() => act({ action: "end" })} disabled={busy} style={{ ...BTN, background: "rgba(var(--pink-deep-rgb), .08)", color: "var(--pink-deep)" }}>
                      done · clear
                    </button>
                  </div>
                )}

                {/* Always allow ending the session */}
                {!view.bothRated && (
                  <button onClick={() => act({ action: "end" })} disabled={busy}
                    style={{ ...LINK_BTN, marginTop: "0.8rem" }}>
                    cancel session
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

function Pill({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: SANS, fontSize: "0.72rem", fontWeight: 700,
      color: on ? "#fff" : "var(--muted)",
      background: on ? "linear-gradient(135deg, var(--pink), var(--pink-deep))" : "rgba(var(--pink-rgb), .12)",
      border: on ? "none" : "1px solid rgba(var(--pink-rgb), .3)",
      borderRadius: 50, padding: "0.3rem 0.75rem",
    }}>
      {children}
    </span>
  );
}

function ScoreCard({ who, score }: { who: string; score: number | null }) {
  return (
    <div style={{ flex: 1, textAlign: "center", background: "rgba(var(--pink-rgb), .1)",
      border: "1px solid rgba(var(--pink-rgb), .28)", borderRadius: 14, padding: "0.7rem 0.5rem" }}>
      <p style={{ fontFamily: SANS, fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "var(--pink-deep)", margin: "0 0 0.2rem" }}>{who}</p>
      <p style={{ fontFamily: SERIF, fontSize: "1.7rem", color: "var(--text)", margin: 0 }}>{score ?? "–"}<span style={{ fontSize: "0.9rem", color: "var(--muted)" }}>/10</span></p>
    </div>
  );
}

const BTN: React.CSSProperties = {
  fontFamily: SANS, fontSize: "0.82rem", fontWeight: 700,
  border: "none", borderRadius: 50, padding: "0.55rem 1.3rem", cursor: "pointer",
};
const LINK_BTN: React.CSSProperties = {
  fontFamily: SANS, fontSize: "0.74rem", fontWeight: 600, color: "rgba(var(--pink-deep-rgb), .55)",
  background: "none", border: "none", cursor: "pointer", padding: "0.2rem 0", textDecoration: "underline",
};
const RATING_BTN: React.CSSProperties = {
  fontFamily: SANS, fontSize: "0.85rem", fontWeight: 700, color: "var(--pink-deep)",
  width: 38, height: 38, borderRadius: 10, cursor: "pointer",
  background: "rgba(var(--pink-rgb), .1)", border: "1px solid rgba(var(--pink-rgb), .3)",
};
