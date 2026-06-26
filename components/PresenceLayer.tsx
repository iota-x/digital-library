"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserData } from "@/lib/userStore";
import { heartBump, buzz } from "@/lib/haptics";
import { notePartnerTick } from "@/lib/presenceStore";
import CuteTooltip from "@/components/CuteTooltip";

/**
 * Lightweight presence + "send-a-heart" layer.
 *
 * Watches all `<section id="...">` elements with IntersectionObserver,
 * picks the most-visible one, and POSTs that as a "presence tick" every
 * ~4 seconds while the user is active. Reads incoming ticks from the
 * existing SSE channel (`annapp:sse` window event) to render a small
 * floating chip near the partner's current section.
 *
 * The send-a-heart button POSTs to /api/presence/heart which broadcasts
 * and also fires a push for the partner's case where the app is closed.
 *
 * Presence is intentionally ephemeral — no DB writes. If both partners
 * reload, both states clear and re-sync within seconds.
 */

const TICK_FAST  = 4000;   // while partner is active
const TICK_SLOW  = 20_000; // when nobody else is seen
const STALE_MS   = 14_000; // partner chip disappears after this
const HEART_TTL  = 1800;

// Reaction palette — the first is the default tap-to-send; the rest live
// behind a long-press. Must stay in sync with the server allow-list in
// /api/presence/heart.
const REACTION_EMOJIS = ["🩷", "😘", "🥺", "🤗", "🔥"];

interface PartnerPresence {
  section: string;
  name: string;
  ts: number;
}

interface FlyingHeart {
  id: string;
  startedAt: number;
  fromMe: boolean;
  emoji: string;
}

export default function PresenceLayer() {
  const userData = useUserData();
  const [partner, setPartner] = useState<PartnerPresence | null>(null);
  const [hearts,  setHearts]  = useState<FlyingHeart[]>([]);
  const [sending, setSending] = useState(false);
  const [tip, setTip] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const currentSection = useRef<string>("");
  const lastTickAt = useRef<number>(0);
  const lastPartnerSeenAt = useRef<number>(0);

  // Tick — POST current section periodically
  useEffect(() => {
    if (!userData) return;
    const sections = () => Array.from(document.querySelectorAll<HTMLElement>("section[id]"));

    let activeSection = "";
    const seen = new Map<string, number>(); // sectionId → ratio
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (!id) continue;
          seen.set(id, entry.intersectionRatio);
        }
        // Pick the section with the highest ratio that's at least 0.25
        let best: { id: string; ratio: number } | null = null;
        seen.forEach((ratio, id) => {
          if (ratio < 0.25) return;
          if (!best || ratio > best.ratio) best = { id, ratio };
        });
        activeSection = best ? (best as { id: string; ratio: number }).id : activeSection;
        currentSection.current = activeSection;
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    // Re-observe when sections change (route nav)
    const wire = () => {
      observer.disconnect();
      sections().forEach(s => observer.observe(s));
    };
    wire();
    const nav = () => setTimeout(wire, 150);
    window.addEventListener("popstate", nav);

    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      if (!currentSection.current) return;
      // Adaptive cadence: tick fast (~4s) while the partner is actively seen,
      // back off to slow (~20s) when their last tick was over 30s ago.
      const partnerActive = Date.now() - lastPartnerSeenAt.current < 30_000;
      const minGap = (partnerActive ? TICK_FAST : TICK_SLOW) - 250;
      if (Date.now() - lastTickAt.current < minGap) return;
      lastTickAt.current = Date.now();
      try {
        await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section: currentSection.current }),
        });
      } catch {}
    };
    // setInterval runs at TICK_FAST so we *can* tick fast when needed; the
    // tick body itself decides whether to actually send based on the gap.
    const interval = setInterval(tick, TICK_FAST);
    // Also fire on visibility regained
    const visHandler = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", visHandler);

    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", nav);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visHandler);
    };
  }, [userData]);

  // Listen to SSE relays
  useEffect(() => {
    if (!userData) return;
    const onSse = (e: Event) => {
      const detail = (e as CustomEvent).detail as { type: string; userId?: string; name?: string; section?: string; ts?: number; emoji?: string };
      if (!detail || !detail.type) return;

      // Ignore our own broadcasts (the SSE server doesn't filter)
      if (detail.userId === userData.userId) return;

      if (detail.type === "presence:tick" && detail.section) {
        lastPartnerSeenAt.current = Date.now();
        setPartner({ section: detail.section, name: detail.name || "them", ts: detail.ts || Date.now() });
        // Feed the shared presence store that powers "together" mode + doodle.
        notePartnerTick(detail.name, detail.section);
      } else if (detail.type === "presence:heart") {
        lastPartnerSeenAt.current = Date.now();
        const id = `h-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
        const emoji = typeof detail.emoji === "string" ? detail.emoji : "🩷";
        setHearts(hs => [...hs, { id, startedAt: Date.now(), fromMe: false, emoji }]);
        heartBump();
        buzz("double");
        setTimeout(() => setHearts(hs => hs.filter(h => h.id !== id)), HEART_TTL);
      }
    };
    window.addEventListener("annapp:sse", onSse as EventListener);
    return () => window.removeEventListener("annapp:sse", onSse as EventListener);
  }, [userData]);

  // Stale-out the partner chip after STALE_MS without an update
  useEffect(() => {
    if (!partner) return;
    const t = setInterval(() => {
      if (Date.now() - partner.ts > STALE_MS) setPartner(null);
    }, 2000);
    return () => clearInterval(t);
  }, [partner]);

  const sendReaction = async (emoji: string) => {
    if (sending) return;
    setSending(true);
    // Optimistic in-app reaction for the sender
    const id = `h-self-${Date.now()}`;
    setHearts(hs => [...hs, { id, startedAt: Date.now(), fromMe: true, emoji }]);
    heartBump();
    buzz("double");
    setTimeout(() => setHearts(hs => hs.filter(h => h.id !== id)), HEART_TTL);
    try {
      await fetch("/api/presence/heart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: currentSection.current, emoji }),
      });
    } catch {}
    setTimeout(() => setSending(false), 600);
  };

  // Long-press the FAB to reveal the reaction palette; a plain tap sends a heart.
  const startPress = () => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => { longPressed.current = true; setPaletteOpen(true); heartBump(); }, 350);
  };
  const clearPress = () => { if (pressTimer.current) clearTimeout(pressTimer.current); pressTimer.current = null; };
  const onFabClick = () => {
    if (longPressed.current) { longPressed.current = false; return; } // long-press opened the palette
    if (paletteOpen) { setPaletteOpen(false); return; }
    sendReaction("🩷");
  };

  // Only render when user is loaded AND there's actually a partner to ping.
  // Solo couples (creator hasn't been joined yet) get no heart button —
  // there's nobody on the other end.
  if (!userData) return null;
  if (!userData.partnerName) return null;

  return (
    <>
      {/* Partner presence chip — pinned to the right edge near the active section */}
      <AnimatePresence>
        {partner && (
          <PartnerChip key="chip" partner={partner} />
        )}
      </AnimatePresence>

      {/* Flying hearts */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        zIndex: 9970, overflow: "hidden",
      }}>
        <AnimatePresence>
          {hearts.map(h => (
            <motion.span
              key={h.id}
              initial={{ y: "100vh", x: h.fromMe ? "calc(100vw - 7rem)" : `${50 + ((Math.random() - 0.5) * 30)}vw`, opacity: 0, scale: 0.4 }}
              animate={{ y: "-20vh", opacity: [0, 1, 1, 0], scale: [0.4, 1.2, 1, 0.8] }}
              exit={{ opacity: 0 }}
              transition={{ duration: HEART_TTL / 1000, ease: "easeOut" }}
              style={{
                position: "absolute",
                fontSize: "2.6rem",
                filter: "drop-shadow(0 6px 20px rgba(var(--pink-deep-rgb), .7))",
              }}
            >{h.emoji}</motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* Click-away backdrop while the reaction palette is open */}
      {paletteOpen && (
        <div
          onClick={() => setPaletteOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 934 }}
          aria-hidden
        />
      )}

      {/* Reaction FAB — tap sends a heart, long-press opens more reactions.
          Bottom-right, above the mobile tab bar. */}
      <div style={{
        position: "fixed",
        right: "max(1rem, env(safe-area-inset-right))",
        bottom: "calc(max(1rem, env(safe-area-inset-bottom)) + 78px)",
        zIndex: 935,
        display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
      }}>
        <AnimatePresence>
          {paletteOpen && (
            <motion.div
              key="reaction-palette"
              initial={{ opacity: 0, y: 12, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              style={{
                display: "flex", flexDirection: "column", gap: "0.45rem",
                background: "var(--cream)",
                border: "1px solid rgba(var(--pink-rgb), .4)",
                borderRadius: 50, padding: "0.5rem",
                boxShadow: "0 12px 30px rgba(var(--pink-deep-rgb), .25)",
              }}
            >
              {REACTION_EMOJIS.filter(e => e !== "🩷").map(e => (
                <motion.button key={e}
                  whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.85 }}
                  onClick={() => { sendReaction(e); setPaletteOpen(false); }}
                  aria-label={`send ${e}`}
                  style={{
                    width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer",
                    background: "rgba(var(--pink-rgb), .12)", fontSize: "1.3rem",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                  {e}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onPointerDown={startPress}
          onPointerUp={clearPress}
          onPointerLeave={clearPress}
          onClick={onFabClick}
          whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.86 }}
          onHoverStart={() => setTip(true)} onHoverEnd={() => setTip(false)}
          onFocus={() => setTip(true)} onBlur={() => setTip(false)}
          // Soft idle heartbeat so it feels alive and invites a tap (pauses while the palette is open).
          animate={paletteOpen ? { scale: 1 } : { scale: [1, 1.06, 1, 1.06, 1] }}
          transition={paletteOpen ? { duration: 0.2 } : { duration: 2.6, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
          aria-label={`send a reaction to ${userData.partnerName || "your love"}`}
          style={{
            width: 54, height: 54,
            borderRadius: "50%",
            border: "1.5px solid rgba(var(--pink-rgb), .5)",
            background: "linear-gradient(135deg, var(--pink), var(--pink-deep))",
            color: "#fff", fontSize: "1.5rem",
            cursor: sending ? "wait" : "pointer",
            boxShadow: "0 10px 28px rgba(var(--pink-deep-rgb), .35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            touchAction: "none",
          }}
        >
          🩷
          <CuteTooltip
            show={tip && !paletteOpen}
            placement="left"
            label="tap for a heart · hold for more 💗"
          />
        </motion.button>
      </div>
    </>
  );
}

function PartnerChip({ partner }: { partner: PartnerPresence }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  // Re-measure where the partner's section sits in the viewport
  useEffect(() => {
    const measure = () => {
      const el = document.getElementById(partner.section);
      if (!el) { setPos(null); return; }
      const rect = el.getBoundingClientRect();
      // Anchor to the vertical center of the section, pinned to the right edge
      const top = Math.min(window.innerHeight - 80, Math.max(80, rect.top + rect.height / 2 - 16));
      setPos({ top, right: 14 });
    };
    measure();
    const onScroll = () => measure();
    const onResize = () => measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [partner.section]);

  if (!pos) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      style={{
        position: "fixed",
        top: pos.top, right: pos.right,
        zIndex: 930,
        display: "flex", alignItems: "center", gap: "0.4rem",
        background: "rgba(var(--pink-deep-rgb), .14)",
        WebkitBackdropFilter: "blur(10px)", backdropFilter: "blur(10px)",
        border: "1px solid rgba(var(--pink-rgb), .45)",
        borderRadius: 50,
        padding: "0.32rem 0.7rem 0.32rem 0.45rem",
        fontFamily: 'var(--font-lato), "Inter", system-ui, sans-serif',
        fontSize: "0.72rem", color: "var(--pink-deep)", fontWeight: 700,
        boxShadow: "0 6px 20px rgba(var(--pink-deep-rgb), .18)",
        pointerEvents: "none",
      }}>
      <span
        aria-hidden
        style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "var(--pink-deep)",
          boxShadow: "0 0 0 4px rgba(var(--pink-rgb), .28)",
          animation: "ann-presence-pulse 2s ease-in-out infinite",
        }}
      />
      <span>{partner.name}</span>
    </motion.div>
  );
}
