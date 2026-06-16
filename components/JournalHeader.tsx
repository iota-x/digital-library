"use client";
import { useMemo } from "react";
import { useCalendarData } from "@/lib/calendarStore";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";
import { defaultStartDate } from "@/lib/relationship";

const START = defaultStartDate();

const SECTIONS = [
  { label: "calendar", emoji: "📅", href: "#calendar" },
  { label: "streak",   emoji: "🔥", href: "#streak"   },
  { label: "surprise", emoji: "✨", href: "#surprise"  },
  { label: "recap",    emoji: "📖", href: "#recap"     },
];

export default function JournalHeader() {
  const { data } = useCalendarData();

  const stats = useMemo(() => {
    const today = new Date();
    const dayNum = Math.floor((today.getTime() - START.getTime()) / 86400000) + 1;
    const entries = data.filter(e => e.note || (e.photos?.length ?? 0) > 0);
    const total   = entries.length;
    const special = data.filter(e => e.special).length;
    const dates   = new Set(entries.map(e => e.date));
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      if (dates.has(k)) streak++;
      else if (i > 0) break;
    }
    return { dayNum, total, special, streak };
  }, [data]);

  return (
    <div className="dk-journal-header" style={{
      padding: "2.5rem clamp(1rem,3vw,2rem) 1.5rem",
      background: "linear-gradient(180deg,var(--rose) 0%,var(--pink-light) 100%)",
      borderBottom: "1px solid rgba(var(--pink-rgb),.18)",
    }}>
      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: "1.4rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginBottom: "0.7rem" }}>
          <div style={{ width: 48, height: 1, background: "linear-gradient(90deg,transparent,rgba(var(--pink-deep-rgb),.3))" }} />
          <span className="occ-heart" style={{ fontSize: "1.5rem" }}>💗</span>
          <div style={{ width: 48, height: 1, background: "linear-gradient(90deg,rgba(var(--pink-deep-rgb),.3),transparent)" }} />
        </div>
        <h1 style={{
          fontFamily: SERIF, fontStyle: "italic",
          fontSize: "clamp(2rem,5vw,2.8rem)",
          color: "var(--pink-deep)", margin: "0 0 0.3rem", fontWeight: 400,
          textShadow: "0 2px 16px rgba(var(--pink-deep-rgb),.12)",
        }}>
          our journal
        </h1>
        <p style={{ fontFamily: SCRIPT, fontSize: "clamp(1rem,2.5vw,1.2rem)", color: "rgba(var(--pink-deep-rgb),.5)", margin: 0 }}>
          day {stats.dayNum} of us 🌸
        </p>
      </div>

      {/* Stats chips */}
      <div style={{ display: "flex", gap: "0.55rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "1.2rem" }}>
        {[
          { e: "📖", v: stats.total,   l: "memories"  },
          { e: "⭐", v: stats.special, l: "special"   },
          { e: "🔥", v: stats.streak,  l: "day streak" },
        ].map((s, i) => (
          <div key={i} style={{
            background: "rgba(var(--pink-rgb),.16)",
            border: "1px solid rgba(var(--pink-rgb),.32)",
            borderRadius: 24, padding: "0.45rem 1.1rem",
            display: "flex", alignItems: "center", gap: "0.45rem",
            fontFamily: SANS, fontSize: "0.84rem", color: "var(--text)",
            boxShadow: "0 2px 10px rgba(var(--pink-deep-rgb),.07)",
            backdropFilter: "blur(6px)",
          }}>
            <span>{s.e}</span>
            <span style={{ fontWeight: 700, color: "var(--pink-deep)" }}>{s.v}</span>
            <span style={{ opacity: 0.85 }}>{s.l}</span>
          </div>
        ))}
      </div>

      {/* Section quick-nav */}
      <div style={{ display: "flex", gap: "0.45rem", justifyContent: "center", flexWrap: "wrap" }}>
        {SECTIONS.map(s => (
          <a key={s.href} href={s.href} style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "0.38rem",
              padding: "0.32rem 0.85rem", borderRadius: 20,
              background: "rgba(var(--pink-rgb),.12)",
              border: "1px solid rgba(var(--pink-rgb),.28)",
              fontFamily: SANS, fontSize: "0.78rem", color: "var(--text)",
              cursor: "pointer",
              backdropFilter: "blur(6px)",
            }}>
              <span style={{ fontSize: "0.85rem" }}>{s.emoji}</span>
              <span>{s.label}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
