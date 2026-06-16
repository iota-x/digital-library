"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendarData } from "@/lib/calendarStore";

const SERIF = `"Georgia","Times New Roman",serif`;
const SANS  = `var(--font-lato),"Inter",system-ui,sans-serif`;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtEntry(date: string) {
  const d = new Date(date + "T12:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * Inline search input on the /journal page — same search logic as Cmd+K but
 * surfaced visually for mobile users who don't know about the keyboard shortcut.
 *
 * Doesn't open a modal — drops results below the input so users can scan + jump.
 */
export default function JournalSearch() {
  const { data } = useCalendarData();
  const router = useRouter();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    return data
      .filter(e => {
        const text = [e.note, e.pinnedNote, e.mood, e.specialLabel, e.date, fmtEntry(e.date)]
          .join(" ").toLowerCase();
        return text.includes(term) && (e.note || (e.photos?.length ?? 0) > 0 || e.special);
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 12);
  }, [q, data]);

  return (
    <div style={{ maxWidth: 640, margin: "1.4rem auto 0", padding: "0 clamp(1rem,3vw,1.4rem)" }}>
      <div style={{ position: "relative" }}>
        <span aria-hidden style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}>🔍</span>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="search your journal — try a mood, word, or date"
          aria-label="search journal entries"
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "0.85rem 1rem 0.85rem 2.5rem",
            background: "var(--cream)",
            border: "1.5px solid rgba(var(--pink-rgb),.3)",
            borderRadius: 14,
            fontFamily: SANS, fontSize: "0.92rem",
            color: "var(--text)", outline: "none",
            boxShadow: "0 4px 14px rgba(var(--pink-deep-rgb),.08)",
          }}
        />
        {q && (
          <button onClick={() => setQ("")} aria-label="clear search"
            style={{ position: "absolute", right: "0.8rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1rem" }}>✕</button>
        )}
      </div>

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              marginTop: "0.7rem",
              background: "var(--cream)",
              border: "1px solid rgba(var(--pink-rgb),.22)",
              borderRadius: 14,
              boxShadow: "0 8px 28px rgba(var(--pink-deep-rgb),.12)",
              maxHeight: 360, overflowY: "auto",
            }}
          >
            {results.map((e) => (
              <motion.button
                key={e.date}
                onClick={() => { router.push(`/journal?date=${e.date}`); setQ(""); }}
                whileHover={{ background: "rgba(var(--pink-rgb),.1)" }}
                style={{
                  width: "100%", textAlign: "left" as const,
                  display: "flex", gap: "0.7rem", alignItems: "flex-start",
                  padding: "0.7rem 1rem",
                  border: "none", background: "transparent",
                  borderBottom: "1px dashed rgba(var(--pink-rgb),.15)",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{e.mood || (e.special ? "⭐" : "📖")}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.92rem", color: "var(--pink-deep)", margin: 0 }}>
                    {fmtEntry(e.date)}
                    {e.specialLabel && <span style={{ fontFamily: SANS, fontSize: "0.7rem", color: "var(--muted)", marginLeft: "0.5rem" }}>· {e.specialLabel}</span>}
                  </p>
                  {(e.pinnedNote || e.note) && (
                    <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: "var(--text)", opacity: 0.75, margin: "0.15rem 0 0", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {e.pinnedNote || e.note?.slice(0, 140)}
                    </p>
                  )}
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
        {q.length >= 2 && results.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ fontFamily: SANS, fontSize: "0.82rem", color: "var(--muted)", textAlign: "center", margin: "0.8rem 0 0", padding: "0.6rem" }}>
            nothing matched &ldquo;{q}&rdquo; — try another word
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
