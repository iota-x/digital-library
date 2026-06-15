"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";

const BUTTONS = [
  {
    emoji: "🤗", sub: "when you miss me",
    msg: "i'm always right here, okay? ♡",
    sub2: "no matter what, i'm never going anywhere 🤍",
    emojis: "🫂 💗 🤍",
    gif: "holding.gif",
    color: "#ffd6e0",
    gradient: "linear-gradient(135deg,#ffd6e0,#ffb3c6)",
  },
  {
    emoji: "🫠", sub: "when you overthink",
    msg: "come here silly, let me love you",
    sub2: "your brain lies to you sometimes. i don't. 💗",
    emojis: "🌀 💗 ✨ 🩷 🫶",
    gif: "hugging.gif",
    color: "#ffc8dd",
    gradient: "linear-gradient(135deg,#ffc8dd,#ff8fab)",
  },
  {
    emoji: "🥺", sub: "when you feel sad",
    msg: "pretend i'm there holding you rn",
    sub2: "don't be sad just talk to me im all ears 🌷",
    emojis: "🥺 💗 🫂",
    gif: "hold.gif",
    color: "#ffb3c6",
    gradient: "linear-gradient(135deg,#ffb3c6,#ff8fab)",
  },
  {
    emoji: "😭", sub: "when you can't sleep",
    msg: "i'm just a call away, okay?",
    sub2: "feel free to annoy me I LOVE IT 🎀",
    emojis: "🌙 🩷 📞 ✨",
    gif: "peeking.gif",
    color: "var(--pink-mid)",
    gradient: "linear-gradient(135deg,var(--pink-mid),#ffd6e0)",
  },
];

// Floating hearts that spawn when modal opens
function FloatingHeart({ delay, x }: { delay: number; x: string }) {
  return (
    <motion.div
      style={{ position: "absolute", bottom: "10%", left: x, fontSize: "1.4rem", pointerEvents: "none" }}
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

  function handleOpen(i: number) {
    setActive(i);
    setHeartKey(k => k + 1);
    document.body.style.overflow = "hidden";
  }
  function handleClose() {
    setActive(null);
    document.body.style.overflow = "";
  }

  return (
    <section
      id="buttons"
      ref={ref}
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "6rem 2rem",
        background: "linear-gradient(160deg,var(--rose),var(--pink-light))",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient floating hearts */}
      {["10%","30%","55%","75%","90%"].map((left, i) => (
        <motion.div
          key={i}
          style={{ position:"absolute", left, top:`${15+i*15}%`, fontSize:"1.2rem", opacity:0.15, pointerEvents:"none" }}
          animate={{ y:[-12,12,-12], rotate:[-8,8,-8] }}
          transition={{ repeat:Infinity, duration:3+i*0.7, ease:"easeInOut", delay:i*0.4 }}
        >
          💗
        </motion.div>
      ))}

      <motion.h2
        initial={{ opacity:0, y:30 }}
        animate={inView ? { opacity:1, y:0 } : {}}
        transition={{ duration:0.7 }}
        style={{ fontFamily:"var(--font-playfair)", fontSize:"clamp(1.8rem,4vw,2.8rem)", color:"var(--pink-deep)", textAlign:"center" }}
      >
        for every little moment 🩷
      </motion.h2>

      <motion.p
        initial={{ opacity:0 }}
        animate={inView ? { opacity:1 } : {}}
        transition={{ duration:0.7, delay:0.2 }}
        style={{ fontFamily:"var(--font-caveat)", fontSize:"1.3rem", color:"var(--muted)", textAlign:"center", margin:"0.5rem 0 3.5rem" }}
      >
        press the one that matches how you&apos;re feeling right now
      </motion.p>

      {/* 2×2 grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(200px, 320px))",
        gap: "1.6rem",
        width: "100%",
        maxWidth: 700,
      }}>
        {BUTTONS.map((b, i) => (
          <motion.button
            key={i}
            onClick={() => handleOpen(i)}
            initial={{ opacity:0, y:40, scale:0.9 }}
            animate={inView ? { opacity:1, y:0, scale:1 } : {}}
            transition={{ duration:0.5, delay:0.3+i*0.1, type:"spring", stiffness:120 }}
            whileHover={{ y:-8, scale:1.04, boxShadow:"0 18px 40px rgba(var(--pink-rgb),.3)" }}
            whileTap={{ scale:0.97 }}
            style={{
              background: "#fff",
              border: "2.5px solid var(--pink)",
              borderRadius: 24,
              padding: "2.2rem 1.5rem",
              cursor: "pointer",
              textAlign: "center",
              boxShadow: "0 4px 18px rgba(var(--pink-rgb),.12)",
              outline: "none",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <motion.span
              style={{ fontSize:"3.2rem", display:"block", marginBottom:"0.8rem" }}
              whileHover={{ scale:1.2, rotate:[-5,5,-5,0] }}
              transition={{ duration:0.4 }}
            >
              {b.emoji}
            </motion.span>
            <span style={{ fontFamily:"var(--font-caveat)", fontWeight:600, fontSize:"1.2rem", display:"block", marginBottom:"0.3rem", color:"var(--pink-deep)" }}>
              press me
            </span>
            <span style={{ fontFamily:"var(--font-lato)", fontSize:"0.88rem", color:"var(--muted)" }}>
              {b.sub}
            </span>
          </motion.button>
        ))}
      </div>

      {/* ── FULLSCREEN MODAL ── */}
      <AnimatePresence>
        {cur && (
          <motion.div
            key="modal"
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            exit={{ opacity:0 }}
            transition={{ duration:0.4 }}
            onClick={handleClose}
            style={{
              position: "fixed",
              inset: 0,
              width: "100vw",
              height: "100vh",
              zIndex: 9998,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem",
              background: "rgba(253,232,244,0.7)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            {/* Floating hearts rising from bottom */}
            {Array.from({ length: 7 }, (_, i) => (
              <FloatingHeart
                key={`${heartKey}-${i}`}
                delay={i * 0.2}
                x={`${10 + i * 12}%`}
              />
            ))}

            <motion.div
              initial={{ scale:0.85, y:60, opacity:0 }}
              animate={{ scale:1, y:0, opacity:1 }}
              exit={{ scale:0.85, y:40, opacity:0 }}
              transition={{ type:"spring", stiffness:120, damping:18 }}
              onClick={e => e.stopPropagation()}
              style={{
                position: "relative",
                borderRadius: 32,
                overflow: "hidden",
                maxWidth: 520,
                width: "100%",
                boxShadow: "0 32px 80px rgba(var(--pink-deep-rgb),.3)",
                textAlign: "center",
              }}
            >
              {/* Gradient header */}
              <div style={{
                background: cur.gradient,
                padding: "3rem 2.5rem 2rem",
                position: "relative",
                overflow: "hidden",
              }}>
                {/* Decorative circles */}
                <div style={{ position:"absolute", top:-40, right:-40, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,.18)" }} />
                <div style={{ position:"absolute", bottom:-30, left:-30, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,.14)" }} />

                <motion.div
                  style={{ fontSize:"4.5rem", display:"block", marginBottom:"0.5rem" }}
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
                    fontFamily: "var(--font-playfair)",
                    fontStyle: "italic",
                    fontSize: "clamp(1.5rem,4vw,2rem)",
                    color: "#fff",
                    textShadow: "0 2px 12px rgba(var(--pink-deep-rgb),.3)",
                    lineHeight: 1.3,
                  }}
                >
                  {cur.msg}
                </motion.h2>
              </div>

              {/* White body */}
              <div style={{ background:"#fff", padding:"2rem 2.5rem 2.5rem" }}>
                <motion.p
                  initial={{ opacity:0, y:8 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ delay:0.25 }}
                  style={{ fontFamily:"var(--font-caveat)", fontSize:"1.2rem", color:"var(--muted)", marginBottom:"1.2rem", lineHeight:1.6 }}
                >
                  {cur.sub2}
                </motion.p>

                <motion.div
                  initial={{ opacity:0, scale:0.8 }}
                  animate={{ opacity:1, scale:1 }}
                  transition={{ delay:0.3, type:"spring" }}
                  style={{ fontSize:"1.8rem", letterSpacing:"0.45rem", marginBottom:"1.5rem" }}
                >
                  {cur.emojis}
                </motion.div>

                {/* GIF placeholder */}
                <motion.div
                  initial={{ opacity:0, y:12 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ delay:0.38 }}
                  style={{
                    margin: "0 auto 1.8rem",
                    maxWidth: 260,
                    minHeight: 160,
                    background: "var(--pink-light)",
                    border: "2px solid var(--pink)",
                    borderRadius: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "1rem",
                  }}
                >
                  {<img src={`/gifs/${cur.gif}`} alt="" style={{maxWidth:"100%",borderRadius:14}} />}
                  <p style={{ fontFamily:"var(--font-caveat)", fontSize:"0.95rem", color:"var(--muted)" }}>
                  </p>
                </motion.div>

                {/* Close button */}
                <motion.button
                  whileHover={{ scale:1.05, y:-2 }}
                  whileTap={{ scale:0.97 }}
                  onClick={handleClose}
                  style={{
                    fontFamily: "var(--font-caveat)",
                    fontSize: "1.1rem",
                    color: "var(--pink-deep)",
                    background: "var(--pink-light)",
                    border: "2px solid var(--pink)",
                    borderRadius: 50,
                    padding: "0.7rem 2.5rem",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(var(--pink-rgb),.2)",
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