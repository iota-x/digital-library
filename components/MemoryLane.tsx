"use client";
import { useState, useRef, useMemo, useCallback, useEffect, Fragment, memo } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";
import Image from "next/image";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useCalendarData } from "@/lib/calendarStore";
import SectionSkeleton from "@/components/SectionSkeleton";

/* ─── fonts / palette ─── */
const SERIF  = `"Georgia","Times New Roman",serif`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
const SCRIPT = `var(--font-caveat),"Caveat",cursive`;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
// TODO: replace hardcoded start date with dynamic value from userStore.getStartDate()
const START  = new Date("2026-03-11");
const PINK   = "var(--pink-deep)";
const CARD_W = 264;

/* scatter positions as % of available horizontal space */
const SCATTER = [3, 54, 27, 62, 10, 44, 68, 6, 38, 18, 58, 1, 46, 31, 64, 13, 50, 72, 22, 56, 8, 42];

/* falling petals — pre-computed */
const PETALS = Array.from({length:30},(_,i)=>({
  left:`${(i*6.7+4)%100}%`,
  emoji:["🌸","💗","🌷","✨","🌺","💕"][i%6],
  size:`${0.85+(i%4)*0.22}rem`,
  dur:`${7+(i*0.9)%5}s`,
  del:`${(i*0.55)%8}s`,
  initRot:(i*43)%360,
}));

/* ─── helpers ─── */
function dayNum(k:string){ return Math.floor((new Date(k+"T12:00:00").getTime()-START.getTime())/86400000)+1; }
function fmtDate(k:string){ const d=new Date(k+"T12:00:00"); return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; }
function mLabel(k:string){ const d=new Date(k+"T12:00:00"); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
function yLabel(k:string){ return new Date(k+"T12:00:00").getFullYear().toString(); }
function isVid(s:string){ return /\.(mp4|mov|webm)$/i.test(s); }
import { cldImg, cldThumb } from "@/lib/cldImg";
const cldHero = (src:string, w=520) => cldImg(src, { w, videoFrame: true });
const cldSq   = (src:string, w=140) => cldThumb(src, w);
function getX(i:number,cW:number){ return Math.round((SCATTER[i%SCATTER.length]/100)*Math.max(0,cW-CARD_W)); }

/* cubic bezier value at t */
function bez(x1:number,y1:number,cx1:number,cy1:number,cx2:number,cy2:number,x2:number,y2:number,t:number){
  const m=1-t;
  return { x:m*m*m*x1+3*m*m*t*cx1+3*m*t*t*cx2+t*t*t*x2, y:m*m*m*y1+3*m*m*t*cy1+3*m*t*t*cy2+t*t*t*y2 };
}

type Entry = ReturnType<typeof useCalendarData>["data"][0];
type Sort   = "asc"|"desc";
type Group  = "none"|"month"|"year";
type Filter = "all"|"special"|"photos"|"video"|string;

/* ─── Lightbox ─── */
function Lightbox({ srcs,start,onClose }:{ srcs:string[]; start:number; onClose:()=>void }) {
  const [i,setI]=useState(start);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{ const h=(e:KeyboardEvent)=>{ if(e.key==="Escape")onClose(); if(e.key==="ArrowLeft")setI(x=>(x-1+srcs.length)%srcs.length); if(e.key==="ArrowRight")setI(x=>(x+1)%srcs.length); }; window.addEventListener("keydown",h); return()=>window.removeEventListener("keydown",h); },[srcs.length,onClose]);
  useFocusTrap(dialogRef, { active: true, onEscape: onClose });
  const src=srcs[i];
  return (
    <motion.div ref={dialogRef} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}
      role="dialog" aria-modal="true" aria-label="photo viewer"
      style={{position:"fixed",inset:0,zIndex:9500,background:"rgba(0,0,0,.96)",display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      {isVid(src)?<video src={src} controls autoPlay playsInline onClick={e=>e.stopPropagation()} style={{maxWidth:"96vw",maxHeight:"90vh",borderRadius:8,display:"block",objectFit:"contain"}}/>
        :<motion.img src={src} alt={`Photo ${i + 1} of ${srcs.length}`} initial={{scale:.9}} animate={{scale:1}} onClick={e=>e.stopPropagation()} style={{maxWidth:"96vw",maxHeight:"90vh",objectFit:"contain",borderRadius:8,display:"block"}}/>}
      {srcs.length>1&&<>
        <button onClick={e=>{e.stopPropagation();setI(x=>(x-1+srcs.length)%srcs.length);}} aria-label="previous photo" style={{position:"absolute",left:"1rem",top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.25)",borderRadius:"50%",width:44,height:44,color:"#fff",cursor:"pointer",fontSize:"1.3rem",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
        <button onClick={e=>{e.stopPropagation();setI(x=>(x+1)%srcs.length);}} aria-label="next photo" style={{position:"absolute",right:"1rem",top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.25)",borderRadius:"50%",width:44,height:44,color:"#fff",cursor:"pointer",fontSize:"1.3rem",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
        <div style={{position:"absolute",bottom:"1.2rem",left:"50%",transform:"translateX(-50%)",display:"flex",gap:6}}>
          {srcs.map((_,j)=><button key={j} onClick={e=>{e.stopPropagation();setI(j);}} aria-label={`go to photo ${j + 1}`} style={{width:j===i?10:6,height:j===i?10:6,borderRadius:"50%",border:"none",background:j===i?"var(--pink-deep)":"rgba(var(--pink-rgb),.4)",cursor:"pointer",transition:"all .2s",padding:0}}/>)}
        </div>
      </>}
      <button onClick={onClose} aria-label="close photo viewer" style={{position:"absolute",top:"1rem",right:"1rem",background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.25)",borderRadius:"50%",width:36,height:36,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
    </motion.div>
  );
}

/* ─── airplane trail — desktop only ─── */
function Trail({ prevX, currX, trailIdx }:{ prevX:number; currX:number; trailIdx:number }) {
  const H = 88;
  const x1 = prevX + CARD_W/2;
  const x2 = currX + CARD_W/2;
  const cy1 = H * 0.55, cy2 = H * 0.45;
  const pathStr = `M ${x1} 0 C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${H}`;

  const kfs = [0,.15,.3,.5,.65,.8,1].map(t=>bez(x1,0,x1,cy1,x2,cy2,x2,H,t));
  const kx = kfs.map(p=>p.x-10);
  const ky = kfs.map(p=>p.y-10);

  const mid0=bez(x1,0,x1,cy1,x2,cy2,x2,H,.48);
  const mid1=bez(x1,0,x1,cy1,x2,cy2,x2,H,.52);
  const angle=Math.atan2(mid1.y-mid0.y,mid1.x-mid0.x)*180/Math.PI+45;

  const del = (trailIdx*0.4)%2.2;

  return (
    <div style={{position:"relative",height:H,width:"100%",pointerEvents:"none",flexShrink:0}}>
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",overflow:"visible"}}>
        <motion.path d={pathStr} stroke="rgba(var(--pink-rgb),.25)" strokeWidth={6} fill="none" strokeLinecap="round"
          initial={{pathLength:0}} whileInView={{pathLength:1}} viewport={{once:true,margin:"-10px"}}
          transition={{duration:1.4,ease:"easeOut"}}/>
        <motion.path d={pathStr} stroke="rgba(var(--pink-deep-rgb),.45)" strokeWidth={2} strokeDasharray="8 5" fill="none" strokeLinecap="round"
          initial={{pathLength:0}} whileInView={{pathLength:1}} viewport={{once:true,margin:"-10px"}}
          transition={{duration:1.4,ease:"easeOut",delay:.1}}/>
      </svg>
      <motion.div
        style={{position:"absolute",top:0,left:0,fontSize:"1.1rem",lineHeight:1,rotate:`${angle}deg`,filter:"drop-shadow(0 2px 6px rgba(var(--pink-deep-rgb),.5))",zIndex:2}}
        animate={{x:kx,y:ky}}
        transition={{duration:2.4,repeat:Infinity,ease:"linear",delay:del,repeatDelay:0.8}}
      >✈️</motion.div>
    </div>
  );
}

/* ─── simple divider — mobile trail replacement ─── */
function TrailMobile() {
  return (
    <div style={{width:"100%",height:18,display:"flex",alignItems:"center",padding:"0 16px"}}>
      <div style={{flex:1,height:1,borderTop:"1px dashed rgba(var(--pink-deep-rgb),.18)"}}/>
    </div>
  );
}

/* ─── bottom-sheet detail view ─── */
function MemoryDetail({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [lb, setLb]             = useState<number|null>(null);
  const photos = entry.photos ?? [];
  const note   = entry.note || '';
  const pinned = entry.pinnedNote || '';
  const dn     = dayNum(entry.date);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     { onClose(); return; }
      if (e.key === 'ArrowLeft')  setPhotoIdx(i => (i - 1 + photos.length) % photos.length);
      if (e.key === 'ArrowRight') setPhotoIdx(i => (i + 1) % photos.length);
    };
    window.addEventListener('keydown', h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = prev; };
  }, [photos.length, onClose]);

  return (
    <>
      <motion.div
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.22}}
        onClick={onClose}
        style={{position:'fixed',inset:0,zIndex:8000,background:'rgba(4,0,2,.72)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)'}}
      />
      <motion.div
        initial={{y:'100%'}}
        animate={{y:0}}
        exit={{y:'100%'}}
        transition={{type:'spring',stiffness:340,damping:38,mass:0.85}}
        onClick={e=>e.stopPropagation()}
        style={{
          position:'fixed', bottom:0, left:0, right:0, zIndex:8001,
          maxWidth:660, margin:'0 auto',
          maxHeight:'92vh', overflowY:'auto', overflowX:'hidden',
          scrollbarWidth:'none' as const,
          background:'linear-gradient(165deg,var(--rose) 0%,var(--pink-light) 60%,var(--rose) 100%)',
          borderRadius:'26px 26px 0 0',
          boxShadow:'0 -8px 60px rgba(var(--pink-deep-rgb),.18),0 -2px 0 rgba(var(--pink-rgb),.25),0 -40px 100px rgba(0,0,0,.28)',
        }}
      >
        {/* drag handle */}
        <div style={{display:'flex',justifyContent:'center',paddingTop:'0.75rem',paddingBottom:'0.2rem',cursor:'pointer'}} onClick={onClose}>
          <motion.div whileHover={{scaleX:1.3,background:'rgba(var(--pink-deep-rgb),.4)'}} transition={{duration:0.2}}
            style={{width:44,height:5,borderRadius:99,background:'rgba(var(--pink-deep-rgb),.22)'}}/>
        </div>

        {/* header */}
        <div style={{padding:'0.55rem 1.5rem 0.85rem',borderBottom:'1px solid rgba(var(--pink-rgb),.12)'}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'0.8rem'}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.42rem',flexWrap:'wrap',marginBottom:'0.2rem'}}>
                <span style={{fontFamily:SCRIPT,fontSize:'1.1rem',color:PINK,fontWeight:600,lineHeight:1}}>Day {dn}</span>
                {entry.mood&&<span style={{fontSize:'1.1rem',lineHeight:1}}>{entry.mood}</span>}
                {entry.special&&(
                  <span style={{fontFamily:SANS,fontSize:'0.58rem',background:'linear-gradient(135deg,var(--pink),var(--pink-deep))',color:'#fff',borderRadius:20,padding:'0.12rem 0.55rem',fontWeight:700}}>
                    ✨ {entry.specialLabel||'special moment'}
                  </span>
                )}
              </div>
              <p style={{fontFamily:SERIF,fontStyle:'italic',fontSize:'0.82rem',color:'var(--muted)',margin:0}}>
                {fmtDate(entry.date)}
              </p>
            </div>
            <motion.button onClick={onClose} whileHover={{scale:1.1,rotate:90}} whileTap={{scale:0.9}}
              transition={{type:'spring',stiffness:300,damping:20}}
              style={{flexShrink:0,width:32,height:32,borderRadius:'50%',border:'1px solid rgba(var(--pink-rgb),.4)',background:'rgba(var(--pink-rgb),.18)',color:PINK,cursor:'pointer',fontSize:'0.82rem',display:'flex',alignItems:'center',justifyContent:'center'}}>
              ✕
            </motion.button>
          </div>
        </div>

        {/* photo gallery — respects native portrait/landscape aspect */}
        {photos.length > 0 && (
          <div style={{
            position: 'relative',
            background: '#0a0003',
            // Backdrop: blurred copy of current photo so portraits feel intentional, not "letterboxed"
            backgroundImage: `url(${cldHero(photos[photoIdx], 80)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}>
            {/* Dim overlay over the blurred backdrop so the photo pops */}
            <div aria-hidden style={{
              position: 'absolute', inset: 0,
              backdropFilter: 'blur(28px) brightness(.45)',
              WebkitBackdropFilter: 'blur(28px) brightness(.45)',
              pointerEvents: 'none',
            }}/>
            <AnimatePresence mode='wait'>
              <motion.div key={photoIdx}
                initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}
                transition={{duration:0.2,ease:'easeOut'}}
                onClick={()=>setLb(photoIdx)}
                style={{
                  cursor:'pointer', position:'relative',
                  width: '100%',
                  // Cap height so portrait shots don't push the modal too tall;
                  // the photo inside uses object-fit:contain so nothing is cropped
                  minHeight: 220,
                  maxHeight: 'min(72vh, 640px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0.5rem',
                }}
                role="img" aria-label={`Photo ${photoIdx + 1} of ${photos.length} — tap to view full size`}>
                <img
                  src={cldHero(photos[photoIdx], 1100)}
                  alt=""
                  loading="eager"
                  decoding="async"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto', height: 'auto',
                    objectFit: 'contain' as const,
                    display: 'block',
                    borderRadius: 6,
                    boxShadow: '0 8px 30px rgba(0,0,0,.5)',
                    background: '#0a0003',
                  }}
                />
                {isVid(photos[photoIdx])&&(
                  <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                    <div style={{width:60,height:60,borderRadius:'50%',background:'rgba(0,0,0,.55)',backdropFilter:'blur(6px)',border:'2px solid rgba(255,255,255,.45)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem'}}>▶</div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
            {photos.length > 1 && (
              <>
                <button onClick={()=>setPhotoIdx(i=>(i-1+photos.length)%photos.length)}
                  aria-label="previous photo"
                  style={{position:'absolute',left:'0.7rem',top:'50%',transform:'translateY(-50%)',background:'rgba(0,0,0,.55)',backdropFilter:'blur(4px)',border:'1px solid rgba(255,255,255,.2)',borderRadius:'50%',width:36,height:36,color:'#fff',cursor:'pointer',fontSize:'1.1rem',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}}>‹</button>
                <button onClick={()=>setPhotoIdx(i=>(i+1)%photos.length)}
                  aria-label="next photo"
                  style={{position:'absolute',right:'0.7rem',top:'50%',transform:'translateY(-50%)',background:'rgba(0,0,0,.55)',backdropFilter:'blur(4px)',border:'1px solid rgba(255,255,255,.2)',borderRadius:'50%',width:36,height:36,color:'#fff',cursor:'pointer',fontSize:'1.1rem',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2}}>›</button>
                <div style={{position:'absolute',bottom:'0.55rem',left:'50%',transform:'translateX(-50%)',display:'flex',gap:5,zIndex:2}}>
                  {photos.map((_,i)=>(
                    <button key={i} onClick={()=>setPhotoIdx(i)}
                      aria-label={`go to photo ${i + 1}`}
                      style={{width:i===photoIdx?18:6,height:6,borderRadius:3,border:'none',background:i===photoIdx?'#fff':'rgba(255,255,255,.45)',cursor:'pointer',transition:'all .22s',padding:0}}/>
                  ))}
                </div>
                <div style={{position:'absolute',top:'0.55rem',right:'0.7rem',background:'rgba(0,0,0,.55)',backdropFilter:'blur(4px)',borderRadius:10,padding:'2px 8px',fontFamily:SANS,fontSize:'0.56rem',color:'rgba(255,255,255,.85)',border:'1px solid rgba(255,255,255,.18)',pointerEvents:'none'}}>
                  tap · full screen
                </div>
              </>
            )}
            {photos.length > 1 && (
              <div style={{display:'flex',gap:2,padding:'2px'}}>
                {photos.map((p,i)=>(
                  <div key={i} onClick={()=>setPhotoIdx(i)}
                    style={{flex:1,aspectRatio:'1',overflow:'hidden',cursor:'pointer',maxHeight:48,position:'relative',background:'#0d0005',outline:i===photoIdx?'2px solid rgba(var(--pink-rgb),.75)':'2px solid transparent',outlineOffset:-2,transition:'outline .18s'}}>
                    <Image src={cldSq(p,96)} alt="" fill sizes="48px" unoptimized style={{objectFit:'cover',opacity:i===photoIdx?1:.55,transition:'opacity .18s'}}/>
                    {isVid(p)&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.25)',fontSize:'0.65rem'}}>▶</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* note */}
        {(note || pinned) && (
          <div style={{padding:'1.5rem 1.6rem 2.4rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:'0.8rem',marginBottom:'1.3rem'}}>
              <div style={{flex:1,height:1,background:'linear-gradient(90deg,rgba(var(--pink-deep-rgb),.18),transparent)'}}/>
              <motion.span animate={{rotate:[-5,5,-5]}} transition={{repeat:Infinity,duration:2.8}} style={{fontSize:'1.1rem'}}>💌</motion.span>
              <div style={{flex:1,height:1,background:'linear-gradient(270deg,rgba(var(--pink-deep-rgb),.18),transparent)'}}/>
            </div>
            {pinned && pinned !== note && (
              <div style={{background:'rgba(var(--pink-rgb),.12)',border:'1px solid rgba(var(--pink-rgb),.28)',borderRadius:14,padding:'0.9rem 1.1rem',marginBottom:'1.2rem'}}>
                <p style={{fontFamily:SANS,fontSize:'0.56rem',color:'var(--muted)',letterSpacing:'0.14em',textTransform:'uppercase',margin:'0 0 0.3rem'}}>📌 pinned</p>
                <p style={{fontFamily:SCRIPT,fontSize:'1.1rem',color:'var(--text)',lineHeight:1.75,margin:0,fontStyle:'italic'}}>{pinned}</p>
              </div>
            )}
            {note && (
              <p style={{fontFamily:SERIF,fontStyle:'italic',fontSize:'clamp(1rem,2.5vw,1.12rem)',color:'var(--text)',lineHeight:2.0,margin:0,whiteSpace:'pre-wrap'}}>
                {note}
              </p>
            )}
            <div style={{display:'flex',alignItems:'center',gap:'0.8rem',marginTop:'1.6rem'}}>
              <div style={{flex:1,height:1,background:'linear-gradient(90deg,rgba(var(--pink-rgb),.3),transparent)'}}/>
              <span style={{fontFamily:SCRIPT,fontSize:'0.95rem',color:'var(--muted)'}}>— with love 🩷</span>
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {lb !== null && <Lightbox srcs={photos} start={lb} onClose={()=>setLb(null)}/>}
      </AnimatePresence>
    </>
  );
}

/* ─── polaroid-style photo card ─── */
const MemCard = memo(function MemCard({ entry,cardIdx,glow,onOpen,setRef,isMobile }:{ entry:Entry; cardIdx:number; glow:boolean; onOpen:()=>void; setRef:(el:HTMLDivElement|null)=>void; isMobile:boolean }) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const inView   = useInView(wrapRef,{once:true,margin:"-30px"});
  const [hovered,setHovered] = useState(false);
  const photos   = entry.photos ?? [];
  const note     = entry.pinnedNote || entry.note || "";
  const dn       = dayNum(entry.date);
  const hasPhoto = photos.length > 0;
  const tilt     = [2.2,-1.8,1.2,-2.6,0.8,-1.4,2.8,-0.6,1.6,-2.2][cardIdx%10];

  const baseShadow = glow
    ? "0 0 0 3px #fde68a,0 16px 50px rgba(245,158,11,.3),0 4px 14px rgba(0,0,0,.18)"
    : "0 10px 40px rgba(0,0,0,.18),0 2px 8px rgba(var(--pink-deep-rgb),.1)";
  const hoverShadow = glow
    ? "0 0 0 4px #fde68a,0 0 32px rgba(245,158,11,.55),0 0 60px rgba(245,158,11,.2),0 28px 70px rgba(0,0,0,.32)"
    : "0 0 0 1.5px rgba(var(--pink-rgb),.55),0 0 22px rgba(var(--pink-rgb),.6),0 0 50px rgba(var(--pink-deep-rgb),.3),0 0 90px rgba(var(--pink-deep-rgb),.14),0 28px 70px rgba(0,0,0,.28)";

  return (
    <div ref={el=>{(wrapRef as any).current=el; setRef(el);}}>
      <motion.div
        initial={{opacity:0,y:40,rotate:tilt,scale:0.88}}
        animate={inView?{opacity:1,y:0,rotate:tilt,scale:1}:{opacity:0,y:40,rotate:tilt,scale:0.88}}
        whileHover={isMobile?{}:{scale:1.035,rotate:0,y:-10}}
        onHoverStart={()=>!isMobile&&setHovered(true)}
        onHoverEnd={()=>!isMobile&&setHovered(false)}
        onClick={onOpen}
        transition={{type:"spring",stiffness:200,damping:22,boxShadow:{duration:0.28,ease:"easeOut"}}}
        style={{
          width:CARD_W,
          background:hasPhoto?"#fff":"#fffaf8",
          boxShadow:hovered?hoverShadow:baseShadow,
          borderRadius:hasPhoto?4:14,
          overflow:"hidden",
          padding:hasPhoto?"8px 8px 0":"0",
          cursor:"pointer",
          border:`1.5px solid ${glow?"#f59e0b":hovered?"rgba(var(--pink-rgb),.45)":"rgba(var(--pink-deep-rgb),.08)"}`,
          position:"relative",
          userSelect:"none" as const,
          transition:"box-shadow .28s ease,border .28s ease",
        }}
      >
        {/* shimmer sweep — desktop hover only */}
        {!isMobile && (
          <motion.div
            animate={hovered?{x:"220%"}:{x:"-120%"}}
            transition={{duration:0.55,ease:"easeInOut"}}
            style={{position:"absolute",inset:0,background:"linear-gradient(105deg,transparent 35%,rgba(255,255,255,.42) 50%,transparent 65%)",zIndex:6,pointerEvents:"none",borderRadius:"inherit"}}
          />
        )}

        {/* remember this badge */}
        {glow&&(
          <motion.div initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}}
            style={{position:"absolute",top:-11,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(135deg,#fde68a,#f59e0b)",color:"#78350f",fontFamily:SANS,fontSize:"0.6rem",fontWeight:700,borderRadius:20,padding:"0.2rem 0.7rem",zIndex:7,boxShadow:"0 2px 14px rgba(245,158,11,.55)",whiteSpace:"nowrap",letterSpacing:"0.04em"}}>
            ✨ remember this?
          </motion.div>
        )}

        {/* ── photo card ── */}
        {hasPhoto && (
          <>
            <div style={{position:"relative",overflow:"hidden",borderRadius:1,background:"#0d0005",height:220}}>
              <Image
                src={cldHero(photos[0])} alt=""
                fill sizes="264px" unoptimized
                priority={cardIdx<6}
                style={{objectFit:"cover",objectPosition:"center top",transform:hovered?"scale(1.05)":"scale(1)",transition:"transform 0.45s ease"}}
              />
              {isVid(photos[0])&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.18)"}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(255,255,255,.2)",backdropFilter:"blur(4px)",border:"1.5px solid rgba(255,255,255,.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem"}}>▶</div>
              </div>}
              {photos.length>1&&<div style={{position:"absolute",top:7,right:7,background:"rgba(0,0,0,.52)",backdropFilter:"blur(6px)",borderRadius:20,padding:"3px 8px",color:"#fff",fontFamily:SANS,fontSize:"0.58rem",fontWeight:700,border:"1px solid rgba(255,255,255,.18)"}}>+{photos.length-1}</div>}
            </div>

            {/* thumb strip */}
            {photos.length > 1 && (
              <div style={{display:"flex",gap:1.5,padding:"2px 0 0",background:"rgba(0,0,0,.04)"}}>
                {photos.slice(1,5).map((p,ti)=>{
                  const isLast=ti===Math.min(photos.length-2,3)&&photos.length>5;
                  return (
                    <div key={ti} style={{flex:1,aspectRatio:"1",overflow:"hidden",position:"relative",maxHeight:52,background:"#0d0005"}}>
                      <Image src={cldSq(p,110)} alt="" fill sizes="52px" unoptimized style={{objectFit:"cover"}}/>
                      {isVid(p)&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.28)",fontSize:"0.65rem"}}>▶</div>}
                      {isLast&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.58)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <span style={{color:"#fff",fontFamily:SANS,fontSize:"0.68rem",fontWeight:700}}>+{photos.length-4}</span>
                      </div>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* caption strip */}
            <div style={{padding:"7px 10px 12px",background:"#fff",position:"relative"}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.35rem",flexWrap:"wrap",marginBottom:"2px"}}>
                <span style={{fontFamily:SCRIPT,fontSize:"0.92rem",color:PINK,fontWeight:600}}>Day {dn}</span>
                {entry.mood&&<span style={{fontSize:"0.84rem"}}>{entry.mood}</span>}
                {entry.special&&<span style={{fontFamily:SANS,fontSize:"0.52rem",background:"linear-gradient(135deg,var(--pink),var(--pink-deep))",color:"#fff",borderRadius:20,padding:"0.1rem 0.42rem",fontWeight:700}}>✨ {entry.specialLabel||"special"}</span>}
              </div>
              {note&&<p style={{fontFamily:SCRIPT,fontSize:"0.94rem",color:"#4a1628",lineHeight:1.45,margin:"2px 0 4px",overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" as const,position:"relative"}}>
                {note}
                {note.length>90&&<span style={{position:"absolute",bottom:0,right:0,width:"3rem",background:"linear-gradient(90deg,transparent,#fff)"}}/>}
              </p>}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <p style={{fontFamily:SANS,fontSize:"0.56rem",color:"rgba(var(--pink-deep-rgb),.32)",margin:0,letterSpacing:"0.05em"}}>{fmtDate(entry.date)}</p>
                <motion.span animate={hovered?{x:3,opacity:1}:{x:0,opacity:.5}} transition={{duration:0.2}}
                  style={{fontFamily:SANS,fontSize:"0.56rem",color:"rgba(var(--pink-deep-rgb),.5)",letterSpacing:"0.04em",display:"flex",alignItems:"center",gap:2}}>
                  open →
                </motion.span>
              </div>
            </div>
          </>
        )}

        {/* ── text-only note card ── */}
        {!hasPhoto && (
          <div style={{
            padding:"1.15rem 1.1rem 1.1rem",
            backgroundImage:"repeating-linear-gradient(transparent,transparent 25px,rgba(var(--pink-deep-rgb),.065) 25px,rgba(var(--pink-deep-rgb),.065) 26px)",
            borderLeft:"3px solid rgba(var(--pink-rgb),.65)",
            position:"relative",
            minHeight:120,
          }}>
            <div style={{position:"absolute",top:9,right:9,background:"rgba(var(--pink-light-rgb),.85)",backdropFilter:"blur(4px)",borderRadius:8,padding:"2px 7px",fontFamily:SCRIPT,fontSize:"0.76rem",color:PINK,border:"1px solid rgba(var(--pink-rgb),.4)",lineHeight:1.3}}>
              {entry.mood||"💗"} Day {dn}
            </div>
            {entry.special&&<span style={{display:"inline-block",fontFamily:SANS,fontSize:"0.52rem",background:"linear-gradient(135deg,var(--pink),var(--pink-deep))",color:"#fff",borderRadius:20,padding:"0.1rem 0.45rem",fontWeight:700,marginBottom:"0.45rem"}}>✨ {entry.specialLabel||"special"}</span>}
            {note&&<p style={{fontFamily:SCRIPT,fontSize:"1.02rem",color:"#4a1628",lineHeight:1.82,margin:"0 0 0.55rem",overflow:"hidden",display:"-webkit-box",WebkitLineClamp:4,WebkitBoxOrient:"vertical" as const,paddingRight:"2.2rem"}}>
              {note}
            </p>}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <p style={{fontFamily:SANS,fontSize:"0.56rem",color:"rgba(var(--pink-deep-rgb),.3)",margin:0,letterSpacing:"0.05em"}}>{fmtDate(entry.date)}</p>
              {note.length>100&&(
                <motion.span animate={hovered?{x:3,opacity:1}:{x:0,opacity:.45}} transition={{duration:0.2}}
                  style={{fontFamily:SANS,fontSize:"0.56rem",color:"rgba(var(--pink-deep-rgb),.5)",letterSpacing:"0.04em"}}>
                  open →
                </motion.span>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
});

/* ─── filter pill ─── */
function Pill({ label,active,onClick,isMobile }:{ label:string; active:boolean; onClick:()=>void; isMobile?:boolean }) {
  return (
    <motion.button onClick={onClick}
      whileHover={isMobile ? undefined : {scale:1.06}}
      whileTap={{scale:0.93}}
      style={{flexShrink:0,padding:"0.34rem 0.88rem",borderRadius:50,cursor:"pointer",
        background:active?"linear-gradient(135deg,var(--pink),var(--pink-deep))":"rgba(var(--pink-rgb),.14)",
        color:active?"#fff":"var(--text)",
        fontFamily:SANS,fontSize:"0.75rem",fontWeight:active?700:500,
        border:active?"1.5px solid transparent":"1px solid rgba(var(--pink-rgb),.3)",
        boxShadow:active?"0 3px 16px rgba(var(--pink-deep-rgb),.32)":"0 1px 6px rgba(var(--pink-deep-rgb),.05)"}}>
      {label}
    </motion.button>
  );
}

/* ─── group divider ─── */
function GroupDivider({ label }:{ label:string }) {
  return (
    <motion.div initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true,margin:"-20px"}}
      style={{display:"flex",alignItems:"center",gap:"0.9rem",padding:"1.5rem 0 0.5rem",width:"100%"}}>
      <motion.span animate={{x:[0,8,0],rotate:[0,16,0]}} transition={{repeat:Infinity,duration:3.5,ease:"easeInOut"}}
        style={{fontSize:"1.3rem",flexShrink:0,filter:"drop-shadow(0 1px 6px rgba(var(--pink-deep-rgb),.4))"}}>✈️</motion.span>
      <div style={{flex:1,height:2,backgroundImage:"repeating-linear-gradient(90deg,rgba(var(--pink-deep-rgb),.28) 0,rgba(var(--pink-deep-rgb),.28) 7px,transparent 7px,transparent 16px)",borderRadius:2}}/>
      <span style={{fontFamily:SCRIPT,fontSize:"1.25rem",color:PINK,opacity:.72,whiteSpace:"nowrap",letterSpacing:"0.02em"}}>{label}</span>
      <div style={{flex:1,height:2,backgroundImage:"repeating-linear-gradient(270deg,rgba(var(--pink-deep-rgb),.28) 0,rgba(var(--pink-deep-rgb),.28) 7px,transparent 7px,transparent 16px)",borderRadius:2}}/>
    </motion.div>
  );
}

/* ─── main ─── */
export default function MemoryLane() {
  const { data, loading } = useCalendarData();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs     = useRef<(HTMLDivElement|null)[]>([]);
  const [containerW, setContainerW] = useState(800);
  const [glowIdx,    setGlowIdx]    = useState<number|null>(null);
  const [spinning,   setSpinning]   = useState(false);
  const [sort,       setSort]       = useState<Sort>("asc");
  const [group,      setGroup]      = useState<Group>("month");
  const [filter,     setFilter]     = useState<Filter>("all");
  const [activeEntry,setActiveEntry]= useState<Entry|null>(null);
  const [isMobile,   setIsMobile]   = useState(false);

  useEffect(()=>{
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  },[]);

  useEffect(()=>{
    const update=()=>{ if(containerRef.current) setContainerW(containerRef.current.offsetWidth); };
    update();
    const ro=new ResizeObserver(update);
    if(containerRef.current) ro.observe(containerRef.current);
    return ()=>ro.disconnect();
  },[]);

  const entries=useMemo(()=>{
    const wc=data.filter(e=>e.note||(e.photos?.length??0)>0);
    const f=wc.filter(e=>{
      if(filter==="special") return!!e.special;
      if(filter==="photos")  return(e.photos?.length??0)>0;
      if(filter==="video")   return e.photos?.some(isVid);
      if(filter.startsWith("mood:")) return e.mood===filter.slice(5);
      return true;
    });
    return [...f].sort((a,b)=>sort==="asc"?a.date.localeCompare(b.date):b.date.localeCompare(a.date));
  },[data,sort,filter]);

  const moods=useMemo(()=>{const s=new Set<string>(); data.forEach(e=>{if(e.mood)s.add(e.mood);}); return[...s];},[data]);
  const totalPhotos=useMemo(()=>entries.reduce((s,e)=>s+(e.photos?.length??0),0),[entries]);

  type Section={ label?:string; start:number; entries:Entry[] };
  const sections=useMemo(()=>{
    if(group==="none") return [{entries,start:0}] as Section[];
    const groups:{label:string;entries:Entry[]}[]=[];
    for(const e of entries){
      const lbl=group==="month"?mLabel(e.date):yLabel(e.date);
      const last=groups[groups.length-1];
      if(!last||last.label!==lbl) groups.push({label:lbl,entries:[e]});
      else last.entries.push(e);
    }
    let ci=0;
    return groups.map(g=>{ const s={label:g.label,entries:g.entries,start:ci}; ci+=g.entries.length; return s; });
  },[entries,group]);

  const surprise=useCallback(()=>{
    if(!entries.length||spinning) return;
    setSpinning(true); setGlowIdx(null);
    const idx=Math.floor(Math.random()*entries.length);
    setTimeout(()=>{
      setGlowIdx(idx); setSpinning(false);
      cardRefs.current[idx]?.scrollIntoView({behavior:"smooth",block:"center"});
      setTimeout(()=>setGlowIdx(null),3500);
    },300);
  },[entries.length,spinning]);

  if(loading) return <SectionSkeleton bg="linear-gradient(160deg,var(--rose),var(--pink-light))" accent="rgba(var(--pink-deep-rgb),.12)" lines={5}/>;

  return (
    <section style={{width:"100%",minHeight:"100vh",background:"linear-gradient(155deg,var(--rose) 0%,var(--pink-light) 35%,var(--pink-light) 65%,var(--rose) 100%)",padding:"clamp(3rem,7vh,5rem) clamp(1rem,4vw,2.5rem) 7rem",position:"relative",overflow:"hidden"}}>

      {/* ── Falling petals — desktop only ── */}
      {!isMobile && PETALS.map((p,i)=>(
        <motion.div key={i}
          initial={{y:"-10vh", x:0, rotate:p.initRot, opacity:0}}
          animate={{y:"110vh", x:[0,18,-14,22,-8,0], rotate:p.initRot+360, opacity:[0,.9,.9,.9,.9,0]}}
          transition={{duration:parseFloat(p.dur),repeat:Infinity,ease:"linear",delay:parseFloat(p.del)}}
          style={{position:"fixed",left:p.left,top:0,fontSize:p.size,pointerEvents:"none",zIndex:0}}>
          {p.emoji}
        </motion.div>
      ))}

      {/* ── Gradient orbs — desktop only ── */}
      {!isMobile && <>
        <motion.div animate={{scale:[1,1.12,1],opacity:[.55,.75,.55]}} transition={{duration:8,repeat:Infinity,ease:"easeInOut"}}
          style={{position:"fixed",top:"-15%",left:"-10%",width:520,height:520,borderRadius:"50%",background:"radial-gradient(circle,rgba(var(--pink-rgb),.55) 0%,transparent 68%)",filter:"blur(50px)",pointerEvents:"none",zIndex:0}}/>
        <motion.div animate={{scale:[1,1.08,1],opacity:[.45,.65,.45]}} transition={{duration:11,repeat:Infinity,ease:"easeInOut",delay:3}}
          style={{position:"fixed",bottom:"-10%",right:"-8%",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(var(--pink-rgb),.4) 0%,transparent 65%)",filter:"blur(60px)",pointerEvents:"none",zIndex:0}}/>
        <motion.div animate={{scale:[1,1.15,1],opacity:[.35,.5,.35]}} transition={{duration:14,repeat:Infinity,ease:"easeInOut",delay:6}}
          style={{position:"fixed",top:"40%",left:"30%",width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,rgba(var(--pink-rgb),.35) 0%,transparent 60%)",filter:"blur(80px)",pointerEvents:"none",zIndex:0}}/>
      </>}

      {/* ── Sparkles — desktop only ── */}
      {!isMobile && [{t:"12%",l:"22%",d:"3.2s"},{t:"68%",l:"78%",d:"4.1s"},{t:"38%",l:"88%",d:"2.8s"},{t:"82%",l:"15%",d:"3.7s"},{t:"25%",l:"65%",d:"5.0s"},{t:"55%",l:"42%",d:"3.4s"}].map((s,i)=>(
        <motion.div key={i} animate={{opacity:[0,1,0],scale:[.4,1.3,.4]}} transition={{duration:parseFloat(s.d),repeat:Infinity,delay:i*0.7}}
          style={{position:"fixed",top:s.t,left:s.l,fontSize:"0.9rem",pointerEvents:"none",zIndex:0}}>✨</motion.div>
      ))}

      {/* ── Content ── */}
      <div style={{position:"relative",zIndex:1,maxWidth:1080,margin:"0 auto"}}>

        {/* Header */}
        <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:0.6}}
          style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1.3rem",marginBottom:"0.8rem"}}>
            <div style={{flex:1,maxWidth:90,height:1,background:"linear-gradient(90deg,transparent,rgba(var(--pink-deep-rgb),.3))"}}/>
            <motion.span animate={{x:[0,10,0],y:[0,-7,0],rotate:[0,20,0]}} transition={{repeat:Infinity,duration:4,ease:"easeInOut"}}
              style={{fontSize:"2.2rem",filter:"drop-shadow(0 3px 12px rgba(var(--pink-deep-rgb),.5))"}}>✈️</motion.span>
            <div style={{flex:1,maxWidth:90,height:1,background:"linear-gradient(90deg,rgba(var(--pink-deep-rgb),.3),transparent)"}}/>
          </div>
          <h1 style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(2rem,5vw,3.2rem)",color:PINK,margin:"0 0 0.2rem",fontWeight:400,textShadow:"0 2px 24px rgba(var(--pink-deep-rgb),.18)"}}>
            our story so far
          </h1>
          {entries.length>0&&<p style={{fontFamily:SANS,fontSize:"0.82rem",color:"rgba(var(--pink-deep-rgb),.42)",margin:"0 0 1.4rem"}}>{entries.length} {entries.length===1?"memory":"memories"} · {totalPhotos} photo{totalPhotos!==1?"s":""}</p>}
          {entries.length>0&&(
            <motion.button onClick={surprise} disabled={spinning}
              whileHover={{scale:1.06,y:-3,boxShadow:"0 16px 44px rgba(var(--pink-deep-rgb),.32)"}} whileTap={{scale:0.95}}
              style={{padding:"0.82rem 2.2rem",borderRadius:50,border:"1.5px solid rgba(var(--pink-deep-rgb),.35)",background:"var(--cream)",color:PINK,fontFamily:SERIF,fontStyle:"italic",fontSize:"1rem",cursor:"pointer",boxShadow:"0 4px 22px rgba(var(--pink-deep-rgb),.18)",display:"inline-flex",alignItems:"center",gap:"0.5rem"}}>
              {spinning?"finding one…":"✨ remember this?"}
            </motion.button>
          )}
        </motion.div>

        {/* Filter bar */}
        {data.length>0&&(
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.12}}
            style={{marginBottom:"2.2rem",background:"var(--cream)",borderRadius:18,padding:"0.85rem 1.1rem",border:"1px solid rgba(var(--pink-deep-rgb),.18)",boxShadow:"0 2px 18px rgba(var(--pink-deep-rgb),.1)"}}>
            <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap",alignItems:"center",marginBottom:"0.5rem"}}>
              <span style={{fontFamily:SANS,fontSize:"0.6rem",color:"var(--muted)",letterSpacing:"0.12em",textTransform:"uppercase"}}>sort</span>
              <Pill label="↑ oldest" active={sort==="asc"} onClick={()=>setSort("asc")}/>
              <Pill label="↓ newest" active={sort==="desc"} onClick={()=>setSort("desc")}/>
              <div style={{width:1,height:14,background:"rgba(var(--pink-deep-rgb),.22)",margin:"0 .15rem"}}/>
              <span style={{fontFamily:SANS,fontSize:"0.6rem",color:"var(--muted)",letterSpacing:"0.12em",textTransform:"uppercase"}}>group</span>
              <Pill label="all" active={group==="none"} onClick={()=>setGroup("none")}/>
              <Pill label="month" active={group==="month"} onClick={()=>setGroup("month")}/>
              <Pill label="year" active={group==="year"} onClick={()=>setGroup("year")}/>
            </div>
            <div style={{display:"flex",gap:"0.38rem",overflowX:"auto",scrollbarWidth:"none" as const,paddingBottom:2}}>
              <Pill label="all" active={filter==="all"} onClick={()=>setFilter("all")}/>
              <Pill label="⭐ special" active={filter==="special"} onClick={()=>setFilter("special")}/>
              <Pill label="📸 photos" active={filter==="photos"} onClick={()=>setFilter("photos")}/>
              <Pill label="🎬 video" active={filter==="video"} onClick={()=>setFilter("video")}/>
              {moods.map(m=><Pill key={m} label={m} active={filter===`mood:${m}`} onClick={()=>setFilter(f=>f===`mood:${m}`?"all":`mood:${m}`)}/>)}
            </div>
          </motion.div>
        )}

        {/* Empty states */}
        {entries.length===0&&data.length>0&&<div style={{textAlign:"center",padding:"5rem 0"}}><motion.div animate={{y:[-4,4,-4],rotate:[-8,8,-8]}} transition={{repeat:Infinity,duration:3}} style={{fontSize:"2.5rem",marginBottom:"0.8rem",opacity:.3}}>✈️</motion.div><p style={{fontFamily:SCRIPT,fontSize:"1.2rem",color:"rgba(var(--pink-deep-rgb),.38)"}}>nothing matches that filter 🌸</p></div>}
        {data.length===0&&<div style={{textAlign:"center",padding:"5rem 0"}}><motion.div animate={{x:[0,12,0],y:[0,-8,0],rotate:[0,18,0]}} transition={{repeat:Infinity,duration:4}} style={{fontSize:"3rem",marginBottom:"1rem",opacity:.25}}>✈️</motion.div><p style={{fontFamily:SCRIPT,fontSize:"1.2rem",color:"rgba(var(--pink-deep-rgb),.36)",lineHeight:1.8}}>no memories yet —<br/>start adding in the journal 🌸</p></div>}

        {/* ── Scattered cards ── */}
        <div ref={containerRef} style={{position:"relative"}}>
          {sections.map((sec,si)=>(
            <div key={si}>
              {sec.label&&<GroupDivider label={sec.label}/>}
              {sec.entries.map((entry,ei)=>{
                const globalIdx=sec.start+ei;
                const cardX=getX(globalIdx,containerW);
                const prevCardX=globalIdx>0?getX(globalIdx-1,containerW):cardX;
                return (
                  <Fragment key={entry.date}>
                    {(ei>0||(si>0&&ei===0))&&(
                      <div style={{width:"100%"}}>
                        {isMobile
                          ? <TrailMobile/>
                          : <Trail prevX={prevCardX} currX={cardX} trailIdx={globalIdx}/>
                        }
                      </div>
                    )}
                    <div style={{paddingLeft:cardX,width:CARD_W+cardX,boxSizing:"border-box"}}>
                      <MemCard
                        entry={entry}
                        cardIdx={globalIdx}
                        glow={glowIdx===globalIdx}
                        onOpen={()=>setActiveEntry(entry)}
                        setRef={el=>{cardRefs.current[globalIdx]=el;}}
                        isMobile={isMobile}
                      />
                    </div>
                  </Fragment>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        {entries.length>0&&(
          <motion.div initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}}
            style={{textAlign:"center",marginTop:"4rem",paddingTop:"2rem",borderTop:"1px solid rgba(var(--pink-deep-rgb),.1)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",marginBottom:"0.6rem"}}>
              <div style={{width:70,height:2,backgroundImage:"repeating-linear-gradient(90deg,rgba(var(--pink-deep-rgb),.2) 0,rgba(var(--pink-deep-rgb),.2) 7px,transparent 7px,transparent 15px)",borderRadius:2}}/>
              <motion.span animate={{x:[0,9,0],y:[0,-6,0],rotate:[0,16,0]}} transition={{repeat:Infinity,duration:4}} style={{fontSize:"1.4rem"}}>✈️</motion.span>
              <div style={{width:70,height:2,backgroundImage:"repeating-linear-gradient(90deg,rgba(var(--pink-deep-rgb),.2) 0,rgba(var(--pink-deep-rgb),.2) 7px,transparent 7px,transparent 15px)",borderRadius:2}}/>
            </div>
            <p style={{fontFamily:SCRIPT,fontSize:"1.15rem",color:"rgba(var(--pink-deep-rgb),.4)",margin:0,lineHeight:1.8}}>and we&apos;re still writing it 🩷</p>
          </motion.div>
        )}
      </div>

      {/* ── Memory detail modal ── */}
      <AnimatePresence>
        {activeEntry && (
          <MemoryDetail entry={activeEntry} onClose={()=>setActiveEntry(null)}/>
        )}
      </AnimatePresence>
    </section>
  );
}
