"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValue, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface PetalData { id:number; delay:number; left:string; size:number; dur:number; symbol:string; }

const PETAL_SYMBOLS = ["🌸","🌷","💗","🌹","💕","🩷","✨","⭐"];
const COLORS = ["#f9a8d4","#fbcfe8","#fce7f3","#f472b6","#ec4899","#fda4af","#fff1f2"];

function Petal({ delay, left, size, dur, symbol }: Omit<PetalData,"id">) {
  return (
    <motion.div
      style={{ position:"absolute", left, fontSize:size, top:-50, pointerEvents:"none", userSelect:"none", zIndex:1 }}
      animate={{ y:"115vh", rotate:720, opacity:[0,0.9,0.6,0] }}
      transition={{ duration:dur, delay, repeat:Infinity, ease:"linear" }}
    >
      {symbol}
    </motion.div>
  );
}

function StardustCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    interface Dot { x:number; y:number; size:number; color:string; vx:number; vy:number; life:number; maxLife:number; }
    const dots: Dot[] = Array.from({ length:70 }, () => ({
      x: Math.random()*window.innerWidth, y: Math.random()*window.innerHeight,
      size: Math.random()*2.5+0.5, color: COLORS[Math.floor(Math.random()*COLORS.length)],
      vx: (Math.random()-0.5)*0.35, vy: -Math.random()*0.5-0.15,
      life: Math.random()*300, maxLife: 250+Math.random()*250,
    }));
    let raf: number;
    const tick = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      dots.forEach(d => {
        d.x+=d.vx; d.y+=d.vy; d.life++;
        const alpha = Math.sin((d.life/d.maxLife)*Math.PI)*0.75;
        ctx.save(); ctx.globalAlpha=Math.max(0,alpha); ctx.fillStyle=d.color;
        ctx.shadowBlur=10; ctx.shadowColor=d.color;
        ctx.beginPath(); ctx.arc(d.x,d.y,d.size,0,Math.PI*2); ctx.fill(); ctx.restore();
        if (d.life>=d.maxLife||d.y<-10) {
          d.x=Math.random()*canvas.width; d.y=canvas.height+10; d.life=0;
          d.maxLife=250+Math.random()*250; d.vy=-Math.random()*0.5-0.15;
          d.vx=(Math.random()-0.5)*0.35; d.size=Math.random()*2.5+0.5;
          d.color=COLORS[Math.floor(Math.random()*COLORS.length)];
        }
      });
      raf=requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize",resize); };
  },[]);
  return <canvas ref={canvasRef} style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:1 }} />;
}

function MagneticPolaroid({ children, rotate, label, emoji }: {
  children: React.ReactNode; rotate:number; label:string; emoji:string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0); const y = useMotionValue(0);
  const sx = useSpring(x,{stiffness:130,damping:18});
  const sy = useSpring(y,{stiffness:130,damping:18});
  const [hovered, setHovered] = useState(false);

  const onMove = useCallback((e: React.MouseEvent) => {
    const el=ref.current; if(!el) return;
    const r=el.getBoundingClientRect();
    x.set((e.clientX-(r.left+r.width/2))*0.18);
    y.set((e.clientY-(r.top+r.height/2))*0.18);
  },[x,y]);
  const onLeave = useCallback(()=>{ x.set(0); y.set(0); setHovered(false); },[x,y]);

  return (
    <div style={{ position:"relative", flexShrink:0, zIndex:10 }}>
      <motion.div
        style={{
          position:"absolute", inset:-6, borderRadius:4,
          background:"linear-gradient(135deg,#f9a8d4,#ec4899,#fbcfe8,#f472b6,#f9a8d4)",
          backgroundSize:"300% 300%", filter:"blur(12px)",
          opacity: hovered ? 0.85 : 0.45, zIndex:-1, transition:"opacity 0.3s ease",
        }}
        animate={{ backgroundPosition:["0% 50%","100% 50%","0% 50%"] }}
        transition={{ duration:3, repeat:Infinity, ease:"linear" }}
      />
      <motion.div
        ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} onHoverStart={()=>setHovered(true)}
        style={{
          x:sx, y:sy, rotate, background:"#fff",
          padding:"1rem 1rem 0.8rem",
          boxShadow:"0 8px 32px rgba(244,114,182,0.18)",
          width:"clamp(190px,28vw,285px)", cursor:"pointer", position:"relative",
        }}
        whileHover={{ rotate:0, scale:1.07 }}
        transition={{ type:"spring", stiffness:180, damping:16 }}
      >
        {children}
        <p style={{
          fontFamily:"var(--font-caveat)", textAlign:"center",
          paddingTop:"0.7rem", color:"var(--muted)", fontSize:"1.1rem", margin:0,
        }}>
          {label} {emoji}
        </p>
      </motion.div>
    </div>
  );
}

function CurtainReveal({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      style={{
        position:"fixed", inset:0, zIndex:9999,
        display:"flex", alignItems:"center", justifyContent:"center",
        flexDirection:"column", gap:"1.5rem",
        background:"linear-gradient(135deg,#fce7f3 0%,#fbcfe8 50%,#fda4af 100%)",
      }}
      animate={{ opacity:[1,1,1,0], scale:[1,1,1.05,1.05] }}
      transition={{ duration:2.8, times:[0,0.55,0.85,1], ease:"easeInOut" }}
      onAnimationComplete={onDone}
    >
      {[0,0.35,0.7].map((d,i) => (
        <motion.div key={i} style={{
          position:"absolute", width:180, height:180, borderRadius:"50%",
          border:"2px solid rgba(236,72,153,0.45)",
        }}
          animate={{ scale:[0.4,3.2], opacity:[0.9,0] }}
          transition={{ duration:1.8, delay:d, repeat:Infinity, ease:"easeOut" }}
        />
      ))}
      <motion.div
        style={{ fontSize:"5rem", zIndex:2, filter:"drop-shadow(0 0 30px rgba(244,114,182,0.8))" }}
        animate={{ scale:[0.5,1.35,1,1.25,1], rotate:[-15,10,-8,6,0] }}
        transition={{ duration:1.6, times:[0,0.3,0.5,0.75,1] }}
      >💗</motion.div>
      <motion.p
        style={{
          fontFamily:"var(--font-playfair)", fontStyle:"italic",
          fontSize:"clamp(1.3rem,3vw,2rem)", color:"#be185d",
          zIndex:2, margin:0, textAlign:"center", padding:"0 2rem",
        }}
        initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
        transition={{ delay:0.5, duration:0.9 }}
      >
        something made just for you…
      </motion.p>
      <motion.p
        style={{ fontFamily:"var(--font-caveat)", fontSize:"clamp(1rem,2.5vw,1.3rem)", color:"#db2777", zIndex:2, margin:0 }}
        initial={{ opacity:0 }} animate={{ opacity:[0,1,1,0] }}
        transition={{ delay:0.9, duration:1.5, times:[0,0.2,0.7,1] }}
      >
        🌸 for my favourite person 🌸
      </motion.p>
    </motion.div>
  );
}

function ScrollIndicator({ entered }: { entered: boolean }) {
  const handleClick = () => {
    document.getElementById("live-timer")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.div
      onClick={handleClick}
      initial={{ opacity: 0 }}
      animate={entered ? { opacity: 1 } : {}}
      transition={{ delay: 1.3, duration: 0.8 }}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: "0.15rem", marginTop: "2.5rem", cursor: "pointer", userSelect: "none",
      }}
      whileHover={{ scale: 1.12 }}
    >
      {/* label */}
      <motion.span
        style={{ fontFamily: "var(--font-caveat)", color: "var(--muted)", fontSize: "1rem", marginBottom: "0.5rem" }}
        animate={{ y: [-2, 2, -2] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
      >
        our time together
      </motion.span>

      {/* bouncing flower */}
      <motion.span
        style={{ fontSize: "1.8rem", lineHeight: 1, display: "block" }}
        animate={{ y: [0, -7, 0], rotate: [-10, 10, -10] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
      >
        🌸
      </motion.span>

      {/* cascading hearts getting smaller — implies downward direction */}
      {([
        { size: "1.1rem", delay: 0 },
        { size: "0.8rem", delay: 0.18 },
        { size: "0.55rem", delay: 0.36 },
      ] as { size: string; delay: number }[]).map((h, i) => (
        <motion.span
          key={i}
          style={{ fontSize: h.size, lineHeight: 1, display: "block", marginTop: "-2px" }}
          animate={{ opacity: [0.15, 1, 0.15], y: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 1.1, delay: h.delay, ease: "easeInOut" }}
        >
          🩷
        </motion.span>
      ))}
    </motion.div>
  );
}

export default function Polaroids() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target:ref, offset:["start start","end start"] });
  const titleY = useTransform(scrollYProgress,[0,1],[0,60]);
  const [petals, setPetals] = useState<PetalData[]>([]);
  const [showCurtain, setShowCurtain] = useState(true);
  const [entered, setEntered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setPetals(Array.from({ length:28 },(_,i) => ({
      id:i, delay:Math.random()*8, left:Math.random()*100+"%",
      size:13+Math.random()*14, dur:8+Math.random()*10,
      symbol:PETAL_SYMBOLS[Math.floor(Math.random()*PETAL_SYMBOLS.length)],
    })));
  },[]);

  useEffect(() => {
  const check = () => setIsMobile(window.innerWidth <= 768);
  check(); // run on first load
  window.addEventListener("resize", check);
  return () => window.removeEventListener("resize", check);
}, []);

  return (
    <>
      <AnimatePresence>
        {showCurtain && <CurtainReveal onDone={()=>{ setShowCurtain(false); setEntered(true); }} />}
      </AnimatePresence>

      <section ref={ref} id="hero" style={{
        position:"relative", width:"100%", minHeight:"100vh",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        padding:"5rem 2rem", overflow:"hidden",
        background:"linear-gradient(160deg,#fff1f2 0%,#fce7f3 45%,#fff5f9 100%)",
      }}>
        <StardustCanvas />
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none", zIndex:0,
          background:[
            "radial-gradient(ellipse 55% 45% at 28% 38%, rgba(249,168,212,0.32) 0%, transparent 70%)",
            "radial-gradient(ellipse 45% 40% at 72% 58%, rgba(253,186,213,0.26) 0%, transparent 70%)",
          ].join(","),
        }} />

        <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:2 }}>
          {petals.map(p => <Petal key={p.id} {...p} />)}
        </div>

        <motion.div
          initial={{ opacity:0, y:90 }}
          animate={entered?{opacity:1,y:0}:{}}
          transition={{ duration:1.2, delay:0.15, ease:[0.16,1,0.3,1] }}

          style={{
  display:"flex",
  flexDirection: isMobile ? "column" : "row",
  alignItems:"center",
  justifyContent:"center",
  gap: isMobile ? "1.5rem" : "clamp(2rem,5vw,5rem)",
  zIndex:10,
  width:"100%",
  maxWidth:920,
}}
      
        >
          <MagneticPolaroid rotate={-6} label="her" emoji="🩷">
            <div style={{ width:"100%", aspectRatio:"1", position:"relative", overflow:"hidden", background:"linear-gradient(135deg,#fce7f3,#fbcfe8)" }}>
              <Image src="/photos/her.jpg" alt="her" fill style={{ objectFit:"cover", objectPosition:"center 30%" }} />
            </div>
          </MagneticPolaroid>

          <motion.div
            style={{
              fontSize:"clamp(3rem,6vw,5rem)", flexShrink:0, zIndex:10,
              filter:"drop-shadow(0 0 18px rgba(244,114,182,0.55))",
            }}
            animate={{
              scale:[1,1.22,1,1.15,1],
              filter:["drop-shadow(0 0 10px rgba(244,114,182,0.4))","drop-shadow(0 0 32px rgba(244,114,182,0.95))","drop-shadow(0 0 10px rgba(244,114,182,0.4))"],
            }}
            transition={{ repeat:Infinity, duration:1.5, ease:"easeInOut" }}
          >💗</motion.div>

          <MagneticPolaroid rotate={6} label="him" emoji="🤍">
            <div style={{ width:"100%", aspectRatio:"1", position:"relative", overflow:"hidden", background:"linear-gradient(135deg,#fce7f3,#fbcfe8)" }}>
              <Image src="/photos/him.jpg" alt="him" fill style={{ objectFit:"cover", objectPosition:"center 25%", transform:"scale(1.4)", transformOrigin:"center 25%" }} />
            </div>
          </MagneticPolaroid>
        </motion.div>

        <motion.div
          initial={{ opacity:0, y:55 }}
          animate={entered?{opacity:1,y:0}:{}}
          transition={{ duration:1.1, delay:0.5, ease:[0.16,1,0.3,1] }}
          style={{ y:titleY, textAlign:"center", marginTop:"3.2rem", zIndex:10 }}
        >
          <motion.div
            style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"0.8rem", marginBottom:"1rem" }}
            initial={{ scaleX:0, opacity:0 }}
            animate={entered?{scaleX:1,opacity:1}:{}}
            transition={{ duration:0.9, delay:0.85 }}
          >
            <div style={{ width:55, height:1, background:"linear-gradient(90deg,transparent,#f9a8d4)" }} />
            <span style={{ fontSize:"0.9rem", color:"#f9a8d4" }}>✦</span>
            <div style={{ width:55, height:1, background:"linear-gradient(90deg,#f9a8d4,transparent)" }} />
          </motion.div>

          <h1 style={{
            fontFamily:"var(--font-playfair)", fontSize:"clamp(2.1rem,5.5vw,3.6rem)",
            color:"var(--pink-deep)", margin:0, textShadow:"0 2px 28px rgba(244,114,182,0.2)",
          }}>
            3 months of <em>us</em> 🌸
          </h1>
          <motion.p
            style={{ fontFamily:"var(--font-caveat)", fontSize:"clamp(1.15rem,3vw,1.65rem)", color:"var(--muted)", marginTop:"0.6rem" }}
            initial={{ opacity:0 }} animate={entered?{opacity:1}:{}}
            transition={{ delay:1.05, duration:0.9 }}
          >
            and somehow every single day gets better than the last haina? 💗
          </motion.p>

          <ScrollIndicator entered={entered} />
        </motion.div>
      </section>
    </>
  );
}