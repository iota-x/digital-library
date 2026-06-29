"use client";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";
import { buzz } from "@/lib/haptics";

interface Idea { title: string; blurb: string }
interface Props {
  mode: "date" | "reconnect";
  heading: string;
  sub: string;
  emoji: string;
  /** Render as a plain <div> instead of a <section> — used on pages with one
   *  continuous flowing background so it doesn't paint its own section band. */
  flat?: boolean;
  /** Tighter vertical spacing (used on the games page, which packs more in). */
  tight?: boolean;
}

const CARD: React.CSSProperties = {
  background: "var(--cream)",
  border: "1.5px solid rgba(var(--pink-rgb), .35)",
  borderRadius: 20,
  padding: "clamp(1.2rem, 4vw, 1.8rem)",
  boxShadow: "0 12px 40px rgba(var(--pink-deep-rgb), .1)",
};

export default function Ideas({ mode, heading, sub, emoji, flat = false, tight = false }: Props) {
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [source, setSource] = useState<"ai" | "library">("library");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      // Bucket list / watchlist text is end-to-end encrypted; fetch it (the
      // interceptor decrypts) and POST it so the AI can personalize without the
      // server ever reading stored content. Best-effort — empty lists are fine.
      let bucket: string[] = [], watch: string[] = [];
      try {
        const [b, w] = await Promise.all([
          fetch("/api/bucketlist").then(r => r.ok ? r.json() : []).catch(() => []),
          fetch("/api/watchlist").then(r => r.ok ? r.json() : []).catch(() => []),
        ]);
        if (Array.isArray(b)) bucket = b.filter((i) => !i?.completed).map((i) => i?.text).filter(Boolean);
        if (Array.isArray(w)) watch = w.filter((i) => i?.status === "plan-to-watch").map((i) => i?.title).filter(Boolean);
      } catch { /* no personalization */ }

      const r = await fetch("/api/ideas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, seed: Date.now(), bucket, watch }), cache: "no-store",
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      if (Array.isArray(d?.ideas)) { setIdeas(d.ideas); setSource(d.source === "ai" ? "ai" : "library"); }
      else throw new Error();
    } catch { setFailed(true); }
    finally { setLoading(false); }
  }, [mode]);

  useEffect(() => { load(); }, [load]);

  const Wrap = flat ? "div" : "section";
  // `flat` is used on flow pages, where every component shares this equal
  // top/bottom spacing; the plain <section> form keeps its own page padding.
  const pad = tight ? "clamp(2.5rem,5.5vh,3.5rem)" : flat ? "clamp(6rem,15vh,10rem)" : "clamp(1.5rem,4vh,2.5rem)";
  return (
    <Wrap style={{ width: "100%", padding: `${pad} clamp(1rem,4vw,2rem)`, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 680 }}>
        <div style={{ textAlign: "center", marginBottom: "1.1rem" }}>
          <div style={{ fontSize: "1.7rem" }}>{emoji}</div>
          <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: "clamp(1.4rem,4vw,1.9rem)", color: "var(--pink-deep)", margin: "0.1rem 0 0.2rem" }}>
            {heading}
          </h2>
          <p style={{ fontFamily: SCRIPT, fontSize: "1rem", color: "var(--muted)", margin: 0 }}>{sub}</p>
          {source === "ai" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", marginTop: "0.5rem", background: "rgba(var(--pink-rgb), .14)", border: "1px solid rgba(var(--pink-rgb), .4)", borderRadius: 50, padding: "0.2rem 0.7rem", fontFamily: SANS, fontSize: "0.68rem", fontWeight: 700, color: "var(--pink-deep)" }}>
              ✨ picked for you two
            </span>
          )}
        </div>

        {failed && !ideas ? (
          <div style={{ ...CARD, textAlign: "center" }}>
            <p style={{ fontFamily: SCRIPT, color: "var(--pink-deep)", margin: "0 0 0.7rem" }}>couldn&apos;t load ideas 💭</p>
            <button onClick={load} style={btn()}>try again</button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0.7rem" }}>
            <AnimatePresence mode="popLayout">
              {(ideas ?? []).map((idea, i) => (
                <motion.div key={`${idea.title}-${i}`}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }} style={CARD}>
                  <p style={{ fontFamily: SANS, fontSize: "1rem", fontWeight: 700, color: "var(--pink-deep)", margin: "0 0 0.25rem" }}>{idea.title}</p>
                  <p style={{ fontFamily: SANS, fontSize: "0.86rem", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>{idea.blurb}</p>
                </motion.div>
              ))}
            </AnimatePresence>
            {!ideas && <div style={{ ...CARD, textAlign: "center", color: "var(--muted)", fontFamily: SANS }}>thinking of ideas…</div>}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", marginTop: "1.1rem" }}>
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => { buzz("tap"); load(); }} disabled={loading} style={{ ...btn(), opacity: loading ? 0.6 : 1 }}>
            {loading ? "finding…" : "give us another set 🔁"}
          </motion.button>
        </div>
      </div>
    </Wrap>
  );
}

function btn(): React.CSSProperties {
  return { fontFamily: SANS, fontSize: "0.86rem", fontWeight: 700, border: "none", borderRadius: 50, padding: "0.65rem 1.4rem", cursor: "pointer", background: "linear-gradient(135deg, var(--pink), var(--pink-deep))", color: "#fff" };
}
