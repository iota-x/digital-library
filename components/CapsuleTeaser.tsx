"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const SERIF  = `"Georgia","Times New Roman",serif`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
const SCRIPT = `var(--font-caveat),"Caveat",cursive`;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface Pending { unlockDate: string; from?: string; }

function fmt(d: string) {
  const dt = new Date(d + "T12:00:00");
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

function daysUntil(d: string) {
  return Math.ceil((new Date(d + "T12:00:00").getTime() - Date.now()) / 86400000);
}

export default function CapsuleTeaser() {
  const [upcoming, setUpcoming] = useState<Pending[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("capsule_pending");
      if (!raw) return;
      const all = JSON.parse(raw) as Pending[];
      const today = new Date().toISOString().slice(0, 10);
      const items = all
        .filter(p => p.unlockDate > today)
        .sort((a, b) => a.unlockDate.localeCompare(b.unlockDate))
        .slice(0, 3);
      setUpcoming(items);
    } catch {}
  }, []);

  if (!upcoming.length) return null;

  return (
    <section style={{
      width: "100%",
      padding: "clamp(2rem,5vh,3rem) clamp(1rem,4vw,2.5rem)",
      background: "linear-gradient(160deg,var(--rose),var(--pink-light))",
    }}>
      <div style={{ maxWidth: 540, margin: "0 auto" }}>

        <div style={{ display:"flex", alignItems:"center", gap:"0.8rem", marginBottom:"1.1rem" }}>
          <div style={{ width:30, height:1, background:"linear-gradient(90deg,transparent,rgba(var(--pink-deep-rgb),.3))" }}/>
          <span style={{ fontFamily:SANS, fontSize:"0.68rem", color:"rgba(var(--pink-deep-rgb),.5)", letterSpacing:"0.18em", textTransform:"uppercase" }}>
            sealed letters
          </span>
          <div style={{ flex:1, height:1, background:"linear-gradient(90deg,rgba(var(--pink-deep-rgb),.3),transparent)" }}/>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:"0.55rem" }}>
          {upcoming.map((p, i) => {
            const days = daysUntil(p.unlockDate);
            return (
              <motion.div key={i}
                initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                transition={{ delay: i * 0.07 }}
                style={{
                  background: "rgba(255,255,255,.82)",
                  border: "1px solid rgba(var(--pink-deep-rgb),.14)",
                  borderRadius: 16,
                  padding: "0.9rem 1.15rem",
                  display: "flex", alignItems: "center", gap: "0.85rem",
                  boxShadow: "0 2px 12px rgba(var(--pink-deep-rgb),.06)",
                }}
              >
                <span style={{ fontSize:"1.3rem", flexShrink:0 }}>🔒</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontFamily:SERIF, fontStyle:"italic", fontSize:"0.88rem", color:"#4a1628", margin:0, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
                    {p.from ? `from ${p.from}` : "a sealed letter"} — unlocks {fmt(p.unlockDate)}
                  </p>
                  <p style={{ fontFamily:SANS, fontSize:"0.66rem", color:"rgba(var(--pink-deep-rgb),.5)", margin:"0.12rem 0 0" }}>
                    {days > 0 ? `${days} day${days !== 1 ? "s" : ""} to go` : "unlocking soon…"}
                  </p>
                </div>
                <div style={{ width:40, height:4, borderRadius:2, background:"rgba(var(--pink-deep-rgb),.1)", overflow:"hidden", flexShrink:0 }}>
                  <div style={{
                    height:"100%",
                    width:`${Math.max(5, 100 - Math.min(100, (days / 365) * 100))}%`,
                    background:"linear-gradient(90deg,var(--pink),var(--pink-deep))",
                    borderRadius:2,
                  }}/>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div style={{ textAlign:"center", marginTop:"0.9rem" }}>
          <Link href="/capsule" style={{ textDecoration:"none" }}>
            <span style={{ fontFamily:SCRIPT, fontSize:"1rem", color:"rgba(var(--pink-deep-rgb),.48)", cursor:"pointer" }}>
              see all capsules →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
