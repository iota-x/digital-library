"use client";
import { useEffect, useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";

const START = new Date("2026-03-11T00:00:00");

function getElapsed() {
  const diff = Math.max(0, Date.now() - START.getTime());
  const s = Math.floor(diff / 1000);
  return { days: Math.floor(s/86400), hours: Math.floor(s/3600)%24, mins: Math.floor(s/60)%60, secs: s%60 };
}
function pad(n: number) { return String(n).padStart(2,"0"); }

/* ── individual flip-style counter ── */
function CounterBox({ label, value, delay, inView }: { label:string; value:number; delay:number; inView:boolean }) {
  const [prev, setPrev] = useState(value);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (value !== prev) {
      setFlipping(true);
      const t = setTimeout(() => { setPrev(value); setFlipping(false); }, 300);
      return () => clearTimeout(t);
    }
  }, [value, prev]);

  return (
    <motion.div
      initial={{ opacity:0, y:50, scale:0.85 }}
      animate={inView ? { opacity:1, y:0, scale:1 } : {}}
      transition={{ duration:0.7, delay, type:"spring", stiffness:110 }}
      style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"0.5rem" }}
    >
      {/* card */}
      <div style={{
        position:"relative", width:"clamp(90px,16vw,130px)", height:"clamp(90px,16vw,130px)",
        borderRadius:20,
        background:"rgba(255,255,255,0.7)",
        backdropFilter:"blur(12px)",
        border:"2px solid rgba(249,168,212,0.6)",
        boxShadow:"0 8px 32px rgba(244,114,182,.18), inset 0 1px 0 rgba(255,255,255,.9)",
        display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden",
      }}>
        {/* shimmer */}
        <motion.div
          style={{
            position:"absolute", inset:0,
            background:"linear-gradient(120deg,transparent 30%,rgba(255,255,255,.6) 50%,transparent 70%)",
            pointerEvents:"none",
          }}
          animate={{ x:["-120%","160%"] }}
          transition={{ duration:2.5, repeat:Infinity, repeatDelay: label==="seconds"?0.5:4, delay }}
        />
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ y: flipping ? -30 : 0, opacity: flipping ? 0 : 1 }}
            animate={{ y:0, opacity:1 }}
            exit={{ y:30, opacity:0 }}
            transition={{ duration:0.28, ease:"easeOut" }}
            style={{
              fontFamily:"var(--font-playfair)",
              fontSize:"clamp(2rem,6vw,3rem)",
              color:"var(--pink-deep)",
              fontWeight:600, lineHeight:1,
            }}
          >
            {pad(value)}
          </motion.span>
        </AnimatePresence>
      </div>
      <span style={{ fontFamily:"var(--font-caveat)", color:"var(--muted)", fontSize:"1.1rem", letterSpacing:"0.04em" }}>
        {label}
      </span>
    </motion.div>
  );
}

/* ── floating tulip / petal ── */
function FloatingEl({ emoji, x, delay, dur, size }: { emoji:string; x:string; delay:number; dur:number; size:number }) {
  return (
    <motion.div
      style={{ position:"absolute", left:x, top:-60, fontSize:size, pointerEvents:"none", userSelect:"none", zIndex:1 }}
      animate={{ y:"110vh", rotate:[0, 25, -15, 20, 0], opacity:[0, 0.9, 0.8, 0.5, 0] }}
      transition={{ duration:dur, delay, repeat:Infinity, ease:"linear" }}
    >
      {emoji}
    </motion.div>
  );
}

const FLOATERS = [
  { emoji:"🌷", x:"8%",  delay:0,   dur:9,  size:28 },
  { emoji:"🌸", x:"18%", delay:1.5, dur:11, size:22 },
  { emoji:"💗", x:"30%", delay:0.8, dur:8,  size:20 },
  { emoji:"🌷", x:"42%", delay:2.2, dur:12, size:32 },
  { emoji:"🩷", x:"55%", delay:0.3, dur:9,  size:18 },
  { emoji:"🌸", x:"65%", delay:1.8, dur:10, size:24 },
  { emoji:"🌷", x:"75%", delay:0.6, dur:11, size:26 },
  { emoji:"💕", x:"85%", delay:1.2, dur:8,  size:20 },
  { emoji:"🌸", x:"93%", delay:2.5, dur:10, size:22 },
];

/* ── side love notes ── */
const SIDE_NOTES = [
  { text:"my kuchupuchuuuuu 💗", pos:{ left:"3%", top:"22%" }, rot:-8 },
  { text:"you are my everything 🎀", pos:{ right:"3%", top:"18%" }, rot:6 },
  { text:"you make the boring stuff beautiful 💗", pos:{ left:"2%", bottom:"28%" }, rot:5 },
  { text:"my favourite notification is you 🩷", pos:{ right:"2%", bottom:"32%" }, rot:-7 },
];

export default function LiveTimer() {
  const [time, setTime] = useState<ReturnType<typeof getElapsed>|null>(null);
  const ref    = useRef(null);
  const inView = useInView(ref, { once:true, margin:"-80px" });

  useEffect(() => {
    setTime(getElapsed());
    const id = setInterval(() => setTime(getElapsed()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      id="timer"
      ref={ref}
      style={{
        width:"100%", minHeight:"100vh",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:"5rem 2rem",
        position:"relative", overflow:"hidden",
        background:"linear-gradient(160deg,#fff0f5 0%,#fce7f3 45%,#fff5f9 100%)",
        textAlign:"center",
      }}
    >
      {/* falling tulips & petals */}
      {FLOATERS.map((f,i) => <FloatingEl key={i} {...f} />)}

      {/* giant faint tulip watermark */}
      <motion.div
        style={{ position:"absolute", fontSize:"55vw", opacity:0.03, pointerEvents:"none", userSelect:"none", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:0 }}
        animate={{ rotate:[0,5,0,-5,0] }}
        transition={{ repeat:Infinity, duration:14, ease:"easeInOut" }}
      >🌷</motion.div>

      {/* floating sticky side notes — hidden on small screens */}
      {SIDE_NOTES.map((n,i) => (
        <motion.div
          key={i}
          initial={{ opacity:0, scale:0.8 }}
          animate={inView ? { opacity:1, scale:1 } : {}}
          transition={{ delay:0.8+i*0.2, duration:0.6, type:"spring" }}
          style={{
            position:"absolute", ...n.pos,
            background:"rgba(255,255,255,0.75)",
            backdropFilter:"blur(8px)",
            border:"1.5px solid #f9a8d4",
            borderRadius:14,
            padding:"0.6rem 1rem",
            maxWidth:160,
            boxShadow:"0 4px 18px rgba(244,114,182,.14)",
            fontFamily:"var(--font-caveat)",
            fontSize:"0.95rem",
            color:"var(--pink-deep)",
            transform:`rotate(${n.rot}deg)`,
            zIndex:2,
            display:"none",
          }}
          className="side-note"
        >
          {n.text}
        </motion.div>
      ))}

      {/* centre content */}
      <div style={{ position:"relative", zIndex:3 }}>

        {/* tulip bouquet above title */}
        <motion.div
          initial={{ opacity:0, y:20 }}
          animate={inView ? { opacity:1, y:0 } : {}}
          transition={{ duration:0.8 }}
          style={{ fontSize:"clamp(2.5rem,6vw,4rem)", marginBottom:"0.5rem", letterSpacing:"0.3rem" }}
        >
          🌷🌸🌷
        </motion.div>

        <motion.h2
          initial={{ opacity:0, y:20 }}
          animate={inView ? { opacity:1, y:0 } : {}}
          transition={{ duration:0.7, delay:0.1 }}
          style={{ fontFamily:"var(--font-playfair)", fontSize:"clamp(1.8rem,4vw,2.8rem)", color:"var(--pink-deep)", marginBottom:"0.4rem" }}
        >
          we&apos;ve been <em>us</em> for…
        </motion.h2>

        <motion.p
          initial={{ opacity:0 }}
          animate={inView ? { opacity:1 } : {}}
          transition={{ duration:0.7, delay:0.2 }}
          style={{ fontFamily:"var(--font-caveat)", fontSize:"1.2rem", color:"var(--muted)", marginBottom:"2.8rem" }}
        >
          every second counts, and i&apos;m counting every one 🩷
        </motion.p>

        {/* timer boxes */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:"clamp(0.8rem,2vw,2rem)", justifyContent:"center", marginBottom:"2.5rem" }}>
          {time ? (
            <>
              <CounterBox label="days"    value={time.days}  delay={0.3} inView={inView} />
              <CounterBox label="hours"   value={time.hours} delay={0.45} inView={inView} />
              <CounterBox label="minutes" value={time.mins}  delay={0.6} inView={inView} />
              <CounterBox label="seconds" value={time.secs}  delay={0.75} inView={inView} />
            </>
          ) : (
            [0,1,2,3].map(i => (
              <div key={i} style={{ width:"clamp(90px,16vw,130px)", height:"clamp(90px,16vw,130px)", borderRadius:20, background:"rgba(255,255,255,.6)", border:"2px solid #f9a8d4" }} />
            ))
          )}
        </div>

        {/* and still counting */}
        <motion.div
          initial={{ opacity:0, scale:0.9 }}
          animate={inView ? { opacity:1, scale:1 } : {}}
          transition={{ duration:0.7, delay:0.9 }}
          style={{
            display:"inline-flex", alignItems:"center", gap:"0.8rem",
            background:"rgba(255,255,255,.7)",
            backdropFilter:"blur(10px)",
            border:"1.5px solid #f9a8d4",
            borderRadius:50,
            padding:"0.7rem 1.8rem",
            boxShadow:"0 4px 20px rgba(244,114,182,.15)",
          }}
        >
          <motion.span animate={{ scale:[1,1.25,1] }} transition={{ repeat:Infinity, duration:1.4, ease:"easeInOut" }}>💗</motion.span>
          <span style={{ fontFamily:"var(--font-caveat)", fontSize:"1.3rem", color:"var(--pink-deep)" }}>
            …and still counting... You make me the happiest frfr
          </span>
          <motion.span animate={{ scale:[1,1.25,1] }} transition={{ repeat:Infinity, duration:1.4, ease:"easeInOut", delay:0.7 }}>💗</motion.span>
        </motion.div>

        {/* little love stat pills */}
        <motion.div
          initial={{ opacity:0, y:16 }}
          animate={inView ? { opacity:1, y:0 } : {}}
          transition={{ delay:1.1, duration:0.7 }}
          style={{ display:"flex", flexWrap:"wrap", gap:"0.7rem", justifyContent:"center", marginTop:"2rem" }}
        >
          {[
            "🎀 2 months of us",
            "🌙 countless sleep calls",
            "💬 endless good nights",
            "🎮 many gaming nights",
            "🩷 one very happy me",
          ].map((pill,i) => (
            <motion.span
              key={i}
              initial={{ opacity:0, scale:0.85 }}
              animate={inView ? { opacity:1, scale:1 } : {}}
              transition={{ delay:1.2+i*0.1, type:"spring" }}
              style={{
                fontFamily:"var(--font-caveat)", fontSize:"1rem",
                color:"var(--pink-deep)",
                background:"rgba(255,255,255,.75)",
                border:"1.5px solid #f9a8d4",
                borderRadius:50,
                padding:"0.35rem 1rem",
                backdropFilter:"blur(6px)",
              }}
            >
              {pill}
            </motion.span>
          ))}
        </motion.div>
      </div>

      {/* show side notes on md+ */}
      <style>{`.side-note { display: block !important; } @media(max-width:900px){ .side-note { display: none !important; } }`}</style>
    </section>
  );
}