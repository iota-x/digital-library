"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendarData } from "@/lib/calendarStore";
import SectionSkeleton from "@/components/SectionSkeleton";
import BgAccents from "@/components/BgAccents";
import { cldImg } from "@/lib/cldImg";
import { SERIF, SANS } from "@/lib/typography";
import { dayNumber } from "@/lib/relationship";
import { getUser } from "@/lib/userStore";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
function dayNum(key:string){ return dayNumber(key, getUser()?.startDate); }

const STARS = Array.from({length:22},(_,i)=>({
  left:`${(i*4.7+2.3)%100}%`, top:`${(i*7.3+5.1)%100}%`,
  size: i%5===0?2.5:1.5,
  dur:`${2+(i*0.31)%3}s`, del:`${(i*0.23)%5}s`,
}));

export default function SurpriseMe() {
  const { data, loading } = useCalendarData();
  const entries = data.filter(e=>e.note||(e.photos?.length??0)>0);

  const [shown,    setShown]    = useState<typeof data[0]|null>(null);
  const [spinning, setSpinning] = useState(false);
  const [imgIdx,   setImgIdx]   = useState(0);
  const spinRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  if (loading) return <SectionSkeleton accent="rgba(var(--pink-rgb),.22)" lines={4}/>;

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
    <section id="surprise" style={{
      position:"relative",width:"100%",minHeight:"100dvh",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:"clamp(4rem,8vh,7rem) clamp(1rem,4vw,3rem)",
      overflow:"hidden",
    }}>
      {/* Twinkling stars (CSS — already optimised) */}
      {STARS.map((s,i)=>(
        <div key={i} className="occ-star"
          style={{ left:s.left, top:s.top, width:s.size, height:s.size,
            background:"var(--pink)", boxShadow:"0 0 5px rgba(var(--pink-rgb),.7)",
            "--occ-dur":s.dur, "--occ-del":s.del } as React.CSSProperties}/>
      ))}

      {/* Themed corner spotlights + drifting sparkles */}
      <BgAccents variant="spotlights" />
      <BgAccents variant="stardust" desktopCount={8} mobileCount={4} />

      <motion.div initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{maxWidth:560,width:"100%",textAlign:"center",position:"relative",zIndex:2}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",marginBottom:"1rem"}}>
          <div style={{width:55,height:1,background:"linear-gradient(90deg,transparent,rgba(var(--pink-rgb),.45))"}}/>
          <span className="occ-icon-bounce" style={{fontSize:"1.8rem",filter:"drop-shadow(0 0 10px rgba(var(--pink-rgb),.55))","--occ-dur":"3.5s"} as React.CSSProperties}>✨</span>
          <div style={{width:55,height:1,background:"linear-gradient(90deg,rgba(var(--pink-rgb),.45),transparent)"}}/>
        </div>
        <h2 style={{
          fontFamily:SERIF,fontStyle:"italic",
          fontSize:"clamp(1.8rem,5vw,2.8rem)",
          color:"var(--pink-deep)",margin:"0 0 0.5rem",fontWeight:400,
        }}>
          surprise me
        </h2>
        <p style={{fontFamily:SANS,fontSize:"0.9rem",color:"var(--muted)",margin:"0 0 2.5rem",lineHeight:1.5}}>
          close your eyes, pick a memory 🌸
        </p>

        {/* Button */}
        <motion.button onClick={spin} disabled={spinning||!entries.length}
          whileHover={{scale:1.06,y:-5}} whileTap={{scale:0.95}}
          style={{
            padding:"1.2rem 3.5rem",borderRadius:50,
            border:"1px solid rgba(var(--pink-rgb),.45)",cursor:"pointer",
            background:"linear-gradient(135deg,var(--pink),var(--pink-deep))",
            color:"#fff",fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1rem,2.5vw,1.25rem)",
            boxShadow:"0 8px 32px rgba(var(--pink-deep-rgb),.35), 0 0 40px rgba(var(--pink-rgb),.25)",
            marginBottom:"2.5rem",
            opacity:!entries.length?0.4:1,
            letterSpacing:"0.02em",
          }}>
          {spinning?"finding a memory…":"take me somewhere ✨"}
        </motion.button>

        {/* Memory card */}
        <AnimatePresence mode="wait">
          {shown&&!spinning&&(
            <motion.div key={shown.date}
              initial={{opacity:0,y:28,scale:0.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-16}}
              transition={{type:"spring",stiffness:200,damping:24}}
              style={{
                background:"var(--cream)",
                border:"1px solid rgba(var(--pink-rgb),.3)",
                borderRadius:24,overflow:"hidden",textAlign:"left",
                boxShadow:"0 24px 70px rgba(var(--pink-deep-rgb),.18), 0 0 0 1px rgba(var(--pink-rgb),.12)",
              }}>
              {(shown.photos?.length??0)>0&&(
                <div style={{position:"relative",height:"clamp(160px,35vw,260px)"}}>
                  <AnimatePresence mode="wait">
                    <motion.img key={imgIdx} src={cldImg(shown.photos[imgIdx], { w: 800, videoFrame: true })} alt=""
                      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.25}}
                      style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                  </AnimatePresence>
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 30%,rgba(0,0,0,.65))"}}/>
                  {shown.photos.length>1&&(
                    <>
                      <button onClick={()=>setImgIdx(i=>(i-1+shown.photos.length)%shown.photos.length)}
                        aria-label="previous photo"
                        style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,.5)",border:"none",borderRadius:"50%",width:34,height:34,color:"#fff",cursor:"pointer",fontSize:"1.1rem"}}>‹</button>
                      <button onClick={()=>setImgIdx(i=>(i+1)%shown.photos.length)}
                        aria-label="next photo"
                        style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,.5)",border:"none",borderRadius:"50%",width:34,height:34,color:"#fff",cursor:"pointer",fontSize:"1.1rem"}}>›</button>
                    </>
                  )}
                  <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"1rem 1.4rem"}}>
                    <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(0.95rem,2.5vw,1.15rem)",color:"#fff",margin:0,textShadow:"0 2px 8px rgba(0,0,0,.7)"}}>
                      {d&&`${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`}
                    </p>
                  </div>
                </div>
              )}
              <div style={{padding:"1.4rem 1.6rem"}}>
                {!(shown.photos?.length)&&d&&(
                  <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1rem,2.5vw,1.15rem)",color:"var(--pink-deep)",margin:"0 0 0.8rem",fontWeight:400}}>
                    {DAYS[d.getDay()]}, {MONTHS[d.getMonth()]} {d.getDate()}, {d.getFullYear()}
                  </p>
                )}
                <div style={{display:"flex",gap:"0.6rem",alignItems:"center",marginBottom:"0.8rem",flexWrap:"wrap"}}>
                  {dn&&<span style={{fontFamily:SANS,fontSize:"0.7rem",color:"var(--muted)",letterSpacing:"0.12em",textTransform:"uppercase"}}>Day {dn} of us</span>}
                  {shown.mood&&<span style={{fontSize:"1.2rem"}}>{shown.mood}</span>}
                  {shown.special&&(
                    <span style={{fontFamily:SANS,fontSize:"0.7rem",background:"rgba(var(--pink-rgb),.22)",color:"var(--pink-deep)",borderRadius:10,padding:"0.12rem 0.55rem",border:"1px solid rgba(var(--pink-rgb),.35)"}}>
                      ⭐ {shown.specialLabel||"special day"}
                    </span>
                  )}
                </div>
                {shown.note&&(
                  <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(0.92rem,2vw,1.05rem)",color:"var(--text)",lineHeight:1.95,margin:0}}>
                    &ldquo;{shown.note.slice(0,300)}{shown.note.length>300?"…":""}&rdquo;
                  </p>
                )}
                <div style={{marginTop:"1.2rem",display:"flex",alignItems:"center",gap:"0.5rem"}}>
                  <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(var(--pink-rgb),.35),transparent)"}}/>
                  <span style={{fontFamily:SANS,fontSize:"0.75rem",color:"var(--muted)"}}>— with love 🩷</span>
                </div>
              </div>
            </motion.div>
          )}
          {spinning&&(
            <motion.div key="spin" animate={{opacity:[0.5,1,0.5]}} transition={{repeat:Infinity,duration:0.22}}
              style={{background:"var(--cream)",border:"1px solid rgba(var(--pink-rgb),.22)",borderRadius:24,padding:"3rem",color:"var(--muted)",fontFamily:SERIF,fontStyle:"italic",fontSize:"1.15rem"}}>
              searching through our memories…
            </motion.div>
          )}
        </AnimatePresence>

        {shown&&!spinning&&(
          <motion.button onClick={spin} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5}}
            whileHover={{scale:1.05,y:-2}} whileTap={{scale:0.97}}
            style={{marginTop:"1.4rem",padding:"0.65rem 1.8rem",borderRadius:30,border:"1px solid rgba(var(--pink-rgb),.3)",background:"var(--cream)",color:"var(--pink-deep)",fontFamily:SANS,fontSize:"0.85rem",cursor:"pointer"}}>
            show me another ✨
          </motion.button>
        )}
        {!entries.length&&(
          <p style={{fontFamily:SANS,fontSize:"0.9rem",color:"var(--muted)",marginTop:"2rem"}}>
            no memories yet — start adding in the calendar 🌸
          </p>
        )}
      </motion.div>
    </section>
  );
}
