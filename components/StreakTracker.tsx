"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SERIF = `"Georgia", "Times New Roman", serif`;
const SANS  = `var(--font-lato), "Inter", system-ui, sans-serif`;

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

      // compute current streak going backwards from today
      let cur = 0;
      for (let i = 0; i < 365; i++) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        if (dates.has(key)) cur++;
        else if (i > 0) break; // allow today to be missing still
      }

      // compute longest streak
      const sorted = [...dates].sort();
      let max = 0, run = 0, prev: Date | null = null;
      sorted.forEach(k => {
        const d = new Date(k+"T12:00:00");
        if (prev) {
          const diff = (d.getTime() - prev.getTime()) / 86400000;
          run = diff === 1 ? run + 1 : 1;
        } else run = 1;
        max = Math.max(max, run);
        prev = d;
      });

      const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
      setStreak(cur);
      setLongest(max);
      setTodayDone(dates.has(todayKey));
      setLoaded(true);
      if (cur >= 7) setTimeout(() => setCelebrate(true), 600);
    });
  }, []);

  const milestones = [3,7,14,30,60,100];
  const nextMilestone = milestones.find(m => m > streak) ?? streak + 10;
  const progress = Math.min((streak / nextMilestone) * 100, 100);

  if (!loaded) return null;

  return (
    <section style={{
      position:"relative", width:"100%",
      padding:"4rem clamp(1rem,3vw,2rem) 5rem",
      background:"linear-gradient(160deg,#fff1f2,#fce7f3 50%,#fff5f9)",
      overflow:"hidden",
    }}>
      {/* Confetti burst on milestone */}
      <AnimatePresence>
        {celebrate && (
          <motion.div initial={{opacity:1}} animate={{opacity:0}} transition={{delay:2,duration:1}}
            onAnimationComplete={()=>setCelebrate(false)}
            style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:10,overflow:"hidden"}}>
            {Array.from({length:20},(_,i)=>(
              <motion.div key={i}
                initial={{x:`${Math.random()*100}%`,y:"110%",rotate:0,opacity:1}}
                animate={{y:"-10%",rotate:Math.random()*720-360,opacity:0}}
                transition={{duration:1.5+Math.random(),ease:"easeOut",delay:Math.random()*0.4}}
                style={{
                  position:"absolute",width:10,height:10,borderRadius:Math.random()>0.5?"50%":2,
                  background:["#f9a8d4","#ec4899","#fda4af","#fce7f3","#f472b6"][Math.floor(Math.random()*5)],
                }}/>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{maxWidth:580,margin:"0 auto",textAlign:"center"}}>

        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",marginBottom:"1.2rem"}}>
          <div style={{width:45,height:1,background:"linear-gradient(90deg,transparent,#f9a8d4)"}}/>
          <motion.span style={{fontSize:"1.6rem"}} animate={{scale:[1,1.2,1]}} transition={{repeat:Infinity,duration:2}}>🔥</motion.span>
          <div style={{width:45,height:1,background:"linear-gradient(90deg,#f9a8d4,transparent)"}}/>
        </div>

        <h2 style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1.5rem,4vw,2.2rem)",color:"#be185d",margin:"0 0 0.4rem",fontWeight:400}}>
          our streak
        </h2>
        <p style={{fontFamily:SANS,fontSize:"0.9rem",color:"rgba(190,24,93,.5)",margin:"0 0 2.5rem"}}>
          {todayDone ? "✓ you've added a memory today 🌸" : "add a memory today to keep the streak going!"}
        </p>

        {/* Big streak number */}
        <motion.div
          animate={{scale:[1,1.04,1]}} transition={{repeat:Infinity,duration:3,ease:"easeInOut"}}
          style={{
            display:"inline-flex",flexDirection:"column",alignItems:"center",
            background:"linear-gradient(135deg,rgba(249,168,212,.15),rgba(236,72,153,.1))",
            border:"2px solid rgba(249,168,212,.3)",
            borderRadius:24,padding:"2rem 3rem",marginBottom:"2rem",
            boxShadow:"0 8px 32px rgba(244,114,182,.15)",
          }}>
          <span style={{fontFamily:SERIF,fontSize:"clamp(3.5rem,10vw,5.5rem)",color:"#be185d",lineHeight:1,fontWeight:700}}>
            {streak}
          </span>
          <span style={{fontFamily:SANS,fontSize:"0.85rem",color:"rgba(190,24,93,.55)",letterSpacing:"0.12em",textTransform:"uppercase",marginTop:"0.3rem"}}>
            day{streak!==1?"s":""} in a row
          </span>
        </motion.div>

        {/* Progress to next milestone */}
        <div style={{marginBottom:"1.5rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.5rem"}}>
            <span style={{fontFamily:SANS,fontSize:"0.78rem",color:"rgba(190,24,93,.45)"}}>progress to {nextMilestone} days</span>
            <span style={{fontFamily:SANS,fontSize:"0.78rem",color:"#ec4899"}}>{streak}/{nextMilestone}</span>
          </div>
          <div style={{height:6,borderRadius:3,background:"rgba(249,168,212,.2)",overflow:"hidden"}}>
            <motion.div
              initial={{width:0}} animate={{width:`${progress}%`}}
              transition={{duration:1.2,ease:"easeOut",delay:0.3}}
              style={{height:"100%",borderRadius:3,background:"linear-gradient(90deg,#f9a8d4,#ec4899)"}}/>
          </div>
        </div>

        {/* Stats row */}
        <div style={{display:"flex",gap:"1rem",justifyContent:"center",flexWrap:"wrap"}}>
          {[{label:"Current streak",val:`${streak} days`,e:"🔥"},{label:"Longest streak",val:`${longest} days`,e:"⭐"},{label:"Today",val:todayDone?"Done!":"Not yet",e:todayDone?"✅":"💭"}].map((s,i)=>(
            <div key={i} style={{
              background:"rgba(255,255,255,.7)",border:"1px solid rgba(249,168,212,.25)",
              borderRadius:16,padding:"1rem 1.5rem",textAlign:"center",minWidth:110,
              boxShadow:"0 2px 12px rgba(244,114,182,.08)",
            }}>
              <div style={{fontSize:"1.5rem",marginBottom:"0.3rem"}}>{s.e}</div>
              <div style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"1.1rem",color:"#be185d",marginBottom:"0.2rem"}}>{s.val}</div>
              <div style={{fontFamily:SANS,fontSize:"0.72rem",color:"rgba(190,24,93,.45)",textTransform:"uppercase",letterSpacing:"0.08em"}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Milestone badges */}
        <div style={{marginTop:"2rem",display:"flex",gap:"0.6rem",justifyContent:"center",flexWrap:"wrap"}}>
          {milestones.map(m=>(
            <div key={m} style={{
              padding:"0.3rem 0.8rem",borderRadius:20,fontFamily:SANS,fontSize:"0.78rem",
              background: streak>=m ? "linear-gradient(135deg,#fda4af,#ec4899)" : "rgba(249,168,212,.1)",
              color: streak>=m ? "#fff" : "rgba(190,24,93,.35)",
              border: `1px solid ${streak>=m?"transparent":"rgba(249,168,212,.2)"}`,
              fontWeight: streak>=m ? 600 : 400,
            }}>
              {streak>=m?"🏆":""} {m} days
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}