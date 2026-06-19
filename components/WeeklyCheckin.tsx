"use client";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useUserData } from "@/lib/userStore";
import { onSSE } from "@/lib/sseClient";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";
import { buzz, heartBump } from "@/lib/haptics";

interface View {
  week: string;
  mine: number | null;
  partnerSubmitted: boolean;
  both: boolean;
  partner: { name: string; value: number } | null;
  history: { week: string; avg: number; count: number }[];
}

const MOODS = [
  { v: 1, e: "😔", l: "tough" },
  { v: 2, e: "😕", l: "off" },
  { v: 3, e: "😐", l: "okay" },
  { v: 4, e: "🙂", l: "good" },
  { v: 5, e: "😍", l: "great" },
];

const CARD: React.CSSProperties = {
  background: "var(--cream)",
  border: "1.5px solid rgba(var(--pink-rgb), .35)",
  borderRadius: 20,
  padding: "clamp(1.3rem, 4vw, 1.9rem)",
  boxShadow: "0 12px 40px rgba(var(--pink-deep-rgb), .1)",
};

export default function WeeklyCheckin() {
  const user = useUserData();
  const [view, setView] = useState<View | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/checkin", { cache: "no-store" });
      const d = (await r.json()) as View;
      if (d && Array.isArray(d.history)) setView(d);
    } catch {}
  }, []);

  useEffect(() => { if (user?.partnerName) load(); }, [user?.partnerName, load]);
  useEffect(() => {
    if (!user?.partnerName) return;
    return onSSE((d) => { if (d.type === "checkin:done") load(); });
  }, [user?.partnerName, load]);

  const submit = async (value: number) => {
    if (saving) return;
    setSaving(true); buzz("double");
    try {
      const r = await fetch("/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value }) });
      const d = (await r.json()) as View;
      if (r.ok && Array.isArray(d?.history)) { setView(d); if (d.both) heartBump(); }
    } catch {}
    finally { setSaving(false); }
  };

  if (!user?.partnerName) return null;

  const partnerName = user.partnerName;
  const maxBar = 5;

  return (
    <div style={{ width: "100%", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <div style={{ fontSize: "1.6rem" }}>🤍</div>
        <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: "clamp(1.4rem,4vw,1.8rem)", color: "var(--pink-deep)", margin: "0.1rem 0 0.2rem" }}>
          our weekly check-in
        </h2>
        <p style={{ fontFamily: SCRIPT, fontSize: "1rem", color: "var(--muted)", margin: 0 }}>
          how are <em>we</em> doing this week?
        </p>
      </div>

      <div style={CARD}>
        {/* Mood picker */}
        <div style={{ display: "flex", justifyContent: "center", gap: "clamp(0.3rem,2vw,0.7rem)", flexWrap: "wrap" }}>
          {MOODS.map((m) => {
            const sel = view?.mine === m.v;
            return (
              <button key={m.v} onClick={() => submit(m.v)} disabled={saving}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem",
                  background: sel ? "rgba(var(--pink-rgb), .16)" : "transparent",
                  border: `1.5px solid rgba(var(--pink-rgb), ${sel ? ".6" : ".25"})`,
                  borderRadius: 16, padding: "0.6rem 0.7rem", cursor: saving ? "wait" : "pointer",
                  transition: "background .15s, border-color .15s",
                }}>
                <span style={{ fontSize: "1.7rem", lineHeight: 1, filter: sel ? "none" : "saturate(0.7)" }}>{m.e}</span>
                <span style={{ fontFamily: SANS, fontSize: "0.66rem", fontWeight: sel ? 700 : 500, color: sel ? "var(--pink-deep)" : "var(--muted)" }}>{m.l}</span>
              </button>
            );
          })}
        </div>

        {/* Status */}
        <p style={{ fontFamily: SCRIPT, fontSize: "1.02rem", color: "var(--pink-deep)", textAlign: "center", margin: "1rem 0 0" }}>
          {view?.mine == null
            ? "tap how this week has felt — just for the two of you 💗"
            : view?.both && view.partner
              ? `you both checked in — ${partnerName} felt ${MOODS.find((m) => m.v === view.partner!.value)?.l ?? "—"} ${MOODS.find((m) => m.v === view.partner!.value)?.e ?? ""}`
              : view?.partnerSubmitted
                ? "you're both in — opening up your week 💞"
                : `saved 💗 — waiting for ${partnerName} to check in too`}
        </p>

        {/* Trend */}
        {view && view.history.some((h) => h.count > 0) && (
          <div style={{ marginTop: "1.3rem" }}>
            <p style={{ fontFamily: SANS, fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(var(--pink-deep-rgb), .5)", textAlign: "center", margin: "0 0 0.6rem" }}>
              the last 8 weeks
            </p>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "0.45rem", height: 80 }}>
              {view.history.map((h) => (
                <div key={h.week} style={{ flex: 1, maxWidth: 34, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: `${h.count ? (h.avg / maxBar) * 100 : 4}%` }} transition={{ duration: 0.5 }}
                    style={{ width: "100%", borderRadius: 6, background: h.count ? "linear-gradient(180deg, var(--pink), var(--pink-deep))" : "rgba(var(--pink-rgb), .18)" }}
                    title={h.count ? `avg ${h.avg.toFixed(1)}/5` : "no check-in"}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
