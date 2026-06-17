"use client";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserData } from "@/lib/userStore";
import { onSSE } from "@/lib/sseClient";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";

/**
 * Keepsake archive of past daily questions — the answers you both gave,
 * preserved. Collapsed by default so it never competes with today's question;
 * a tap unrolls the history. Only days you both answered appear (the server
 * enforces that gate).
 */

interface Entry {
  date: string;
  question: string;
  answers: { name: string; text: string }[];
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmt(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function DailyArchive() {
  const user = useUserData();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/daily/history", { cache: "no-store" });
      const d = await r.json();
      if (Array.isArray(d)) setEntries(d);
    } catch {}
    finally { setLoaded(true); }
  }, []);

  useEffect(() => { if (user?.partnerName) load(); }, [user?.partnerName, load]);
  // A fresh reveal adds yesterday's-and-older into history over time.
  useEffect(() => {
    if (!user?.partnerName) return;
    return onSSE((d) => { if (d.type === "daily:reveal") load(); });
  }, [user?.partnerName, load]);

  if (!user?.partnerName || !loaded || entries.length === 0) return null;

  return (
    <section style={{
      width: "100%", padding: "0 clamp(1rem, 4vw, 2rem) clamp(2.5rem, 6vh, 4rem)",
      display: "flex", justifyContent: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 640 }}>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: "0.6rem", cursor: "pointer",
            background: "rgba(var(--pink-rgb), .08)",
            border: "1px solid rgba(var(--pink-rgb), .28)",
            borderRadius: 16, padding: "0.85rem 1.1rem",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span aria-hidden style={{ fontSize: "1rem" }}>📜</span>
            <span style={{ fontFamily: SANS, fontSize: "0.82rem", fontWeight: 700, color: "var(--pink-deep)" }}>
              our past answers
            </span>
            <span style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)" }}>
              · {entries.length}
            </span>
          </span>
          <motion.span aria-hidden animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
            style={{ fontSize: "0.7rem", color: "var(--pink-deep)" }}>▾</motion.span>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="archive"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: "hidden" }}
            >
              <div style={{ display: "grid", gap: "0.9rem", paddingTop: "0.9rem" }}>
                {entries.map((e) => (
                  <div key={e.date} style={{
                    background: "var(--cream)",
                    border: "1px solid rgba(var(--pink-rgb), .22)",
                    borderRadius: 16, padding: "1rem 1.1rem",
                  }}>
                    <p style={{ fontFamily: SANS, fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.1em",
                      textTransform: "uppercase", color: "rgba(var(--pink-deep-rgb), .45)", margin: "0 0 0.35rem" }}>
                      {fmt(e.date)}
                    </p>
                    <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1.02rem",
                      color: "var(--pink-deep)", margin: "0 0 0.7rem", lineHeight: 1.35 }}>
                      {e.question}
                    </p>
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      {e.answers.map((a, i) => (
                        <div key={i} style={{
                          background: "rgba(var(--pink-rgb), .08)",
                          border: "1px solid rgba(var(--pink-rgb), .2)",
                          borderRadius: 12, padding: "0.55rem 0.75rem",
                        }}>
                          <p style={{ fontFamily: SANS, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.06em",
                            textTransform: "uppercase", color: "var(--pink-deep)", margin: "0 0 0.25rem" }}>
                            {a.name}
                          </p>
                          <p style={{ fontFamily: SCRIPT, fontSize: "1.02rem", color: "var(--text)", margin: 0,
                            lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                            {a.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
