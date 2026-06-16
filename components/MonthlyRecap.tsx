"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendarData } from "@/lib/calendarStore";
import SectionSkeleton from "@/components/SectionSkeleton";

const SERIF  = `"Georgia","Times New Roman",serif`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MOOD_LABELS: Record<string,string> = {
  "🥰":"loved","😊":"happy","🥺":"soft","😂":"laughing","🌙":"moonlit",
  "💗":"loved","✨":"sparkling","🎮":"gaming","🌷":"peaceful","😴":"sleepy","🤭":"giggly","💫":"dreamy",
};

/* ── Pre-computed star positions — stable, no Math.random() in JSX ── */
const STARS = Array.from({length:35},(_,i)=>({
  left:`${(i*2.9+1.7)%100}%`, top:`${(i*5.3+3.8)%100}%`,
  size: i%5===0?2:1.2,
  dur:`${2+(i*0.14)%4}s`, del:`${(i*0.14)%5}s`,
}));

/* Intentionally DEEP themed section — solid dark themed via color-mix. */
const BG   = "linear-gradient(180deg, color-mix(in srgb, var(--pink-deep), #000 35%) 0%, color-mix(in srgb, var(--pink-deep), #000 65%) 60%, color-mix(in srgb, var(--pink-deep), #000 80%) 100%)";
const ACC  = "var(--pink)";
const SOFT = "var(--pink)";
const DIM  = "rgba(var(--pink-rgb),.7)";

export default function MonthlyRecap() {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [expanded,  setExpanded]  = useState<string|null>(null);
  const { data, loading }         = useCalendarData();

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

  if (loading) return <SectionSkeleton bg={BG} accent="rgba(var(--pink-rgb),.22)" lines={5}/>;

  const isEmpty = monthEntries.length===0;

  return (
    <section id="recap" className="deep-themed" style={{
      position:"relative",width:"100%",minHeight:"100vh",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:"clamp(4rem,8vh,7rem) clamp(1rem,4vw,3rem)",
      background:BG, overflow:"hidden",
    }}>
      {/* Star field — CSS animation, no JS */}
      {STARS.map((s,i)=>(
        <div key={i} className="occ-star"
          style={{ left:s.left, top:s.top, width:s.size, height:s.size,
            background:ACC, boxShadow:`0 0 3px ${ACC}`,
            "--occ-dur":s.dur, "--occ-del":s.del } as React.CSSProperties}/>
      ))}
      {/* Radial glow */}
      <div style={{position:"absolute",top:"20%",left:"50%",transform:"translateX(-50%)",width:"70%",height:"50%",borderRadius:"50%",background:`${ACC}06`,filter:"blur(80px)",pointerEvents:"none"}}/>

      <motion.div initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{maxWidth:660,width:"100%",position:"relative",zIndex:2}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",marginBottom:"1rem"}}>
            <div style={{width:55,height:1,background:`linear-gradient(90deg,transparent,${ACC}55)`}}/>
            <span className="occ-icon-bounce" style={{fontSize:"1.8rem",filter:`drop-shadow(0 0 10px ${ACC}88)`,"--occ-dur":"2.5s"} as React.CSSProperties}>📖</span>
            <div style={{width:55,height:1,background:`linear-gradient(90deg,${ACC}55,transparent)`}}/>
          </div>
          <h2 style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1.8rem,5vw,2.8rem)",color:SOFT,margin:"0 0 0.4rem",fontWeight:400}}>
            monthly recap
          </h2>
          <p style={{fontFamily:SANS,fontSize:"0.9rem",color:DIM,margin:0,lineHeight:1.5}}>
            a little summary of everything we felt 🌙
          </p>
        </div>

        {/* Month nav */}
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"2rem",
          background:"rgba(0,0,0,.38)",border:`1px solid ${ACC}22`,borderRadius:20,padding:"1rem 1.5rem",
        }}>
          <motion.button onClick={prev} whileHover={{scale:1.2,x:-2}} whileTap={{scale:0.9}}
            style={{background:"none",border:"none",cursor:"pointer",fontSize:"1.4rem",color:ACC,padding:"0.2rem 0.5rem"}}>‹</motion.button>
          <div style={{textAlign:"center"}}>
            <AnimatePresence mode="wait">
              <motion.p key={`${viewYear}-${viewMonth}`}
                initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}} transition={{duration:0.2}}
                style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"1.6rem",color:SOFT,margin:0,fontWeight:400}}>
                {MONTHS[viewMonth]}
              </motion.p>
            </AnimatePresence>
            <p style={{fontFamily:SANS,fontSize:"0.82rem",color:`${ACC}66`,margin:0}}>{viewYear}</p>
          </div>
          <motion.button onClick={next} whileHover={{scale:1.2,x:2}} whileTap={{scale:0.9}}
            style={{background:"none",border:"none",cursor:"pointer",fontSize:"1.4rem",color:ACC,padding:"0.2rem 0.5rem"}}>›</motion.button>
        </div>

        {isEmpty?(
          <div style={{textAlign:"center",padding:"4rem 1rem"}}>
            <div style={{fontSize:"2.5rem",marginBottom:"1rem",opacity:0.3}}>🌙</div>
            <p style={{fontFamily:SANS,fontSize:"0.95rem",color:`${ACC}44`,margin:0}}>
              No memories logged for {MONTHS[viewMonth]} yet
            </p>
          </div>
        ):(
          <>
            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:"0.8rem",marginBottom:"1.8rem"}}>
              {[{e:"📅",v:monthEntries.length,l:"days logged"},{e:"⭐",v:specialDays.length,l:"special"},{e:"📸",v:withPhotos.length,l:"photos"},{e:"📝",v:withNotes.length,l:"notes"}].map((s,i)=>(
                <motion.div key={i} initial={{opacity:0,y:16}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.07}}
                  whileHover={{y:-3,scale:1.03}}
                  style={{background:"rgba(0,0,0,.28)",border:`1px solid ${ACC}22`,borderRadius:18,padding:"1.3rem 0.8rem",textAlign:"center",boxShadow:`0 0 20px ${ACC}06`}}>
                  <div style={{fontSize:"1.5rem",marginBottom:"0.35rem"}}>{s.e}</div>
                  <div style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"1.9rem",color:SOFT,lineHeight:1}}>{s.v}</div>
                  <div style={{fontFamily:SANS,fontSize:"0.65rem",color:`${ACC}66`,textTransform:"uppercase",letterSpacing:"0.1em",marginTop:"0.2rem"}}>{s.l}</div>
                </motion.div>
              ))}
            </div>

            {/* Mood bars */}
            {topMoods.length>0&&(
              <div style={{background:"rgba(0,0,0,.28)",border:`1px solid ${ACC}18`,borderRadius:22,padding:"1.6rem",marginBottom:"1.5rem",boxShadow:`0 0 30px ${ACC}06`}}>
                <p style={{fontFamily:SANS,fontSize:"0.7rem",color:`${ACC}66`,letterSpacing:"0.18em",textTransform:"uppercase",margin:"0 0 1.3rem"}}>mood breakdown</p>
                <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
                  {topMoods.map(([mood,count])=>(
                    <div key={mood} style={{display:"flex",alignItems:"center",gap:"0.9rem"}}>
                      <span style={{fontSize:"1.5rem",width:34,textAlign:"center",flexShrink:0}}>{mood}</span>
                      <div style={{flex:1,height:9,borderRadius:5,background:`${ACC}12`,overflow:"hidden"}}>
                        <motion.div initial={{width:0}} whileInView={{width:`${(count/maxMoodCount)*100}%`}}
                          viewport={{once:true}} transition={{duration:1.1,ease:"easeOut",delay:0.1}}
                          style={{height:"100%",borderRadius:5,background:`linear-gradient(90deg,var(--pink),var(--pink-deep))`,boxShadow:`0 0 10px ${ACC}77`}}/>
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
              <div style={{background:"rgba(0,0,0,.28)",border:`1px solid ${ACC}18`,borderRadius:22,padding:"1.6rem"}}>
                <p style={{fontFamily:SANS,fontSize:"0.7rem",color:`${ACC}66`,letterSpacing:"0.18em",textTransform:"uppercase",margin:"0 0 1rem"}}>special days</p>
                <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                  {specialDays.map(e=>{
                    const d=new Date(e.date+"T12:00:00");
                    const isOpen=expanded===e.date;
                    return (
                      <div key={e.date}>
                        <motion.div whileHover={{x:4}} onClick={()=>setExpanded(isOpen?null:e.date)}
                          style={{display:"flex",alignItems:"center",gap:"0.8rem",cursor:"pointer",padding:"0.55rem 0",borderBottom:`1px solid ${ACC}12`}}>
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
                              style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.9rem",color:`${SOFT}99`,lineHeight:1.9,margin:"0.5rem 0 0.5rem 1.8rem",overflow:"hidden"}}>
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