"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendarData } from "@/lib/calendarStore";
import SectionSkeleton from "@/components/SectionSkeleton";

const SERIF  = `"Georgia","Times New Roman",serif`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MOOD_LABELS: Record<string,string> = {
  "🥰":"loved","😊":"happy","🥺":"soft","😂":"laughing","🌙":"night",
  "💗":"love","✨":"sparkling","🎮":"gaming","🌷":"calm","😴":"sleepy","🤭":"giggly","💫":"dreamy"
};

/* ── Palette slot 4: #4E0535 → #3B032F — darkest, end of journal scroll ── */
const BG  = "linear-gradient(180deg,#4e0535 0%,#3b032f 60%,#3b032f 100%)";
const ACC = "#e879f9";   /* bright violet-pink so text pops on dark bg */
const SOFT= "#fdf4ff";

export default function MonthlyRecap() {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [expanded,  setExpanded]  = useState<string|null>(null);

  const { data, loading } = useCalendarData();

  /* Derive this month's entries from cached data — no extra fetch */
  const prefix       = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}`;
  const monthEntries = useMemo(()=>data.filter(e=>e.date.startsWith(prefix)),[data,prefix]);
  const specialDays  = useMemo(()=>monthEntries.filter(e=>e.special),[monthEntries]);
  const withPhotos   = useMemo(()=>monthEntries.filter(e=>(e.photos?.length??0)>0),[monthEntries]);
  const withNotes    = useMemo(()=>monthEntries.filter(e=>e.note),[monthEntries]);

  const { topMoods, maxMoodCount } = useMemo(()=>{
    const map:Record<string,number>={};
    monthEntries.forEach(e=>{ if(e.mood) map[e.mood]=(map[e.mood]||0)+1; });
    const top = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5);
    return { topMoods:top, maxMoodCount:top[0]?.[1]??1 };
  },[monthEntries]);

  const prev=()=>{ if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); };
  const next=()=>{ if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); };

  if (loading) return <SectionSkeleton bg={BG} accent="rgba(232,121,249,0.2)" lines={5} />;

  const isEmpty = monthEntries.length===0;

  return (
    <section style={{
      position:"relative",width:"100%",minHeight:"100vh",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:"clamp(4rem,8vh,7rem) clamp(1rem,4vw,3rem)",
      background:BG, overflow:"hidden",
    }}>
      {/* Subtle star field */}
      {Array.from({length:30},(_,i)=>(
        <motion.div key={i}
          animate={{opacity:[0.05,0.4,0.05]}}
          transition={{repeat:Infinity,duration:2+Math.random()*4,delay:Math.random()*5}}
          style={{
            position:"absolute",
            left:`${Math.random()*100}%`,top:`${Math.random()*100}%`,
            width:1.5,height:1.5,borderRadius:"50%",
            background:ACC,pointerEvents:"none",
          }}/>
      ))}

      <motion.div initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{maxWidth:660,width:"100%",position:"relative",zIndex:2}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",marginBottom:"1rem"}}>
            <div style={{width:50,height:1,background:`linear-gradient(90deg,transparent,${ACC}55)`}}/>
            <motion.span style={{fontSize:"1.8rem"}}
              animate={{scale:[1,1.18,1],rotate:[-4,4,-4]}} transition={{repeat:Infinity,duration:2.5}}>📖</motion.span>
            <div style={{width:50,height:1,background:`linear-gradient(90deg,${ACC}55,transparent)`}}/>
          </div>
          <h2 style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1.8rem,5vw,2.6rem)",color:SOFT,margin:"0 0 0.4rem",fontWeight:400}}>
            monthly recap
          </h2>
          <p style={{fontFamily:SANS,fontSize:"0.88rem",color:`${ACC}99`,margin:0}}>
            a little summary of everything we felt 🌙
          </p>
        </div>

        {/* Month nav */}
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"2rem",
          background:"rgba(0,0,0,.25)",border:`1px solid ${ACC}22`,borderRadius:18,padding:"1rem 1.5rem",
        }}>
          <motion.button onClick={prev} whileHover={{scale:1.2,x:-2}} whileTap={{scale:0.9}}
            style={{background:"none",border:"none",cursor:"pointer",fontSize:"1.3rem",color:ACC,padding:"0.2rem 0.5rem"}}>‹</motion.button>
          <div style={{textAlign:"center"}}>
            <AnimatePresence mode="wait">
              <motion.p key={`${viewYear}-${viewMonth}`}
                initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}}
                transition={{duration:0.2}}
                style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"1.5rem",color:SOFT,margin:0,fontWeight:400}}>
                {MONTHS[viewMonth]}
              </motion.p>
            </AnimatePresence>
            <p style={{fontFamily:SANS,fontSize:"0.82rem",color:`${ACC}66`,margin:0}}>{viewYear}</p>
          </div>
          <motion.button onClick={next} whileHover={{scale:1.2,x:2}} whileTap={{scale:0.9}}
            style={{background:"none",border:"none",cursor:"pointer",fontSize:"1.3rem",color:ACC,padding:"0.2rem 0.5rem"}}>›</motion.button>
        </div>

        {isEmpty?(
          <div style={{textAlign:"center",padding:"4rem 1rem",color:`${ACC}44`,fontFamily:SANS,fontSize:"0.95rem"}}>
            <div style={{fontSize:"2.5rem",marginBottom:"1rem",opacity:0.3}}>🌙</div>
            No memories logged for {MONTHS[viewMonth]} yet
          </div>
        ):(
          <>
            {/* Stats grid */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:"0.8rem",marginBottom:"1.8rem"}}>
              {[{e:"📅",v:monthEntries.length,l:"days logged"},{e:"⭐",v:specialDays.length,l:"special"},{e:"📸",v:withPhotos.length,l:"photos"},{e:"📝",v:withNotes.length,l:"notes"}].map((s,i)=>(
                <motion.div key={i} initial={{opacity:0,y:16}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.07}}
                  style={{background:"rgba(0,0,0,.25)",border:`1px solid ${ACC}22`,borderRadius:16,padding:"1.2rem 0.8rem",textAlign:"center"}}>
                  <div style={{fontSize:"1.5rem",marginBottom:"0.3rem"}}>{s.e}</div>
                  <div style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"1.8rem",color:SOFT,lineHeight:1}}>{s.v}</div>
                  <div style={{fontFamily:SANS,fontSize:"0.65rem",color:`${ACC}66`,textTransform:"uppercase",letterSpacing:"0.1em",marginTop:"0.2rem"}}>{s.l}</div>
                </motion.div>
              ))}
            </div>

            {/* Mood bars */}
            {topMoods.length>0&&(
              <div style={{background:"rgba(0,0,0,.25)",border:`1px solid ${ACC}18`,borderRadius:20,padding:"1.5rem",marginBottom:"1.5rem"}}>
                <p style={{fontFamily:SANS,fontSize:"0.7rem",color:`${ACC}66`,letterSpacing:"0.18em",textTransform:"uppercase",margin:"0 0 1.2rem"}}>mood breakdown</p>
                <div style={{display:"flex",flexDirection:"column",gap:"0.9rem"}}>
                  {topMoods.map(([mood,count])=>(
                    <div key={mood} style={{display:"flex",alignItems:"center",gap:"0.8rem"}}>
                      <span style={{fontSize:"1.4rem",width:32,textAlign:"center",flexShrink:0}}>{mood}</span>
                      <div style={{flex:1,height:8,borderRadius:4,background:`${ACC}14`,overflow:"hidden"}}>
                        <motion.div initial={{width:0}} whileInView={{width:`${(count/maxMoodCount)*100}%`}}
                          viewport={{once:true}} transition={{duration:1,ease:"easeOut",delay:0.1}}
                          style={{height:"100%",borderRadius:4,background:`linear-gradient(90deg,${ACC},#c026d3)`,boxShadow:`0 0 8px ${ACC}66`}}/>
                      </div>
                      <span style={{fontFamily:SANS,fontSize:"0.75rem",color:`${ACC}88`,minWidth:18,textAlign:"right"}}>{count}</span>
                      <span style={{fontFamily:SANS,fontSize:"0.7rem",color:`${ACC}55`,minWidth:60}}>{MOOD_LABELS[mood]||""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Special days */}
            {specialDays.length>0&&(
              <div style={{background:"rgba(0,0,0,.25)",border:`1px solid ${ACC}18`,borderRadius:20,padding:"1.5rem"}}>
                <p style={{fontFamily:SANS,fontSize:"0.7rem",color:`${ACC}66`,letterSpacing:"0.18em",textTransform:"uppercase",margin:"0 0 1rem"}}>special days</p>
                <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                  {specialDays.map(e=>{
                    const d=new Date(e.date+"T12:00:00");
                    const isOpen=expanded===e.date;
                    return (
                      <div key={e.date}>
                        <motion.div whileHover={{x:3}} onClick={()=>setExpanded(isOpen?null:e.date)}
                          style={{display:"flex",alignItems:"center",gap:"0.8rem",cursor:"pointer",padding:"0.5rem 0",borderBottom:`1px solid ${ACC}12`}}>
                          <span style={{fontSize:"1rem"}}>⭐</span>
                          <div style={{flex:1}}>
                            <span style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.95rem",color:SOFT}}>{d.getDate()} {MONTHS[d.getMonth()]}</span>
                            {e.specialLabel&&<span style={{fontFamily:SANS,fontSize:"0.75rem",color:`${ACC}77`,marginLeft:"0.5rem"}}>{e.specialLabel}</span>}
                          </div>
                          {e.mood&&<span style={{fontSize:"1rem"}}>{e.mood}</span>}
                          <span style={{color:`${ACC}44`,fontSize:"0.75rem"}}>{isOpen?"▲":"▼"}</span>
                        </motion.div>
                        <AnimatePresence>
                          {isOpen&&e.note&&(
                            <motion.p initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}
                              style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.9rem",color:`${SOFT}aa`,lineHeight:1.85,margin:"0.5rem 0 0.5rem 1.8rem",overflow:"hidden"}}>
                              {e.note.slice(0,200)}{e.note.length>200?"…":""}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </section>
  );
}