"use client";
import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useCanvasParticles } from "@/lib/useCanvasParticles";

const PAGES = [
  {
    icon: "🌷",
    accent: "#ffb3c6",
    bg: "linear-gradient(160deg,var(--rose),var(--pink-light))",
    text: `I know i'm not that cool, I don't understand a lotta stuff which is very common knowledge among people our age — but one thing I'm certain of is that my love for you is very pure and comes with no conditions whatsoever 💗`,
  },
  {
    icon: "🌸",
    accent: "var(--pink)",
    bg: "linear-gradient(160deg,var(--rose),var(--pink-light))",
    text: `Going back, I feel like choosing you is the best decision I've made in my entire life abhi tak. And I never regret it — not even for a second. (I don't know what makes u think I do, but I never have.)`,
  },
  {
    icon: "💗",
    accent: "var(--pink-deep)",
    bg: "linear-gradient(160deg,var(--pink-light),var(--pink-mid))",
    text: `We will grow and learn together and we both will make efforts for each other — one thing I'm sure of is that I do plan on spending the rest of my life with you. It's not a hasty decision. I've thought about it properly and it's something I want you to know. 🩷`,
  },
  {
    icon: "✨",
    accent: "var(--pink)",
    bg: "linear-gradient(160deg,var(--rose),var(--pink-mid))",
    text: `You truly make me the happiest. Having you feels very very veryyyy warm and comfy and I have this sense of calm whenever I'm with you — which is otherwise just chaos. Thank you for being mine. 🌷`,
  },
];

/* ── starfield ── */
interface StarPoint { x: number; y: number; r: number; a: number; da: number }

function Stars() {
  const ref = useRef<HTMLCanvasElement>(null);
  const ptsRef = useRef<StarPoint[]>([]);
  const varsRef = useRef({ pinkRgb: "", pink: "" });

  // CSS var snapshot — re-read only when the theme changes (cheap event),
  // not 60 times per second inside the draw loop.
  useEffect(() => {
    const read = () => {
      const style = getComputedStyle(document.documentElement);
      varsRef.current.pinkRgb = style.getPropertyValue("--pink-rgb").trim();
      varsRef.current.pink    = style.getPropertyValue("--pink").trim();
    };
    read();
    window.addEventListener("annapp:theme", read);
    return () => window.removeEventListener("annapp:theme", read);
  }, []);

  useCanvasParticles(ref, {
    setup: () => {
      // Fractional coords → resize-stable; only seed once.
      if (ptsRef.current.length > 0) return;
      ptsRef.current = Array.from({ length: 55 }, () => ({
        x: Math.random(), y: Math.random(),
        r: Math.random() * 1.5 + 0.4, a: Math.random(), da: (Math.random() - 0.5) * 0.013,
      }));
    },
    draw: (ctx, w, h) => {
      const { pinkRgb, pink } = varsRef.current;
      ctx.clearRect(0, 0, w, h);
      for (const p of ptsRef.current) {
        p.a = Math.max(0.1, Math.min(1, p.a + p.da));
        if (p.a <= 0.1 || p.a >= 1) p.da *= -1;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pinkRgb},${p.a * 0.6})`;
        ctx.shadowBlur = 5; ctx.shadowColor = pink; ctx.fill();
      }
    },
  });

  return <canvas ref={ref} style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:0 }} />;
}

/* ── I Love You Game ── */
const ILY_STEPS = [
  {
    type: "button",
    btn: "did you know? 🤔",
    reveal: null,
  },
  {
    type: "reveal",
    reveal: "i love you",
    btn: "wait, really? 🥺",
  },
  {
    type: "reveal",
    reveal: "oh did i forget to mention something?",
    btn: "what is it?? 💗",
  },
  {
    type: "reveal",
    reveal: "I LOVE YOUU!! 🌷",
    btn: "say it again!! 🫶",
  },
  {
    type: "reveal",
    reveal: "i love you i love you i love you",
    btn: "once more 🥹",
  },
  {
    type: "final",
    reveal: "I LOVE YOUUU SO MUCH IT'S ACTUALLY INSANE 💗🌷💗",
    btn: null,
  },
];

const BURST_EMOJIS = ["💗","🌷","🌸","💕","✨","🩷","💫","🌺"];

function Burst({ id }: { id: number }) {
  const items = Array.from({ length: 14 }, (_, i) => ({
    angle: (i / 14) * 360,
    dist: 80 + Math.random() * 80,
    emoji: BURST_EMOJIS[Math.floor(Math.random() * BURST_EMOJIS.length)],
    size: 16 + Math.random() * 16,
  }));
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:9990 }}>
      {items.map((item, i) => {
        const rad = (item.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * item.dist;
        const ty = Math.sin(rad) * item.dist;
        return (
          <motion.div
            key={`${id}-${i}`}
            style={{
              position:"absolute", top:"50%", left:"50%",
              fontSize: item.size, lineHeight:1,
              originX:"50%", originY:"50%",
            }}
            initial={{ x:0, y:0, opacity:1, scale:0 }}
            animate={{ x:tx, y:ty, opacity:0, scale:1.4 }}
            transition={{ duration:0.9, ease:"easeOut", delay: i * 0.02 }}
          >
            {item.emoji}
          </motion.div>
        );
      })}
    </div>
  );
}

function ILoveYouGame({ globalStep, totalSteps }: { globalStep: number; totalSteps: number }) {
  const [step, setStep] = useState(-1);
  const [burstId, setBurstId] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:"-80px" });

  // combined progress: book pages (0-3) + ily steps (0-5), normalized 0→1
  const totalProgress = (globalStep / (totalSteps - 1)) * 0.4 + (Math.max(step, 0) / (ILY_STEPS.length - 1)) * 0.6;
  const heartOpacity = 0.04 + totalProgress * 0.82;
  const heartBlur    = 40  - totalProgress * 38;   // 40px → ~2px
  const heartScale   = 0.7 + totalProgress * 0.5;  // subtle grow

  function advance() {
    setBurstId(b => b + 1);
    setStep(s => Math.min(s + 1, ILY_STEPS.length - 1));
  }

  const cur = step >= 0 ? ILY_STEPS[step] : null;
  const isFinal = step === ILY_STEPS.length - 1;

  return (
    <div
      ref={ref}
      className="dk-ily-game"
      style={{
        width:"100%",
        minHeight:"100vh",
        zIndex:2, position:"relative",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        gap:"2rem",
        padding:"6rem 2rem",
        background:"linear-gradient(180deg,var(--pink-light),var(--rose),var(--pink-light))",
        overflow:"hidden",
        borderTop:"1px solid rgba(var(--pink-rgb),.25)",
      }}
    >
      {/* ── hologram heart — gets clearer + bigger as progress increases ── */}
            {/* ── hologram heart — perfectly centered ── */}
            <motion.div
        animate={{
          opacity: heartOpacity,
          scale: heartScale,
        }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        <motion.div
          animate={{
            filter: `blur(${heartBlur}px)`,
          }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          style={{
            fontSize: "min(78vw, 640px)",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "translateY(4%)",
            userSelect: "none",
            willChange: "transform, filter, opacity",
          }}
        >
          💗
        </motion.div>
      </motion.div>

      {/* soft centered glow */}
      <motion.div
        animate={{
          opacity: totalProgress * 0.32,
          scale: heartScale * 1.08,
        }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "min(72vw, 620px)",
          height: "min(72vw, 620px)",
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(var(--pink-rgb),.5) 0%, rgba(var(--pink-deep-rgb),.16) 45%, transparent 72%)",
          filter: `blur(${Math.max(8, heartBlur * 0.45)}px)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ambient petals */}
      {["🌷","🌸","💕"].map((e,i) => (
        <motion.span key={i} style={{
          position:"absolute",
          left:`${15+i*30}%`, top:`${10+i*25}%`,
          fontSize:"1.5rem", opacity:0.2, pointerEvents:"none",
        }}
          animate={{ y:[-8,8,-8], rotate:[-12,12,-12] }}
          transition={{ repeat:Infinity, duration:3+i, delay:i*0.6, ease:"easeInOut" }}
        >{e}</motion.span>
      ))}

      {/* burst */}
      <AnimatePresence>
        {burstId > 0 && <Burst key={burstId} id={burstId} />}
      </AnimatePresence>

      {/* ── initial button ── */}
      {step === -1 && (
        <motion.div
          initial={{ opacity:0, y:30 }}
          animate={inView ? { opacity:1, y:0 } : {}}
          transition={{ duration:0.7, delay:0.2 }}
          style={{ textAlign:"center" }}
        >
          <p style={{ fontFamily:"var(--font-caveat)", fontSize:"1.35rem", color:"var(--muted)", marginBottom:"2rem" }}>
            one last thing before you go… 🌷
          </p>
          <motion.button
            whileHover={{ scale:1.08, y:-4, boxShadow:"0 16px 40px rgba(var(--pink-deep-rgb),.4)" }}
            whileTap={{ scale:0.96 }}
            onClick={advance}
            style={{
              fontFamily:"var(--font-caveat)",
              fontSize:"clamp(1.4rem,3.5vw,2rem)",
              color:"#fff",
              background:"linear-gradient(135deg,var(--pink),var(--pink-deep),var(--pink-deep))",
              border:"none", borderRadius:50,
              padding:"1.2rem 3.5rem",
              cursor:"pointer",
              boxShadow:"0 8px 30px rgba(var(--pink-deep-rgb),.45)",
              letterSpacing:"0.04em",
            }}
          >
            did you know? 🤔
          </motion.button>
        </motion.div>
      )}

      {/* ── step reveals ── */}
      <AnimatePresence mode="wait">
        {cur && (
          <motion.div
            key={step}
            initial={{ opacity:0, scale:0.85, y:30 }}
            animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:0.9, y:-20 }}
            transition={{ type:"spring", stiffness:180, damping:20 }}
            style={{ textAlign:"center", maxWidth:580, width:"100%" }}
          >
            {cur.reveal && (
              <motion.p
                initial={{ opacity:0, y:20, filter:"blur(6px)" }}
                animate={{ opacity:1, y:0, filter:"blur(0px)" }}
                transition={{ duration:0.6, ease:"easeOut" }}
                style={{
                  fontFamily: isFinal ? "var(--font-playfair)" : "var(--font-caveat)",
                  fontStyle: isFinal ? "italic" : "normal",
                  fontSize: isFinal
                    ? "clamp(1.8rem,5vw,3rem)"
                    : step <= 1
                    ? "clamp(1.6rem,4.5vw,2.4rem)"
                    : "clamp(2rem,6vw,3.5rem)",
                  color: isFinal ? "var(--pink-deep)" : "var(--pink-deep)",
                  lineHeight:1.5,
                  marginBottom:"2.5rem",
                  textShadow: step >= 3 ? "0 2px 24px rgba(var(--pink-rgb),.35)" : "none",
                  fontWeight: step >= 3 ? 600 : 400,
                }}
              >
                {cur.reveal}
              </motion.p>
            )}

            {isFinal && (
              <motion.div
                initial={{ opacity:0, scale:0.5 }}
                animate={{ opacity:1, scale:1 }}
                transition={{ delay:0.3, type:"spring" }}
                style={{ fontSize:"2.8rem", letterSpacing:"0.5rem", marginBottom:"2rem" }}
              >
                🌷💗🌸💗🌷
              </motion.div>
            )}

            {cur.btn && (
              <motion.button
                initial={{ opacity:0, y:10 }}
                animate={{ opacity:1, y:0 }}
                transition={{ delay:0.3 }}
                whileHover={{ scale:1.07, y:-4 }}
                whileTap={{ scale:0.95 }}
                onClick={advance}
                style={{
                  fontFamily:"var(--font-caveat)",
                  fontSize:"clamp(1.2rem,3vw,1.6rem)",
                  color:"#fff",
                  background: step >= 3
                    ? "linear-gradient(135deg,var(--pink),var(--pink-deep),var(--pink-deep))"
                    : "linear-gradient(135deg,var(--pink),var(--pink-deep))",
                  border:"none", borderRadius:50,
                  padding:"1rem 3rem",
                  cursor:"pointer",
                  boxShadow:"0 8px 28px rgba(var(--pink-deep-rgb),.38)",
                  letterSpacing:"0.03em",
                }}
              >
                {cur.btn}
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


function Book({ active, dir }: { active: number; dir: "next"|"prev" }) {
  const p = PAGES[active];

  return (
    <div style={{ position:"relative", width:"100%", height:"100%", perspective: 1400 }}>
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={active}
          custom={dir}
          initial={dir === "next"
            ? { rotateY: 90, opacity: 0, x: 40 }
            : { rotateY: -90, opacity: 0, x: -40 }
          }
          animate={{ rotateY: 0, opacity: 1, x: 0 }}
          exit={dir === "next"
            ? { rotateY: -90, opacity: 0, x: -40 }
            : { rotateY: 90, opacity: 0, x: 40 }
          }
          transition={{
            rotateY: { type: "spring", stiffness: 160, damping: 22 },
            opacity:  { duration: 0.22 },
            x:        { type: "spring", stiffness: 160, damping: 22 },
          }}
          style={{
            position: "absolute", inset: 0,
            transformOrigin: dir === "next" ? "left center" : "right center",
            transformStyle: "preserve-3d",
            borderRadius: 24,
          }}
        >
          {/* Page face */}
          <div className="dk-book-page" style={{
            position: "absolute", inset: 0,
            background: p.bg,
            borderRadius: 24,
            border: `1.5px solid ${p.accent}55`,
            boxShadow: `0 24px 64px rgba(var(--pink-deep-rgb),.2), 0 0 0 1.5px ${p.accent}33`,
            display: "flex", flexDirection: "column",
            padding: "2.8rem 2.8rem 2rem",
            overflow: "hidden",
            backfaceVisibility: "hidden",
          }}>
            {/* shimmer */}
            <motion.div style={{
              position:"absolute", inset:0, borderRadius:24, pointerEvents:"none",
              background:"linear-gradient(120deg,transparent 30%,rgba(255,255,255,.5) 50%,transparent 70%)",
            }}
              animate={{ x:["-120%","160%"] }}
              transition={{ duration:2.4, repeat:Infinity, repeatDelay:3.5 }}
            />

            {/* top bar */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"2rem" }}>
              <span style={{
                fontFamily:"var(--font-lato)", fontSize:"0.72rem", letterSpacing:"0.1em",
                textTransform:"uppercase", color:p.accent, fontWeight:700,
                background:`${p.accent}22`, borderRadius:50, padding:"0.2rem 0.8rem",
              }}>
                {active + 1} / {PAGES.length}
              </span>
              <motion.span
                style={{ fontSize:"2rem" }}
                animate={{ rotate:[-8,8,-8,0], scale:[1,1.2,1] }}
                transition={{ repeat:Infinity, duration:2.8, ease:"easeInOut" }}
              >{p.icon}</motion.span>
            </div>

            {/* body text */}
            <p style={{
              fontFamily:"var(--font-caveat)",
              fontSize:"clamp(1.18rem,2.8vw,1.48rem)",
              color:"var(--text)", lineHeight:2.1,
              flex:1, margin:0,
            }}>
              {p.text}
            </p>

            {/* last page signature + seal */}
            {active === PAGES.length - 1 && (
              <motion.div
                initial={{ opacity:0, y:12 }}
                animate={{ opacity:1, y:0 }}
                transition={{ delay:0.3 }}
                style={{
                  marginTop:"1.8rem",
                  display:"flex", alignItems:"center",
                  justifyContent:"space-between", flexWrap:"wrap", gap:"1rem",
                }}
              >
                <div>
                  <div style={{ width:"100%", height:1, background:"linear-gradient(90deg,rgba(var(--pink-rgb),.5),transparent)", marginBottom:"0.8rem" }} />
                  <p style={{ fontFamily:"var(--font-playfair)", fontStyle:"italic", fontSize:"1.1rem", color:"var(--pink-deep)", margin:0 }}>
                    — forever yours 🩷
                  </p>
                  <motion.div style={{ fontSize:"1.1rem", marginTop:"0.4rem" }}
                    animate={{ y:[-3,3,-3] }} transition={{ repeat:Infinity, duration:2.2 }}>
                    🌸💗🌸
                  </motion.div>
                </div>
                {/* wax seal */}
                <motion.div
                  initial={{ scale:0, rotate:-20 }}
                  animate={{ scale:1, rotate:0 }}
                  transition={{ type:"spring", stiffness:180, damping:16, delay:0.5 }}
                  style={{
                    width:64, height:64, borderRadius:"50%",
                    background:"radial-gradient(circle at 38% 36%,var(--pink),var(--pink-deep) 60%,var(--pink-deep))",
                    boxShadow:"0 4px 20px rgba(var(--pink-deep-rgb),.4),inset 0 2px 6px rgba(255,255,255,.25)",
                    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                    gap:1, position:"relative",
                  }}
                >
                  <div style={{ position:"absolute", inset:5, borderRadius:"50%", border:"1.5px solid rgba(255,255,255,.3)" }} />
                  <motion.span
                    style={{ fontSize:"1.8rem", lineHeight:1, filter:"drop-shadow(0 2px 4px rgba(0,0,0,.15))" }}
                    animate={{ scale:[1,1.18,1] }}
                    transition={{ repeat:Infinity, duration:1.4, ease:"easeInOut" }}
                  >🩷</motion.span>
                </motion.div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── arrow button ── */
function Arrow({ dir, onClick, disabled }: { dir:"left"|"right"; onClick:()=>void; disabled:boolean }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "left" ? "previous page" : "next page"}
      whileHover={disabled ? {} : { scale:1.12, x: dir==="left" ? -3 : 3 }}
      whileTap={disabled ? {} : { scale:0.93 }}
      style={{
        width:48, height:48, borderRadius:"50%", flexShrink:0,
        background: disabled ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.8)",
        border: "1.5px solid var(--pink)",
        boxShadow: disabled ? "none" : "0 4px 16px rgba(var(--pink-rgb),.18)",
        cursor: disabled ? "not-allowed" : "pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:"1.2rem",
        color: disabled ? "var(--pink)99" : "var(--pink-deep)",
        outline:"none",
        backdropFilter:"blur(8px)",
        transition:"background 0.2s, box-shadow 0.2s",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {dir === "left" ? "←" : "→"}
    </motion.button>
  );
}

/* ── pill dots ── */
function Dots({ active, total, onGoTo }: { active:number; total:number; onGoTo:(i:number)=>void }) {
  return (
    <div style={{ display:"flex", gap:"0.5rem", justifyContent:"center", alignItems:"center" }}>
      {Array.from({ length: total }, (_, i) => (
        <motion.button
          key={i}
          onClick={() => onGoTo(i)}
          aria-label={`go to page ${i + 1}`}
          aria-current={i === active ? "page" : undefined}
          animate={{ width: i === active ? 26 : 9, opacity: i <= active ? 1 : 0.3 }}
          transition={{ type:"spring", stiffness:320, damping:24 }}
          style={{
            height:9, borderRadius:99, border:"none", padding:0, outline:"none",
            cursor:"pointer", flexShrink:0,
            background: i <= active
              ? "linear-gradient(90deg,var(--pink),var(--pink-deep))"
              : "var(--pink)",
          }}
        />
      ))}
    </div>
  );
}

export default function Final() {
  const [active, setActive] = useState(0);
  const [dir,    setDir]    = useState<"next"|"prev">("next");
  const [done,   setDone]   = useState(false);

  function goTo(i: number) {
    if (i === active) return;
    setDir(i > active ? "next" : "prev");
    setActive(i);
    if (i < PAGES.length - 1) setDone(false);
  }
  function next() { if (active < PAGES.length - 1) goTo(active + 1); else setDone(true); }
  function back() { if (active > 0) goTo(active - 1); }

  return (
    <>
      <section
        id="final"
        style={{
          width:"100%", minHeight:"100vh",
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
          padding:"6rem 2rem",
          position:"relative", overflow:"hidden",
          background:"linear-gradient(180deg,var(--cream),var(--pink-light) 40%,var(--pink-light))",
        }}
      >
        <Stars />

        {/* ambient orbs */}
        {[
          {l:"5%",  t:"12%", w:260, c:"rgba(var(--pink-rgb),.17)"},
          {l:"70%", t:"8%",  w:200, c:"rgba(var(--pink-rgb),.14)"},
          {l:"62%", t:"68%", w:240, c:"rgba(var(--pink-rgb),.10)"},
        ].map((o,i) => (
          <div key={i} style={{
            position:"absolute", left:o.l, top:o.t,
            width:o.w, height:o.w, borderRadius:"50%",
            background:o.c, filter:"blur(50px)", pointerEvents:"none", zIndex:0, opacity:0.7,
          }} />
        ))}

        {/* header */}
        <motion.div
          initial={{ opacity:0, y:24 }}
          whileInView={{ opacity:1, y:0 }}
          viewport={{ once:true }}
          transition={{ duration:0.8 }}
          style={{ textAlign:"center", marginBottom:"2.5rem", zIndex:2, position:"relative" }}
        >
          <motion.div
            style={{ fontSize:"clamp(1.8rem,4vw,2.8rem)", letterSpacing:"0.5rem", marginBottom:"0.6rem" }}
            animate={{ y:[-4,4,-4] }}
            transition={{ repeat:Infinity, duration:2.8, ease:"easeInOut" }}
          >🌸 💌 🌸</motion.div>
          <h2 style={{
            fontFamily:"var(--font-playfair)", fontStyle:"italic",
            fontSize:"clamp(1.6rem,4vw,2.4rem)", color:"var(--pink-deep)", margin:0,
          }}>just so you know…</h2>
          <p style={{ fontFamily:"var(--font-caveat)", fontSize:"1rem", color:"var(--muted)", marginTop:"0.4rem" }}>
            four things i need you to always remember 🌷
          </p>
        </motion.div>

        {/* book row: ← [book] → */}
        <motion.div
          initial={{ opacity:0, y:40 }}
          whileInView={{ opacity:1, y:0 }}
          viewport={{ once:true }}
          transition={{ duration:0.8, delay:0.2 }}
          style={{ display:"flex", alignItems:"center", gap:"1.2rem", width:"100%", maxWidth:640, zIndex:2, position:"relative" }}
        >
          <Arrow dir="left"  onClick={back} disabled={active === 0} />

          <div style={{
            flex:1,
            height:"clamp(320px,52vw,430px)",
            position:"relative",
          }}>
            <Book active={active} dir={dir} />
          </div>

          <Arrow dir="right" onClick={next} disabled={active === PAGES.length - 1 && done} />
        </motion.div>

        {/* dots */}
        <div style={{ marginTop:"1.6rem", zIndex:2, position:"relative" }}>
          <Dots active={active} total={PAGES.length} onGoTo={goTo} />
        </div>

        {/* done quote */}
        <AnimatePresence>
          {done && (
            <motion.div
              initial={{ opacity:0, y:20 }}
              animate={{ opacity:1, y:0 }}
              exit={{ opacity:0 }}
              transition={{ type:"spring", stiffness:160, delay:0.2 }}
              style={{ textAlign:"center", marginTop:"2rem", zIndex:2 }}
            >
              <motion.div
                style={{ fontSize:"2rem", letterSpacing:"0.4rem", marginBottom:"0.6rem" }}
                animate={{ scale:[1,1.18,1] }} transition={{ repeat:Infinity, duration:1.6, ease:"easeInOut" }}
              >💗🌷💗</motion.div>
              <p style={{
                fontFamily:"var(--font-playfair)", fontStyle:"italic",
                fontSize:"clamp(1rem,2.5vw,1.25rem)",
                color:"var(--pink-deep)", maxWidth:360, margin:"0 auto", lineHeight:1.7,
              }}>
                &ldquo;and i&apos;d choose you again, in every version of this life.&rdquo;
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── I LOVE YOU GAME ── */}
      <ILoveYouGame globalStep={active} totalSteps={PAGES.length} />

      <footer style={{
        width:"100%",
        background:"linear-gradient(135deg,var(--pink-light),var(--pink-mid),var(--pink))",
        borderTop:"1px solid rgba(var(--pink-rgb),.4)",
        padding:"3rem 2rem", textAlign:"center",
        position:"relative", overflow:"hidden",
      }}>
        <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse 60% 80% at 50%,rgba(255,255,255,.35),transparent 70%)" }} />
        <motion.div
          initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }}
          viewport={{ once:true }} transition={{ duration:0.9 }}
          style={{ position:"relative", zIndex:1 }}
        >
          <motion.div style={{ fontSize:"1.5rem", marginBottom:"0.8rem" }}
            animate={{ scale:[1,1.2,1] }} transition={{ repeat:Infinity, duration:2, ease:"easeInOut" }}>
            💗
          </motion.div>
          <p style={{ fontFamily:"var(--font-caveat)", fontSize:"1.2rem", color:"var(--pink-deep)", margin:"0 0 0.4rem" }}>
            made with way too much love by yours truly, for the one whom I love the most in this universe 🌸
          </p>
          <p style={{ fontFamily:"var(--font-playfair)", fontStyle:"italic", fontSize:"1.05rem", color:"var(--pink-deep)", margin:0 }}>
            march 11, 2026 → forever 💗
          </p>
        </motion.div>
      </footer>
    </>
  );
}