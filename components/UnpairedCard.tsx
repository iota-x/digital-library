"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useUserData } from "@/lib/userStore";
import { SANS, SERIF } from "@/lib/typography";
import InvitePartner from "@/components/InvitePartner";

const DISMISS_KEY = "ann_invite_card_hidden_v1";

/**
 * Shown at the top of Home for a creator whose partner hasn't joined yet — the
 * app is hollow until both are in, so this is a gentle, persistent (dismissible)
 * nudge to get partner #2 through the door, with the full invite toolkit inline.
 * Renders nothing once paired, or for the partner role.
 */
export default function UnpairedCard() {
  const user = useUserData();
  const [hidden, setHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });

  // Only the creator, only while unpaired.
  const unpaired = user?.role === "creator" && !user?.partnerName;
  if (!unpaired || hidden) return null;

  const dismiss = () => { try { localStorage.setItem(DISMISS_KEY, "1"); } catch {} setHidden(true); };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ padding: "1.4rem clamp(1rem,3vw,2rem) 0.4rem" }}
    >
      <div style={{
        position: "relative",
        maxWidth: 560, margin: "0 auto", padding: "1.4rem 1.3rem 1.5rem",
        borderRadius: 22,
        background: "linear-gradient(135deg, rgba(var(--pink-rgb),0.12), rgba(var(--pink-mid-rgb,249,168,212),0.16))",
        border: "1px solid rgba(var(--pink-mid-rgb,249,168,212),0.45)",
        boxShadow: "0 10px 34px rgba(var(--pink-deep-rgb),0.14)",
      }}>
        <button
          onClick={dismiss}
          aria-label="hide invite card"
          style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "1.1rem", lineHeight: 1 }}
          data-no-touch-min
        >×</button>

        <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1.25rem", color: "var(--pink-deep)", margin: "0 0 0.3rem" }}>
          it&apos;s a little quiet in here 🌷
        </p>
        <p style={{ fontFamily: SANS, fontSize: "0.86rem", color: "var(--text)", opacity: 0.8, margin: "0 0 1.1rem", lineHeight: 1.5 }}>
          your person hasn&apos;t joined yet. once they&apos;re in, everything here comes alive — shared journal,
          daily questions, the days-together timer, all of it. send them in:
        </p>

        <InvitePartner />
      </div>
    </motion.section>
  );
}
