"use client";
import React, { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendarData, updateCalendarCache, deleteFromCalendarCache, type CalEntry } from "@/lib/calendarStore";

/* ─── types ─── */
interface DraftEntry extends Omit<CalEntry,"date"> {}

/* ─── constants ─── */
const MONTHS     = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const DAYS_FULL  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const SPECIAL_LABELS = ["🌹 First date","💗 Special moment","🌙 Late night talk","✈️ Adventure","🎂 Birthday","💌 Important","⭐ Favourite memory","🎶 Our song","🌸 Just us","🎮 Gaming night","🍜 Food date","🌃 Night out"];
const MOODS = ["🥰","😊","🥺","😂","🌙","💗","✨","🎮","🌷","😴","🤭","💫"];
const START = new Date("2026-03-11");

function toKey(y:number,m:number,d:number){ return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function dayNum(key:string){ return Math.floor((new Date(key+"T12:00:00").getTime()-START.getTime())/86400000)+1; }
function fmtDate(key:string){ const d=new Date(key+"T12:00:00"); return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`; }

/* shared readable font stack — Georgia-like serif + system fallbacks */
const SERIF  = `"Georgia", "Times New Roman", serif`;
const SCRIPT = `var(--font-caveat), "Segoe Script", cursive`;
const SANS   = `var(--font-lato), "Inter", system-ui, sans-serif`;

const GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`;

/* ─── lightbox with prev/next ─── */
function Lightbox({ photos, startIdx, onClose }: { photos:string[]; startIdx:number; onClose:()=>void }) {
  const [idx, setIdx] = useState(startIdx);
  const prev = useCallback((e: React.MouseEvent) => { e.stopPropagation(); setIdx(i=>(i-1+photos.length)%photos.length); }, [photos.length]);
  const next = useCallback((e: React.MouseEvent) => { e.stopPropagation(); setIdx(i=>(i+1)%photos.length); }, [photos.length]);

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(e.key==="ArrowLeft") setIdx(i=>(i-1+photos.length)%photos.length);
      if(e.key==="ArrowRight") setIdx(i=>(i+1)%photos.length);
      if(e.key==="Escape") onClose();
    };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[photos.length,onClose]);

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}
      style={{position:"fixed",inset:0,zIndex:9500,background:"rgba(4,0,2,.97)",display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>

      {photos.length>1&&(
        <motion.button onClick={prev} whileHover={{scale:1.1}} whileTap={{scale:0.9}}
          style={{position:"absolute",left:"clamp(0.6rem,2.5vw,2rem)",background:"rgba(236,72,153,.15)",border:"1px solid rgba(236,72,153,.3)",borderRadius:"50%",width:48,height:48,cursor:"pointer",color:"#f9a8d4",fontSize:"1.4rem",zIndex:2,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</motion.button>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{opacity:0,x:40}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-40}}
          transition={{duration:0.22,ease:"easeOut"}}
          onClick={e=>e.stopPropagation()}
          style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"1rem",maxWidth:"min(85vw,900px)"}}>
          <img src={photos[idx]} alt="" style={{maxWidth:"100%",maxHeight:"75vh",objectFit:"contain",borderRadius:6,boxShadow:"0 20px 60px rgba(0,0,0,.9)",display:"block"}}/>
          {/* Dot nav */}
          <div style={{display:"flex",gap:"0.5rem",alignItems:"center"}}>
            {photos.map((_,i)=>(
              <div key={i} onClick={e=>{e.stopPropagation();setIdx(i);}} style={{
                width:i===idx?10:6,height:i===idx?10:6,borderRadius:"50%",cursor:"pointer",
                background:i===idx?"#ec4899":"rgba(249,168,212,.35)",transition:"all 0.2s",
              }}/>
            ))}
          </div>
          <p style={{fontFamily:SANS,fontSize:"0.72rem",color:"rgba(244,114,182,.4)",letterSpacing:"0.12em",margin:0}}>
            {idx+1} / {photos.length} &nbsp;·&nbsp; ← → to navigate &nbsp;·&nbsp; ESC to close
          </p>
        </motion.div>
      </AnimatePresence>

      {photos.length>1&&(
        <motion.button onClick={next} whileHover={{scale:1.1}} whileTap={{scale:0.9}}
          style={{position:"absolute",right:"clamp(0.6rem,2.5vw,2rem)",background:"rgba(236,72,153,.15)",border:"1px solid rgba(236,72,153,.3)",borderRadius:"50%",width:48,height:48,cursor:"pointer",color:"#f9a8d4",fontSize:"1.4rem",zIndex:2,display:"flex",alignItems:"center",justifyContent:"center"}}>›</motion.button>
      )}

      <motion.button onClick={onClose} whileHover={{scale:1.1,rotate:90}} whileTap={{scale:0.9}}
        style={{position:"absolute",top:"1rem",right:"1rem",background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.12)",borderRadius:"50%",width:38,height:38,cursor:"pointer",color:"rgba(255,255,255,.7)",fontSize:"1rem",zIndex:3,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</motion.button>
    </motion.div>
  );
}

/* ─── polaroid card ─── */
function Polaroid({ src, dateKey, idx, total, isTop, offset, onClick, onBringForward }: {
  src:string; dateKey:string; idx:number; total:number;
  isTop:boolean; offset:number; onClick:()=>void; onBringForward:()=>void;
}) {
  return (
    <motion.div
      style={{
        position:"absolute", width:"100%", height:"100%",
        background:"#fefefe",
        padding:"10px 10px 52px",
        cursor:"pointer",
        zIndex: total - Math.abs(offset),
        /* no rotate in style prop — use animate below */
        boxShadow: isTop
          ? "0 24px 70px rgba(0,0,0,.65),0 6px 20px rgba(236,72,153,.2)"
          : "0 8px 28px rgba(0,0,0,.45)",
      }}
      animate={{
        rotate: isTop ? 0 : offset * 6,
        x:      isTop ? 0 : offset * 18,
        y:      isTop ? 0 : Math.abs(offset) * 6,
        scale:  isTop ? 1 : 1 - Math.abs(offset)*0.05,
      }}
      whileHover={isTop ? { scale:1.03, y:-6 } : { scale:1.01 }}
      transition={{type:"spring",stiffness:260,damping:28}}
      onClick={isTop ? onClick : onBringForward}
    >
      <div style={{width:"100%",paddingBottom:"100%",position:"relative",overflow:"hidden",background:"#e8d5dc"}}>
        <img src={src} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
      </div>
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:52,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:2}}>
        <span style={{fontFamily:"monospace",fontSize:"0.68rem",color:"rgba(80,40,60,.5)",letterSpacing:"0.14em",fontWeight:700}}>{fmtDate(dateKey)}</span>
        {total>1&&<span style={{fontFamily:"monospace",fontSize:"0.55rem",color:"rgba(80,40,60,.32)",letterSpacing:"0.08em"}}>{idx+1} / {total}</span>}
      </div>
    </motion.div>
  );
}

/* ─── polaroid stack ─── */
function PolaroidStack({ photos, dateKey, onPhotoClick }: { photos:string[]; dateKey:string; onPhotoClick:(i:number)=>void }) {
  const [topIdx, setTopIdx] = useState(0);

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"2.5rem",width:"100%"}}>
      {/* Stack wrapper — responsive size */}
      <div style={{position:"relative",width:"min(300px,70vw)",aspectRatio:"1 / 1.24",flexShrink:0}}>
        {/* Bottom padding for caption */}
        <div style={{position:"absolute",inset:0}}>
          {photos.map((src,i)=>(
            <Polaroid key={i} src={src} dateKey={dateKey} idx={i} total={photos.length}
              isTop={i===topIdx} offset={i-topIdx}
              onClick={()=>onPhotoClick(i)}
              onBringForward={()=>setTopIdx(i)}/>
          ))}
        </div>
      </div>

      {/* Controls */}
      {photos.length>1&&(
        <div style={{display:"flex",alignItems:"center",gap:"1rem"}}>
          <motion.button onClick={()=>setTopIdx(i=>(i-1+photos.length)%photos.length)}
            whileHover={{scale:1.1}} whileTap={{scale:0.9}}
            style={{background:"rgba(236,72,153,.1)",border:"1px solid rgba(236,72,153,.25)",borderRadius:"50%",width:38,height:38,cursor:"pointer",color:"#f9a8d4",fontSize:"1.1rem",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</motion.button>
          <div style={{display:"flex",gap:"0.45rem",alignItems:"center"}}>
            {photos.map((_,i)=>(
              <div key={i} onClick={()=>setTopIdx(i)} style={{
                width:i===topIdx?9:5,height:i===topIdx?9:5,borderRadius:"50%",cursor:"pointer",
                background:i===topIdx?"#ec4899":"rgba(249,168,212,.3)",transition:"all 0.2s",
              }}/>
            ))}
          </div>
          <motion.button onClick={()=>setTopIdx(i=>(i+1)%photos.length)}
            whileHover={{scale:1.1}} whileTap={{scale:0.9}}
            style={{background:"rgba(236,72,153,.1)",border:"1px solid rgba(236,72,153,.25)",borderRadius:"50%",width:38,height:38,cursor:"pointer",color:"#f9a8d4",fontSize:"1.1rem",display:"flex",alignItems:"center",justifyContent:"center"}}>›</motion.button>
        </div>
      )}
      <p style={{fontFamily:SANS,fontSize:"0.78rem",color:"rgba(244,114,182,.35)",margin:0,textAlign:"center"}}>
        {photos.length>1?"tap a photo to open full screen · tap back photo to bring forward":"tap photo to open full screen"}
      </p>
    </div>
  );
}

/* ─── film strip ─── */
function FilmStrip({ photos, dateKey, onPhotoClick }: { photos:string[]; dateKey:string; onPhotoClick:(i:number)=>void }) {
  return (
    <div style={{display:"flex",gap:"1rem",overflowX:"auto",paddingBottom:"1.5rem",paddingTop:"0.5rem",scrollbarWidth:"none"} as React.CSSProperties}>
      {photos.map((src,i)=>{
        const rot = (i-(photos.length-1)/2)*3;
        return (
          <motion.div key={i}
            initial={{opacity:0,y:24}} animate={{opacity:1,y:0}}
            transition={{delay:i*0.06,duration:0.3,ease:"easeOut"}}
            whileHover={{scale:1.06,y:-6}}
            onClick={()=>onPhotoClick(i)}
            style={{
              cursor:"pointer",flexShrink:0,position:"relative",
              background:"#110507",
              padding:"7px 7px 28px",
              boxShadow:"0 16px 40px rgba(0,0,0,.65)",
              width:140,
              transform:`rotate(${rot}deg)`,  /* CSS transform, not framer rotate */
            }}
          >
            {[0,1,2,3].map(h=>(
              <React.Fragment key={h}>
                <div style={{position:"absolute",top:4+h*21,left:2,width:5,height:12,borderRadius:2,background:"#000"}}/>
                <div style={{position:"absolute",top:4+h*21,right:2,width:5,height:12,borderRadius:2,background:"#000"}}/>
              </React.Fragment>
            ))}
            <img src={src} alt="" style={{width:"100%",aspectRatio:"1",objectFit:"cover",display:"block",filter:"saturate(0.9)"}}/>
            <div style={{position:"absolute",bottom:4,left:0,right:0,textAlign:"center",fontFamily:"monospace",fontSize:"0.58rem",color:"rgba(255,170,150,.4)",letterSpacing:"0.1em"}}>
              {fmtDate(dateKey)} · {String(i+1).padStart(2,"0")}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── day view portal ─── */
function DayView({ dateKey, entry, originRect, onClose, onSave, onDelete }: {
  dateKey:string; entry:Partial<CalEntry>; originRect:DOMRect|null;
  onClose:()=>void; onSave:(d:DraftEntry)=>Promise<void>; onDelete:()=>Promise<void>;
}) {
  const [draft, setDraft] = useState<DraftEntry>({
    note:entry.note||"", photos:entry.photos||[],
    special:entry.special||false, specialLabel:entry.specialLabel||"", mood:entry.mood||"",
  });
  const [tab,      setTab]      = useState<"view"|"edit">(entry.note||(entry.photos?.length??0)>0?"view":"edit");
  const [saving,   setSaving]   = useState(false);
  const [lbIdx,    setLbIdx]    = useState<number|null>(null);
  const [dispMode, setDispMode] = useState<"polaroid"|"film">("polaroid");
  const fileRef = useRef<HTMLInputElement>(null);

  const displayDate = new Date(dateKey+"T12:00:00");
  const isOurs      = displayDate >= START;
  const dn          = isOurs ? dayNum(dateKey) : null;
  const hasContent  = !!(draft.note||(draft.photos?.length??0)>0);
  const hasPhotos   = (draft.photos?.length??0)>0;

  const addPhotos = (e:React.ChangeEvent<HTMLInputElement>)=>{
    Array.from(e.target.files||[]).forEach(file=>{
      const r=new FileReader();
      r.onload=ev=>setDraft(d=>({...d,photos:[...(d.photos||[]),ev.target?.result as string]}));
      r.readAsDataURL(file);
    });
  };
  const removePhoto = (i:number)=>setDraft(d=>({...d,photos:(d.photos||[]).filter((_,idx)=>idx!==i)}));
  const save = async()=>{ setSaving(true); await onSave(draft); setSaving(false); };

  /* origin for zoom-from-cell */
  const ox = originRect ? originRect.left+originRect.width/2-window.innerWidth/2  : 0;
  const oy = originRect ? originRect.top+originRect.height/2-window.innerHeight/2 : 0;

  return (
    <>
      {/* Backdrop — separate layer so it doesn't interfere with panel animation */}
      <motion.div
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.25}}
        onClick={onClose}
        style={{position:"fixed",inset:0,zIndex:3000,background:"rgba(6,1,4,.82)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)"}}
      />

      {/* Panel */}
      <motion.div
        initial={{opacity:0,scale:0.08,borderRadius:999,x:ox,y:oy}}
        animate={{opacity:1,scale:1,borderRadius:18,x:0,y:0}}
        exit={{opacity:0,scale:0.06,borderRadius:999}}
        transition={{type:"spring",stiffness:230,damping:30,mass:0.8}}
        style={{
          position:"fixed",
          top:"2vh",left:"2vw",right:"2vw",bottom:"2vh",
          zIndex:3001,
          background:"linear-gradient(148deg,#17060f 0%,#280c1a 50%,#190810 100%)",
          backgroundImage:`${GRAIN},linear-gradient(148deg,#17060f 0%,#280c1a 50%,#190810 100%)`,
          display:"flex",flexDirection:"column",overflow:"hidden",
          boxShadow:"0 30px 100px rgba(0,0,0,.9),0 0 0 1px rgba(236,72,153,.1)",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding:"clamp(1rem,3vw,1.8rem) clamp(1rem,3vw,2rem) clamp(0.8rem,2vw,1.2rem)",
          borderBottom:"1px solid rgba(236,72,153,.1)",
          background:"linear-gradient(180deg,rgba(236,72,153,.06) 0%,transparent)",
          flexShrink:0,
          display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"0.8rem",
        }}>
          <div style={{minWidth:0,flex:1}}>
            {dn&&(
              <span style={{fontFamily:SANS,fontSize:"0.68rem",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(244,114,182,.4)",display:"block",marginBottom:"0.3rem"}}>
                day {dn} of us 🌸
              </span>
            )}
            <h2 style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1.1rem,3.5vw,1.8rem)",color:"#fce7f3",margin:0,lineHeight:1.25,fontWeight:400}}>
              {DAYS_FULL[displayDate.getDay()]}, {MONTHS[displayDate.getMonth()]} {displayDate.getDate()}, {displayDate.getFullYear()}
            </h2>
            <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginTop:"0.35rem",flexWrap:"wrap"}}>
              {entry.specialLabel&&<span style={{fontFamily:SANS,fontSize:"0.82rem",color:"#f9a8d4"}}>{entry.specialLabel}</span>}
              {draft.mood&&<span style={{fontSize:"1.3rem",lineHeight:1}}>{draft.mood}</span>}
              <span style={{fontFamily:"monospace",fontSize:"0.68rem",color:"rgba(244,114,182,.3)",letterSpacing:"0.1em"}}>{fmtDate(dateKey)}</span>
            </div>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:"0.5rem",flexShrink:0}}>
            {hasContent&&(
              <div style={{background:"rgba(255,255,255,.05)",borderRadius:28,padding:"0.18rem",display:"flex",border:"1px solid rgba(236,72,153,.15)"}}>
                {(["view","edit"] as const).map(t=>(
                  <button key={t} onClick={()=>setTab(t)}
                    style={{
                      padding:"0.28rem 0.85rem",borderRadius:24,border:"none",fontFamily:SANS,fontSize:"0.82rem",cursor:"pointer",transition:"all 0.2s",
                      background:tab===t?"linear-gradient(135deg,rgba(236,72,153,.4),rgba(190,24,93,.3))":"transparent",
                      color:tab===t?"#fce7f3":"rgba(252,231,243,.35)",
                    }}>
                    {t==="view"?"💌 memory":"✏️ edit"}
                  </button>
                ))}
              </div>
            )}
            <motion.button onClick={onClose} whileHover={{scale:1.1,rotate:90}} whileTap={{scale:0.9}}
              style={{background:"rgba(255,255,255,.05)",border:"1px solid rgba(236,72,153,.15)",borderRadius:"50%",width:34,height:34,cursor:"pointer",color:"rgba(252,231,243,.6)",fontSize:"0.95rem",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              ✕
            </motion.button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{flex:1,overflowY:"auto",overflowX:"hidden"}}>
          <AnimatePresence mode="wait">

            {/* VIEW */}
            {tab==="view"&&(
              <motion.div key="view"
                initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                transition={{duration:0.22,ease:"easeOut"}}
                style={{padding:"clamp(1.2rem,3vw,2rem)",minHeight:"100%"}}
              >
                {hasPhotos&&(
                  <div style={{marginBottom:"1.8rem"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.2rem"}}>
                      <span style={{fontFamily:SANS,fontSize:"0.75rem",color:"rgba(244,114,182,.5)",letterSpacing:"0.12em",textTransform:"uppercase"}}>
                        {draft.photos!.length} photo{draft.photos!.length!==1?"s":""}
                      </span>
                      <div style={{display:"flex",gap:"0.35rem"}}>
                        {(["polaroid","film"] as const).map(m=>(
                          <button key={m} onClick={()=>setDispMode(m)}
                            style={{
                              padding:"0.25rem 0.75rem",borderRadius:18,cursor:"pointer",transition:"all 0.2s",fontFamily:SANS,fontSize:"0.78rem",
                              border:`1px solid ${dispMode===m?"rgba(236,72,153,.45)":"rgba(236,72,153,.18)"}`,
                              background:dispMode===m?"rgba(236,72,153,.15)":"transparent",
                              color:dispMode===m?"#f9a8d4":"rgba(244,114,182,.38)",
                            }}>
                            {m==="polaroid"?"🖼 polaroid":"🎞 film"}
                          </button>
                        ))}
                      </div>
                    </div>
                    {dispMode==="polaroid"
                      ? <PolaroidStack photos={draft.photos!} dateKey={dateKey} onPhotoClick={i=>setLbIdx(i)}/>
                      : <FilmStrip    photos={draft.photos!} dateKey={dateKey} onPhotoClick={i=>setLbIdx(i)}/>
                    }
                  </div>
                )}

                {draft.note?(
                  <div style={{
                    background:"rgba(255,255,255,.02)",border:"1px solid rgba(236,72,153,.08)",
                    borderRadius:14,padding:"clamp(1.2rem,3vw,1.8rem) clamp(1.2rem,3vw,1.8rem) clamp(1.2rem,3vw,1.8rem) clamp(2rem,4vw,2.5rem)",
                    position:"relative",overflow:"hidden",marginTop:hasPhotos?"2rem":"0",
                  }}>
                    <div style={{position:"absolute",inset:0,pointerEvents:"none",backgroundImage:"repeating-linear-gradient(transparent,transparent 31px,rgba(236,72,153,.05) 31px,rgba(236,72,153,.05) 32px)"}}/>
                    <div style={{position:"absolute",left:"2.5rem",top:0,bottom:0,width:1,background:"rgba(236,72,153,.09)"}}/>
                    {/* Readable journaling font */}
                    <p style={{
                      fontFamily:SERIF,
                      fontSize:"clamp(1rem,2.2vw,1.18rem)",
                      color:"rgba(252,231,243,.88)",
                      lineHeight:2,
                      margin:0,whiteSpace:"pre-wrap",position:"relative",zIndex:1,
                      letterSpacing:"0.01em",fontWeight:400,
                    }}>
                      {draft.note}
                    </p>
                    <div style={{marginTop:"1.4rem",display:"flex",alignItems:"center",gap:"0.5rem",position:"relative",zIndex:1}}>
                      <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(236,72,153,.28),transparent)"}}/>
                      <span style={{fontFamily:SCRIPT,fontSize:"0.85rem",color:"rgba(244,114,182,.4)"}}>— with love 🩷</span>
                    </div>
                  </div>
                ):!hasPhotos&&(
                  <div style={{textAlign:"center",padding:"4rem 1rem"}}>
                    <div style={{fontSize:"2rem",marginBottom:"0.8rem",opacity:0.4}}>🌸</div>
                    <p style={{fontFamily:SANS,fontSize:"0.95rem",color:"rgba(244,114,182,.3)",margin:0}}>nothing here yet — tap edit to add a memory</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* EDIT */}
            {(tab==="edit"||!hasContent)&&(
              <motion.div key="edit"
                initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                transition={{duration:0.22,ease:"easeOut"}}
                style={{padding:"clamp(1.2rem,3vw,2rem)",display:"flex",flexDirection:"column",gap:"1.4rem"}}
              >
                {/* Mood */}
                <div>
                  <p style={{fontFamily:SANS,fontSize:"0.72rem",color:"rgba(244,114,182,.45)",marginBottom:"0.6rem",letterSpacing:"0.14em",textTransform:"uppercase"}}>How are you feeling?</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"0.45rem"}}>
                    {MOODS.map(m=>(
                      <motion.button key={m} onClick={()=>setDraft(d=>({...d,mood:d.mood===m?"":m}))}
                        whileHover={{scale:1.18,y:-3}} whileTap={{scale:0.9}}
                        style={{
                          fontSize:"1.5rem",
                          background:draft.mood===m?"rgba(236,72,153,.18)":"rgba(255,255,255,.04)",
                          border:`1.5px solid ${draft.mood===m?"rgba(236,72,153,.55)":"rgba(255,255,255,.06)"}`,
                          borderRadius:10,padding:"0.35rem",cursor:"pointer",
                          transition:"all 0.15s",
                        }}>{m}</motion.button>
                    ))}
                  </div>
                </div>

                {/* Photos */}
                <div>
                  <p style={{fontFamily:SANS,fontSize:"0.72rem",color:"rgba(244,114,182,.45)",marginBottom:"0.6rem",letterSpacing:"0.14em",textTransform:"uppercase"}}>Photos</p>
                  {(draft.photos||[]).length>0&&(
                    <div style={{display:"flex",flexWrap:"wrap",gap:"0.6rem",marginBottom:"0.8rem"}}>
                      {draft.photos!.map((src,i)=>(
                        <div key={i} style={{position:"relative"}}>
                          <img src={src} style={{width:64,height:64,objectFit:"cover",borderRadius:8,display:"block",border:"1px solid rgba(236,72,153,.18)"}} alt=""/>
                          <button onClick={()=>removePhoto(i)}
                            style={{position:"absolute",top:-6,right:-6,width:20,height:20,borderRadius:"50%",border:"none",background:"#be185d",color:"#fff",fontSize:"0.6rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={addPhotos}/>
                  <motion.button onClick={()=>fileRef.current?.click()} whileHover={{scale:1.01}} whileTap={{scale:0.98}}
                    style={{
                      width:"100%",padding:"0.85rem",
                      background:"rgba(236,72,153,.04)",border:"1.5px dashed rgba(236,72,153,.25)",
                      borderRadius:12,cursor:"pointer",fontFamily:SANS,fontSize:"0.9rem",
                      color:"rgba(244,114,182,.7)",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.5rem",
                    }}>
                    📸 Add photos — select multiple at once
                  </motion.button>
                </div>

                {/* Note — journaling area */}
                <div>
                  <p style={{fontFamily:SANS,fontSize:"0.72rem",color:"rgba(244,114,182,.45)",marginBottom:"0.6rem",letterSpacing:"0.14em",textTransform:"uppercase"}}>Journal</p>
                  <textarea value={draft.note} onChange={e=>setDraft(d=>({...d,note:e.target.value}))}
                    placeholder={"Write about this day…\n\nHow did it feel? What do you want to remember? 🌸"}
                    rows={6}
                    style={{
                      width:"100%",padding:"1rem 1rem 1rem 1.4rem",
                      background:"rgba(255,255,255,.03)",
                      border:"1px solid rgba(236,72,153,.16)",
                      borderRadius:12,resize:"vertical",
                      /* Readable journaling font */
                      fontFamily:SERIF,
                      fontSize:"clamp(0.95rem,2.2vw,1.1rem)",
                      color:"rgba(252,231,243,.85)",
                      outline:"none",boxSizing:"border-box",
                      lineHeight:1.9,caretColor:"#f9a8d4",
                      letterSpacing:"0.01em",
                    }}/>
                </div>

                {/* Special */}
                <div>
                  <label style={{display:"flex",alignItems:"center",gap:"0.7rem",cursor:"pointer",marginBottom:"0.8rem"}}
                    onClick={()=>setDraft(d=>({...d,special:!d.special}))}>
                    <div style={{
                      width:20,height:20,borderRadius:5,flexShrink:0,
                      border:`2px solid ${draft.special?"#ec4899":"rgba(236,72,153,.28)"}`,
                      background:draft.special?"linear-gradient(135deg,#ec4899,#be185d)":"transparent",
                      display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",
                    }}>
                      {draft.special&&<span style={{color:"#fff",fontSize:"0.7rem"}}>✓</span>}
                    </div>
                    <span style={{fontFamily:SANS,fontSize:"0.92rem",color:"rgba(252,231,243,.72)"}}>Mark as a special day ⭐</span>
                  </label>
                  <AnimatePresence>
                    {draft.special&&(
                      <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}}
                        style={{display:"flex",flexWrap:"wrap",gap:"0.45rem",overflow:"hidden"}}>
                        {SPECIAL_LABELS.map(lbl=>(
                          <button key={lbl} onClick={()=>setDraft(d=>({...d,specialLabel:d.specialLabel===lbl?"":lbl}))}
                            style={{
                              padding:"0.28rem 0.7rem",borderRadius:18,cursor:"pointer",fontFamily:SANS,fontSize:"0.82rem",
                              border:`1.5px solid ${draft.specialLabel===lbl?"#ec4899":"rgba(236,72,153,.2)"}`,
                              background:draft.specialLabel===lbl?"rgba(236,72,153,.2)":"rgba(255,255,255,.04)",
                              color:draft.specialLabel===lbl?"#f9a8d4":"rgba(244,114,182,.45)",transition:"all 0.15s",
                            }}>{lbl}</button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Actions */}
                <div style={{display:"flex",gap:"0.8rem",paddingBottom:"1rem"}}>
                  <motion.button onClick={save} disabled={saving}
                    whileHover={{scale:1.02,y:-2}} whileTap={{scale:0.97}}
                    style={{
                      flex:1,padding:"0.95rem",borderRadius:12,border:"none",cursor:"pointer",
                      background:"linear-gradient(135deg,#ec4899,#be185d)",
                      color:"#fff",fontFamily:SANS,fontSize:"1rem",fontWeight:600,
                      boxShadow:"0 4px 20px rgba(236,72,153,.35)",
                    }}>
                    {saving?"Saving…":"Save memory 💗"}
                  </motion.button>
                  {hasContent&&(
                    <motion.button onClick={async()=>{await onDelete();}} whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                      style={{padding:"0.95rem 1.2rem",borderRadius:12,border:"1px solid rgba(236,72,153,.2)",cursor:"pointer",background:"rgba(255,255,255,.03)",color:"rgba(244,114,182,.5)",fontFamily:SANS,fontSize:"0.9rem"}}>
                      Clear
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {lbIdx!==null&&<Lightbox photos={draft.photos!} startIdx={lbIdx} onClose={()=>setLbIdx(null)}/>}
      </AnimatePresence>
    </>
  );
}

/* ─── main calendar ─── */
export default function OurCalendar() {
  /* ── use shared store — no independent fetch ── */
  const { data: calData, loading } = useCalendarData();

  const today = new Date();
  const [year,    setYear]    = useState(today.getFullYear());
  const [month,   setMonth]   = useState(today.getMonth());
  const [selected,   setSelected]  = useState<string|null>(null);
  const [originRect, setOriginRect]= useState<DOMRect|null>(null);
  const [flipDir,    setFlipDir]   = useState<"left"|"right"|null>(null);

  /* Build lookup map from flat array */
  const entries = useMemo(()=>{
    const map:Record<string,CalEntry>={};
    calData.forEach(e=>{map[e.date]=e;});
    return map;
  },[calData]);

  const changeMonth=(dir:"left"|"right")=>{
    setFlipDir(dir);
    setTimeout(()=>{
      if(dir==="left"){if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);}
      else{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);}
      setFlipDir(null);
    },240);
  };

  const openDay=(key:string,e:React.MouseEvent<HTMLButtonElement>)=>{
    setOriginRect(e.currentTarget.getBoundingClientRect());
    setSelected(key);
  };

  const handleSave=useCallback(async(draft:DraftEntry)=>{
    if(!selected) return;
    const payload={...draft,date:selected} as CalEntry;
    await fetch("/api/calendar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    updateCalendarCache(payload);
    setSelected(null);
  },[selected]);

  const handleDelete=useCallback(async()=>{
    if(!selected) return;
    await fetch("/api/calendar",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({date:selected})});
    deleteFromCalendarCache(selected);
    setSelected(null);
  },[selected]);

  const firstDay    = new Date(year,month,1).getDay();
  const daysInMonth = new Date(year,month+1,0).getDate();
  const cells:(number|null)[] = [...Array(firstDay).fill(null),...Array.from({length:daysInMonth},(_,i)=>i+1)];
  while(cells.length%7!==0) cells.push(null);

  const totalMem   = Object.keys(entries).length;
  const specialCnt = Object.values(entries).filter(e=>e.special).length;

  return (
    <section id="calendar" style={{
      position:"relative",width:"100%",
      minHeight:"100vh",
      padding:"clamp(4rem,7vw,6rem) clamp(1rem,3vw,2rem) clamp(4rem,7vw,6rem)",
      /* Soft blush — section 1, lightest in the palette flow */
      background:"linear-gradient(180deg,#fff0f5 0%,#fde8f2 30%,#fad0e8 60%,#f0a8cc 85%,#c9447a 100%)",
      overflow:"hidden",
    }}>
      {/* Floating hearts bg deco */}
      {["💗","🌸","💕","🩷","✨"].map((sym,i)=>(
        <motion.span key={i}
          animate={{y:[-12,12,-12],opacity:[0.12,0.28,0.12],rotate:[-10,10,-10]}}
          transition={{repeat:Infinity,duration:4+i*1.2,delay:i*0.8,ease:"easeInOut"}}
          style={{
            position:"absolute",
            left:`${8+i*18}%`,top:`${15+((i*37)%55)}%`,
            fontSize:`${2+Math.random()*1.5}rem`,
            pointerEvents:"none",userSelect:"none",zIndex:0,
          }}>{sym}</motion.span>
      ))}
      {/* Orbs */}
      {[{l:"5%",t:"8%",c:"rgba(249,168,212,.22)"},{l:"70%",t:"4%",c:"rgba(253,186,213,.18)"},{l:"45%",t:"72%",c:"rgba(244,114,182,.12)"}].map((o,i)=>(
        <motion.div key={i} style={{position:"absolute",left:o.l,top:o.t,width:"clamp(200px,28vw,360px)",height:"clamp(200px,28vw,360px)",borderRadius:"50%",background:o.c,filter:"blur(65px)",pointerEvents:"none",zIndex:0}}
          animate={{scale:[1,1.18,1],opacity:[0.5,0.85,0.5]}} transition={{repeat:Infinity,duration:6+i*2,ease:"easeInOut"}}/>
      ))}

      {/* Section header */}
      <motion.div initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{textAlign:"center",marginBottom:"clamp(2rem,4vw,3.5rem)",position:"relative",zIndex:2}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",marginBottom:"1rem"}}>
          <div style={{width:60,height:1,background:"linear-gradient(90deg,transparent,rgba(190,24,93,.4))"}}/>
          <motion.span style={{fontSize:"1.8rem",filter:"drop-shadow(0 0 8px rgba(190,24,93,.3))"}}
            animate={{scale:[1,1.2,1],rotate:[-5,5,-5]}} transition={{repeat:Infinity,duration:2.5}}>💗</motion.span>
          <div style={{width:60,height:1,background:"linear-gradient(90deg,rgba(190,24,93,.4),transparent)"}}/>
        </div>
        <h2 style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(2rem,5vw,3rem)",color:"#9d174d",margin:"0 0 0.5rem",fontWeight:400,textShadow:"0 2px 16px rgba(190,24,93,.15)"}}>
          our days together
        </h2>
        <p style={{fontFamily:SANS,fontSize:"clamp(0.88rem,2vw,1rem)",color:"rgba(157,23,77,.55)",margin:"0 0 1.2rem",lineHeight:1.6}}>
          every day logged, every moment saved 🌸
        </p>
        <div style={{display:"flex",gap:"0.6rem",justifyContent:"center",flexWrap:"wrap"}}>
          {[
            {label:`${totalMem} memories`,e:"📖"},
            {label:`${specialCnt} special days`,e:"⭐"},
            {label:`Day ${Math.floor((today.getTime()-START.getTime())/86400000)+1} of us`,e:"🌸"},
          ].map((s,i)=>(
            <motion.div key={i} initial={{opacity:0,y:8}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.08}}
              style={{background:"rgba(255,255,255,.6)",border:"1px solid rgba(190,24,93,.2)",borderRadius:30,padding:"0.35rem 1rem",fontFamily:SANS,fontSize:"0.82rem",color:"#9d174d",backdropFilter:"blur(8px)",boxShadow:"0 2px 12px rgba(190,24,93,.08)"}}>
              {s.e} {s.label}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Calendar card — wider, fills viewport properly */}
      <div style={{position:"relative",zIndex:2,maxWidth:780,margin:"0 auto"}}>
        <motion.div
          animate={{rotateY:flipDir==="right"?-12:flipDir==="left"?12:0,scale:flipDir?0.97:1,opacity:flipDir?0.6:1}}
          transition={{duration:0.24,ease:"easeInOut"}}
          style={{
            background:"rgba(255,255,255,.88)",
            backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",
            borderRadius:28,overflow:"hidden",transformStyle:"preserve-3d",perspective:1000,
            boxShadow:"0 16px 70px rgba(190,24,93,.18),0 4px 16px rgba(0,0,0,.06),inset 0 0 0 1.5px rgba(249,168,212,.4)",
          }}
        >
          {/* Dark month header */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1.2rem 1.6rem",background:"linear-gradient(135deg,#2d0f1e,#4a1628)",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",inset:0,backgroundImage:GRAIN,pointerEvents:"none",opacity:0.5}}/>
            <motion.button onClick={()=>changeMonth("left")} whileHover={{scale:1.18,x:-2}} whileTap={{scale:0.9}}
              style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(244,114,182,.18)",cursor:"pointer",width:38,height:38,borderRadius:"50%",color:"#f9a8d4",fontSize:"1.1rem",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",zIndex:1}}>‹</motion.button>

            <div style={{textAlign:"center",position:"relative",zIndex:1}}>
              <AnimatePresence mode="wait">
                <motion.p key={`${year}-${month}`}
                  initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:12}}
                  transition={{duration:0.22}}
                  style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1.2rem,3vw,1.6rem)",color:"#fce7f3",margin:0,fontWeight:400}}>
                  {MONTHS[month]}
                </motion.p>
              </AnimatePresence>
              <p style={{fontFamily:SANS,fontSize:"0.85rem",color:"rgba(252,231,243,.4)",margin:0}}>{year}</p>
            </div>

            <motion.button onClick={()=>changeMonth("right")} whileHover={{scale:1.18,x:2}} whileTap={{scale:0.9}}
              style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(244,114,182,.18)",cursor:"pointer",width:38,height:38,borderRadius:"50%",color:"#f9a8d4",fontSize:"1.1rem",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",zIndex:1}}>›</motion.button>
          </div>

          {/* Day labels */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"1rem 1.4rem 0.4rem",background:"rgba(252,231,243,.08)"}}>
            {DAYS_SHORT.map((d,i)=>(
              <div key={i} style={{textAlign:"center",fontFamily:SANS,fontSize:"0.75rem",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:i===0||i===6?"rgba(236,72,153,.5)":"rgba(157,23,77,.4)",padding:"0.3rem 0"}}>{d}</div>
            ))}
          </div>

          {/* Grid — no per-cell stagger on mobile to avoid lag */}
          <AnimatePresence mode="wait">
            <motion.div key={`${year}-${month}`}
              initial={{opacity:0,x:flipDir==="right"?28:-28}} animate={{opacity:1,x:0}} exit={{opacity:0}}
              transition={{duration:0.24,ease:"easeOut"}}
              style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,padding:"0.4rem 1.4rem 1rem"}}>
              {cells.map((day,i)=>{
                if(!day) return <div key={i}/>;
                const key=toKey(year,month,day);
                const entry=entries[key];
                const isToday=day===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
                const isSpecial=!!entry?.special;
                const hasPhoto=(entry?.photos?.length??0)>0;
                const hasNote=!!entry?.note;
                const inOurTime=new Date(key+"T12:00:00")>=START;
                return (
                  <motion.button key={key} onClick={e=>openDay(key,e)}
                    whileHover={{scale:1.18,zIndex:5}} whileTap={{scale:0.88}}
                    style={{
                      position:"relative",aspectRatio:"1",border:"none",borderRadius:12,cursor:"pointer",
                      background:isSpecial?"linear-gradient(135deg,#fda4af,#ec4899)":isToday?"linear-gradient(135deg,#fce7f3,#f9a8d4)":hasPhoto||hasNote?"rgba(249,168,212,.28)":inOurTime?"rgba(249,168,212,.1)":"transparent",
                      boxShadow:isSpecial?"0 4px 18px rgba(236,72,153,.5)":isToday?"0 2px 14px rgba(244,114,182,.35)":hasPhoto||hasNote?"0 1px 8px rgba(244,114,182,.18)":"none",
                      outline:isToday?"2.5px solid #ec4899":"none",outlineOffset:1,
                      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                      gap:2,padding:"4px",transition:"background 0.2s",
                    }}>
                    <span style={{fontFamily:SANS,fontSize:"clamp(0.82rem,2.2vw,1rem)",color:isSpecial?"#fff":isToday?"#9d174d":inOurTime?"#9d3f68":"#c4a0b0",fontWeight:isToday||isSpecial?700:inOurTime?500:400,lineHeight:1}}>{day}</span>
                    {entry?.mood&&<span style={{fontSize:"clamp(0.45rem,1.2vw,0.58rem)",lineHeight:1}}>{entry.mood}</span>}
                    {isSpecial&&!entry?.mood&&<span style={{fontSize:"0.48rem",lineHeight:1}}>⭐</span>}
                    {hasPhoto&&!isSpecial&&!entry?.mood&&<span style={{fontSize:"0.45rem",lineHeight:1}}>📸</span>}
                    {hasNote&&!hasPhoto&&!isSpecial&&!entry?.mood&&<div style={{width:3,height:3,borderRadius:"50%",background:"#f472b6"}}/>}
                  </motion.button>
                );
              })}
            </motion.div>
          </AnimatePresence>

          {/* Legend */}
          <div style={{display:"flex",gap:"1rem",flexWrap:"wrap",justifyContent:"center",padding:"1rem 1.5rem 1.5rem",borderTop:"1px solid rgba(249,168,212,.18)",fontFamily:SANS,fontSize:"0.82rem",color:"rgba(157,23,77,.5)"}}>
            <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:12,height:12,borderRadius:3,background:"linear-gradient(135deg,#fda4af,#ec4899)"}}/> special</span>
            <span style={{display:"flex",alignItems:"center",gap:4}}>📸 photo</span>
            <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:5,height:5,borderRadius:"50%",background:"#f472b6"}}/> note</span>
            <span style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:12,height:12,borderRadius:3,outline:"2.5px solid #ec4899",outlineOffset:1}}/> today</span>
          </div>
        </motion.div>
      </div>

      {/* Loading */}
      {loading&&(
        <div style={{position:"absolute",inset:0,zIndex:10,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,245,249,.8)",backdropFilter:"blur(6px)"}}>
          <motion.div animate={{scale:[1,1.2,1]}} transition={{repeat:Infinity,duration:1.2}} style={{fontSize:"2rem"}}>💗</motion.div>
        </div>
      )}

      {/* Day portal */}
      <AnimatePresence>
        {selected&&(
          <DayView key={selected} dateKey={selected}
            entry={entries[selected]??{date:selected,note:"",photos:[],special:false,specialLabel:"",mood:""}}
            originRect={originRect} onClose={()=>setSelected(null)} onSave={handleSave} onDelete={handleDelete}/>
        )}
      </AnimatePresence>
    </section>
  );
}