"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendarData } from "@/lib/calendarStore";
import { SERIF, SANS } from "@/lib/typography";


const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtEntry(date: string) {
  const d = new Date(date + "T12:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        fontFamily: SANS, fontSize: "0.76rem", fontWeight: active ? 700 : 500,
        color: active ? "#fff" : "var(--pink-deep)",
        background: active ? "linear-gradient(135deg,var(--pink),var(--pink-deep))" : "rgba(var(--pink-rgb),.1)",
        border: `1px solid ${active ? "transparent" : "rgba(var(--pink-rgb),.3)"}`,
        borderRadius: 50, padding: "0.3rem 0.7rem", cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
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
  const [moodFilter, setMoodFilter] = useState<string | null>(null);
  const [weatherFilter, setWeatherFilter] = useState<string | null>(null);
  const [specialOnly, setSpecialOnly] = useState(false);

  // Facets actually present in the journal, so we never show an empty filter.
  const { moods, weathers } = useMemo(() => {
    const moodSet = new Map<string, number>();
    const weatherSet = new Map<string, string>(); // emoji -> label
    for (const e of data) {
      if (e.mood) moodSet.set(e.mood, (moodSet.get(e.mood) ?? 0) + 1);
      if (e.weather?.emoji) weatherSet.set(e.weather.emoji, e.weather.label || e.weather.emoji);
    }
    return {
      moods: [...moodSet.keys()],
      weathers: [...weatherSet.entries()].map(([emoji, label]) => ({ emoji, label })),
    };
  }, [data]);

  const filtering = !!moodFilter || !!weatherFilter || specialOnly;

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const hasQuery = term.length >= 2;
    if (!hasQuery && !filtering) return [];
    return data
      .filter(e => {
        if (!(e.note || (e.photos?.length ?? 0) > 0 || e.special)) return false;
        if (hasQuery) {
          const text = [e.note, e.pinnedNote, e.mood, e.specialLabel, e.date, fmtEntry(e.date)]
            .join(" ").toLowerCase();
          if (!text.includes(term)) return false;
        }
        if (moodFilter && e.mood !== moodFilter) return false;
        if (weatherFilter && e.weather?.emoji !== weatherFilter) return false;
        if (specialOnly && !e.special) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      // Wider cap when filtering — it's a browse view, not a typeahead.
      .slice(0, filtering ? 60 : 12);
  }, [q, data, moodFilter, weatherFilter, specialOnly, filtering]);

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

      {/* Filter chips — mood / weather / special. Tap to narrow the list. */}
      {(moods.length > 0 || weathers.length > 0 || data.some(e => e.special)) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.7rem", alignItems: "center" }}>
          {data.some(e => e.special) && (
            <Chip active={specialOnly} onClick={() => setSpecialOnly(v => !v)} label="⭐ special" />
          )}
          {moods.map(m => (
            <Chip key={m} active={moodFilter === m} onClick={() => setMoodFilter(v => v === m ? null : m)} label={m} />
          ))}
          {weathers.map(w => (
            <Chip key={w.emoji} active={weatherFilter === w.emoji} onClick={() => setWeatherFilter(v => v === w.emoji ? null : w.emoji)} label={`${w.emoji} ${w.label}`} />
          ))}
          {filtering && (
            <button onClick={() => { setMoodFilter(null); setWeatherFilter(null); setSpecialOnly(false); }}
              style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", marginLeft: "0.2rem" }}>
              clear filters
            </button>
          )}
        </div>
      )}

      {filtering && (
        <p style={{ fontFamily: SANS, fontSize: "0.74rem", color: "var(--muted)", margin: "0.5rem 0 0" }}>
          {results.length} {results.length === 1 ? "memory" : "memories"} match
        </p>
      )}

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
