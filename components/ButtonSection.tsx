"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";

// Spoken in the partner's first-person voice — whoever is logged in, the "me"
// is the person who loves them, so it reads right for both partners.
const BUTTONS = [
  {
    emoji: "🤗",
    sub: "when you miss me",
    msg: "i'm always with you 🩷",
    sub2: "distance is just distance — our love is not. close your eyes, i'm right there 💗",
    emojis: "🫂 💗 🤍",
    gif: "holding.gif",
  },
  {
    emoji: "🫠",
    sub: "when you overthink",
    msg: "breathe. you're doing better than you think",
    sub2: "your brain lies sometimes. my love is real, the worry is not. 💫",
    emojis: "🌀 💗 ✨ 🩷 🫶",
    gif: "hugging.gif",
  },
  {
    emoji: "🥺",
    sub: "when you feel sad",
    msg: "it's okay to not be okay",
    sub2: "you don't have to hold it all in — i love you and i want to hear about it 🌷",
    emojis: "🥺 💗 🫂",
    gif: "hold.gif",
  },
  {
    emoji: "😭",
    sub: "when you can't sleep",
    msg: "3am thoughts are loudest, but my love is louder",
    sub2: "send me a message. i want to hear from you more than you know 🌙",
    emojis: "🌙 🩷 📞 ✨",
    gif: "peeking.gif",
  },
];

// Each card gets a distinctly different shade of the active theme
const CARD_SHADES = [
  {
    bg: "var(--rose)",
    border: "rgba(var(--pink-mid-rgb),0.7)",
    shadow: "rgba(var(--pink-rgb),0.12)",
  },
  {
    bg: "var(--pink-light)",
    border: "rgba(var(--pink-rgb),0.55)",
    shadow: "rgba(var(--pink-rgb),0.18)",
  },
  {
    bg: "rgba(var(--pink-mid-rgb),0.55)",
    border: "var(--pink)",
    shadow: "rgba(var(--pink-rgb),0.22)",
  },
  {
    bg: "rgba(var(--pink-rgb),0.22)",
    border: "var(--pink-deep)",
    shadow: "rgba(var(--pink-deep-rgb),0.22)",
  },
];

function FloatingHeart({ delay, x }: { delay: number; x: string }) {
  return (
    <motion.div
      style={{ position: "absolute", bottom: "10%", left: x, fontSize: "1.4rem", pointerEvents: "none", zIndex: 0 }}
      initial={{ y: 0, opacity: 1 }}
      animate={{ y: -320, opacity: [1, 1, 0] }}
      transition={{ duration: 2.5, delay, ease: "easeOut" }}
    >
      💗
    </motion.div>
  );
}

export default function ButtonSection() {
  const [active, setActive] = useState<number | null>(null);
  const [heartKey, setHeartKey] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const cur = active !== null ? BUTTONS[active] : null;
  const curShade = active !== null ? CARD_SHADES[active] : null;

  // Lock background scroll while a card is open. Driven by `active` (not the
  // open/close handlers) so the cleanup ALWAYS restores overflow — on close,
  // on unmount, on route change, or on an HMR reload mid-open. The old
  // imperative version could leave `body.overflow:hidden` stuck (page won't
  // scroll) if the modal ever went away without handleClose running.
  useEffect(() => {
    if (active === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [active]);

  function handleOpen(i: number) {
    setActive(i);
    setHeartKey(k => k + 1);
  }
  function handleClose() {
    setActive(null);
  }

  return (
    <section
      id="buttons"
      ref={ref}
      style={{
        width: "100%",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(4rem,10vh,7rem) clamp(1rem,4vw,2.5rem)",
        background: "linear-gradient(160deg,var(--rose),var(--pink-light))",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient floating accents */}
      {["10%","30%","55%","75%","90%"].map((left, i) => (
        <motion.div
          key={i}
          style={{ position:"absolute", left, top:`${15+i*14}%`, fontSize:"1.1rem", opacity:0.18, pointerEvents:"none" }}
          animate={{ y:[-12,12,-12], rotate:[-8,8,-8] }}
          transition={{ repeat:Infinity, duration:3+i*0.7, ease:"easeInOut", delay:i*0.4 }}
        >
          💗
        </motion.div>
      ))}

      <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto" }}>
        <motion.h2
          initial={{ opacity:0, y:30 }}
          animate={inView ? { opacity:1, y:0 } : {}}
          transition={{ duration:0.7 }}
          style={{
            fontFamily:"var(--font-playfair)", fontStyle:"italic",
            fontSize:"clamp(1.6rem,4vw,2.6rem)",
            color:"var(--pink-deep)", textAlign:"center", marginBottom:"0.5rem",
          }}
        >
          for every little moment 🩷
        </motion.h2>

        <motion.p
          initial={{ opacity:0 }}
          animate={inView ? { opacity:1 } : {}}
          transition={{ duration:0.7, delay:0.2 }}
          style={{
            fontFamily:"var(--font-caveat)", fontSize:"clamp(1rem,2.5vw,1.25rem)",
            color:"var(--muted)", textAlign:"center",
            margin:"0 0 clamp(2rem,5vh,3.5rem)",
          }}
        >
          press the one that matches how you&apos;re feeling right now
        </motion.p>

        {/* Responsive grid — 2 cols on tablet+, 1 on mobile */}
        <style>{`
          .btn-moment-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: clamp(0.8rem,2vw,1.4rem);
          }
          @media (max-width: 480px) {
            .btn-moment-grid { grid-template-columns: 1fr; }
          }
        `}</style>

        <div className="btn-moment-grid">
          {BUTTONS.map((b, i) => {
            const shade = CARD_SHADES[i];
            return (
              <motion.button
                key={i}
                onClick={() => handleOpen(i)}
                initial={{ opacity:0, y:36, scale:0.92 }}
                animate={inView ? { opacity:1, y:0, scale:1 } : {}}
                transition={{ duration:0.5, delay:0.3+i*0.1, type:"spring", stiffness:120 }}
                whileHover={{ y:-6, scale:1.03, boxShadow:`0 16px 36px ${shade.shadow}` }}
                whileTap={{ scale:0.97 }}
                style={{
                  background: shade.bg,
                  border: `2px solid ${shade.border}`,
                  borderRadius: 22,
                  padding: "clamp(1.4rem,3.5vw,2.2rem) clamp(1rem,2.5vw,1.6rem)",
                  cursor: "pointer",
                  textAlign: "center",
                  boxShadow: `0 4px 18px ${shade.shadow}`,
                  outline: "none",
                  position: "relative",
                  overflow: "hidden",
                  transition: "box-shadow .2s",
                }}
              >
                {/* Subtle corner shimmer */}
                <div style={{
                  position:"absolute", top:-30, right:-30, width:80, height:80,
                  borderRadius:"50%", background:"rgba(255,255,255,.12)",
                  pointerEvents:"none",
                }}/>

                <motion.span
                  style={{ fontSize:"clamp(2.2rem,5vw,3.2rem)", display:"block", marginBottom:"0.75rem" }}
                  whileHover={{ scale:1.2, rotate:-5 }}
                  transition={{ duration:0.3 }}
                >
                  {b.emoji}
                </motion.span>
                <span style={{
                  fontFamily:"var(--font-caveat)", fontWeight:600,
                  fontSize:"clamp(0.95rem,2.5vw,1.15rem)",
                  display:"block", marginBottom:"0.3rem", color:"var(--pink-deep)",
                }}>
                  press me
                </span>
                <span style={{
                  fontFamily:"var(--font-lato)", fontSize:"clamp(0.75rem,2vw,0.88rem)",
                  color:"var(--muted)", display:"block",
                }}>
                  {b.sub}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── MODAL ── */}
      <AnimatePresence>
        {cur && curShade && (
          <motion.div
            key="modal"
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            exit={{ opacity:0 }}
            transition={{ duration:0.3 }}
            onClick={handleClose}
            style={{
              position:"fixed", inset:0, zIndex:9998,
              display:"flex", alignItems:"center", justifyContent:"center",
              padding:"clamp(1rem,4vw,2rem)",
              background:`rgba(var(--pink-light-rgb),0.65)`,
              WebkitBackdropFilter: "blur(18px)", backdropFilter: "blur(18px)",
              }}
          >
            {Array.from({ length: 7 }, (_, i) => (
              <FloatingHeart key={`${heartKey}-${i}`} delay={i*0.2} x={`${10+i*12}%`} />
            ))}

            <motion.div
              initial={{ scale:0.88, y:50, opacity:0 }}
              animate={{ scale:1, y:0, opacity:1 }}
              exit={{ scale:0.88, y:30, opacity:0 }}
              transition={{ type:"spring", stiffness:130, damping:18 }}
              onClick={e => e.stopPropagation()}
              style={{
                borderRadius:28, overflow:"hidden",
                maxWidth:500, width:"100%",
                boxShadow:`0 32px 80px rgba(var(--pink-deep-rgb),.28)`,
                textAlign:"center",
              }}
            >
              {/* Header — uses the card's own shade as gradient */}
              <div style={{
                background:`linear-gradient(135deg, ${curShade.bg}, rgba(var(--pink-deep-rgb),0.7))`,
                padding:"clamp(2rem,5vw,3rem) clamp(1.5rem,4vw,2.5rem) clamp(1.5rem,4vw,2rem)",
                position:"relative", overflow:"hidden",
              }}>
                <div style={{ position:"absolute", top:-40, right:-40, width:130, height:130, borderRadius:"50%", background:"rgba(255,255,255,.14)", pointerEvents:"none" }}/>
                <div style={{ position:"absolute", bottom:-30, left:-30, width:90, height:90, borderRadius:"50%", background:"rgba(255,255,255,.1)", pointerEvents:"none" }}/>

                <motion.div
                  style={{ fontSize:"clamp(3rem,8vw,4.5rem)", display:"block", marginBottom:"0.5rem" }}
                  animate={{ scale:[1,1.15,1], rotate:[-5,5,-5,0] }}
                  transition={{ duration:1.2, repeat:Infinity, repeatDelay:0.8 }}
                >
                  {cur.emoji}
                </motion.div>

                <motion.h2
                  initial={{ opacity:0, y:10 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ delay:0.15 }}
                  style={{
                    fontFamily:"var(--font-playfair)", fontStyle:"italic",
                    fontSize:"clamp(1.2rem,3.5vw,1.9rem)",
                    color:"#fff",
                    textShadow:"0 2px 12px rgba(0,0,0,.25)",
                    lineHeight:1.3, margin:0,
                  }}
                >
                  {cur.msg}
                </motion.h2>
              </div>

              {/* Body — themed, not white */}
              <div style={{
                background:"var(--cream)",
                padding:"clamp(1.5rem,4vw,2rem) clamp(1.5rem,4vw,2.5rem) clamp(1.5rem,4vw,2.5rem)",
              }}>
                <motion.p
                  initial={{ opacity:0, y:8 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ delay:0.25 }}
                  style={{
                    fontFamily:"var(--font-caveat)", fontSize:"clamp(1rem,2.5vw,1.2rem)",
                    color:"var(--muted)", marginBottom:"1rem", lineHeight:1.6,
                  }}
                >
                  {cur.sub2}
                </motion.p>

                <motion.div
                  initial={{ opacity:0, scale:0.8 }}
                  animate={{ opacity:1, scale:1 }}
                  transition={{ delay:0.3, type:"spring" }}
                  style={{ fontSize:"clamp(1.4rem,3vw,1.8rem)", letterSpacing:"0.4rem", marginBottom:"1.3rem" }}
                >
                  {cur.emojis}
                </motion.div>

                {/* GIF area */}
                <motion.div
                  initial={{ opacity:0, y:12 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ delay:0.38 }}
                  style={{
                    margin:"0 auto 1.5rem",
                    maxWidth:240, minHeight:140,
                    background:curShade.bg,
                    border:`1.5px solid ${curShade.border}`,
                    borderRadius:18,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    overflow:"hidden",
                  }}
                >
                  <img src={`/gifs/${cur.gif}`} alt="" style={{ maxWidth:"100%", borderRadius:14 }} />
                </motion.div>

                <motion.button
                  whileHover={{ scale:1.05, y:-2 }}
                  whileTap={{ scale:0.97 }}
                  onClick={handleClose}
                  style={{
                    fontFamily:"var(--font-caveat)", fontSize:"1.05rem",
                    color:"var(--pink-deep)",
                    background:curShade.bg,
                    border:`1.5px solid ${curShade.border}`,
                    borderRadius:50, padding:"0.65rem 2.2rem",
                    cursor:"pointer",
                    boxShadow:`0 4px 14px ${curShade.shadow}`,
                  }}
                >
                  close 🩷
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
