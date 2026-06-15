"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserData } from "@/lib/userStore";

const SERIF = `"Georgia","Times New Roman",serif`;
const SANS  = `var(--font-lato),"Inter",system-ui,sans-serif`;
const MONTHS= ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function AnniversaryBanner() {
  const userData = useUserData();
  const START = userData?.startDate ? new Date(userData.startDate) : new Date("2026-03-11");
  const [next,    setNext]    = useState<{date:Date;months:number;daysUntil:number}|null>(null);
  const [isToday, setIsToday] = useState(false);

  useEffect(()=>{
    const today = new Date();
    today.setHours(0,0,0,0);

    // Find next monthly anniversary (same day of month as START)
    const startDay = START.getDate();
    let checkDate = new Date(today);
    checkDate.setDate(startDay);
    if (checkDate < today) { checkDate.setMonth(checkDate.getMonth()+1); checkDate.setDate(startDay); }

    const monthsTotal = Math.round((checkDate.getTime()-START.getTime())/(30.44*24*3600*1000));
    const daysUntil   = Math.round((checkDate.getTime()-today.getTime())/86400000);

    setNext({date:checkDate, months:monthsTotal, daysUntil});
    setIsToday(daysUntil===0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[START.getTime()]);

  if (!next) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{opacity:0,y:-16,scale:0.96}}
        animate={{opacity:1,y:0,scale:1}}
        transition={{type:"spring",stiffness:200,damping:22}}
        style={{
          position:"relative",overflow:"hidden",
          background: isToday
            ? "linear-gradient(135deg,var(--pink),var(--pink),var(--pink-deep))"
            : "linear-gradient(135deg,rgba(var(--pink-rgb),0.15),rgba(var(--pink-rgb),0.2))",
          border: isToday
            ? "none"
            : "1px solid rgba(var(--pink-rgb),0.35)",
          borderRadius:20,
          padding:"1.2rem 1.8rem",
          marginBottom:"1.5rem",
          boxShadow: isToday
            ? "0 8px 32px rgba(var(--pink-deep-rgb),0.4)"
            : "0 2px 16px rgba(var(--pink-rgb),0.1)",
          maxWidth:660,margin:"0 auto 1.5rem",
        }}>

        {/* Sparkle bg for anniversary day */}
        {isToday&&Array.from({length:12},(_,i)=>(
          <motion.span key={i}
            animate={{y:[-20,20,-20],x:[-10,10,-10],opacity:[0,0.8,0]}}
            transition={{repeat:Infinity,duration:2+i*0.3,delay:i*0.2}}
            style={{
              position:"absolute",
              left:`${8+i*8}%`,top:`${20+((i*37)%60)}%`,
              fontSize:"0.8rem",pointerEvents:"none",
            }}>✨</motion.span>
        ))}

        <div style={{display:"flex",alignItems:"center",gap:"1rem",flexWrap:"wrap",position:"relative",zIndex:1}}>
          <span className="occ-icon-bounce" style={{fontSize:"2rem",flexShrink:0,"--occ-dur":"1.8s"} as React.CSSProperties}>
            {isToday?"🎉":"💗"}
          </span>
          <div style={{flex:1}}>
            {isToday?(
              <>
                <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1rem,3vw,1.25rem)",color:"#fff",margin:"0 0 0.2rem",fontWeight:400,textShadow:"0 2px 8px rgba(0,0,0,0.2)"}}>
                  happy {next.months} month{next.months!==1?"s":""} anniversary! 🌸
                </p>
                <p style={{fontFamily:SANS,fontSize:"0.82rem",color:"rgba(255,255,255,0.8)",margin:0}}>
                  {MONTHS[next.date.getMonth()]} {next.date.getDate()} — {next.months} beautiful months together
                </p>
              </>
            ):(
              <>
                <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(0.92rem,2.5vw,1.1rem)",color:"var(--pink-deep)",margin:"0 0 0.2rem",fontWeight:400}}>
                  {next.months} month anniversary in {next.daysUntil} day{next.daysUntil!==1?"s":""}
                </p>
                <p style={{fontFamily:SANS,fontSize:"0.78rem",color:"rgba(var(--pink-deep-rgb),0.55)",margin:0}}>
                  {MONTHS[next.date.getMonth()]} {next.date.getDate()} — mark the calendar 🌸
                </p>
              </>
            )}
          </div>
          {!isToday&&(
            <div style={{
              background:"rgba(var(--pink-rgb),0.2)",border:"1px solid rgba(var(--pink-rgb),0.4)",
              borderRadius:14,padding:"0.5rem 1rem",textAlign:"center",flexShrink:0,
            }}>
              <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"1.5rem",color:"var(--pink-deep)",margin:0,lineHeight:1}}>{next.daysUntil}</p>
              <p style={{fontFamily:SANS,fontSize:"0.65rem",color:"rgba(var(--pink-deep-rgb),0.5)",margin:0,textTransform:"uppercase",letterSpacing:"0.1em"}}>days</p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}