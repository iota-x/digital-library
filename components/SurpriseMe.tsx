"use client";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SERIF  = `"Georgia","Times New Roman",serif`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const START  = new Date("2026-03-11");

interface CalEntry { date:string; note:string; photos:string[]; special:boolean; specialLabel:string; mood:string; }
function dayNum(key:string){ return Math.floor((new Date(key+"T12:00:00").getTime()-START.getTime())/86400000)+1; }

const BG_TOP = "#ffc8dc";
const GRAIN  = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.055'/%3E%3C/svg%3E")`;

export default function SurpriseMe() {
  const [entries,  setEntries]  = useState<CalEntry[]>([]);
  const [shown,    setShown]    = useState<CalEntry|null>(null);
  const [spinning, setSpinning] = useState(false);
  const [imgIdx,   setImgIdx]   = useState(0);
  const spinRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  useEffect(()=>{
    fetch("/api/calendar").then(r=>r.json()).then((arr:CalEntry[])=>{
      setEntries(arr.filter(e=>e.note||(e.photos?.length??0)>0));
    });
  },[]);

  const spin = () => {
    if (!entries.length || spinning) return;
    setSpinning(true); setShown(null);
    let i = 0;
    const flicker = () => {
      setShown(entries[Math.floor(Math.random()*entries.length)]);
      i++;
      if (i < 8) spinRef.current = setTimeout(flicker, 80 + i*30);
      else { const final = entries[Math.floor(Math.random()*entries.length)]; setShown(final); setImgIdx(0); setSpinning(false); }
    };
    flicker();
  };

  const d  = shown ? new Date(shown.date+"T12:00:00") : null;
  const dn = shown ? dayNum(shown.date) : null;
  const hasCard = shown && !spinning;

  return (
    <section style={{
      position:"relative",
      width:"100%",
      minHeight:"100vh",
      display:"flex",
      flexDirection:"column",
      justifyContent:"center",
      padding:"clamp(4rem,8vh,6rem) clamp(1rem,4vw,3rem)",
      background:`linear-gradient(180deg, ${BG_TOP} 0%, #8b1a3a 14%, #3d0d1f 45%, #2a0813 100%)`,
      backgroundImage:`${GRAIN}, linear-gradient(180deg, ${BG_TOP} 0%, #8b1a3a 14%, #3d0d1f 45%, #2a0813 100%)`,
      overflow:"hidden",
      boxSizing:"border-box",
    }}>
      {/* Ambient glows */}
      {[
        { l:"8%",  t:"18%", c:"rgba(244,114,182,0.12)", s:340 },
        { l:"72%", t:"58%", c:"rgba(190,24,93,0.10)",   s:280 },
        { l:"42%", t:"8%",  c:"rgba(253,164,175,0.08)", s:220 },
        { l:"20%", t:"75%", c:"rgba(131,24,67,0.09)",   s:200 },
      ].map((g,i)=>(
        <motion.div key={i}
          animate={{scale:[1,1.2,1],opacity:[0.5,1,0.5]}}
          transition={{repeat:Infinity,duration:7+i*2,ease:"easeInOut"}}
          style={{position:"absolute",left:g.l,top:g.t,width:g.s,height:g.s,
            borderRadius:"50%",background:g.c,filter:"blur(90px)",pointerEvents:"none",zIndex:0}} />
      ))}

      <motion.div initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{
          maxWidth:620,
          width:"100%",
          margin:"0 auto",
          textAlign:"center",
          position:"relative",
          zIndex:2,
          display:"flex",
          flexDirection:"column",
          gap:"clamp(1.4rem,3vh,2.2rem)",
        }}>

        {/* Header */}
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",marginBottom:"0.9rem"}}>
            <div style={{width:52,height:1,background:"linear-gradient(90deg,transparent,rgba(249,168,212,0.35))"}}/>
            <motion.span style={{fontSize:"1.7rem"}}
              animate={{rotate:[0,22,-22,0],scale:[1,1.15,1]}}
              transition={{repeat:Infinity,duration:3,ease:"easeInOut"}}>✨</motion.span>
            <div style={{width:52,height:1,background:"linear-gradient(90deg,rgba(249,168,212,0.35),transparent)"}}/>
          </div>
          <h2 style={{fontFamily:SERIF,fontStyle:"italic",
            fontSize:"clamp(1.8rem,4vw,2.8rem)",color:"#fce7f3",
            margin:"0 0 0.4rem",fontWeight:400,
            textShadow:"0 0 40px rgba(244,114,182,0.3)"}}>
            surprise me
          </h2>
          <p style={{fontFamily:SANS,fontSize:"clamp(0.85rem,1.5vw,0.95rem)",
            color:"rgba(252,231,243,0.45)",margin:0,letterSpacing:"0.02em"}}>
            relive a random memory from our time together 🌸
          </p>
        </div>

        {/* Spin button */}
        <div style={{display:"flex",justifyContent:"center"}}>
          <motion.button onClick={spin} disabled={spinning||!entries.length}
            whileHover={{scale:1.06,y:-3}} whileTap={{scale:0.96}}
            animate={spinning?{rotate:[0,6,-6,5,-5,0]}:{}}
            transition={spinning?{repeat:Infinity,duration:0.28}:{type:"spring",stiffness:200}}
            style={{
              padding:"clamp(0.9rem,2vh,1.2rem) clamp(2rem,4vw,3rem)",
              borderRadius:50,border:"1.5px solid rgba(249,168,212,0.3)",
              cursor:(!entries.length||spinning)?"not-allowed":"pointer",
              background: spinning
                ? "rgba(236,72,153,0.12)"
                : "linear-gradient(135deg,rgba(244,114,182,0.2),rgba(190,24,93,0.38))",
              backdropFilter:"blur(14px)",
              color:"#fce7f3",
              fontFamily:SERIF,fontStyle:"italic",
              fontSize:"clamp(1rem,2.5vw,1.25rem)",
              boxShadow:"0 8px 36px rgba(0,0,0,0.4),inset 0 0 0 1px rgba(255,255,255,0.06)",
              opacity:(!entries.length)?0.45:1,
              transition:"background 0.2s",
            }}>
            {spinning ? "finding a memory…" : "take me somewhere ✨"}
          </motion.button>
        </div>

        {/* Empty state when no entries */}
        {!entries.length && (
          <div style={{padding:"2rem",color:"rgba(252,231,243,0.25)",fontFamily:SERIF,fontStyle:"italic",fontSize:"1rem"}}>
            add some memories to the journal first 🌸
          </div>
        )}

        {/* Memory card */}
        <AnimatePresence mode="wait">
          {hasCard && (
            <motion.div key={shown!.date}
              initial={{opacity:0,y:36,scale:0.94}}
              animate={{opacity:1,y:0,scale:1}}
              exit={{opacity:0,y:-20,scale:0.96}}
              transition={{type:"spring",stiffness:220,damping:26}}
              style={{
                background:"linear-gradient(145deg,rgba(255,255,255,0.09),rgba(255,255,255,0.04))",
                border:"1px solid rgba(249,168,212,0.2)",
                borderRadius:24,overflow:"hidden",textAlign:"left",
                backdropFilter:"blur(20px)",
                boxShadow:"0 24px 80px rgba(0,0,0,0.55),inset 0 0 0 1px rgba(255,255,255,0.06)",
              }}>
              {(shown!.photos?.length??0)>0&&(
                <div style={{position:"relative",height:"clamp(180px,28vh,300px)"}}>
                  <AnimatePresence mode="wait">
                    <motion.img key={imgIdx} src={shown!.photos[imgIdx]} alt=""
                      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                      transition={{duration:0.3}}
                      style={{width:"100%",height:"100%",objectFit:"cover",display:"block",
                        filter:"saturate(0.88) contrast(1.05)"}}/>
                  </AnimatePresence>
                  <div style={{position:"absolute",inset:0,
                    background:"linear-gradient(to bottom,rgba(61,13,31,0.25) 0%,transparent 40%,rgba(42,8,19,0.85) 100%)"}}/>
                  {shown!.photos.length>1&&(
                    <>
                      <button onClick={()=>setImgIdx(i=>(i-1+shown!.photos.length)%shown!.photos.length)}
                        style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",
                          background:"rgba(0,0,0,0.4)",border:"1px solid rgba(255,255,255,0.15)",
                          borderRadius:"50%",width:34,height:34,color:"#fce7f3",cursor:"pointer",fontSize:"1.1rem",
                          backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
                      <button onClick={()=>setImgIdx(i=>(i+1)%shown!.photos.length)}
                        style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
                          background:"rgba(0,0,0,0.4)",border:"1px solid rgba(255,255,255,0.15)",
                          borderRadius:"50%",width:34,height:34,color:"#fce7f3",cursor:"pointer",fontSize:"1.1rem",
                          backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
                    </>
                  )}
                  <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"1.1rem 1.4rem"}}>
                    <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(0.95rem,2.5vw,1.2rem)",
                      color:"#fce7f3",margin:0,textShadow:"0 2px 12px rgba(0,0,0,0.6)"}}>
                      {d&&`${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`}
                    </p>
                  </div>
                </div>
              )}
              <div style={{padding:"clamp(1rem,2.5vh,1.5rem) clamp(1rem,3vw,1.6rem)"}}>
                {!(shown!.photos?.length)&&d&&(
                  <p style={{fontFamily:SERIF,fontStyle:"italic",
                    fontSize:"clamp(1rem,2.5vw,1.15rem)",color:"#fce7f3",margin:"0 0 0.8rem",fontWeight:400}}>
                    {DAYS[d.getDay()]}, {MONTHS[d.getMonth()]} {d.getDate()}, {d.getFullYear()}
                  </p>
                )}
                <div style={{display:"flex",gap:"0.6rem",alignItems:"center",marginBottom:"0.8rem",flexWrap:"wrap"}}>
                  {dn&&<span style={{fontFamily:SANS,fontSize:"0.7rem",color:"rgba(252,231,243,0.38)",
                    letterSpacing:"0.1em",textTransform:"uppercase"}}>Day {dn} of us</span>}
                  {shown!.mood&&<span style={{fontSize:"1.2rem"}}>{shown!.mood}</span>}
                  {shown!.special&&(
                    <span style={{fontFamily:SANS,fontSize:"0.7rem",
                      background:"linear-gradient(135deg,rgba(244,114,182,0.25),rgba(190,24,93,0.35))",
                      color:"#fce7f3",borderRadius:10,padding:"0.15rem 0.6rem",
                      border:"1px solid rgba(249,168,212,0.2)"}}>
                      ⭐ {shown!.specialLabel||"special day"}
                    </span>
                  )}
                </div>
                {shown!.note&&(
                  <p style={{fontFamily:SERIF,fontSize:"clamp(0.9rem,1.8vw,1.05rem)",
                    color:"rgba(252,231,243,0.75)",lineHeight:1.88,margin:0,fontStyle:"italic"}}>
                    "{shown!.note.slice(0,300)}{shown!.note.length>300?"…":""}"
                  </p>
                )}
              </div>
            </motion.div>
          )}
          {shown && spinning && (
            <motion.div key="flicker"
              animate={{opacity:[0.3,1,0.3]}} transition={{repeat:Infinity,duration:0.18}}
              style={{background:"rgba(244,114,182,0.07)",border:"1px solid rgba(249,168,212,0.15)",
                borderRadius:24,padding:"2rem",
                color:"rgba(252,231,243,0.35)",fontFamily:SERIF,fontStyle:"italic",fontSize:"1.1rem"}}>
              {shown.date}…
            </motion.div>
          )}
        </AnimatePresence>

        {hasCard && (
          <motion.div style={{display:"flex",justifyContent:"center"}}
            initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5}}>
            <motion.button onClick={spin}
              whileHover={{scale:1.05,y:-2}} whileTap={{scale:0.97}}
              style={{padding:"0.65rem 1.9rem",borderRadius:30,
                border:"1px solid rgba(249,168,212,0.22)",background:"transparent",
                color:"rgba(252,231,243,0.55)",fontFamily:SANS,fontSize:"0.88rem",cursor:"pointer"}}>
              another one ✨
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}