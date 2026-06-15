"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useEscKey } from "@/lib/useEscKey";

// Generic, heartfelt messages any couple can relate to
const MEMORIES = [
  {
    title: "how it started 🌸",
    body: "Every love story has a moment — a first conversation, a laugh that felt too easy, a silence that wasn't awkward at all. Yours had that too. Something in that early spark told you this was different. Not louder, just… realer. And it was. It really was.",
    rotation: -2,
  },
  {
    title: "their presence 💗",
    body: "There's something about the way they make a room feel different. You don't always notice it until they're gone and the room feels a little emptier. Their laugh, their voice, the way they say your name — it all lands a little differently than anyone else's ever has.",
    rotation: 1.5,
  },
  {
    title: "late nights 🌙",
    body: "The best conversations happen when you're both supposed to be asleep. The world gets quieter and somehow you get more honest. You say things at 2am you'd never say at 2pm. That version of them — sleepy, unguarded, soft — might be your favourite one.",
    rotation: -1,
  },
  {
    title: "the comfort 🤍",
    body: "It's rare, actually — finding someone you don't have to perform for. Someone you can be quiet around without it being weird, or have a bad day around without explaining it. They just get it. They just get you. That kind of ease doesn't happen twice.",
    rotation: 2,
  },
  {
    title: "home 💕",
    body: "Home isn't always a place. Sometimes it's a person. The one you want to tell things to first. The one whose opinion matters most. The one you think about when something good happens. They became that for you without even trying. You just looked up one day and they were home.",
    rotation: -2.5,
  },
  {
    title: "still you 🌷",
    body: "If you had to do it all again — every hard conversation, every nervous first, every moment you didn't know how it would turn out — you'd do it. Because it all led here. To this. To them. To a love that feels less like luck and more like the right answer to every question you didn't know you were asking.",
    rotation: 1,
  },
];

// 6 distinct themed shades — auto-adapt to active colour theme + dark mode
const CARD_SHADES = [
  { bg: "var(--rose)",                          border: "rgba(var(--pink-mid-rgb),0.6)"  },
  { bg: "var(--pink-light)",                    border: "rgba(var(--pink-rgb),0.5)"      },
  { bg: "rgba(var(--pink-mid-rgb),0.5)",        border: "var(--pink)"                   },
  { bg: "rgba(var(--pink-rgb),0.2)",            border: "var(--pink)"                   },
  { bg: "rgba(var(--pink-deep-rgb),0.15)",      border: "var(--pink-deep)"              },
  { bg: "rgba(var(--pink-mid-rgb),0.7)",        border: "var(--pink-mid)"               },
];

export default function MemoryCards() {
  const [active, setActive] = useState<number | null>(null);
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:"-80px" });
  useEscKey(() => setActive(null), active !== null);

  const activeShade = active !== null ? CARD_SHADES[active] : null;

  return (
    <section
      id="memories"
      ref={ref}
      style={{
        width:"100%",
        padding:"clamp(4rem,10vh,7rem) clamp(1rem,4vw,2.5rem)",
        background:"var(--cream)",
      }}
    >
      <motion.h2
        initial={{ opacity:0, y:30 }}
        animate={inView ? { opacity:1, y:0 } : {}}
        transition={{ duration:0.7 }}
        style={{
          fontFamily:"var(--font-playfair)", fontStyle:"italic",
          fontSize:"clamp(1.6rem,4vw,2.6rem)",
          color:"var(--pink-deep)", textAlign:"center", marginBottom:"0.4rem",
        }}
      >
        little love notes 🌸
      </motion.h2>
      <motion.p
        initial={{ opacity:0 }}
        animate={inView ? { opacity:1 } : {}}
        transition={{ duration:0.7, delay:0.2 }}
        style={{
          fontFamily:"var(--font-caveat)", fontSize:"clamp(1rem,2.5vw,1.25rem)",
          color:"var(--muted)", textAlign:"center",
          margin:"0 auto clamp(2rem,5vh,3.5rem)", maxWidth:480,
        }}
      >
        tap a card to read the full thing 💌
      </motion.p>

      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill, minmax(min(260px,100%), 1fr))",
        gap:"clamp(1rem,2.5vw,1.8rem)",
        maxWidth:1100,
        margin:"0 auto",
        width:"100%",
      }}>
        {MEMORIES.map((m, i) => {
          const shade = CARD_SHADES[i];
          return (
            <motion.div
              key={i}
              onClick={() => setActive(i)}
              initial={{ opacity:0, y:50, rotate:m.rotation }}
              animate={inView ? { opacity:1, y:0, rotate:m.rotation } : {}}
              transition={{ duration:0.5, delay:i * 0.08 }}
              whileHover={{ scale:1.04, rotate:0, zIndex:10, boxShadow:`8px 8px 32px rgba(var(--pink-deep-rgb),.18)` }}
              className="dk-mem-card"
              style={{
                background: shade.bg,
                border: `1.5px solid ${shade.border}`,
                borderRadius: 6,
                padding: "clamp(1.3rem,3vw,2rem) clamp(1rem,2.5vw,1.6rem) clamp(1rem,2.5vw,1.4rem)",
                minHeight: "clamp(170px,20vw,210px)",
                cursor: "pointer",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: `4px 4px 16px rgba(var(--pink-rgb),.1)`,
                transition: "box-shadow .2s",
              }}
            >
              <span style={{ position:"absolute", top:-14, left:"50%", transform:"translateX(-50%)", fontSize:"1.4rem" }}>📌</span>
              <h3 style={{
                fontFamily:"var(--font-caveat)", fontWeight:600,
                fontSize:"clamp(1.05rem,2.5vw,1.25rem)",
                marginBottom:"0.5rem", color:"var(--text)",
              }}>
                {m.title}
              </h3>
              <p style={{
                fontFamily:"var(--font-caveat)",
                fontSize:"clamp(0.88rem,2vw,1rem)",
                lineHeight:1.55, flex:1, color:"var(--muted)",
              }}>
                {m.body.length > 90 ? m.body.slice(0,90)+"…" : m.body}
              </p>
              <span style={{
                fontFamily:"var(--font-lato)", fontSize:"0.72rem",
                marginTop:"0.7rem", color:"var(--pink-deep)", opacity:0.75,
              }}>
                tap to read more ✨
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {active !== null && (
          <motion.div
            style={{
              position:"fixed", inset:0, zIndex:2000,
              display:"flex", alignItems:"center", justifyContent:"center",
              padding:"clamp(0.8rem,3vw,1.5rem)",
              background:"rgba(var(--pink-deep-rgb),.35)",
              backdropFilter:"blur(10px)",
              WebkitBackdropFilter:"blur(10px)",
            }}
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setActive(null)}
          >
            <motion.div
              className="dk-mem-modal memory-modal"
              style={{
                background: activeShade?.bg ?? "var(--cream)",
                border: `1.5px solid ${activeShade?.border ?? "var(--pink-mid)"}`,
                borderRadius: 24,
                padding: "clamp(2rem,5vw,3rem) clamp(1.5rem,4vw,2.5rem)",
                maxWidth: 500, width:"100%",
                position:"relative",
                boxShadow:`0 24px 60px rgba(var(--pink-deep-rgb),.28)`,
                maxHeight: "85dvh",
                overflowY: "auto",
              }}
              initial={{ scale:0.88, y:40 }}
              animate={{ scale:1, y:0 }}
              exit={{ scale:0.88, y:40 }}
              transition={{ type:"spring", stiffness:200, damping:22 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setActive(null)}
                style={{
                  position:"absolute", top:14, right:16, fontSize:"1.2rem",
                  background:"var(--cream)", border:"1px solid var(--pink-mid)",
                  borderRadius:"50%", width:30, height:30,
                  cursor:"pointer", color:"var(--muted)", lineHeight:1,
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}
              >✕</button>
              <h2 style={{
                fontFamily:"var(--font-playfair)", fontStyle:"italic",
                fontSize:"clamp(1.3rem,3.5vw,1.6rem)",
                color:"var(--pink-deep)", marginBottom:"1rem",
              }}>
                {MEMORIES[active].title}
              </h2>
              <p style={{
                fontFamily:"var(--font-caveat)",
                fontSize:"clamp(1rem,2.5vw,1.2rem)",
                color:"var(--text)", lineHeight:1.8,
              }}>
                {MEMORIES[active].body}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
