"use client";
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendarData } from "@/lib/calendarStore";
import SectionSkeleton from "@/components/SectionSkeleton";
import BgAccents from "@/components/BgAccents";

const SERIF = `"Georgia","Times New Roman",serif`;
const SANS  = `var(--font-lato),"Inter",system-ui,sans-serif`;

/* Theme-adaptive: dark accent text on light section in light mode,
   bright accent text on dark section in dark mode (handled by globals). */

export default function StreakTracker() {
  const { data, loading } = useCalendarData();

  const { streak, longest, todayDone, celebrate } = useMemo(() => {
    const dates = new Set(data.filter(e => e.note || (e.photos?.length ?? 0) > 0).map(e => e.date));
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
      if (prev) { const diff=(d.getTime()-prev.getTime())/86400000; run=diff===1?run+1:1; } else run=1;
      max=Math.max(max,run); prev=d;
    });
    const todayKey=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
    return { streak: cur, longest: max, todayDone: dates.has(todayKey), celebrate: cur >= 7 };
  }, [data]);

  if (loading) return <SectionSkeleton accent="rgba(var(--pink-rgb),.25)" lines={5}/>;

  const milestones    = [3,7,14,30,60,100];
  const nextMilestone = milestones.find(m=>m>streak) ?? streak+10;
  const progress      = Math.min((streak/nextMilestone)*100,100);

  return (
    <section id="streak" style={{
      position:"relative",width:"100%",minHeight:"100vh",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:"clamp(4rem,8vh,7rem) clamp(1rem,4vw,3rem)",
      overflow:"hidden",
    }}>
      {/* Confetti burst */}
      <AnimatePresence>
        {celebrate&&(
          <motion.div initial={{opacity:1}} animate={{opacity:0}} transition={{delay:3,duration:1.2}}
            style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:10,overflow:"hidden"}}>
            {Array.from({length:28},(_,i)=>(
              <motion.div key={i}
                initial={{x:`${Math.random()*100}%`,y:"110%",opacity:1}}
                animate={{y:"-10%",rotate:Math.random()*720-360,opacity:0}}
                transition={{duration:2+Math.random(),ease:"easeOut",delay:Math.random()*0.6}}
                style={{position:"absolute",width:8,height:8,borderRadius:Math.random()>.5?"50%":2,
                  background:["var(--pink-light)","var(--pink)","var(--pink)","var(--pink)","var(--pink-mid)"][Math.floor(Math.random()*5)]}}/>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Soft glow */}
      <div style={{position:"absolute",top:"30%",left:"50%",transform:"translateX(-50%)",width:"60%",height:"40%",borderRadius:"50%",background:"rgba(var(--pink-rgb),.08)",filter:"blur(80px)",pointerEvents:"none"}}/>

      {/* Themed corner spotlights + rising embers */}
      <BgAccents variant="spotlights" />
      <BgAccents variant="embers" desktopCount={10} mobileCount={5} />

      <motion.div initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{maxWidth:520,width:"100%",textAlign:"center",position:"relative",zIndex:2}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",marginBottom:"1rem"}}>
          <div style={{width:55,height:1,background:"linear-gradient(90deg,transparent,rgba(var(--pink-rgb),.4))"}}/>
          <span className="occ-fire-icon" style={{fontSize:"2rem","--occ-glow":"drop-shadow(0 0 12px rgba(var(--pink-rgb),.6))"} as React.CSSProperties}>🔥</span>
          <div style={{width:55,height:1,background:"linear-gradient(90deg,rgba(var(--pink-rgb),.4),transparent)"}}/>
        </div>
        <h2 style={{
          fontFamily:SERIF,fontStyle:"italic",
          fontSize:"clamp(1.8rem,5vw,2.8rem)",
          color:"var(--pink-deep)",margin:"0 0 0.5rem",fontWeight:400,
          textShadow:"0 2px 20px rgba(var(--pink-rgb),.18)",
        }}>
          our streak
        </h2>
        <p style={{fontFamily:SANS,fontSize:"0.9rem",color:"var(--muted)",margin:"0 0 2.5rem",lineHeight:1.5}}>
          {todayDone
            ? "✓ memory added today — streak's alive 🌸"
            : "add a memory today to keep the streak going 💗"}
        </p>

        {/* Big number */}
        <div style={{
            display:"inline-flex",flexDirection:"column",alignItems:"center",
            background:"var(--cream)",
            border:"1px solid rgba(var(--pink-rgb),.25)",
            borderRadius:32,padding:"2.5rem 5rem",marginBottom:"2.5rem",
            boxShadow:"0 6px 30px rgba(var(--pink-deep-rgb),.12), inset 0 0 30px rgba(var(--pink-rgb),.04)",
            position:"relative",overflow:"hidden",
          }}>
          <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 30%,rgba(var(--pink-rgb),.15) 0%,transparent 65%)",pointerEvents:"none"}}/>
          <span style={{
            fontFamily:SERIF,
            fontSize:"clamp(4.5rem,14vw,8rem)",
            color:"var(--pink-deep)",
            lineHeight:1,fontWeight:700,
            textShadow:"0 0 40px rgba(var(--pink-rgb),.35)",
            position:"relative",zIndex:1,
          }}>
            {streak}
          </span>
          <span style={{fontFamily:SANS,fontSize:"0.8rem",color:"var(--muted)",letterSpacing:"0.22em",textTransform:"uppercase",marginTop:"0.5rem",position:"relative",zIndex:1}}>
            day{streak!==1?"s":""} in a row
          </span>
        </div>

        {/* Progress */}
        <div style={{marginBottom:"2rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.5rem"}}>
            <span style={{fontFamily:SANS,fontSize:"0.75rem",color:"var(--muted)"}}>next milestone: {nextMilestone} days</span>
            <span style={{fontFamily:SANS,fontSize:"0.75rem",color:"var(--pink-deep)",fontWeight:600}}>{streak}/{nextMilestone}</span>
          </div>
          <div style={{height:6,borderRadius:3,background:"rgba(var(--pink-rgb),.15)",overflow:"hidden"}}>
            <motion.div initial={{width:0}} animate={{width:`${progress}%`}} transition={{duration:1.4,ease:"easeOut",delay:0.4}}
              style={{height:"100%",borderRadius:3,background:"linear-gradient(90deg,var(--pink),var(--pink-deep))",boxShadow:"0 0 10px rgba(var(--pink-rgb),.5)"}}/>
          </div>
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.8rem",marginBottom:"2rem"}}>
          {[
            {e:"🔥",v:`${streak}d`,l:"current"},
            {e:"⭐",v:`${longest}d`,l:"longest"},
            {e:todayDone?"✅":"💭",v:todayDone?"done!":"pending",l:"today"},
          ].map((s,i)=>(
            <motion.div key={i} whileHover={{y:-3,scale:1.03}}
              style={{
                background:"var(--cream)",
                border:"1px solid rgba(var(--pink-rgb),.22)",
                borderRadius:18,padding:"1.1rem 0.5rem",textAlign:"center",
                boxShadow:"0 4px 16px rgba(var(--pink-deep-rgb),.08)",
              }}>
              <div style={{fontSize:"1.5rem",marginBottom:"0.3rem"}}>{s.e}</div>
              <div style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"1.1rem",color:"var(--pink-deep)",lineHeight:1,marginBottom:"0.2rem"}}>{s.v}</div>
              <div style={{fontFamily:SANS,fontSize:"0.65rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.1em"}}>{s.l}</div>
            </motion.div>
          ))}
        </div>

        {/* Milestone badges */}
        <div style={{display:"flex",gap:"0.5rem",justifyContent:"center",flexWrap:"wrap"}}>
          {milestones.map(m=>{
            const reached = streak>=m;
            return (
              <motion.div key={m} whileHover={{scale:1.08,y:-2}}
                style={{
                  padding:"0.3rem 0.9rem",borderRadius:22,fontFamily:SANS,fontSize:"0.75rem",
                  background: reached ? "rgba(var(--pink-rgb),.22)" : "var(--cream)",
                  color: reached ? "var(--pink-deep)" : "var(--muted)",
                  border: `1px solid rgba(var(--pink-rgb),${reached?.5:.18})`,
                  boxShadow: reached ? "0 0 14px rgba(var(--pink-rgb),.25)" : "none",
                }}>
                {reached?"🏆 ":""}{m}d
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
