"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── types ── */
interface CalEntry {
  date: string;
  note: string;
  imageBase64: string;
  special: boolean;
  specialLabel: string;
  mood: string;
}

/* ── constants ── */
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const SPECIAL_LABELS = ["🌹 First date","💗 Special moment","🌙 Late night talk","✈️ Adventure","🎂 Birthday","💌 Important","⭐ Favourite memory","🎶 Our song","🌸 Just us","🎮 Gaming night"];
const MOODS = ["🥰","😊","🥺","😂","🌙","💗","✨","🎮","🌷","😴"];
const START_DATE = new Date("2026-03-11");

function toKey(y:number,m:number,d:number){ return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function daysSince(date: Date){ return Math.floor((Date.now()-START_DATE.getTime())/86400000); }

/* ── starfield (reused pattern) ── */
function MiniStars() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const c=ref.current; if(!c) return;
    const ctx=c.getContext("2d"); if(!ctx) return;
    const resize=()=>{ c.width=c.offsetWidth; c.height=c.offsetHeight; };
    resize();
    const ro=new ResizeObserver(resize); ro.observe(c);
    const pts=Array.from({length:40},()=>({ x:Math.random(),y:Math.random(),r:Math.random()*1.4+0.3,a:Math.random(),da:(Math.random()-0.5)*0.012 }));
    let raf:number;
    const draw=()=>{
      ctx.clearRect(0,0,c.width,c.height);
      pts.forEach(p=>{
        p.a=Math.max(0.1,Math.min(1,p.a+p.da)); if(p.a<=0.1||p.a>=1)p.da*=-1;
        ctx.beginPath(); ctx.arc(p.x*c.width,p.y*c.height,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(244,114,182,${p.a*0.5})`; ctx.shadowBlur=4; ctx.shadowColor="#f9a8d4"; ctx.fill();
      });
      raf=requestAnimationFrame(draw);
    };
    draw();
    return ()=>{ cancelAnimationFrame(raf); ro.disconnect(); };
  },[]);
  return <canvas ref={ref} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0}} />;
}

/* ── memory modal — the immersive experience ── */
function MemoryModal({
  dateKey, entry, onClose, onSave, onDelete
}: {
  dateKey: string;
  entry: Partial<CalEntry>;
  onClose: ()=>void;
  onSave: (e: Partial<CalEntry>)=>Promise<void>;
  onDelete: ()=>Promise<void>;
}) {
  const [draft, setDraft] = useState<Partial<CalEntry>>(entry);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<"view"|"edit">(entry.note||entry.imageBase64 ? "view" : "edit");
  const fileRef = useRef<HTMLInputElement>(null);

  const displayDate = new Date(dateKey+"T12:00:00");
  const isOurs  = displayDate >= START_DATE;
  const hasContent = !!(entry.note||entry.imageBase64);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>setDraft(d=>({...d,imageBase64:ev.target?.result as string}));
    reader.readAsDataURL(file);
  };

  async function handleSave(){
    setSaving(true);
    await onSave(draft);
    setSaving(false);
  }
  async function handleDelete(){
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  }

  return (
    <motion.div
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      transition={{duration:0.3}}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}
      style={{
        position:"fixed",inset:0,zIndex:2000,
        background:"rgba(61,31,43,0.55)",
        backdropFilter:"blur(14px)",
        WebkitBackdropFilter:"blur(14px)",
        display:"flex",alignItems:"center",justifyContent:"center",
        padding:"1rem",
      }}
    >
      <motion.div
        initial={{opacity:0,scale:0.88,y:50}}
        animate={{opacity:1,scale:1,y:0}}
        exit={{opacity:0,scale:0.9,y:30}}
        transition={{type:"spring",stiffness:200,damping:24}}
        style={{
          width:"100%",maxWidth:520,
          maxHeight:"92vh",
          borderRadius:28,
          overflow:"hidden",
          boxShadow:"0 32px 80px rgba(236,72,153,.35),0 4px 16px rgba(0,0,0,.1)",
          display:"flex",flexDirection:"column",
          position:"relative",
        }}
      >
        {/* Photo as hero — full bleed */}
        {(draft.imageBase64||entry.imageBase64) ? (
          <div style={{position:"relative",height:220,flexShrink:0}}>
            <img
              src={draft.imageBase64||entry.imageBase64}
              alt="memory"
              style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}
            />
            {/* gradient overlay so text sits on top */}
            <div style={{
              position:"absolute",inset:0,
              background:"linear-gradient(to bottom,rgba(0,0,0,.1) 0%,rgba(61,31,43,.6) 100%)",
            }}/>
            {/* date + label on photo */}
            <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"1.2rem 1.4rem"}}>
              <p style={{fontFamily:"var(--font-playfair)",fontStyle:"italic",fontSize:"1.3rem",color:"#fff",margin:0,textShadow:"0 2px 8px rgba(0,0,0,.4)"}}>
                {displayDate.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
              </p>
              {entry.specialLabel&&<p style={{fontFamily:"var(--font-caveat)",fontSize:"1rem",color:"#fda4af",margin:"0.2rem 0 0"}}>{entry.specialLabel}</p>}
            </div>
            {/* close */}
            <motion.button onClick={onClose} whileHover={{scale:1.1}} whileTap={{scale:0.9}}
              style={{position:"absolute",top:12,right:12,background:"rgba(0,0,0,.35)",border:"none",borderRadius:"50%",width:34,height:34,cursor:"pointer",color:"#fff",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
              ✕
            </motion.button>
          </div>
        ) : (
          /* No photo — gradient header */
          <div style={{
            background:`linear-gradient(135deg,${entry.special?"#fda4af,#f472b6":"#fce7f3,#fbcfe8"})`,
            padding:"1.6rem 1.8rem 1.4rem",flexShrink:0,position:"relative",overflow:"hidden",
          }}>
            <div style={{position:"absolute",top:-30,right:-30,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,.15)"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <p style={{fontFamily:"var(--font-playfair)",fontStyle:"italic",fontSize:"1.25rem",color: entry.special?"#fff":"#be185d",margin:0}}>
                  {displayDate.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
                </p>
                {entry.specialLabel&&<p style={{fontFamily:"var(--font-caveat)",fontSize:"1rem",color: entry.special?"rgba(255,255,255,.85)":"#f472b6",margin:"0.3rem 0 0"}}>{entry.specialLabel}</p>}
                {entry.mood&&<p style={{fontSize:"1.4rem",margin:"0.3rem 0 0"}}>{entry.mood}</p>}
              </div>
              <motion.button onClick={onClose} whileHover={{scale:1.1}} whileTap={{scale:0.9}}
                style={{background:"rgba(255,255,255,.25)",border:"none",borderRadius:"50%",width:34,height:34,cursor:"pointer",color: entry.special?"#fff":"#be185d",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                ✕
              </motion.button>
            </div>
          </div>
        )}

        {/* Tab strip */}
        {hasContent && (
          <div style={{display:"flex",background:"#fff",borderBottom:"1px solid rgba(249,168,212,.25)"}}>
            {(["view","edit"] as const).map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                style={{
                  flex:1,padding:"0.75rem",border:"none",cursor:"pointer",
                  fontFamily:"var(--font-caveat)",fontSize:"1rem",
                  background: tab===t ? "rgba(249,168,212,.15)" : "#fff",
                  color: tab===t ? "#be185d" : "rgba(190,24,93,.45)",
                  borderBottom: tab===t ? "2px solid #ec4899" : "2px solid transparent",
                  transition:"all 0.2s",
                }}>
                {t==="view" ? "💌 memory" : "✏️ edit"}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div style={{flex:1,overflowY:"auto",background:"#fff"}}>

          {/* VIEW tab */}
          {tab==="view" && (
            <div style={{
              padding:"1.8rem 1.8rem 2rem",
              backgroundImage:"repeating-linear-gradient(transparent,transparent 31px,rgba(249,168,212,.12) 31px,rgba(249,168,212,.12) 32px)",
              backgroundAttachment:"local",
              minHeight:160,
            }}>
              {/* mood + days since */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.2rem"}}>
                {entry.mood&&<span style={{fontSize:"1.8rem"}}>{entry.mood}</span>}
                {isOurs&&(
                  <span style={{fontFamily:"var(--font-caveat)",fontSize:"0.85rem",color:"var(--pink)",background:"rgba(249,168,212,.15)",borderRadius:50,padding:"0.2rem 0.8rem"}}>
                    day {Math.floor((displayDate.getTime()-START_DATE.getTime())/86400000)+1} of us 🌸
                  </span>
                )}
              </div>
              {entry.note ? (
                <p style={{fontFamily:"var(--font-caveat)",fontSize:"1.22rem",color:"#7c3f58",lineHeight:"2rem",margin:0,whiteSpace:"pre-wrap"}}>
                  {entry.note}
                </p>
              ) : (
                <p style={{fontFamily:"var(--font-caveat)",fontSize:"1.1rem",color:"rgba(190,24,93,.3)",fontStyle:"italic",margin:0}}>
                  no note yet — tap edit to add one 🌷
                </p>
              )}
              <div style={{marginTop:"1.5rem",display:"flex",alignItems:"center",gap:"0.5rem"}}>
                <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(249,168,212,.5),transparent)"}}/>
                <span style={{fontFamily:"var(--font-caveat)",fontSize:"0.85rem",color:"rgba(244,114,182,.6)"}}>— with love 🩷</span>
              </div>
            </div>
          )}

          {/* EDIT tab */}
          {(tab==="edit"||!hasContent) && (
            <div style={{padding:"1.5rem 1.6rem 2rem",display:"flex",flexDirection:"column",gap:"1rem"}}>

              {/* Mood picker */}
              <div>
                <p style={{fontFamily:"var(--font-caveat)",fontSize:"0.95rem",color:"#be185d",marginBottom:"0.5rem"}}>how were you feeling? 🌸</p>
                <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem"}}>
                  {MOODS.map(m=>(
                    <motion.button key={m} onClick={()=>setDraft(d=>({...d,mood:d.mood===m?"":m}))}
                      whileHover={{scale:1.15}} whileTap={{scale:0.9}}
                      style={{
                        fontSize:"1.5rem",background:draft.mood===m?"rgba(249,168,212,.3)":"transparent",
                        border:draft.mood===m?"2px solid #f9a8d4":"2px solid transparent",
                        borderRadius:10,padding:"0.3rem",cursor:"pointer",
                      }}>{m}</motion.button>
                  ))}
                </div>
              </div>

              {/* Photo */}
              <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleImage}/>
              <motion.button onClick={()=>fileRef.current?.click()} whileHover={{scale:1.02}} whileTap={{scale:0.98}}
                style={{
                  width:"100%",padding:"0.85rem",
                  background:"linear-gradient(135deg,rgba(249,168,212,.12),rgba(253,186,213,.12))",
                  border:"1.5px dashed #f9a8d4",borderRadius:12,
                  cursor:"pointer",fontFamily:"var(--font-caveat)",fontSize:"1rem",
                  color:"#be185d",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.5rem",
                }}>
                📸 {draft.imageBase64 ? "change photo" : "add a photo"}
              </motion.button>

              {/* Note */}
              <textarea
                value={draft.note||""}
                onChange={e=>setDraft(d=>({...d,note:e.target.value}))}
                placeholder={`write about this day… 🌸\n\nhow did it feel? what do you want to remember?`}
                rows={5}
                style={{
                  width:"100%",padding:"0.9rem",
                  background:"rgba(252,231,243,.25)",
                  border:"1.5px solid rgba(249,168,212,.4)",
                  borderRadius:12,resize:"vertical",
                  fontFamily:"var(--font-caveat)",fontSize:"1.12rem",
                  color:"#7c3f58",outline:"none",
                  boxSizing:"border-box",lineHeight:1.8,
                }}
              />

              {/* Special */}
              <div>
                <label style={{display:"flex",alignItems:"center",gap:"0.6rem",cursor:"pointer",marginBottom:"0.7rem"}}>
                  <input type="checkbox" checked={!!draft.special}
                    onChange={e=>setDraft(d=>({...d,special:e.target.checked}))}
                    style={{accentColor:"#ec4899",width:17,height:17}}/>
                  <span style={{fontFamily:"var(--font-caveat)",fontSize:"1rem",color:"#be185d"}}>mark as a special day ⭐</span>
                </label>
                <AnimatePresence>
                  {draft.special&&(
                    <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}}
                      style={{display:"flex",flexWrap:"wrap",gap:"0.5rem",overflow:"hidden"}}>
                      {SPECIAL_LABELS.map(lbl=>(
                        <motion.button key={lbl} onClick={()=>setDraft(d=>({...d,specialLabel:lbl}))}
                          whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                          style={{
                            padding:"0.32rem 0.7rem",borderRadius:20,border:"1.5px solid",
                            borderColor:draft.specialLabel===lbl?"#ec4899":"rgba(249,168,212,.4)",
                            background:draft.specialLabel===lbl?"linear-gradient(135deg,#fda4af,#f472b6)":"rgba(249,168,212,.1)",
                            color:draft.specialLabel===lbl?"#fff":"#be185d",
                            fontFamily:"var(--font-caveat)",fontSize:"0.88rem",cursor:"pointer",
                          }}>{lbl}</motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Actions */}
              <div style={{display:"flex",gap:"0.8rem",marginTop:"0.3rem"}}>
                <motion.button onClick={handleSave} disabled={saving}
                  whileHover={{scale:1.03,y:-2}} whileTap={{scale:0.97}}
                  style={{
                    flex:1,padding:"0.95rem",borderRadius:14,border:"none",cursor:"pointer",
                    background:"linear-gradient(135deg,#f472b6,#ec4899)",
                    color:"#fff",fontFamily:"var(--font-caveat)",fontSize:"1.12rem",
                    boxShadow:"0 4px 18px rgba(244,114,182,.38)",
                  }}>
                  {saving ? "saving…" : "save 💗"}
                </motion.button>
                {hasContent&&(
                  <motion.button onClick={handleDelete} disabled={deleting}
                    whileHover={{scale:1.03}} whileTap={{scale:0.97}}
                    style={{
                      padding:"0.95rem 1.2rem",borderRadius:14,
                      border:"1.5px solid rgba(249,168,212,.5)",
                      cursor:"pointer",background:"transparent",
                      color:"#f472b6",fontFamily:"var(--font-caveat)",fontSize:"1rem",
                    }}>
                    {deleting?"…":"clear"}
                  </motion.button>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── main calendar ── */
export default function OurCalendar() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [entries, setEntries] = useState<Record<string,CalEntry>>({});
  const [selected, setSelected] = useState<string|null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(()=>{
    fetch("/api/calendar").then(r=>r.json()).then((arr:CalEntry[])=>{
      const map:Record<string,CalEntry>={};
      arr.forEach(e=>{map[e.date]=e;});
      setEntries(map);
    }).finally(()=>setLoading(false));
  },[]);

  const openDay = (key:string) => setSelected(key);

  const handleSave = useCallback(async (draft: Partial<CalEntry>) => {
    if (!selected) return;
    const payload = {...draft, date:selected} as CalEntry;
    await fetch("/api/calendar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    setEntries(prev=>({...prev,[selected]:payload}));
    setSelected(null);
  },[selected]);

  const handleDelete = useCallback(async () => {
    if (!selected) return;
    await fetch("/api/calendar",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({date:selected})});
    setEntries(prev=>{const n={...prev};delete n[selected];return n;});
    setSelected(null);
  },[selected]);

  const firstDay    = new Date(year,month,1).getDay();
  const daysInMonth = new Date(year,month+1,0).getDate();
  const cells:(number|null)[] = [...Array(firstDay).fill(null),...Array.from({length:daysInMonth},(_,i)=>i+1)];
  while(cells.length%7!==0) cells.push(null);

  const prevMonth=()=>{ if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth=()=>{ if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };

  /* count special days in view */
  const specialCount = cells.filter(d=>{ if(!d) return false; return entries[toKey(year,month,d)]?.special; }).length;

  return (
    <section id="calendar" style={{
      position:"relative",width:"100%",
      padding:"6rem 1.5rem 7rem",
      background:"linear-gradient(180deg,#fff5f9,#fce7f3 40%,#fff0f5)",
      overflow:"hidden",
    }}>
      <MiniStars/>

      {/* orbs */}
      {[{l:"5%",t:"8%",c:"rgba(249,168,212,.22)"},{l:"72%",t:"4%",c:"rgba(253,186,213,.18)"},{l:"55%",t:"72%",c:"rgba(244,114,182,.11)"}].map((o,i)=>(
        <motion.div key={i} style={{
          position:"absolute",left:o.l,top:o.t,width:260,height:260,borderRadius:"50%",
          background:o.c,filter:"blur(55px)",pointerEvents:"none",zIndex:0,
        }} animate={{scale:[1,1.22,1],opacity:[0.5,0.9,0.5]}} transition={{repeat:Infinity,duration:5+i*1.5,ease:"easeInOut"}}/>
      ))}

      {/* header */}
      <motion.div initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{textAlign:"center",marginBottom:"2.5rem",position:"relative",zIndex:2}}>
        <motion.div style={{fontSize:"clamp(2rem,5vw,3rem)",letterSpacing:"0.4rem",marginBottom:"0.5rem"}}
          animate={{y:[-4,4,-4]}} transition={{repeat:Infinity,duration:3,ease:"easeInOut"}}>
          🌸 📅 🌸
        </motion.div>
        <h2 style={{fontFamily:"var(--font-playfair)",fontStyle:"italic",fontSize:"clamp(1.8rem,4vw,2.8rem)",color:"#be185d",margin:0}}>
          our days together
        </h2>
        <p style={{fontFamily:"var(--font-caveat)",fontSize:"1.15rem",color:"rgba(190,24,93,.55)",marginTop:"0.4rem"}}>
          {daysSince(today)}+ days of us — tap any day to relive it 🌷
        </p>
        {specialCount>0&&(
          <motion.p initial={{opacity:0}} animate={{opacity:1}}
            style={{fontFamily:"var(--font-caveat)",fontSize:"1rem",color:"#f472b6",marginTop:"0.3rem"}}>
            ✨ {specialCount} special {specialCount===1?"day":"days"} this month
          </motion.p>
        )}
      </motion.div>

      {/* calendar card */}
      <motion.div initial={{opacity:0,y:40}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.15}}
        style={{
          position:"relative",zIndex:2,maxWidth:700,margin:"0 auto",
          background:"rgba(255,255,255,.9)",
          backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",
          borderRadius:28,
          boxShadow:"0 12px 60px rgba(244,114,182,.18),0 2px 8px rgba(0,0,0,.05),inset 0 0 0 1.5px rgba(249,168,212,.3)",
          overflow:"hidden",
        }}>

        {/* month nav */}
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"1.4rem 2rem",
          background:"linear-gradient(135deg,#fce7f3,#fbcfe8)",
          borderBottom:"1px solid rgba(249,168,212,.3)",
        }}>
          <motion.button onClick={prevMonth} whileHover={{scale:1.2,x:-2}} whileTap={{scale:0.9}}
            style={{background:"rgba(255,255,255,.4)",border:"none",cursor:"pointer",fontSize:"1.3rem",color:"#be185d",width:38,height:38,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
            ‹
          </motion.button>
          <div style={{textAlign:"center"}}>
            <p style={{fontFamily:"var(--font-playfair)",fontStyle:"italic",fontSize:"1.6rem",color:"#be185d",margin:0,fontWeight:600}}>
              {MONTHS[month]}
            </p>
            <p style={{fontFamily:"var(--font-caveat)",fontSize:"0.95rem",color:"rgba(190,24,93,.55)",margin:0}}>{year}</p>
          </div>
          <motion.button onClick={nextMonth} whileHover={{scale:1.2,x:2}} whileTap={{scale:0.9}}
            style={{background:"rgba(255,255,255,.4)",border:"none",cursor:"pointer",fontSize:"1.3rem",color:"#be185d",width:38,height:38,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
            ›
          </motion.button>
        </div>

        {/* day labels */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"1rem 1.2rem 0.4rem"}}>
          {DAYS.map(d=>(
            <div key={d} style={{textAlign:"center",fontFamily:"var(--font-lato)",fontSize:"0.78rem",fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",color:"rgba(190,24,93,.45)",padding:"0.3rem 0"}}>
              {d}
            </div>
          ))}
        </div>

        {/* grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,padding:"0.3rem 1.2rem 1.4rem"}}>
          {cells.map((day,i)=>{
            if(!day) return <div key={i}/>;
            const key=toKey(year,month,day);
            const entry=entries[key];
            const isToday=day===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
            const isSpecial=!!entry?.special;
            const hasNote=!!entry?.note||!!entry?.imageBase64;
            const inOurTime=new Date(key+"T12:00:00")>=START_DATE;

            return (
              <motion.button key={key} onClick={()=>openDay(key)}
                whileHover={{scale:1.14,zIndex:5}} whileTap={{scale:0.93}}
                style={{
                  position:"relative",aspectRatio:"1",
                  border:"none",borderRadius:12,cursor:"pointer",
                  background: isSpecial
                    ? "linear-gradient(135deg,#fda4af,#f472b6)"
                    : isToday
                    ? "linear-gradient(135deg,#fce7f3,#f9a8d4)"
                    : hasNote
                    ? "rgba(249,168,212,.22)"
                    : inOurTime
                    ? "rgba(249,168,212,.06)"
                    : "transparent",
                  boxShadow:isSpecial?"0 4px 16px rgba(244,114,182,.45)":isToday?"0 2px 10px rgba(244,114,182,.25)":"none",
                  outline:isToday?"2.5px solid #f9a8d4":"none",
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                  gap:2,padding:"2px",
                  transition:"background 0.2s",
                }}>
                <span style={{
                  fontFamily:"var(--font-lato)",
                  fontSize:"clamp(0.78rem,2vw,0.95rem)",
                  color:isSpecial?"#fff":isToday?"#be185d":inOurTime?"#9d3f68":"#c8a0b0",
                  fontWeight:isToday||isSpecial?700:inOurTime?500:400,
                  lineHeight:1,
                }}>{day}</span>
                {/* mood emoji on the cell */}
                {entry?.mood&&<span style={{fontSize:"0.6rem",lineHeight:1}}>{entry.mood}</span>}
                {isSpecial&&!entry?.mood&&<span style={{fontSize:"0.55rem",lineHeight:1}}>⭐</span>}
                {hasNote&&!isSpecial&&!entry?.mood&&<div style={{width:4,height:4,borderRadius:"50%",background:"#f472b6"}}/>}
              </motion.button>
            );
          })}
        </div>

        {/* legend */}
        <div style={{
          display:"flex",gap:"1rem",flexWrap:"wrap",justifyContent:"center",
          padding:"0.8rem 1.5rem 1.4rem",
          borderTop:"1px solid rgba(249,168,212,.2)",
          fontFamily:"var(--font-caveat)",fontSize:"0.88rem",color:"rgba(190,24,93,.55)",
        }}>
          <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:12,height:12,borderRadius:3,background:"linear-gradient(135deg,#fda4af,#f472b6)"}}/> special</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:6,height:6,borderRadius:"50%",background:"#f472b6"}}/> memory</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:12,height:12,borderRadius:3,outline:"2.5px solid #f9a8d4"}}/> today</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:12,height:12,borderRadius:3,background:"rgba(249,168,212,.22)"}}/> our time</span>
        </div>
      </motion.div>

      {/* loading shimmer */}
      {loading&&(
        <div style={{position:"absolute",inset:0,zIndex:10,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,245,249,.7)",backdropFilter:"blur(4px)"}}>
          <motion.div animate={{scale:[1,1.2,1]}} transition={{repeat:Infinity,duration:1.2}} style={{fontSize:"2.5rem"}}>💗</motion.div>
        </div>
      )}

      {/* modal */}
      <AnimatePresence>
        {selected&&(
          <MemoryModal
            key={selected}
            dateKey={selected}
            entry={entries[selected]??{date:selected,note:"",imageBase64:"",special:false,specialLabel:"",mood:""}}
            onClose={()=>setSelected(null)}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>
    </section>
  );
}