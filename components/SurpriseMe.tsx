"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendarData } from "@/lib/calendarStore";
import SectionSkeleton from "@/components/SectionSkeleton";

const SERIF  = `"Georgia","Times New Roman",serif`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const START  = new Date("2026-03-11");
function dayNum(key:string){ return Math.floor((new Date(key+"T12:00:00").getTime()-START.getTime())/86400000)+1; }

/* ── Palette slot 3: #4E0535 Tyrian purple ── */
const BG = "linear-gradient(180deg,#61063b 0%,#4e0535 60%,#4e0535 100%)";
const ACC = "#f472b6";
const SOFT= "#fdf2f8";

export default function SurpriseMe() {
  const { data, loading } = useCalendarData();
  const entries = data.filter(e=>e.note||(e.photos?.length??0)>0);

  const [shown,    setShown]   = useState<typeof data[0]|null>(null);
  const [spinning, setSpinning]= useState(false);
  const [imgIdx,   setImgIdx]  = useState(0);
  const spinRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  if (loading) return <SectionSkeleton bg={BG} accent="rgba(244,114,182,0.18)" lines={4} />;

  const spin=()=>{
    if(!entries.length||spinning) return;
    setSpinning(true); setShown(null);
    let i=0;
    const flicker=()=>{
      setShown(entries[Math.floor(Math.random()*entries.length)]); i++;
      if(i<10) spinRef.current=setTimeout(flicker,55+i*22);
      else{ setShown(entries[Math.floor(Math.random()*entries.length)]); setImgIdx(0); setSpinning(false); }
    };
    flicker();
  };

  const d  = shown?new Date(shown.date+"T12:00:00"):null;
  const dn = shown?dayNum(shown.date):null;

  return (
    <section style={{
      position:"relative",width:"100%",minHeight:"100vh",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:"clamp(4rem,8vh,7rem) clamp(1rem,4vw,3rem)",
      background:BG,overflow:"hidden",
    }}>
      {/* Sparkle particles */}
      {Array.from({length:18},(_,i)=>(
        <motion.div key={i}
          animate={{y:[0,Math.random()*-50,0],opacity:[0.05,0.4,0.05],x:[0,Math.random()*30-15,0]}}
          transition={{repeat:Infinity,duration:3+Math.random()*4,delay:Math.random()*5,ease:"easeInOut"}}
          style={{
            position:"absolute",left:`${Math.random()*100}%`,top:`${Math.random()*100}%`,
            width:2,height:2,borderRadius:"50%",background:ACC,
            boxShadow:`0 0 5px ${ACC}`,pointerEvents:"none",
          }}/>
      ))}

      <motion.div initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{maxWidth:560,width:"100%",textAlign:"center",position:"relative",zIndex:2}}>

        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",marginBottom:"1rem"}}>
          <div style={{width:50,height:1,background:`linear-gradient(90deg,transparent,${ACC}44)`}}/>
          <motion.span style={{fontSize:"1.8rem"}} animate={{rotate:[0,20,-20,0],scale:[1,1.15,1]}} transition={{repeat:Infinity,duration:3.5}}>✨</motion.span>
          <div style={{width:50,height:1,background:`linear-gradient(90deg,${ACC}44,transparent)`}}/>
        </div>
        <h2 style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1.8rem,5vw,2.6rem)",color:SOFT,margin:"0 0 0.4rem",fontWeight:400}}>
          surprise me
        </h2>
        <p style={{fontFamily:SANS,fontSize:"0.88rem",color:`${ACC}99`,margin:"0 0 2.5rem"}}>
          let fate pick a memory to relive 🌸
        </p>

        <motion.button onClick={spin} disabled={spinning||!entries.length}
          whileHover={{scale:1.05,y:-4}} whileTap={{scale:0.95}}
          style={{
            padding:"1.1rem 2.8rem",borderRadius:50,border:`1px solid ${ACC}55`,cursor:"pointer",
            background:"rgba(0,0,0,.3)",backdropFilter:"blur(8px)",
            color:SOFT,fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1rem,2.5vw,1.25rem)",
            boxShadow:`0 0 30px ${ACC}22`,marginBottom:"2.5rem",
            opacity:!entries.length?0.4:1,
          }}>
          {spinning?"finding a memory…":"take me somewhere ✨"}
        </motion.button>

        <AnimatePresence mode="wait">
          {shown&&!spinning&&(
            <motion.div key={shown.date}
              initial={{opacity:0,y:24,scale:0.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-16}}
              transition={{type:"spring",stiffness:200,damping:24}}
              style={{background:"rgba(0,0,0,.3)",border:`1px solid ${ACC}33`,borderRadius:22,overflow:"hidden",textAlign:"left",
                backdropFilter:"blur(12px)",boxShadow:`0 20px 60px rgba(0,0,0,.5),0 0 0 1px ${ACC}18`}}>
              {(shown.photos?.length??0)>0&&(
                <div style={{position:"relative",height:"clamp(160px,35vw,250px)"}}>
                  <AnimatePresence mode="wait">
                    <motion.img key={imgIdx} src={shown.photos[imgIdx]} alt=""
                      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.22}}
                      style={{width:"100%",height:"100%",objectFit:"cover",display:"block",filter:"saturate(0.85)"}}/>
                  </AnimatePresence>
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 35%,rgba(59,3,47,.85))"}}/>
                  {shown.photos.length>1&&(
                    <>
                      <button onClick={()=>setImgIdx(i=>(i-1+shown.photos.length)%shown.photos.length)}
                        style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,.45)",border:"none",borderRadius:"50%",width:32,height:32,color:"#fff",cursor:"pointer",fontSize:"1rem"}}>‹</button>
                      <button onClick={()=>setImgIdx(i=>(i+1)%shown.photos.length)}
                        style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,.45)",border:"none",borderRadius:"50%",width:32,height:32,color:"#fff",cursor:"pointer",fontSize:"1rem"}}>›</button>
                    </>
                  )}
                  <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"0.9rem 1.2rem"}}>
                    <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(0.9rem,2.5vw,1.1rem)",color:"#fff",margin:0,textShadow:"0 2px 8px rgba(0,0,0,.6)"}}>
                      {d&&`${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`}
                    </p>
                  </div>
                </div>
              )}
              <div style={{padding:"1.3rem 1.5rem"}}>
                {!(shown.photos?.length)&&d&&(
                  <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(0.95rem,2.5vw,1.1rem)",color:ACC,margin:"0 0 0.7rem",fontWeight:400}}>
                    {DAYS[d.getDay()]}, {MONTHS[d.getMonth()]} {d.getDate()}, {d.getFullYear()}
                  </p>
                )}
                <div style={{display:"flex",gap:"0.6rem",alignItems:"center",marginBottom:"0.7rem",flexWrap:"wrap"}}>
                  {dn&&<span style={{fontFamily:SANS,fontSize:"0.68rem",color:`${ACC}77`,letterSpacing:"0.12em",textTransform:"uppercase"}}>Day {dn}</span>}
                  {shown.mood&&<span style={{fontSize:"1.1rem"}}>{shown.mood}</span>}
                  {shown.special&&<span style={{fontFamily:SANS,fontSize:"0.68rem",background:`${ACC}22`,color:ACC,borderRadius:8,padding:"0.12rem 0.5rem",border:`1px solid ${ACC}33`}}>⭐ {shown.specialLabel||"special"}</span>}
                </div>
                {shown.note&&(
                  <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(0.9rem,2vw,1rem)",color:`${SOFT}cc`,lineHeight:1.9,margin:0}}>
                    "{shown.note.slice(0,280)}{shown.note.length>280?"…":""}"
                  </p>
                )}
              </div>
            </motion.div>
          )}
          {spinning&&(
            <motion.div key="spin" animate={{opacity:[0.3,0.8,0.3]}} transition={{repeat:Infinity,duration:0.22}}
              style={{background:`${ACC}0d`,border:`1px solid ${ACC}22`,borderRadius:22,padding:"2.5rem",color:`${ACC}66`,fontFamily:SERIF,fontStyle:"italic",fontSize:"1.1rem"}}>
              searching memories…
            </motion.div>
          )}
        </AnimatePresence>

        {shown&&!spinning&&(
          <motion.button onClick={spin} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5}}
            whileHover={{scale:1.04}} whileTap={{scale:0.97}}
            style={{marginTop:"1.2rem",padding:"0.6rem 1.6rem",borderRadius:28,border:`1px solid ${ACC}33`,background:"transparent",color:`${ACC}88`,fontFamily:SANS,fontSize:"0.85rem",cursor:"pointer"}}>
            another one ✨
          </motion.button>
        )}
        {!entries.length&&(
          <p style={{fontFamily:SANS,fontSize:"0.88rem",color:`${ACC}44`,marginTop:"2rem"}}>no memories yet — add some in the journal 🌸</p>
        )}
      </motion.div>
    </section>
  );
}