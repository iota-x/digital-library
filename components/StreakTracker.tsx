"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SERIF = `"Georgia", "Times New Roman", serif`;
const SANS  = `var(--font-lato), "Inter", system-ui, sans-serif`;

const BG    = "linear-gradient(170deg, #fff0f4 0%, #ffe4ed 30%, #ffd6e5 60%, #ffc8dc 100%)";
const CARD  = "rgba(255,255,255,0.55)";
const RING  = "rgba(236,72,153,0.18)";
const ACCENT= "#c0335a";
const DIM   = "rgba(160,30,70,0.45)";

export default function StreakTracker() {
  const [streak,    setStreak]    = useState(0);
  const [longest,   setLongest]   = useState(0);
  const [todayDone, setTodayDone] = useState(false);
  const [loaded,    setLoaded]    = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    fetch("/api/calendar").then(r => r.json()).then((arr: { date:string; note:string; photos:string[] }[]) => {
      const dates = new Set(arr.filter(e => e.note || (e.photos?.length ?? 0) > 0).map(e => e.date));
      const today = new Date();
      let cur = 0;
      for (let i = 0; i < 365; i++) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        if (dates.has(key)) cur++;
        else if (i > 0) break;
      }
      const sorted = [...dates].sort();
      let max = 0, run = 0, prev: Date | null = null;
      sorted.forEach(k => {
        const d = new Date(k+"T12:00:00");
        if (prev) { const diff = (d.getTime() - prev.getTime()) / 86400000; run = diff === 1 ? run + 1 : 1; }
        else run = 1;
        max = Math.max(max, run); prev = d;
      });
      const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
      setStreak(cur); setLongest(max); setTodayDone(dates.has(todayKey)); setLoaded(true);
      if (cur >= 7) setTimeout(() => setCelebrate(true), 600);
    });
  }, []);

  const milestones = [3, 7, 14, 30, 60, 100];
  const nextMilestone = milestones.find(m => m > streak) ?? streak + 10;
  const progress = Math.min((streak / nextMilestone) * 100, 100);
  const petals = ["#fda4af","#f9a8d4","#fecdd3","#fbcfe8","#f472b6"];

  if (!loaded) return null;

  return (
    <section style={{
      position: "relative",
      width: "100%",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "clamp(4rem,8vh,6rem) clamp(1rem,4vw,3rem)",
      background: BG,
      overflow: "hidden",
      boxSizing: "border-box",
    }}>
      {/* Blobs */}
      {[
        { w:380, h:380, top:"-8%",  left:"-8%",  c:"rgba(252,100,150,0.10)" },
        { w:300, h:300, top:"60%",  left:"78%",  c:"rgba(244,114,182,0.09)" },
        { w:220, h:220, top:"35%",  left:"48%",  c:"rgba(236,72,153,0.07)"  },
        { w:260, h:260, top:"80%",  left:"10%",  c:"rgba(253,164,175,0.08)" },
      ].map((b,i) => (
        <motion.div key={i}
          animate={{ scale:[1,1.18,1], opacity:[0.6,1,0.6] }}
          transition={{ repeat:Infinity, duration:6+i*2, ease:"easeInOut" }}
          style={{ position:"absolute", width:b.w, height:b.h, top:b.top, left:b.left,
            borderRadius:"50%", background:b.c, filter:"blur(80px)", pointerEvents:"none", zIndex:0 }} />
      ))}

      {/* Confetti */}
      <AnimatePresence>
        {celebrate && (
          <motion.div initial={{opacity:1}} animate={{opacity:0}} transition={{delay:2.2,duration:0.8}}
            onAnimationComplete={() => setCelebrate(false)}
            style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:10,overflow:"hidden"}}>
            {Array.from({length:28},(_,i) => (
              <motion.div key={i}
                initial={{ x:`${Math.random()*100}%`, y:"110%", rotate:0, opacity:1 }}
                animate={{ y:"-10%", rotate:Math.random()*720-360, opacity:0 }}
                transition={{ duration:1.4+Math.random(), ease:"easeOut", delay:Math.random()*0.5 }}
                style={{ position:"absolute", width:9, height:9,
                  borderRadius: Math.random()>0.5 ? "50%" : 2,
                  background: petals[Math.floor(Math.random()*petals.length)] }} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{opacity:0,y:32}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{
          maxWidth: 640,
          width: "100%",
          margin: "0 auto",
          textAlign: "center",
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1.4rem,3vh,2.2rem)",
        }}>

        {/* Header */}
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",marginBottom:"0.9rem"}}>
            <div style={{width:52,height:1,background:"linear-gradient(90deg,transparent,rgba(192,51,90,0.4))"}} />
            <motion.span style={{fontSize:"1.8rem"}}
              animate={{scale:[1,1.22,1],rotate:[0,12,-12,0]}}
              transition={{repeat:Infinity,duration:2.2,ease:"easeInOut"}}>🔥</motion.span>
            <div style={{width:52,height:1,background:"linear-gradient(90deg,rgba(192,51,90,0.4),transparent)"}} />
          </div>
          <h2 style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1.8rem,4vw,2.8rem)",
            color:ACCENT,margin:"0 0 0.4rem",fontWeight:400,
            textShadow:"0 2px 20px rgba(192,51,90,0.15)"}}>
            our streak
          </h2>
          <p style={{fontFamily:SANS,fontSize:"clamp(0.85rem,1.5vw,0.95rem)",color:DIM,margin:0,letterSpacing:"0.02em"}}>
            {todayDone ? "✓ memory added today — streak alive 🌸" : "no memory yet today — keep it going!"}
          </p>
        </div>

        {/* Flame ring + big number */}
        <div style={{display:"flex",justifyContent:"center"}}>
          <div style={{position:"relative",display:"inline-block"}}>
            <motion.div
              animate={{scale:[1,1.06,1],opacity:[0.5,1,0.5]}}
              transition={{repeat:Infinity,duration:2.6,ease:"easeInOut"}}
              style={{
                position:"absolute",inset:-22,borderRadius:"50%",
                background:"conic-gradient(from 180deg,#fda4af,#f472b6,#ec4899,#be185d,#fda4af)",
                filter:"blur(16px)",opacity:0.38,pointerEvents:"none",
              }} />
            <motion.div
              animate={{scale:[1,1.03,1]}}
              transition={{repeat:Infinity,duration:3,ease:"easeInOut"}}
              style={{
                position:"relative",
                width:"clamp(160px,22vw,220px)",
                height:"clamp(160px,22vw,220px)",
                borderRadius:"50%",
                background:"linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,220,235,0.78))",
                border:"2.5px solid rgba(236,72,153,0.22)",
                backdropFilter:"blur(12px)",
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                boxShadow:"0 16px 60px rgba(192,51,90,0.18),inset 0 0 0 1px rgba(255,255,255,0.65)",
              }}>
              <span style={{fontFamily:SERIF,fontSize:"clamp(3.2rem,7vw,5rem)",color:ACCENT,
                lineHeight:1,fontWeight:700,textShadow:"0 2px 12px rgba(192,51,90,0.2)"}}>
                {streak}
              </span>
              <span style={{fontFamily:SANS,fontSize:"clamp(0.62rem,1vw,0.74rem)",color:DIM,
                letterSpacing:"0.18em",textTransform:"uppercase",marginTop:"0.15rem"}}>
                day{streak!==1?"s":""} in a row
              </span>
            </motion.div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{padding:"0 0.5rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.6rem"}}>
            <span style={{fontFamily:SANS,fontSize:"0.78rem",color:DIM}}>next milestone: {nextMilestone} days</span>
            <span style={{fontFamily:SANS,fontSize:"0.78rem",color:ACCENT,fontWeight:600}}>{streak}/{nextMilestone}</span>
          </div>
          <div style={{height:8,borderRadius:4,background:"rgba(236,72,153,0.12)",overflow:"hidden",
            boxShadow:"inset 0 1px 3px rgba(0,0,0,0.06)"}}>
            <motion.div
              initial={{width:0}} animate={{width:`${progress}%`}}
              transition={{duration:1.4,ease:"easeOut",delay:0.4}}
              style={{height:"100%",borderRadius:4,
                background:"linear-gradient(90deg,#fda4af 0%,#f472b6 50%,#be185d 100%)",
                boxShadow:"0 0 14px rgba(236,72,153,0.5)"}} />
          </div>
        </div>

        {/* Stat cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"clamp(0.7rem,2vw,1.1rem)"}}>
          {[
            { e:"🔥", val:`${streak}`, sub:"current streak" },
            { e:"⭐", val:`${longest}`, sub:"longest streak" },
            { e: todayDone?"✅":"💭", val:todayDone?"done!":"pending", sub:"today" },
          ].map((s,i) => (
            <motion.div key={i}
              initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}}
              viewport={{once:true}} transition={{delay:i*0.1,type:"spring",stiffness:200,damping:20}}
              style={{
                background:CARD,
                border:`1px solid ${RING}`,
                borderRadius:20,
                padding:"clamp(1rem,2.5vh,1.6rem) clamp(0.6rem,2vw,1rem)",
                textAlign:"center",
                backdropFilter:"blur(12px)",
                boxShadow:"0 6px 28px rgba(192,51,90,0.09),inset 0 0 0 1px rgba(255,255,255,0.55)",
              }}>
              <div style={{fontSize:"clamp(1.6rem,3vw,2rem)",marginBottom:"0.5rem"}}>{s.e}</div>
              <div style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1.3rem,2.5vw,1.7rem)",
                color:ACCENT,marginBottom:"0.2rem",lineHeight:1}}>{s.val}</div>
              <div style={{fontFamily:SANS,fontSize:"clamp(0.62rem,1vw,0.72rem)",color:DIM,
                textTransform:"uppercase",letterSpacing:"0.1em"}}>{s.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Milestone badges */}
        <div style={{display:"flex",gap:"0.55rem",justifyContent:"center",flexWrap:"wrap"}}>
          {milestones.map(m => {
            const done = streak >= m;
            return (
              <motion.div key={m} whileHover={{scale:1.08,y:-2}}
                style={{
                  padding:"0.35rem 1rem",borderRadius:20,
                  fontFamily:SANS,fontSize:"clamp(0.72rem,1.2vw,0.82rem)",fontWeight:done?700:400,
                  background: done ? "linear-gradient(135deg,#f472b6,#be185d)" : "rgba(236,72,153,0.07)",
                  color: done ? "#fff" : "rgba(160,30,70,0.38)",
                  border: `1px solid ${done ? "transparent" : "rgba(236,72,153,0.15)"}`,
                  boxShadow: done ? "0 3px 14px rgba(190,24,93,0.32)" : "none",
                  transition:"all 0.2s",
                }}>
                {done ? "🏆 " : ""}{m} days
              </motion.div>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(192,51,90,0.18),rgba(180,30,80,0.28),rgba(192,51,90,0.18),transparent)"}} />
      </motion.div>
    </section>
  );
}