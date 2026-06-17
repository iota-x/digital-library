"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendarData } from "@/lib/calendarStore";
import SectionSkeleton from "@/components/SectionSkeleton";
import BgAccents from "@/components/BgAccents";
import EmptyState from "@/components/EmptyState";
import { SERIF, SANS } from "@/lib/typography";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MOOD_LABELS: Record<string,string> = {
  "🥰":"loved","😊":"happy","🥺":"soft","😂":"laughing","🌙":"moonlit",
  "💗":"loved","✨":"sparkling","🎮":"gaming","🌷":"peaceful","😴":"sleepy","🤭":"giggly","💫":"dreamy",
};

const STARS = Array.from({length:35},(_,i)=>({
  left:`${(i*2.9+1.7)%100}%`, top:`${(i*5.3+3.8)%100}%`,
  size: i%5===0?2:1.2,
  dur:`${2+(i*0.14)%4}s`, del:`${(i*0.14)%5}s`,
}));

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

  // "Our month in a sentence" — a gentle natural-language recap, the heart of
  // the insights card. Also surfaces the day with the most photos.
  const narrative = useMemo(()=>{
    if (monthEntries.length === 0) return "";
    const parts: string[] = [];
    parts.push(`${monthEntries.length} day${monthEntries.length!==1?"s":""} worth remembering`);
    const dom = topMoods[0];
    if (dom) parts.push(`mostly ${MOOD_LABELS[dom[0]] ? `feeling ${MOOD_LABELS[dom[0]]} ${dom[0]}` : `${dom[0]}`}`);
    if (specialDays.length) parts.push(`${specialDays.length} moment${specialDays.length!==1?"s":""} marked special`);
    if (withPhotos.length) parts.push(`${withPhotos.length} captured in photos`);
    return parts.join(" · ");
  },[monthEntries, topMoods, specialDays, withPhotos]);

  const topPhotoDay = useMemo(()=>{
    let best: { date: string; count: number } | null = null;
    for (const e of monthEntries) {
      const c = e.photos?.length ?? 0;
      if (c > 0 && (!best || c > best.count)) best = { date: e.date, count: c };
    }
    return best;
  },[monthEntries]);

  const prev=()=>{ if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); };
  const next=()=>{ if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); };

  if (loading) return <SectionSkeleton accent="rgba(var(--pink-rgb),.22)" lines={5}/>;

  const isEmpty = monthEntries.length===0;
  const CARD_BG  = "var(--cream)";
  const CARD_BORDER = "1px solid rgba(var(--pink-rgb),.22)";

  return (
    <section id="recap" style={{
      position:"relative",width:"100%",minHeight:"100vh",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:"clamp(4rem,8vh,7rem) clamp(1rem,4vw,3rem)",
      overflow:"hidden",
    }}>
      {/* Star field */}
      {STARS.map((s,i)=>(
        <div key={i} className="occ-star"
          style={{ left:s.left, top:s.top, width:s.size, height:s.size,
            background:"var(--pink)", boxShadow:"0 0 3px rgba(var(--pink-rgb),.6)",
            "--occ-dur":s.dur, "--occ-del":s.del } as React.CSSProperties}/>
      ))}
      {/* Radial glow */}
      <div style={{position:"absolute",top:"20%",left:"50%",transform:"translateX(-50%)",width:"70%",height:"50%",borderRadius:"50%",background:"rgba(var(--pink-rgb),.08)",filter:"blur(80px)",pointerEvents:"none"}}/>

      {/* Themed corner spotlights + drifting sparkles */}
      <BgAccents variant="spotlights" />
      <BgAccents variant="stardust" desktopCount={10} mobileCount={5} />

      <motion.div initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{maxWidth:660,width:"100%",position:"relative",zIndex:2}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",marginBottom:"1rem"}}>
            <div style={{width:55,height:1,background:"linear-gradient(90deg,transparent,rgba(var(--pink-rgb),.45))"}}/>
            <span className="occ-icon-bounce" style={{fontSize:"1.8rem",filter:"drop-shadow(0 0 10px rgba(var(--pink-rgb),.55))","--occ-dur":"2.5s"} as React.CSSProperties}>📖</span>
            <div style={{width:55,height:1,background:"linear-gradient(90deg,rgba(var(--pink-rgb),.45),transparent)"}}/>
          </div>
          <h2 style={{
            fontFamily:SERIF,fontStyle:"italic",
            fontSize:"clamp(1.8rem,5vw,2.8rem)",
            color:"var(--pink-deep)",margin:"0 0 0.4rem",fontWeight:400,
          }}>
            monthly recap
          </h2>
          <p style={{fontFamily:SANS,fontSize:"0.9rem",color:"var(--muted)",margin:0,lineHeight:1.5}}>
            a little summary of everything we felt 🌙
          </p>
        </div>

        {/* Month nav */}
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"2rem",
          background:CARD_BG,border:CARD_BORDER,borderRadius:20,padding:"1rem 1.5rem",
          boxShadow:"0 4px 18px rgba(var(--pink-deep-rgb),.08)",
        }}>
          <motion.button onClick={prev} aria-label="previous month" whileHover={{scale:1.2,x:-2}} whileTap={{scale:0.9}}
            style={{background:"none",border:"none",cursor:"pointer",fontSize:"1.4rem",color:"var(--pink-deep)",padding:"0.2rem 0.5rem"}}>‹</motion.button>
          <div style={{textAlign:"center"}}>
            <AnimatePresence mode="wait">
              <motion.p key={`${viewYear}-${viewMonth}`}
                initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}} transition={{duration:0.2}}
                style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"1.6rem",color:"var(--pink-deep)",margin:0,fontWeight:400}}>
                {MONTHS[viewMonth]}
              </motion.p>
            </AnimatePresence>
            <p style={{fontFamily:SANS,fontSize:"0.82rem",color:"var(--muted)",margin:0}}>{viewYear}</p>
          </div>
          <motion.button onClick={next} aria-label="next month" whileHover={{scale:1.2,x:2}} whileTap={{scale:0.9}}
            style={{background:"none",border:"none",cursor:"pointer",fontSize:"1.4rem",color:"var(--pink-deep)",padding:"0.2rem 0.5rem"}}>›</motion.button>
        </div>

        {isEmpty?(
          <EmptyState
            emoji="🌙"
            title={`nothing logged for ${MONTHS[viewMonth]}`}
            hint="Tap a day in the calendar above and drop a note, mood, or photo to start filling this month in."
            size="inline"
          />
        ):(
          <>
            {/* Our month in a sentence — the insights headline */}
            {narrative && (
              <motion.div initial={{opacity:0,y:14}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
                style={{
                  background:"linear-gradient(135deg,rgba(var(--pink-rgb),.14),rgba(var(--pink-deep-rgb),.1))",
                  border:CARD_BORDER, borderRadius:20, padding:"1.3rem 1.5rem", marginBottom:"1.8rem",
                  textAlign:"center", boxShadow:"0 4px 18px rgba(var(--pink-deep-rgb),.08)",
                }}>
                <p style={{fontFamily:SANS,fontSize:"0.62rem",color:"var(--muted)",letterSpacing:"0.18em",textTransform:"uppercase",margin:"0 0 0.5rem"}}>
                  our {MONTHS[viewMonth].toLowerCase()} in a sentence
                </p>
                <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1rem,2.6vw,1.2rem)",color:"var(--pink-deep)",margin:0,lineHeight:1.6}}>
                  {narrative} 🌸
                </p>
                {topPhotoDay && (
                  <p style={{fontFamily:SANS,fontSize:"0.74rem",color:"var(--muted)",margin:"0.7rem 0 0"}}>
                    📸 most photographed: {new Date(topPhotoDay.date+"T12:00:00").getDate()} {MONTHS[viewMonth]} ({topPhotoDay.count} photo{topPhotoDay.count!==1?"s":""})
                  </p>
                )}
              </motion.div>
            )}

            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:"0.8rem",marginBottom:"1.8rem"}}>
              {[{e:"📅",v:monthEntries.length,l:"days logged"},{e:"⭐",v:specialDays.length,l:"special"},{e:"📸",v:withPhotos.length,l:"photos"},{e:"📝",v:withNotes.length,l:"notes"}].map((s,i)=>(
                <motion.div key={i} initial={{opacity:0,y:16}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.07}}
                  whileHover={{y:-3,scale:1.03}}
                  style={{background:CARD_BG,border:CARD_BORDER,borderRadius:18,padding:"1.3rem 0.8rem",textAlign:"center",boxShadow:"0 4px 18px rgba(var(--pink-deep-rgb),.08)"}}>
                  <div style={{fontSize:"1.5rem",marginBottom:"0.35rem"}}>{s.e}</div>
                  <div style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"1.9rem",color:"var(--pink-deep)",lineHeight:1}}>{s.v}</div>
                  <div style={{fontFamily:SANS,fontSize:"0.65rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.1em",marginTop:"0.2rem"}}>{s.l}</div>
                </motion.div>
              ))}
            </div>

            {/* Mood bars */}
            {topMoods.length>0&&(
              <div style={{background:CARD_BG,border:CARD_BORDER,borderRadius:22,padding:"1.6rem",marginBottom:"1.5rem",boxShadow:"0 4px 18px rgba(var(--pink-deep-rgb),.08)"}}>
                <p style={{fontFamily:SANS,fontSize:"0.7rem",color:"var(--muted)",letterSpacing:"0.18em",textTransform:"uppercase",margin:"0 0 1.3rem"}}>mood breakdown</p>
                <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
                  {topMoods.map(([mood,count])=>(
                    <div key={mood} style={{display:"flex",alignItems:"center",gap:"0.9rem"}}>
                      <span style={{fontSize:"1.5rem",width:34,textAlign:"center",flexShrink:0}}>{mood}</span>
                      <div style={{flex:1,height:9,borderRadius:5,background:"rgba(var(--pink-rgb),.15)",overflow:"hidden"}}>
                        <motion.div initial={{width:0}} whileInView={{width:`${(count/maxMoodCount)*100}%`}}
                          viewport={{once:true}} transition={{duration:1.1,ease:"easeOut",delay:0.1}}
                          style={{height:"100%",borderRadius:5,background:"linear-gradient(90deg,var(--pink),var(--pink-deep))",boxShadow:"0 0 10px rgba(var(--pink-rgb),.5)"}}/>
                      </div>
                      <span style={{fontFamily:SANS,fontSize:"0.75rem",color:"var(--pink-deep)",fontWeight:600,minWidth:18,textAlign:"right"}}>{count}</span>
                      <span style={{fontFamily:SANS,fontSize:"0.7rem",color:"var(--muted)",minWidth:60}}>{MOOD_LABELS[mood]||""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Special days */}
            {specialDays.length>0&&(
              <div style={{background:CARD_BG,border:CARD_BORDER,borderRadius:22,padding:"1.6rem",boxShadow:"0 4px 18px rgba(var(--pink-deep-rgb),.08)"}}>
                <p style={{fontFamily:SANS,fontSize:"0.7rem",color:"var(--muted)",letterSpacing:"0.18em",textTransform:"uppercase",margin:"0 0 1rem"}}>special days</p>
                <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                  {specialDays.map(e=>{
                    const d=new Date(e.date+"T12:00:00");
                    const isOpen=expanded===e.date;
                    return (
                      <div key={e.date}>
                        <motion.div whileHover={{x:4}} onClick={()=>setExpanded(isOpen?null:e.date)}
                          style={{display:"flex",alignItems:"center",gap:"0.8rem",cursor:"pointer",padding:"0.55rem 0",borderBottom:"1px solid rgba(var(--pink-rgb),.15)"}}>
                          <span style={{fontSize:"1rem"}}>⭐</span>
                          <div style={{flex:1}}>
                            <span style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.95rem",color:"var(--pink-deep)"}}>{d.getDate()} {MONTHS[d.getMonth()]}</span>
                            {e.specialLabel&&<span style={{fontFamily:SANS,fontSize:"0.75rem",color:"var(--muted)",marginLeft:"0.5rem"}}>{e.specialLabel}</span>}
                          </div>
                          {e.mood&&<span style={{fontSize:"1rem"}}>{e.mood}</span>}
                          <span style={{color:"var(--muted)",fontSize:"0.75rem"}}>{isOpen?"▲":"▼"}</span>
                        </motion.div>
                        <AnimatePresence>
                          {isOpen&&e.note&&(
                            <motion.p initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}
                              style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.9rem",color:"var(--text)",lineHeight:1.9,margin:"0.5rem 0 0.5rem 1.8rem",overflow:"hidden"}}>
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
