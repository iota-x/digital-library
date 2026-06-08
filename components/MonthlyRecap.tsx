"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SERIF = `"Georgia","Times New Roman",serif`;
const SANS  = `var(--font-lato),"Inter",system-ui,sans-serif`;
const SCRIPT= `var(--font-caveat),"Segoe Script",cursive`;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MOOD_LABELS: Record<string,string> = {"🥰":"loved","😊":"happy","🥺":"soft","😂":"laughing","🌙":"night","💗":"love","✨":"sparkling","🎮":"gaming","🌷":"calm","😴":"sleepy","🤭":"giggly","💫":"dreamy"};

interface CalEntry { date:string; note:string; photos:string[]; special:boolean; specialLabel:string; mood:string; }

export default function MonthlyRecap() {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [entries,   setEntries]   = useState<Record<string,CalEntry>>({});
  const [loaded,    setLoaded]    = useState(false);
  const [expanded,  setExpanded]  = useState<string|null>(null);

  useEffect(()=>{
    fetch("/api/calendar").then(r=>r.json()).then((arr:CalEntry[])=>{
      const map:Record<string,CalEntry>={};
      arr.forEach(e=>{map[e.date]=e;});
      setEntries(map);
      setLoaded(true);
    });
  },[]);

  const prefix = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}`;
  const monthEntries = Object.values(entries).filter(e=>e.date.startsWith(prefix));
  const specialDays  = monthEntries.filter(e=>e.special);
  const withPhotos   = monthEntries.filter(e=>(e.photos?.length??0)>0);
  const withNotes    = monthEntries.filter(e=>e.note);

  // mood frequency
  const moodMap: Record<string,number> = {};
  monthEntries.forEach(e=>{ if(e.mood) moodMap[e.mood]=(moodMap[e.mood]||0)+1; });
  const topMoods = Object.entries(moodMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxMoodCount = topMoods[0]?.[1] ?? 1;

  const prev = () => { if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); };
  const next = () => { if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); };

  if (!loaded) return null;
  const isEmpty = monthEntries.length === 0;

  return (
    <section style={{
      position:"relative",width:"100%",
      padding:"4rem clamp(1rem,3vw,2rem) 5rem",
      background:"linear-gradient(160deg,#fff5f9,#fce7f3 40%,#fff0f5)",
      overflow:"hidden",
    }}>
      <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{maxWidth:680,margin:"0 auto"}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",marginBottom:"0.8rem"}}>
            <div style={{width:45,height:1,background:"linear-gradient(90deg,transparent,#f9a8d4)"}}/>
            <motion.span style={{fontSize:"1.5rem"}} animate={{scale:[1,1.18,1],rotate:[-4,4,-4]}} transition={{repeat:Infinity,duration:2.5}}>📖</motion.span>
            <div style={{width:45,height:1,background:"linear-gradient(90deg,#f9a8d4,transparent)"}}/>
          </div>
          <h2 style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1.5rem,4vw,2.2rem)",color:"#be185d",margin:"0 0 0.3rem",fontWeight:400}}>
            monthly recap
          </h2>
          <p style={{fontFamily:SANS,fontSize:"0.88rem",color:"rgba(190,24,93,.5)",margin:0}}>a little summary of everything we felt 🌸</p>
        </div>

        {/* Month nav */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"2rem",
          background:"linear-gradient(135deg,rgba(252,231,243,.6),rgba(253,186,213,.3))",
          borderRadius:16,padding:"1rem 1.5rem",border:"1px solid rgba(249,168,212,.25)"}}>
          <motion.button onClick={prev} whileHover={{scale:1.15,x:-2}} whileTap={{scale:0.9}}
            style={{background:"none",border:"none",cursor:"pointer",fontSize:"1.3rem",color:"#be185d",padding:"0.2rem 0.5rem"}}>‹</motion.button>
          <div style={{textAlign:"center"}}>
            <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"1.4rem",color:"#be185d",margin:0,fontWeight:400}}>{MONTHS[viewMonth]}</p>
            <p style={{fontFamily:SANS,fontSize:"0.82rem",color:"rgba(190,24,93,.45)",margin:0}}>{viewYear}</p>
          </div>
          <motion.button onClick={next} whileHover={{scale:1.15,x:2}} whileTap={{scale:0.9}}
            style={{background:"none",border:"none",cursor:"pointer",fontSize:"1.3rem",color:"#be185d",padding:"0.2rem 0.5rem"}}>›</motion.button>
        </div>

        {isEmpty ? (
          <div style={{textAlign:"center",padding:"3rem 1rem",color:"rgba(190,24,93,.35)",fontFamily:SANS,fontSize:"0.95rem"}}>
            <div style={{fontSize:"2rem",marginBottom:"0.8rem",opacity:0.4}}>🌙</div>
            No memories logged for {MONTHS[viewMonth]} yet
          </div>
        ) : (
          <>
            {/* Stats cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:"0.8rem",marginBottom:"2rem"}}>
              {[
                {e:"📅",val:monthEntries.length,label:"days logged"},
                {e:"⭐",val:specialDays.length,label:"special days"},
                {e:"📸",val:withPhotos.length,label:"with photos"},
                {e:"📝",val:withNotes.length,label:"with notes"},
              ].map((s,i)=>(
                <motion.div key={i} initial={{opacity:0,y:16}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.08}}
                  style={{background:"rgba(255,255,255,.75)",border:"1px solid rgba(249,168,212,.2)",borderRadius:16,padding:"1.1rem",textAlign:"center",boxShadow:"0 2px 12px rgba(244,114,182,.08)"}}>
                  <div style={{fontSize:"1.4rem",marginBottom:"0.3rem"}}>{s.e}</div>
                  <div style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"1.6rem",color:"#be185d",lineHeight:1}}>{s.val}</div>
                  <div style={{fontFamily:SANS,fontSize:"0.68rem",color:"rgba(190,24,93,.45)",textTransform:"uppercase",letterSpacing:"0.08em",marginTop:"0.2rem"}}>{s.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Mood chart */}
            {topMoods.length>0&&(
              <div style={{background:"rgba(255,255,255,.7)",border:"1px solid rgba(249,168,212,.2)",borderRadius:20,padding:"1.5rem",marginBottom:"1.5rem",boxShadow:"0 2px 16px rgba(244,114,182,.08)"}}>
                <p style={{fontFamily:SANS,fontSize:"0.75rem",color:"rgba(190,24,93,.5)",letterSpacing:"0.12em",textTransform:"uppercase",margin:"0 0 1.2rem"}}>Mood breakdown</p>
                <div style={{display:"flex",flexDirection:"column",gap:"0.8rem"}}>
                  {topMoods.map(([mood,count])=>(
                    <div key={mood} style={{display:"flex",alignItems:"center",gap:"0.8rem"}}>
                      <span style={{fontSize:"1.4rem",width:32,textAlign:"center",flexShrink:0}}>{mood}</span>
                      <div style={{flex:1,height:10,borderRadius:5,background:"rgba(249,168,212,.15)",overflow:"hidden"}}>
                        <motion.div
                          initial={{width:0}} whileInView={{width:`${(count/maxMoodCount)*100}%`}}
                          viewport={{once:true}} transition={{duration:0.9,ease:"easeOut",delay:0.1}}
                          style={{height:"100%",borderRadius:5,background:"linear-gradient(90deg,#fda4af,#ec4899)"}}/>
                      </div>
                      <span style={{fontFamily:SANS,fontSize:"0.78rem",color:"rgba(190,24,93,.5)",minWidth:20,textAlign:"right"}}>{count}</span>
                      <span style={{fontFamily:SANS,fontSize:"0.72rem",color:"rgba(190,24,93,.35)",minWidth:56}}>{MOOD_LABELS[mood]||""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Special days list */}
            {specialDays.length>0&&(
              <div style={{background:"rgba(255,255,255,.7)",border:"1px solid rgba(249,168,212,.2)",borderRadius:20,padding:"1.5rem",boxShadow:"0 2px 16px rgba(244,114,182,.08)"}}>
                <p style={{fontFamily:SANS,fontSize:"0.75rem",color:"rgba(190,24,93,.5)",letterSpacing:"0.12em",textTransform:"uppercase",margin:"0 0 1rem"}}>Special days this month</p>
                <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
                  {specialDays.map(e=>{
                    const d=new Date(e.date+"T12:00:00");
                    const label=`${d.getDate()} ${MONTHS[d.getMonth()]}`;
                    const isOpen=expanded===e.date;
                    return (
                      <div key={e.date}>
                        <motion.div whileHover={{x:3}} onClick={()=>setExpanded(isOpen?null:e.date)}
                          style={{display:"flex",alignItems:"center",gap:"0.8rem",cursor:"pointer",padding:"0.5rem 0"}}>
                          <span style={{fontSize:"1.1rem"}}>⭐</span>
                          <div style={{flex:1}}>
                            <span style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"1rem",color:"#be185d"}}>{label}</span>
                            {e.specialLabel&&<span style={{fontFamily:SANS,fontSize:"0.78rem",color:"rgba(190,24,93,.5)",marginLeft:"0.5rem"}}>{e.specialLabel}</span>}
                          </div>
                          {e.mood&&<span style={{fontSize:"1rem"}}>{e.mood}</span>}
                          <span style={{color:"rgba(190,24,93,.35)",fontSize:"0.8rem"}}>{isOpen?"▲":"▼"}</span>
                        </motion.div>
                        <AnimatePresence>
                          {isOpen&&e.note&&(
                            <motion.p initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}
                              style={{fontFamily:SERIF,fontSize:"0.92rem",color:"rgba(190,24,93,.65)",lineHeight:1.8,margin:"0 0 0 2rem",overflow:"hidden",fontStyle:"italic"}}>
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