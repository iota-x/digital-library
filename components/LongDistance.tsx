"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useUserData, updateSettings } from "@/lib/userStore";
import { type CoupleSettings } from "@/lib/themes";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";
import { buzz, heartBump } from "@/lib/haptics";

/**
 * Long-distance widgets — a two-timezone clock, a one-tap "thinking of you"
 * buzz (reuses the push+SSE reaction pipeline), and a countdown to the next
 * time you're together. Config lives in the couple's settings blob so both
 * sides stay in sync.
 */

type Slot = "person1" | "person2";
const mySlot = (role?: string): Slot => (role === "creator" ? "person1" : "person2");
const theirSlot = (role?: string): Slot => (role === "creator" ? "person2" : "person1");

const CARD: React.CSSProperties = {
  background: "var(--cream)",
  border: "1.5px solid rgba(var(--pink-rgb), .35)",
  borderRadius: 20,
  padding: "clamp(1.2rem, 4vw, 1.8rem)",
  boxShadow: "0 12px 40px rgba(var(--pink-deep-rgb), .1)",
};

async function persistSettings(settings: CoupleSettings) {
  updateSettings(settings);
  try {
    await fetch("/api/couples/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    });
  } catch {}
}

function fmtTime(tz: string, now: Date): { time: string; day: string } | null {
  try {
    const time = new Intl.DateTimeFormat(undefined, { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(now);
    const day = new Intl.DateTimeFormat(undefined, { timeZone: tz, weekday: "short" }).format(now);
    return { time, day };
  } catch { return null; }
}

/** Whole-hour offset between two zones, for the "X hours ahead/behind" line. */
function hourGap(tzA: string, tzB: string, now: Date): number | null {
  try {
    const get = (tz: string) =>
      Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false, minute: "numeric" })
        .formatToParts(now).find((p) => p.type === "hour")?.value);
    const a = get(tzA), b = get(tzB);
    if (Number.isNaN(a) || Number.isNaN(b)) return null;
    let d = a - b;
    if (d > 12) d -= 24;
    if (d < -12) d += 24;
    return d;
  } catch { return null; }
}

function Clock({ name, tz, now, mine }: { name: string; tz: string | undefined; now: Date; mine?: boolean }) {
  const t = tz ? fmtTime(tz, now) : null;
  return (
    <div style={{ flex: "1 1 130px", textAlign: "center" }}>
      <p style={{ fontFamily: SANS, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(var(--pink-deep-rgb), .55)", margin: "0 0 0.3rem" }}>
        {mine ? "you" : name}
      </p>
      <p style={{ fontFamily: SERIF, fontSize: "clamp(1.8rem,7vw,2.4rem)", fontWeight: 700, color: "var(--pink-deep)", margin: 0, lineHeight: 1 }}>
        {t ? t.time : "—"}
      </p>
      <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", margin: "0.25rem 0 0" }}>
        {t ? `${t.day} · ${(tz || "").split("/").pop()?.replace(/_/g, " ")}` : "not set yet"}
      </p>
    </div>
  );
}

export default function LongDistance() {
  const user = useUserData();
  const [now, setNow] = useState(() => new Date());
  const [sent, setSent] = useState(false);
  const [editVisit, setEditVisit] = useState(false);
  const [visitDraft, setVisitDraft] = useState("");
  const cooldown = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const settings = user?.settings;
  const myTz = settings?.timezones?.[mySlot(user?.role)];
  const theirTz = settings?.timezones?.[theirSlot(user?.role)];
  const partnerName = user?.partnerName || "them";

  // Auto-store this device's timezone the first time, so the partner's clock
  // can render without any manual setup.
  useEffect(() => {
    if (!user || !settings) return;
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && !myTz) {
      persistSettings({ ...settings, timezones: { ...(settings.timezones ?? {}), [mySlot(user.role)]: detected } });
    }
  }, [user, settings, myTz]);

  const gap = useMemo(() => (myTz && theirTz ? hourGap(theirTz, myTz, now) : null), [myTz, theirTz, now]);

  const updateMyTz = () => {
    if (!settings || !user) return;
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    persistSettings({ ...settings, timezones: { ...(settings.timezones ?? {}), [mySlot(user.role)]: detected } });
    buzz("tap");
  };

  const thinkingOfYou = async () => {
    if (cooldown.current) return;
    cooldown.current = true;
    buzz("double"); heartBump(); setSent(true);
    setTimeout(() => setSent(false), 2500);
    setTimeout(() => { cooldown.current = false; }, 4000);
    try {
      await fetch("/api/presence/heart", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji: "💭", section: "together" }),
      });
    } catch {}
  };

  const visit = settings?.nextVisit;
  const daysToVisit = useMemo(() => {
    if (!visit) return null;
    const target = new Date(`${visit}T00:00:00`).getTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.round((target - today) / 86_400_000);
  }, [visit, now]);

  const saveVisit = () => {
    if (!settings) return;
    persistSettings({ ...settings, nextVisit: visitDraft || undefined });
    setEditVisit(false);
  };

  if (!user) return null;

  return (
    <div style={{ width: "100%", maxWidth: 680, margin: "0 auto", display: "grid", gap: "1rem" }}>
      {/* Two-timezone clock */}
      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.6rem" }}>
          <Clock name="you" tz={myTz} now={now} mine />
          <div style={{ alignSelf: "center", fontSize: "1.3rem" }}>💞</div>
          <Clock name={partnerName} tz={theirTz} now={now} />
        </div>
        <p style={{ fontFamily: SCRIPT, fontSize: "1rem", color: "var(--muted)", textAlign: "center", margin: "0.8rem 0 0" }}>
          {!theirTz
            ? `ask ${partnerName} to open this page so their clock syncs 🕰️`
            : gap === 0 || gap === null
              ? "you're on the same clock right now 💗"
              : gap > 0
                ? `${partnerName} is ${Math.abs(gap)}h ahead of you`
                : `${partnerName} is ${Math.abs(gap)}h behind you`}
        </p>
        <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
          <button onClick={updateMyTz} style={linkBtn()}>update my timezone</button>
        </div>
      </div>

      {/* Thinking of you */}
      <div style={{ ...CARD, textAlign: "center" }}>
        <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1.2rem", color: "var(--pink-deep)", margin: "0 0 0.8rem" }}>
          a little hello across the miles
        </p>
        <motion.button onClick={thinkingOfYou} whileTap={{ scale: 0.94 }} whileHover={{ scale: 1.03 }}
          style={{ fontFamily: SCRIPT, fontSize: "1.3rem", border: "none", borderRadius: 50, padding: "0.8rem 1.8rem", cursor: "pointer", background: "linear-gradient(135deg, var(--pink), var(--pink-deep))", color: "#fff", boxShadow: "0 8px 26px rgba(var(--pink-deep-rgb), .35)" }}>
          {sent ? "sent 💭" : "thinking of you 💭"}
        </motion.button>
        <p style={{ fontFamily: SANS, fontSize: "0.74rem", color: "var(--muted)", margin: "0.7rem 0 0" }}>
          one tap and {partnerName} gets a little buzz — even if the app&apos;s closed
        </p>
      </div>

      {/* Countdown to next visit */}
      <div style={{ ...CARD, textAlign: "center" }}>
        <p style={{ fontFamily: SANS, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(var(--pink-deep-rgb), .5)", margin: "0 0 0.5rem" }}>
          next time together
        </p>
        {visit && !editVisit ? (
          <>
            <div style={{ fontFamily: SERIF, fontSize: "clamp(2.4rem,10vw,3.4rem)", fontWeight: 700, color: "var(--pink-deep)", lineHeight: 1 }}>
              {daysToVisit !== null && daysToVisit > 0 ? daysToVisit : daysToVisit === 0 ? "🎉" : "💗"}
            </div>
            <p style={{ fontFamily: SCRIPT, fontSize: "1.15rem", color: "var(--pink-deep)", margin: "0.3rem 0 0.2rem" }}>
              {daysToVisit !== null && daysToVisit > 0
                ? `${daysToVisit === 1 ? "day" : "days"} until you're together`
                : daysToVisit === 0 ? "it's today — go hug them!" : "hope it was wonderful 💗"}
            </p>
            <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: "var(--muted)", margin: 0 }}>
              {new Date(`${visit}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <button onClick={() => { setVisitDraft(visit); setEditVisit(true); }} style={{ ...linkBtn(), marginTop: "0.6rem" }}>change the date</button>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.7rem" }}>
            <p style={{ fontFamily: SCRIPT, fontSize: "1.05rem", color: "var(--muted)", margin: 0 }}>
              when do you next get to be together?
            </p>
            <input type="date" value={visitDraft} onChange={(e) => setVisitDraft(e.target.value)}
              style={{ fontFamily: SANS, fontSize: "0.95rem", padding: "0.55rem 0.8rem", borderRadius: 12, border: "1px solid rgba(var(--pink-rgb), .4)", background: "rgba(var(--pink-rgb), .06)", color: "var(--text)", outline: "none" }} />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {editVisit && <button onClick={() => setEditVisit(false)} style={{ ...btn(), background: "rgba(var(--pink-deep-rgb), .08)", color: "var(--pink-deep)" }}>cancel</button>}
              <motion.button whileTap={{ scale: 0.96 }} onClick={saveVisit} disabled={!visitDraft} style={{ ...btn(), opacity: visitDraft ? 1 : 0.5 }}>
                set the countdown 💞
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function btn(): React.CSSProperties {
  return { fontFamily: SANS, fontSize: "0.84rem", fontWeight: 700, border: "none", borderRadius: 50, padding: "0.55rem 1.3rem", cursor: "pointer", background: "linear-gradient(135deg, var(--pink), var(--pink-deep))", color: "#fff" };
}
function linkBtn(): React.CSSProperties {
  return { fontFamily: SANS, fontSize: "0.76rem", fontWeight: 600, color: "rgba(var(--pink-deep-rgb), .65)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: "0.2rem 0" };
}
