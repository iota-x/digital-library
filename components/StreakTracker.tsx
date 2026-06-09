"use client";
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendarData } from "@/lib/calendarStore";
import SectionSkeleton from "@/components/SectionSkeleton";

const SERIF = `"Georgia","Times New Roman",serif`;
const SANS  = `var(--font-lato),"Inter",system-ui,sans-serif`;

/* ── Palette slot 2: #61063B mid-Tyrian — sits between Calendar (#A10B56 light) and SurpriseMe (#4E0535) ── */
const BG   = "linear-gradient(180deg,#a10b56 0%,#7e0b48 50%,#61063b 100%)";
const ACC  = "#f9a8d4";
const DEEP = "#fce7f3";

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

  if (loading) return <SectionSkeleton bg={BG} accent="rgba(249,168,212,0.2)" lines={5} />;

  const milestones    = [3,7,14,30,60,100];
  const nextMilestone = milestones.find(m=>m>streak) ?? streak+10;
  const progress      = Math.min((streak/nextMilestone)*100,100);

  return (
    <section style={{
      position:"relative",width:"100%",minHeight:"100vh",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:"clamp(4rem,8vh,7rem) clamp(1rem,4vw,3rem)",
      background:BG,overflow:"hidden",
    }}>
      {/* Ambient orbs */}
      <div style={{position:"absolute",top:"20%",left:"10%",width:280,height:280,borderRadius:"50%",background:"rgba(236,72,153,.08)",filter:"blur(70px)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"15%",right:"8%",width:220,height:220,borderRadius:"50%",background:"rgba(244,114,182,.06)",filter:"blur(60px)",pointerEvents:"none"}}/>

      {/* Confetti on milestone */}
      <AnimatePresence>
        {celebrate&&(
          <motion.div initial={{opacity:1}} animate={{opacity:0}} transition={{delay:3,duration:1.2}}
            style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:10,overflow:"hidden"}}>
            {Array.from({length:24},(_,i)=>(
              <motion.div key={i}
                initial={{x:`${Math.random()*100}%`,y:"110%",opacity:1}}
                animate={{y:"-10%",rotate:Math.random()*720-360,opacity:0}}
                transition={{duration:2+Math.random(),ease:"easeOut",delay:Math.random()*0.6}}
                style={{position:"absolute",width:8,height:8,borderRadius:Math.random()>.5?"50%":2,
                  background:["#f9a8d4","#ec4899","#fda4af","#f472b6"][Math.floor(Math.random()*4)]}}/>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{maxWidth:520,width:"100%",textAlign:"center",position:"relative",zIndex:2}}>

        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",marginBottom:"1rem"}}>
          <div style={{width:50,height:1,background:`linear-gradient(90deg,transparent,${ACC}44)`}}/>
          <motion.span style={{fontSize:"1.8rem",filter:`drop-shadow(0 0 10px ${ACC}88)`}}
            animate={{scale:[1,1.25,1]}} transition={{repeat:Infinity,duration:1.8}}>🔥</motion.span>
          <div style={{width:50,height:1,background:`linear-gradient(90deg,${ACC}44,transparent)`}}/>
        </div>
        <h2 style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1.8rem,5vw,2.6rem)",color:DEEP,margin:"0 0 0.4rem",fontWeight:400}}>
          our streak
        </h2>
        <p style={{fontFamily:SANS,fontSize:"0.88rem",color:`${ACC}99`,margin:"0 0 2.5rem"}}>
          {todayDone?"✓ memory added today 🌸":"add a memory today to keep it going!"}
        </p>

        {/* Big number */}
        <motion.div animate={{scale:[1,1.03,1]}} transition={{repeat:Infinity,duration:3.5,ease:"easeInOut"}}
          style={{
            display:"inline-flex",flexDirection:"column",alignItems:"center",
            background:"rgba(0,0,0,.25)",border:"1px solid rgba(249,168,212,.2)",
            borderRadius:28,padding:"2.5rem 4rem",marginBottom:"2.5rem",
            boxShadow:"0 0 60px rgba(236,72,153,.15),inset 0 0 40px rgba(0,0,0,.3)",
            position:"relative",overflow:"hidden",
          }}>
          <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 30%,rgba(236,72,153,.1) 0%,transparent 70%)",pointerEvents:"none"}}/>
          <span style={{fontFamily:SERIF,fontSize:"clamp(4rem,12vw,7rem)",color:DEEP,lineHeight:1,fontWeight:700,textShadow:`0 0 40px ${ACC}66`,position:"relative",zIndex:1}}>
            {streak}
          </span>
          <span style={{fontFamily:SANS,fontSize:"0.78rem",color:`${ACC}88`,letterSpacing:"0.2em",textTransform:"uppercase",marginTop:"0.4rem",position:"relative",zIndex:1}}>
            day{streak!==1?"s":""} in a row
          </span>
        </motion.div>

        {/* Progress */}
        <div style={{marginBottom:"2rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.45rem"}}>
            <span style={{fontFamily:SANS,fontSize:"0.73rem",color:`${ACC}66`}}>next: {nextMilestone} days</span>
            <span style={{fontFamily:SANS,fontSize:"0.73rem",color:ACC}}>{streak}/{nextMilestone}</span>
          </div>
          <div style={{height:5,borderRadius:3,background:"rgba(249,168,212,.1)",overflow:"hidden"}}>
            <motion.div initial={{width:0}} animate={{width:`${progress}%`}} transition={{duration:1.4,ease:"easeOut",delay:0.3}}
              style={{height:"100%",borderRadius:3,background:`linear-gradient(90deg,${ACC},#ec4899)`,boxShadow:`0 0 8px ${ACC}66`}}/>
          </div>
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.7rem",marginBottom:"1.8rem"}}>
          {[{e:"🔥",v:`${streak}d`,l:"current"},{e:"⭐",v:`${longest}d`,l:"longest"},{e:todayDone?"✅":"💭",v:todayDone?"done":"pending",l:"today"}].map((s,i)=>(
            <div key={i} style={{background:"rgba(0,0,0,.2)",border:"1px solid rgba(249,168,212,.12)",borderRadius:14,padding:"0.9rem 0.5rem",textAlign:"center"}}>
              <div style={{fontSize:"1.3rem",marginBottom:"0.25rem"}}>{s.e}</div>
              <div style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"1rem",color:DEEP}}>{s.v}</div>
              <div style={{fontFamily:SANS,fontSize:"0.62rem",color:`${ACC}66`,textTransform:"uppercase",letterSpacing:"0.1em",marginTop:"0.15rem"}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Badges */}
        <div style={{display:"flex",gap:"0.45rem",justifyContent:"center",flexWrap:"wrap"}}>
          {milestones.map(m=>(
            <div key={m} style={{
              padding:"0.28rem 0.8rem",borderRadius:20,fontFamily:SANS,fontSize:"0.73rem",
              background:streak>=m?"rgba(236,72,153,.2)":"rgba(0,0,0,.2)",
              color:streak>=m?DEEP:`${ACC}44`,
              border:`1px solid ${streak>=m?"rgba(236,72,153,.4)":"rgba(249,168,212,.08)"}`,
            }}>
              {streak>=m?"🏆 ":""}{m}d
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}