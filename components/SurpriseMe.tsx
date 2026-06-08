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

export default function SurpriseMe() {
  const [entries, setEntries] = useState<CalEntry[]>([]);
  const [shown,   setShown]   = useState<CalEntry|null>(null);
  const [spinning,setSpinning]= useState(false);
  const [imgIdx,  setImgIdx]  = useState(0);
  const spinRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  useEffect(()=>{
    fetch("/api/calendar").then(r=>r.json()).then((arr:CalEntry[])=>{
      setEntries(arr.filter(e=>e.note||(e.photos?.length??0)>0));
    });
  },[]);

  const spin = () => {
    if (!entries.length || spinning) return;
    setSpinning(true);
    setShown(null);
    let i = 0;
    const flicker = () => {
      setShown(entries[Math.floor(Math.random()*entries.length)]);
      i++;
      if (i < 8) spinRef.current = setTimeout(flicker, 80 + i*30);
      else {
        const final = entries[Math.floor(Math.random()*entries.length)];
        setShown(final);
        setImgIdx(0);
        setSpinning(false);
      }
    };
    flicker();
  };

  const d = shown ? new Date(shown.date+"T12:00:00") : null;
  const dn = shown ? dayNum(shown.date) : null;

  return (
    <section style={{
      position:"relative",width:"100%",
      padding:"4rem clamp(1rem,3vw,2rem) 5rem",
      background:"linear-gradient(160deg,#fff0f5,#fce7f3 50%,#fff5f9)",
      overflow:"hidden",
    }}>
      {/* Ambient glow */}
      <AnimatePresence>
        {shown&&(
          <motion.div initial={{opacity:0,scale:0.5}} animate={{opacity:1,scale:1}} exit={{opacity:0}}
            style={{position:"absolute",inset:0,pointerEvents:"none",
              background:"radial-gradient(ellipse 60% 50% at 50% 40%,rgba(244,114,182,.14) 0%,transparent 70%)"}}/>
        )}
      </AnimatePresence>

      <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{maxWidth:600,margin:"0 auto",textAlign:"center"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",marginBottom:"0.8rem"}}>
          <div style={{width:45,height:1,background:"linear-gradient(90deg,transparent,#f9a8d4)"}}/>
          <motion.span style={{fontSize:"1.5rem"}} animate={{rotate:[0,20,-20,0]}} transition={{repeat:Infinity,duration:3,ease:"easeInOut"}}>✨</motion.span>
          <div style={{width:45,height:1,background:"linear-gradient(90deg,#f9a8d4,transparent)"}}/>
        </div>
        <h2 style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1.5rem,4vw,2.2rem)",color:"#be185d",margin:"0 0 0.4rem",fontWeight:400}}>
          surprise me
        </h2>
        <p style={{fontFamily:SANS,fontSize:"0.88rem",color:"rgba(190,24,93,.5)",margin:"0 0 2rem"}}>
          relive a random memory from our time together 🌸
        </p>

        {/* Big button */}
        <motion.button onClick={spin} disabled={spinning||!entries.length}
          whileHover={{scale:1.05,y:-3}} whileTap={{scale:0.96}}
          animate={spinning?{rotate:[0,5,-5,4,-4,0]}:{}}
          transition={spinning?{repeat:Infinity,duration:0.3}:{type:"spring",stiffness:200}}
          style={{
            padding:"1.1rem 2.5rem",borderRadius:50,border:"none",cursor:"pointer",
            background:"linear-gradient(135deg,#f9a8d4,#ec4899)",
            color:"#fff",fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1rem,2.5vw,1.25rem)",
            boxShadow:"0 6px 28px rgba(236,72,153,.4)",
            marginBottom:"2.5rem",
            opacity:(!entries.length)?0.5:1,
          }}>
          {spinning?"finding a memory…":"take me somewhere ✨"}
        </motion.button>

        {/* Memory card */}
        <AnimatePresence mode="wait">
          {shown&&!spinning&&(
            <motion.div key={shown.date}
              initial={{opacity:0,y:30,scale:0.94}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-20,scale:0.96}}
              transition={{type:"spring",stiffness:220,damping:26}}
              style={{
                background:"rgba(255,255,255,.9)",border:"1px solid rgba(249,168,212,.3)",
                borderRadius:24,overflow:"hidden",textAlign:"left",
                boxShadow:"0 16px 60px rgba(244,114,182,.2),0 4px 16px rgba(0,0,0,.06)",
              }}>

              {/* Photo hero */}
              {(shown.photos?.length??0)>0&&(
                <div style={{position:"relative",height:"clamp(180px,40vw,280px)"}}>
                  <AnimatePresence mode="wait">
                    <motion.img key={imgIdx} src={shown.photos[imgIdx]} alt=""
                      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.3}}
                      style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                  </AnimatePresence>
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 50%,rgba(0,0,0,.55))"}}/>
                  {shown.photos.length>1&&(
                    <>
                      <button onClick={()=>setImgIdx(i=>(i-1+shown.photos.length)%shown.photos.length)}
                        style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,.35)",border:"none",borderRadius:"50%",width:32,height:32,color:"#fff",cursor:"pointer",fontSize:"1rem"}}>‹</button>
                      <button onClick={()=>setImgIdx(i=>(i+1)%shown.photos.length)}
                        style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,.35)",border:"none",borderRadius:"50%",width:32,height:32,color:"#fff",cursor:"pointer",fontSize:"1rem"}}>›</button>
                    </>
                  )}
                  <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"1rem 1.2rem"}}>
                    <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1rem,3vw,1.25rem)",color:"#fff",margin:0,textShadow:"0 2px 8px rgba(0,0,0,.5)"}}>
                      {d&&`${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`}
                    </p>
                  </div>
                </div>
              )}

              <div style={{padding:"1.4rem 1.6rem"}}>
                {!(shown.photos?.length)&&d&&(
                  <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1rem,3vw,1.2rem)",color:"#be185d",margin:"0 0 0.8rem",fontWeight:400}}>
                    {DAYS[d.getDay()]}, {MONTHS[d.getMonth()]} {d.getDate()}, {d.getFullYear()}
                  </p>
                )}
                <div style={{display:"flex",gap:"0.6rem",alignItems:"center",marginBottom:"0.8rem",flexWrap:"wrap"}}>
                  {dn&&<span style={{fontFamily:SANS,fontSize:"0.72rem",color:"rgba(190,24,93,.45)",letterSpacing:"0.1em",textTransform:"uppercase"}}>Day {dn} of us</span>}
                  {shown.mood&&<span style={{fontSize:"1.2rem"}}>{shown.mood}</span>}
                  {shown.special&&<span style={{fontFamily:SANS,fontSize:"0.72rem",background:"linear-gradient(135deg,#fda4af,#ec4899)",color:"#fff",borderRadius:10,padding:"0.15rem 0.5rem"}}>⭐ {shown.specialLabel||"special day"}</span>}
                </div>
                {shown.note&&(
                  <p style={{fontFamily:SERIF,fontSize:"clamp(0.92rem,2vw,1.05rem)",color:"#7c3f58",lineHeight:1.85,margin:0,fontStyle:"italic"}}>
                    "{shown.note.slice(0,300)}{shown.note.length>300?"…":""}"
                  </p>
                )}
              </div>
            </motion.div>
          )}
          {shown&&spinning&&(
            <motion.div key="flicker"
              animate={{opacity:[0.4,1,0.4]}} transition={{repeat:Infinity,duration:0.18}}
              style={{background:"rgba(249,168,212,.1)",border:"1px solid rgba(249,168,212,.25)",borderRadius:24,padding:"2rem",color:"rgba(190,24,93,.4)",fontFamily:SERIF,fontStyle:"italic",fontSize:"1.2rem"}}>
              {shown.date}…
            </motion.div>
          )}
        </AnimatePresence>

        {shown&&!spinning&&(
          <motion.button onClick={spin} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.6}}
            whileHover={{scale:1.04}} whileTap={{scale:0.97}}
            style={{marginTop:"1.2rem",padding:"0.7rem 1.8rem",borderRadius:30,border:"1px solid rgba(249,168,212,.4)",background:"transparent",color:"#be185d",fontFamily:SANS,fontSize:"0.88rem",cursor:"pointer"}}>
            another one ✨
          </motion.button>
        )}
      </motion.div>
    </section>
  );
}