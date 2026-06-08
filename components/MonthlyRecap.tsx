"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SERIF  = `"Georgia","Times New Roman",serif`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MOOD_LABELS: Record<string,string> = {
  "🥰":"loved","😊":"happy","🥺":"soft","😂":"laughing","🌙":"night",
  "💗":"love","✨":"sparkling","🎮":"gaming","🌷":"calm","😴":"sleepy","🤭":"giggly","💫":"dreamy"
};

interface CalEntry { date:string; note:string; photos:string[]; special:boolean; specialLabel:string; mood:string; }

const GRAIN  = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`;
const CARD   = "rgba(255,255,255,0.05)";
const RING   = "rgba(244,114,182,0.14)";
const TEXT   = "rgba(252,231,243,0.82)";
const DIM    = "rgba(244,114,182,0.38)";
const ACCENT = "#f9a8d4";

export default function MonthlyRecap() {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [entries,   setEntries]   = useState<Record<string,CalEntry>>({});
  const [loaded,    setLoaded]    = useState(false);
  const [expanded,  setExpanded]  = useState<string|null>(null);
  const [slideDir,  setSlideDir]  = useState<1|-1>(1);

  useEffect(()=>{
    fetch("/api/calendar").then(r=>r.json()).then((arr:CalEntry[])=>{
      const map:Record<string,CalEntry>={};
      arr.forEach(e=>{ map[e.date]=e; });
      setEntries(map); setLoaded(true);
    });
  },[]);

  const prev = () => { setSlideDir(-1); if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); };
  const next = () => { setSlideDir(1);  if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); };

  const prefix       = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}`;
  const monthEntries = Object.values(entries).filter(e=>e.date.startsWith(prefix));
  const specialDays  = monthEntries.filter(e=>e.special);
  const withPhotos   = monthEntries.filter(e=>(e.photos?.length??0)>0);
  const withNotes    = monthEntries.filter(e=>e.note);
  const moodMap: Record<string,number> = {};
  monthEntries.forEach(e=>{ if(e.mood) moodMap[e.mood]=(moodMap[e.mood]||0)+1; });
  const topMoods     = Object.entries(moodMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxMoodCount = topMoods[0]?.[1] ?? 1;

  if (!loaded) return null;
  const isEmpty = monthEntries.length===0;

  return (
    <section style={{
      position:"relative",
      width:"100%",
      minHeight:"100vh",
      display:"flex",
      flexDirection:"column",
      justifyContent:"center",
      padding:"clamp(4rem,8vh,6rem) clamp(1rem,4vw,3rem)",
      background:`${GRAIN}, linear-gradient(180deg, #2a0813 0%, #1a0520 45%, #110118 100%)`,
      overflow:"hidden",
      boxSizing:"border-box",
    }}>
      {/* Top seam line */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:1,
        background:"linear-gradient(90deg,transparent,rgba(244,114,182,0.14),rgba(190,24,93,0.2),rgba(244,114,182,0.14),transparent)"}} />

      {/* Ambient glows */}
      {[
        { l:"4%",  t:"12%", c:"rgba(190,24,93,0.09)",   s:380 },
        { l:"74%", t:"48%", c:"rgba(131,24,67,0.08)",   s:300 },
        { l:"38%", t:"78%", c:"rgba(244,114,182,0.07)", s:240 },
        { l:"58%", t:"10%", c:"rgba(100,10,50,0.07)",   s:200 },
      ].map((g,i)=>(
        <motion.div key={i}
          animate={{scale:[1,1.15,1],opacity:[0.45,0.85,0.45]}}
          transition={{repeat:Infinity,duration:8+i*2,ease:"easeInOut"}}
          style={{position:"absolute",left:g.l,top:g.t,width:g.s,height:g.s,
            borderRadius:"50%",background:g.c,filter:"blur(100px)",pointerEvents:"none",zIndex:0}} />
      ))}

      <motion.div initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{
          maxWidth:700,
          width:"100%",
          margin:"0 auto",
          position:"relative",
          zIndex:2,
          display:"flex",
          flexDirection:"column",
          gap:"clamp(1.2rem,2.5vh,1.8rem)",
        }}>

        {/* Header */}
        <div style={{textAlign:"center"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",marginBottom:"0.9rem"}}>
            <div style={{width:52,height:1,background:"linear-gradient(90deg,transparent,rgba(249,168,212,0.3))"}}/>
            <motion.span style={{fontSize:"1.7rem"}}
              animate={{scale:[1,1.2,1],rotate:[-5,5,-5]}}
              transition={{repeat:Infinity,duration:2.8,ease:"easeInOut"}}>📖</motion.span>
            <div style={{width:52,height:1,background:"linear-gradient(90deg,rgba(249,168,212,0.3),transparent)"}}/>
          </div>
          <h2 style={{fontFamily:SERIF,fontStyle:"italic",
            fontSize:"clamp(1.8rem,4vw,2.8rem)",color:"#fce7f3",
            margin:"0 0 0.35rem",fontWeight:400,
            textShadow:"0 0 40px rgba(244,114,182,0.2)"}}>
            monthly recap
          </h2>
          <p style={{fontFamily:SANS,fontSize:"clamp(0.85rem,1.5vw,0.95rem)",color:DIM,margin:0,letterSpacing:"0.02em"}}>
            a little summary of everything we felt 🌸
          </p>
        </div>

        {/* Month nav */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          background:"linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))",
          borderRadius:18,padding:"clamp(0.8rem,2vh,1.1rem) 1.5rem",
          border:"1px solid rgba(244,114,182,0.12)",
          backdropFilter:"blur(14px)",
          boxShadow:"0 4px 24px rgba(0,0,0,0.25),inset 0 0 0 1px rgba(255,255,255,0.04)"}}>
          <motion.button onClick={prev} whileHover={{scale:1.18,x:-2}} whileTap={{scale:0.9}}
            style={{background:"none",border:"none",cursor:"pointer",fontSize:"1.5rem",
              color:"rgba(249,168,212,0.6)",padding:"0.2rem 0.5rem",lineHeight:1}}>‹</motion.button>
          <AnimatePresence mode="wait">
            <motion.div key={`${viewYear}-${viewMonth}`}
              initial={{opacity:0,x:slideDir>0?16:-16,filter:"blur(4px)"}}
              animate={{opacity:1,x:0,filter:"blur(0px)"}}
              exit={{opacity:0,x:slideDir>0?-16:16,filter:"blur(4px)"}}
              transition={{duration:0.22}}
              style={{textAlign:"center"}}>
              <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1.3rem,3vw,1.65rem)",
                color:"#fce7f3",margin:0,fontWeight:400}}>{MONTHS[viewMonth]}</p>
              <p style={{fontFamily:SANS,fontSize:"0.8rem",color:DIM,margin:0}}>{viewYear}</p>
            </motion.div>
          </AnimatePresence>
          <motion.button onClick={next} whileHover={{scale:1.18,x:2}} whileTap={{scale:0.9}}
            style={{background:"none",border:"none",cursor:"pointer",fontSize:"1.5rem",
              color:"rgba(249,168,212,0.6)",padding:"0.2rem 0.5rem",lineHeight:1}}>›</motion.button>
        </div>

        {/* Empty state */}
        {isEmpty ? (
          <motion.div initial={{opacity:0}} animate={{opacity:1}}
            style={{textAlign:"center",padding:"clamp(2rem,6vh,4rem) 1rem",flex:1,
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"1rem"}}>
            <motion.div animate={{scale:[1,1.1,1],opacity:[0.3,0.6,0.3]}}
              transition={{repeat:Infinity,duration:3}}
              style={{fontSize:"2.5rem"}}>🌙</motion.div>
            <p style={{fontFamily:SANS,fontSize:"0.95rem",color:"rgba(252,231,243,0.25)",margin:0}}>
              no memories logged for {MONTHS[viewMonth]} yet
            </p>
          </motion.div>
        ) : (
          <>
            {/* Stat cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"clamp(0.6rem,1.5vw,0.9rem)"}}>
              {[
                {e:"📅",val:monthEntries.length,label:"days"},
                {e:"⭐",val:specialDays.length, label:"special"},
                {e:"📸",val:withPhotos.length,  label:"photos"},
                {e:"📝",val:withNotes.length,   label:"notes"},
              ].map((s,i)=>(
                <motion.div key={i}
                  initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}}
                  viewport={{once:true}} transition={{delay:i*0.09,type:"spring",stiffness:180,damping:20}}
                  style={{
                    background:CARD,border:`1px solid ${RING}`,
                    borderRadius:18,
                    padding:"clamp(0.9rem,2.5vh,1.4rem) clamp(0.5rem,1.5vw,0.9rem)",
                    textAlign:"center",backdropFilter:"blur(16px)",
                    boxShadow:"0 4px 24px rgba(0,0,0,0.3),inset 0 0 0 1px rgba(255,255,255,0.04)",
                  }}>
                  <div style={{fontSize:"clamp(1.3rem,2.5vw,1.6rem)",marginBottom:"0.4rem"}}>{s.e}</div>
                  <div style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1.4rem,3vw,1.8rem)",
                    color:ACCENT,lineHeight:1,marginBottom:"0.15rem"}}>{s.val}</div>
                  <div style={{fontFamily:SANS,fontSize:"clamp(0.6rem,0.9vw,0.7rem)",color:DIM,
                    textTransform:"uppercase",letterSpacing:"0.1em"}}>{s.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Mood chart */}
            {topMoods.length>0&&(
              <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
                style={{
                  background:CARD,border:`1px solid ${RING}`,
                  borderRadius:22,padding:"clamp(1.1rem,2.5vh,1.6rem)",
                  backdropFilter:"blur(16px)",
                  boxShadow:"0 4px 24px rgba(0,0,0,0.3),inset 0 0 0 1px rgba(255,255,255,0.04)",
                }}>
                <p style={{fontFamily:SANS,fontSize:"0.72rem",color:DIM,
                  letterSpacing:"0.14em",textTransform:"uppercase",margin:"0 0 1.1rem"}}>mood breakdown</p>
                <div style={{display:"flex",flexDirection:"column",gap:"0.85rem"}}>
                  {topMoods.map(([mood,count])=>(
                    <div key={mood} style={{display:"flex",alignItems:"center",gap:"0.85rem"}}>
                      <span style={{fontSize:"clamp(1.2rem,2.5vw,1.45rem)",width:34,textAlign:"center",flexShrink:0}}>{mood}</span>
                      <div style={{flex:1,height:9,borderRadius:5,
                        background:"rgba(244,114,182,0.08)",overflow:"hidden",
                        boxShadow:"inset 0 1px 3px rgba(0,0,0,0.2)"}}>
                        <motion.div
                          initial={{width:0}} whileInView={{width:`${(count/maxMoodCount)*100}%`}}
                          viewport={{once:true}} transition={{duration:1.1,ease:"easeOut",delay:0.15}}
                          style={{height:"100%",borderRadius:5,
                            background:"linear-gradient(90deg,rgba(253,164,175,0.7),#ec4899)",
                            boxShadow:"0 0 10px rgba(236,72,153,0.3)"}}/>
                      </div>
                      <span style={{fontFamily:SANS,fontSize:"0.76rem",color:"rgba(244,114,182,0.55)",
                        minWidth:20,textAlign:"right"}}>{count}</span>
                      <span style={{fontFamily:SANS,fontSize:"0.7rem",color:"rgba(244,114,182,0.3)",
                        minWidth:58}}>{MOOD_LABELS[mood]||""}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Special days */}
            {specialDays.length>0&&(
              <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
                style={{
                  background:CARD,border:`1px solid ${RING}`,
                  borderRadius:22,padding:"clamp(1.1rem,2.5vh,1.6rem)",
                  backdropFilter:"blur(16px)",
                  boxShadow:"0 4px 24px rgba(0,0,0,0.3),inset 0 0 0 1px rgba(255,255,255,0.04)",
                }}>
                <p style={{fontFamily:SANS,fontSize:"0.72rem",color:DIM,
                  letterSpacing:"0.14em",textTransform:"uppercase",margin:"0 0 1rem"}}>special days this month</p>
                <div style={{display:"flex",flexDirection:"column"}}>
                  {specialDays.map((e,idx)=>{
                    const dd=new Date(e.date+"T12:00:00");
                    const label=`${dd.getDate()} ${MONTHS[dd.getMonth()]}`;
                    const isOpen=expanded===e.date;
                    return (
                      <div key={e.date}
                        style={{borderBottom:idx<specialDays.length-1?"1px solid rgba(244,114,182,0.08)":"none"}}>
                        <motion.div whileHover={{x:4}}
                          onClick={()=>setExpanded(isOpen?null:e.date)}
                          style={{display:"flex",alignItems:"center",gap:"0.8rem",
                            cursor:"pointer",padding:"0.7rem 0"}}>
                          <span style={{fontSize:"1.05rem",flexShrink:0}}>⭐</span>
                          <div style={{flex:1}}>
                            <span style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.98rem",color:TEXT}}>{label}</span>
                            {e.specialLabel&&<span style={{fontFamily:SANS,fontSize:"0.75rem",
                              color:"rgba(244,114,182,0.45)",marginLeft:"0.5rem"}}>{e.specialLabel}</span>}
                          </div>
                          {e.mood&&<span style={{fontSize:"1rem"}}>{e.mood}</span>}
                          <motion.span animate={{rotate:isOpen?180:0}} transition={{duration:0.22}}
                            style={{color:"rgba(244,114,182,0.3)",fontSize:"0.75rem",flexShrink:0}}>▼</motion.span>
                        </motion.div>
                        <AnimatePresence>
                          {isOpen&&e.note&&(
                            <motion.p
                              initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}
                              transition={{duration:0.22}}
                              style={{fontFamily:SERIF,fontSize:"0.9rem",
                                color:"rgba(252,231,243,0.5)",lineHeight:1.85,
                                margin:"0 0 0.7rem 1.85rem",overflow:"hidden",fontStyle:"italic"}}>
                              {e.note.slice(0,200)}{e.note.length>200?"…":""}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Closing ornament */}
        <div style={{textAlign:"center",paddingTop:"0.5rem"}}>
          <motion.span
            animate={{scale:[1,1.14,1],opacity:[0.3,0.6,0.3]}}
            transition={{repeat:Infinity,duration:3.5,ease:"easeInOut"}}
            style={{fontSize:"1.2rem"}}>🌸</motion.span>
          <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.8rem",
            color:"rgba(244,114,182,0.2)",marginTop:"0.5rem",letterSpacing:"0.06em"}}>
            every day with you is worth remembering
          </p>
        </div>
      </motion.div>
    </section>
  );
}