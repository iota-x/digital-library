"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";


type Category = "dates" | "travel" | "experiences" | "firsts" | "other";

const IDEAS: { text: string; category: Category }[] = [
  // dates
  { text: "stargazing picnic at night", category: "dates" },
  { text: "cook a new recipe together", category: "dates" },
  { text: "sunrise date", category: "dates" },
  { text: "recreate your first date", category: "dates" },
  { text: "board game night with snacks", category: "dates" },
  { text: "watch a movie under the stars", category: "dates" },
  { text: "go thrifting together", category: "dates" },
  { text: "bake something from scratch", category: "dates" },
  { text: "karaoke night", category: "dates" },
  // travel
  { text: "weekend trip to the mountains", category: "travel" },
  { text: "visit a city neither of you has been to", category: "travel" },
  { text: "road trip with no planned route", category: "travel" },
  { text: "beach trip off-season", category: "travel" },
  { text: "camping under the stars", category: "travel" },
  { text: "explore a new country together", category: "travel" },
  // experiences
  { text: "take a dance class together", category: "experiences" },
  { text: "go skydiving", category: "experiences" },
  { text: "learn to surf", category: "experiences" },
  { text: "pottery class date", category: "experiences" },
  { text: "volunteer together for a day", category: "experiences" },
  { text: "go-karting", category: "experiences" },
  { text: "escape room challenge", category: "experiences" },
  { text: "try a new sport together", category: "experiences" },
  // firsts
  { text: "first trip abroad together", category: "firsts" },
  { text: "meet each other's childhood friends", category: "firsts" },
  { text: "get matching tattoos", category: "firsts" },
  { text: "write letters to your future selves", category: "firsts" },
  { text: "plant something together and watch it grow", category: "firsts" },
  // other
  { text: "build a scrapbook of your first year", category: "other" },
  { text: "create a shared playlist that tells your story", category: "other" },
  { text: "adopt a plant and name it", category: "other" },
  { text: "make a bucket list for next year", category: "other" },
];

const CAT_COLORS: Record<Category, { color: string; bg: string; emoji: string }> = {
  dates:       { color: "var(--pink-deep)", bg: "rgba(var(--pink-rgb),.15)",    emoji: "💕" },
  travel:      { color: "#0369a1",          bg: "rgba(186,230,253,.25)",        emoji: "✈️"  },
  experiences: { color: "#92400e",          bg: "rgba(253,230,138,.25)",        emoji: "🌟" },
  firsts:      { color: "#5b21b6",          bg: "rgba(221,214,254,.25)",        emoji: "🎊" },
  other:       { color: "#065f46",          bg: "rgba(167,243,208,.25)",        emoji: "✨" },
};

interface Props {
  onAdd: (text: string, category: Category) => void;
}

export default function BucketListIdeas({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [added, setAdded] = useState<Set<string>>(new Set());

  const visible = filter === "all" ? IDEAS : IDEAS.filter(i => i.category === filter);

  const handleAdd = (idea: { text: string; category: Category }) => {
    onAdd(idea.text, idea.category);
    setAdded(prev => new Set([...prev, idea.text]));
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
        style={{
          fontFamily: SCRIPT, fontSize: "1rem",
          color: "var(--pink-deep)",
          background: "rgba(var(--pink-rgb),.1)",
          border: "1.5px solid var(--pink-mid)",
          borderRadius: 50, padding: "0.55rem 1.2rem",
          cursor: "pointer",
        }}
      >
        ✨ get ideas
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,.45)", backdropFilter: "blur(4px)" }}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="mobile-sheet"
              style={{
                position: "fixed", zIndex: 9001,
                top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                width: "min(560px, 95vw)", maxHeight: "82vh",
                background: "var(--cream)",
                borderRadius: 24, display: "flex", flexDirection: "column",
                boxShadow: "0 32px 100px rgba(var(--pink-deep-rgb),.25)",
                border: "1.5px solid var(--pink-mid)",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div style={{ padding: "1.4rem 1.6rem 1rem", borderBottom: "1px solid var(--pink-mid)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1.4rem", color: "var(--pink-deep)", margin: 0 }}>dream ideas ✨</h2>
                  <p style={{ fontFamily: SANS, fontSize: "0.75rem", color: "var(--muted)", margin: "0.2rem 0 0" }}>tap to add to your bucket list</p>
                </div>
                <motion.button onClick={() => setOpen(false)} whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
                  style={{ background: "var(--pink-light)", border: "1px solid var(--pink-mid)", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "var(--pink-deep)", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ✕
                </motion.button>
              </div>

              {/* Filter tabs */}
              <div style={{ display: "flex", gap: "0.4rem", padding: "0.8rem 1.6rem", flexWrap: "wrap" }}>
                {(["all", "dates", "travel", "experiences", "firsts", "other"] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    fontFamily: SANS, fontSize: "0.72rem", fontWeight: filter === f ? 700 : 500,
                    padding: "0.3rem 0.75rem", borderRadius: 50, cursor: "pointer",
                    border: "1.5px solid",
                    borderColor: filter === f ? "var(--pink-deep)" : "var(--pink-mid)",
                    background: filter === f ? "var(--pink-deep)" : "transparent",
                    color: filter === f ? "#fff" : "var(--muted)",
                    transition: "all .18s",
                  }}>
                    {f === "all" ? "all" : `${CAT_COLORS[f].emoji} ${f}`}
                  </button>
                ))}
              </div>

              {/* Ideas list */}
              <div style={{ overflowY: "auto", padding: "0.4rem 1.2rem 1.4rem", flex: 1 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                  {visible.map((idea, i) => {
                    const c = CAT_COLORS[idea.category];
                    const done = added.has(idea.text);
                    return (
                      <motion.button
                        key={i}
                        onClick={() => !done && handleAdd(idea)}
                        whileHover={done ? {} : { scale: 1.03, y: -2 }}
                        whileTap={done ? {} : { scale: 0.97 }}
                        style={{
                          fontFamily: SCRIPT, fontSize: "1rem", textAlign: "left",
                          padding: "0.75rem 0.9rem", borderRadius: 14,
                          border: `1.5px solid ${done ? "var(--pink-mid)" : c.color}`,
                          background: done ? "var(--pink-light)" : c.bg,
                          color: done ? "var(--muted)" : c.color,
                          cursor: done ? "default" : "pointer",
                          opacity: done ? 0.6 : 1,
                          transition: "all .18s",
                          lineHeight: 1.35,
                        }}
                      >
                        {done ? "✓ " : ""}{idea.text}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
