"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserData, displayName, partnerDisplayName } from "@/lib/userStore";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";
import { shareMilestone } from "@/lib/shareCard";


interface Milestone { days: number; label: string; emoji: string }

const MILESTONES: Milestone[] = [
  { days:   7, label: "1 week",      emoji: "🌱" },
  { days:  14, label: "2 weeks",     emoji: "🌷" },
  { days:  30, label: "1 month",     emoji: "🌸" },
  { days:  60, label: "2 months",    emoji: "💕" },
  { days:  90, label: "3 months",    emoji: "💗" },
  { days: 100, label: "100 days",    emoji: "🎉" },
  { days: 180, label: "6 months",    emoji: "💫" },
  { days: 365, label: "1 year",      emoji: "🎊" },
  { days: 500, label: "500 days",    emoji: "✨" },
  { days: 730, label: "2 years",     emoji: "💞" },
];

function getCurrentMilestone(startDate: Date): Milestone | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const days = Math.floor((today.getTime() - start.getTime()) / 86400000);
  return MILESTONES.find(m => m.days === days) ?? null;
}

export default function MilestoneCelebration() {
  const user = useUserData();
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [visible, setVisible] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!user?.startDate) return;
    const start = new Date(user.startDate + "T00:00:00");
    const m = getCurrentMilestone(start);
    if (!m) return;

    const key = `milestone_seen_${m.days}`;
    try {
      if (localStorage.getItem(key)) return;
    } catch {}

    setMilestone(m);
    setVisible(true);
  }, [user?.startDate]);

  const dismiss = () => {
    if (milestone) {
      try { localStorage.setItem(`milestone_seen_${milestone.days}`, "1"); } catch {}
    }
    setVisible(false);
  };

  const coupleName = user?.settings?.coupleName?.trim() ||
    (user?.partnerName ? `${displayName(user)} & ${partnerDisplayName(user)}` : "you two");

  // Share at the emotional peak — a branded card carrying a referral link so the
  // most shareable moment in the app turns into word-of-mouth.
  const share = async () => {
    if (!milestone || sharing) return;
    setSharing(true);
    let referralUrl: string | undefined;
    try {
      const d = await (await fetch("/api/couples/referral")).json();
      if (d?.referralCode && typeof window !== "undefined") referralUrl = `${window.location.origin}/?ref=${d.referralCode}`;
    } catch {}
    try {
      await shareMilestone({ label: milestone.label, emoji: milestone.emoji, coupleName, daysTogether: milestone.days }, referralUrl);
    } catch {}
    setSharing(false);
    dismiss();
  };

  return (
    <AnimatePresence>
      {visible && milestone && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={dismiss}
            style={{ position:"fixed", inset:0, zIndex:9998, background:"rgba(0,0,0,.5)", WebkitBackdropFilter: "blur(6px)", backdropFilter: "blur(6px)" }}
          />
          <motion.div
            initial={{ opacity:0, scale:0.8, y:40 }}
            animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:0.9, y:20 }}
            transition={{ type:"spring", stiffness:260, damping:22 }}
            style={{
              position:"fixed", zIndex:9999,
              top:"50%", left:"50%", transform:"translate(-50%,-50%)",
              width:"min(420px, 92vw)",
              background:"var(--cream)",
              borderRadius:28,
              padding:"2.5rem 2rem",
              boxShadow:"0 32px 100px rgba(var(--pink-deep-rgb),.3)",
              border:"2px solid var(--pink-mid)",
              textAlign:"center",
            }}
          >
            {/* Confetti blobs */}
            {["🎉","🌸","💗","✨","🎊","🩷","💕","🌷"].map((e,i) => (
              <motion.span key={i} style={{
                position:"absolute", fontSize:"1.4rem",
                top:`${10+Math.random()*80}%`, left:`${5+Math.random()*90}%`,
                pointerEvents:"none",
              }}
                animate={{ y:[-8,8,-8], rotate:[-10,10,-10], opacity:[0.6,1,0.6] }}
                transition={{ repeat:Infinity, duration:2+i*0.3, delay:i*0.15 }}
              >{e}</motion.span>
            ))}

            <motion.div
              style={{ fontSize:"4.5rem", marginBottom:"0.8rem", display:"block" }}
              animate={{ scale:[1,1.2,1], rotate:[-5,5,-5] }}
              transition={{ repeat:Infinity, duration:1.8 }}
            >
              {milestone.emoji}
            </motion.div>

            <p style={{ fontFamily:SANS, fontSize:"0.72rem", letterSpacing:"0.2em", textTransform:"uppercase", color:"var(--muted)", margin:"0 0 0.4rem" }}>
              today marks
            </p>
            <h2 style={{ fontFamily:SERIF, fontStyle:"italic", fontSize:"clamp(2rem,6vw,2.8rem)", color:"var(--pink-deep)", margin:"0 0 0.5rem", lineHeight:1.1 }}>
              {milestone.label} together
            </h2>
            <p style={{ fontFamily:SCRIPT, fontSize:"1.2rem", color:"var(--muted)", margin:"0 0 1.8rem" }}>
              {coupleName} 💗
            </p>

            <div style={{ display:"flex", gap:"0.6rem", justifyContent:"center", flexWrap:"wrap" }}>
              <motion.button
                onClick={share} disabled={sharing}
                whileHover={{ scale:1.04, y:-2 }} whileTap={{ scale:0.97 }}
                style={{
                  fontFamily:SCRIPT, fontSize:"1.15rem",
                  background:"linear-gradient(135deg,var(--pink),var(--pink-deep))",
                  color:"#fff", border:"none", borderRadius:50,
                  padding:"0.85rem 2rem", cursor:"pointer",
                  boxShadow:"0 6px 24px rgba(var(--pink-deep-rgb),.35)",
                }}
              >
                {sharing ? "making your card…" : "share this 💌"}
              </motion.button>
              <motion.button
                onClick={dismiss}
                whileHover={{ scale:1.04, y:-2 }} whileTap={{ scale:0.97 }}
                style={{
                  fontFamily:SCRIPT, fontSize:"1.15rem",
                  background:"rgba(var(--pink-rgb),0.12)",
                  color:"var(--pink-deep)", border:"none", borderRadius:50,
                  padding:"0.85rem 1.8rem", cursor:"pointer",
                }}
              >
                celebrate! 🎉
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
