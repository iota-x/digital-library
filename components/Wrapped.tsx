"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserData } from "@/lib/userStore";
import { DISPLAY, SANS, SCRIPT } from "@/lib/typography";
import { buzz, heartBump } from "@/lib/haptics";
import { shareWrapped, type ShareStats } from "@/lib/shareCard";

interface WrappedData {
  names: { you: string; partner: string };
  coupleName: string;
  startDate: string;
  daysTogether: number;
  journal: { entries: number; photos: number; specialDays: number; topMood: string | null; topMoodCount: number; longestStreak: number };
  daily: { answeredTogether: number; longestStreak: number };
  quizzes: { played: number; bestMatched: number; bestTotal: number };
  loveJar: number;
  bucket: { total: number; done: number };
  watch: { total: number; done: number };
  voiceNotes: number;
  capsules: number;
}

interface Card { bg: string; node: React.ReactNode }

const CARD_MS = 6000;

export default function Wrapped() {
  const user = useUserData();
  const [data, setData] = useState<WrappedData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState("");

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const r = await fetch("/api/wrapped", { cache: "no-store" });
      if (!r.ok) throw new Error();
      setData((await r.json()) as WrappedData);
    } catch { setFailed(true); }
    finally { setLoaded(true); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const matchPct = data && data.quizzes.bestTotal ? Math.round((data.quizzes.bestMatched / data.quizzes.bestTotal) * 100) : null;

  const cards = useMemo<Card[]>(() => {
    if (!data) return [];
    const you = data.names.you, partner = data.names.partner;
    const title = data.coupleName?.trim() || `${you} & ${partner}`;
    const list: Card[] = [];

    list.push({ bg: "linear-gradient(160deg,color-mix(in srgb,var(--pink) 60%,#fff),var(--pink))", node: (
      <Stage>
        <Kicker>us, wrapped</Kicker>
        <Big style={{ fontSize: "clamp(2.2rem,8vw,3rem)" }}>{title}</Big>
        <Soft>your story so far — one card at a time ✨</Soft>
      </Stage>
    ) });

    list.push({ bg: "linear-gradient(160deg,var(--pink),var(--pink-deep))", node: (
      <Stage>
        <Soft>you&apos;ve been together</Soft>
        <Big style={{ fontSize: "clamp(4rem,20vw,7rem)", lineHeight: 1 }}>{data.daysTogether}</Big>
        <Big style={{ fontSize: "clamp(1.4rem,5vw,2rem)" }}>days 💞</Big>
        <Soft>and every one of them counted</Soft>
      </Stage>
    ) });

    if (data.journal.entries > 0) {
      list.push({ bg: "linear-gradient(160deg,color-mix(in srgb,var(--pink) 75%,#fff),var(--pink-deep))", node: (
        <Stage>
          <Soft>together you kept</Soft>
          <Big style={{ fontSize: "clamp(3.5rem,16vw,6rem)" }}>{data.journal.entries}</Big>
          <Big style={{ fontSize: "clamp(1.3rem,4.5vw,1.8rem)" }}>memories 📖</Big>
          {data.journal.photos > 0 && <Soft>· {data.journal.photos} photos pinned up ·</Soft>}
          {data.journal.longestStreak > 1 && <Soft>longest journaling streak: {data.journal.longestStreak} days 🔥</Soft>}
        </Stage>
      ) });
    }

    if (data.journal.topMood) {
      list.push({ bg: "linear-gradient(160deg,var(--pink),color-mix(in srgb,var(--pink-deep) 65%,#000))", node: (
        <Stage>
          <Soft>your most-felt mood</Soft>
          <Big style={{ fontSize: "clamp(3rem,14vw,5rem)" }}>{data.journal.topMood}</Big>
          <Soft>logged {data.journal.topMoodCount} {data.journal.topMoodCount === 1 ? "time" : "times"}</Soft>
        </Stage>
      ) });
    }

    if (data.daily.answeredTogether > 0) {
      list.push({ bg: "linear-gradient(160deg,var(--pink),var(--pink-deep))", node: (
        <Stage>
          <Soft>questions you answered together</Soft>
          <Big style={{ fontSize: "clamp(3.5rem,16vw,6rem)" }}>{data.daily.answeredTogether}</Big>
          {data.daily.longestStreak > 1 && <Soft>best streak: {data.daily.longestStreak} days in a row 💌</Soft>}
        </Stage>
      ) });
    }

    if (matchPct != null) {
      list.push({ bg: "linear-gradient(160deg,color-mix(in srgb,var(--pink) 55%,#fff),var(--pink))", node: (
        <Stage>
          <Soft>at your most in sync, you were</Soft>
          <Big style={{ fontSize: "clamp(4rem,18vw,6.5rem)" }}>{matchPct}%</Big>
          <Soft>aligned on a quiz 💞</Soft>
        </Stage>
      ) });
    }

    // Little tallies card — only the non-zero ones.
    const tallySource: Array<[number, string]> = [
      [data.loveJar, "reasons in the jar 🫙"],
      [data.bucket.done, "dreams checked off ✅"],
      [data.watch.done, "things watched together 🎬"],
      [data.voiceNotes, "voice notes left 🎙️"],
      [data.capsules, "letters to the future 💌"],
    ];
    const tallies = tallySource.filter(([n]) => n > 0);
    if (tallies.length) {
      list.push({ bg: "linear-gradient(160deg,color-mix(in srgb,var(--pink) 70%,#fff),var(--pink-deep))", node: (
        <Stage>
          <Soft>the little things add up</Soft>
          <div style={{ display: "grid", gap: "0.6rem", marginTop: "0.6rem" }}>
            {tallies.map(([n, l]) => (
              <div key={l} style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", justifyContent: "center" }}>
                <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: "2.2rem", color: "#fff", letterSpacing: "-0.02em" }}>{n}</span>
                <span style={{ fontFamily: SANS, fontSize: "0.95rem", color: "rgba(255,255,255,0.9)" }}>{l}</span>
              </div>
            ))}
          </div>
        </Stage>
      ) });
    }

    list.push({ bg: "linear-gradient(160deg,var(--pink),var(--pink-deep))", node: (
      <Stage>
        <Kicker>that&apos;s your story — so far</Kicker>
        <Big style={{ fontSize: "clamp(1.8rem,7vw,2.6rem)" }}>{title} 💗</Big>
        <Soft>here&apos;s to all the days still coming</Soft>
      </Stage>
    ) });

    return list;
  }, [data, matchPct]);

  // Auto-advance through the cards like a story reel.
  useEffect(() => {
    if (paused || !cards.length || idx >= cards.length - 1) return;
    const t = setTimeout(() => setIdx((i) => Math.min(i + 1, cards.length - 1)), CARD_MS);
    return () => clearTimeout(t);
  }, [idx, paused, cards.length]);

  const go = (dir: 1 | -1) => {
    buzz("tap");
    setIdx((i) => Math.max(0, Math.min(cards.length - 1, i + dir)));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cards.length]);

  const onShare = async () => {
    if (!data || sharing) return;
    setSharing(true); setShareMsg("");
    const stats: ShareStats = {
      youName: data.names.you, partnerName: data.names.partner, coupleName: data.coupleName,
      daysTogether: data.daysTogether, memories: data.journal.entries, photos: data.journal.photos,
      daily: data.daily.answeredTogether, matchPct, loveNotes: data.loveJar,
      bucketDone: data.bucket.done, moviesDone: data.watch.done,
    };
    try {
      const how = await shareWrapped(stats);
      heartBump();
      setShareMsg(how === "shared" ? "shared 💗" : "saved to your photos 💗");
    } catch { setShareMsg("couldn't make the card — try again"); }
    finally { setSharing(false); }
  };

  // Loading / error both render inside the same phone-shaped frame as the real
  // player, so the page looks intentional instead of a void with floating text.
  if (!loaded) {
    return (
      <Stack>
        <Frame>
          <motion.div animate={{ opacity: [0.55, 1, 0.55] }} transition={{ repeat: Infinity, duration: 1.5 }}
            style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.8rem", padding: "2rem", textAlign: "center" }}>
            <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} style={{ fontSize: "2.4rem" }}>💞</motion.div>
            <p style={{ fontFamily: SCRIPT, fontSize: "1.15rem", color: "#fff", margin: 0 }}>counting up your year…</p>
          </motion.div>
        </Frame>
        <p style={{ fontFamily: SANS, fontSize: "0.74rem", color: "var(--muted)", margin: 0 }}>gathering every little moment 💗</p>
      </Stack>
    );
  }
  if (failed || !data) {
    return (
      <Stack>
        <Frame>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: "2.2rem" }}>💭</div>
            <p style={{ fontFamily: SCRIPT, fontSize: "1.2rem", color: "#fff", margin: 0 }}>couldn&apos;t load your wrapped</p>
            <motion.button whileTap={{ scale: 0.96 }} onClick={load} style={{ ...pillBtn(), background: "#fff", color: "#be185d" }}>try again</motion.button>
          </div>
        </Frame>
      </Stack>
    );
  }

  const last = idx === cards.length - 1;

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      {/* Glow halo so the phone sits on the backdrop intentionally */}
      <div aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(120vw, 560px)", height: "min(120vw, 560px)", borderRadius: "50%", background: "radial-gradient(circle, rgba(var(--pink-rgb),0.35), rgba(var(--pink-rgb),0) 65%)", filter: "blur(20px)", zIndex: 0, pointerEvents: "none" }} />
      <div
        onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)}
        onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)}
        style={{
          position: "relative", zIndex: 1, width: "min(94vw, 420px)", aspectRatio: "9 / 16",
          borderRadius: 28, overflow: "hidden", userSelect: "none",
          boxShadow: "0 24px 70px rgba(var(--pink-deep-rgb), .3)",
        }}
      >
        {/* Progress bars */}
        <div style={{ position: "absolute", top: 14, left: 14, right: 14, zIndex: 4, display: "flex", gap: 5 }}>
          {cards.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.3)", overflow: "hidden" }}>
              <motion.div
                style={{ height: "100%", background: "#fff", transformOrigin: "left" }}
                initial={false}
                animate={{ scaleX: i < idx ? 1 : i === idx ? 1 : 0 }}
                transition={{ duration: i === idx && !paused ? CARD_MS / 1000 : 0, ease: "linear" }}
              />
            </div>
          ))}
        </div>

        {/* Tap zones */}
        <button aria-label="previous" onClick={() => go(-1)} style={{ position: "absolute", inset: "0 65% 0 0", zIndex: 3, background: "transparent", border: "none", cursor: "pointer" }} />
        <button aria-label="next" onClick={() => go(1)} style={{ position: "absolute", inset: "0 0 0 35%", zIndex: 3, background: "transparent", border: "none", cursor: "pointer" }} />

        <AnimatePresence mode="wait">
          <motion.div key={idx}
            initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: "absolute", inset: 0, background: cards[idx].bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "2.6rem 1.7rem" }}
          >
            {/* top sheen for depth */}
            <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 70% at 50% -10%, rgba(255,255,255,0.28), rgba(255,255,255,0) 55%)" }} />
            {/* soft bottom vignette so the share button + footer stay legible */}
            <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.18) 100%)" }} />
            {cards[idx].node}
          </motion.div>
        </AnimatePresence>

        {/* Share CTA on the last card */}
        {last && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 22, zIndex: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <motion.button whileTap={{ scale: 0.96 }} onClick={onShare} disabled={sharing}
              style={{ ...pillBtn(), background: "#fff", color: "#be185d", boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
              {sharing ? "making your card…" : "share our wrapped 📤"}
            </motion.button>
            {shareMsg && <span style={{ fontFamily: SANS, fontSize: "0.78rem", color: "#fff" }}>{shareMsg}</span>}
          </div>
        )}
      </div>

      <p style={{ fontFamily: SANS, fontSize: "0.74rem", color: "var(--muted)", margin: 0 }}>
        tap to move · hold to pause
      </p>
    </div>
  );
}

/* ── little presentational helpers (white-on-gradient story text) ── */
function Stage({ children }: { children: React.ReactNode }) {
  return <div style={{ position: "relative", zIndex: 1, textAlign: "center", display: "flex", flexDirection: "column", gap: "0.55rem", color: "#fff" }}>{children}</div>;
}
function Big({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontFamily: DISPLAY, fontWeight: 700, color: "#fff", lineHeight: 1.02, letterSpacing: "-0.02em", textShadow: "0 6px 30px rgba(0,0,0,0.22)", ...style }}>{children}</div>;
}
function Soft({ children }: { children: React.ReactNode }) {
  return <p style={{ fontFamily: SCRIPT, fontSize: "clamp(1.05rem,3.8vw,1.3rem)", color: "rgba(255,255,255,0.94)", margin: 0 }}>{children}</p>;
}
function Kicker({ children }: { children: React.ReactNode }) {
  return <p style={{ fontFamily: SANS, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(255,255,255,0.88)", margin: 0 }}>{children}</p>;
}
function Stack({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>{children}</div>;
}
/** The phone-shaped card used for loading/error so they match the real player. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: "relative", width: "min(94vw, 420px)", aspectRatio: "9 / 16",
      borderRadius: 28, overflow: "hidden",
      background: "linear-gradient(160deg,var(--pink),var(--pink-deep))",
      boxShadow: "0 24px 70px rgba(var(--pink-deep-rgb), .28)",
    }}>
      {children}
    </div>
  );
}
function pillBtn(): React.CSSProperties {
  return { fontFamily: SANS, fontSize: "0.9rem", fontWeight: 700, border: "none", borderRadius: 50, padding: "0.7rem 1.5rem", cursor: "pointer", background: "var(--pink-deep)", color: "#fff" };
}
