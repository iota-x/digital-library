"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SERIF  = `"Georgia","Times New Roman",serif`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ── PALETTE: deep midnight with gold — capsule section 1 ── */
const BG   = "linear-gradient(160deg,#0e0c02 0%,#1a1808 50%,#0e0c02 100%)";
const ACC  = "#fcd34d";
const SOFT = "#fefce8";
const DIM  = "rgba(252,211,77,.5)";

interface Capsule { id:string; letter:string; unlockDate:string; from:string; createdAt:string; }

export default function TimeCapsule() {
  const [unlocked,   setUnlocked]   = useState<Capsule[]>([]);
  const [composing,  setComposing]  = useState(false);
  const [letter,     setLetter]     = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [from,       setFrom]       = useState("");
  const [saving,     setSaving]     = useState(false);
  const [opened,     setOpened]     = useState<string|null>(null);
  const [saved,      setSaved]      = useState(false);
  const [pending,    setPending]    = useState<{unlockDate:string;from:string;createdAt:string}[]>([]);

  useEffect(()=>{
    fetch("/api/capsules").then(r=>r.json()).then((arr:Capsule[])=>setUnlocked(arr.sort((a,b)=>a.unlockDate.localeCompare(b.unlockDate))));
    try{ const s=localStorage.getItem("capsule_pending"); if(s) setPending(JSON.parse(s)); }catch{}
  },[]);

  const save=async()=>{
    if(!letter.trim()||!unlockDate) return;
    setSaving(true);
    await fetch("/api/capsules",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({letter,unlockDate,from})});
    const np=[...pending,{unlockDate,from,createdAt:new Date().toISOString()}];
    setPending(np); localStorage.setItem("capsule_pending",JSON.stringify(np));
    setSaving(false); setSaved(true); setComposing(false);
    setLetter(""); setUnlockDate(""); setFrom("");
    setTimeout(()=>setSaved(false),3500);
  };

  const fmt=(d:string)=>{ const dt=new Date(d+"T12:00:00"); return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`; };
  const daysUntil=(d:string)=>Math.ceil((new Date(d+"T12:00:00").getTime()-Date.now())/86400000);

  return (
    <section style={{
      position:"relative",width:"100%",minHeight:"100vh",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:"clamp(4rem,8vh,7rem) clamp(1rem,4vw,3rem)",
      background:BG, overflow:"hidden",
    }}>
      {/* Gold dust particles */}
      {Array.from({length:25},(_,i)=>(
        <motion.div key={i}
          animate={{y:[0,-40,0],opacity:[0,0.6,0],x:[0,Math.random()*20-10,0]}}
          transition={{repeat:Infinity,duration:4+Math.random()*4,delay:Math.random()*6,ease:"easeInOut"}}
          style={{
            position:"absolute",
            left:`${Math.random()*100}%`,bottom:`${Math.random()*60}%`,
            width:Math.random()>0.7?3:1.5,height:Math.random()>0.7?3:1.5,
            borderRadius:"50%",background:ACC,
            boxShadow:`0 0 4px ${ACC}`,
            pointerEvents:"none",
          }}/>
      ))}

      <motion.div initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{maxWidth:640,width:"100%",position:"relative",zIndex:2}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",marginBottom:"1rem"}}>
            <div style={{width:50,height:1,background:`linear-gradient(90deg,transparent,${ACC}44)`}}/>
            <motion.span style={{fontSize:"1.8rem",filter:`drop-shadow(0 0 8px ${ACC}88)`}}
              animate={{y:[-3,3,-3],rotate:[-5,5,-5]}} transition={{repeat:Infinity,duration:3}}>💌</motion.span>
            <div style={{width:50,height:1,background:`linear-gradient(90deg,${ACC}44,transparent)`}}/>
          </div>
          <h2 style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1.8rem,5vw,2.8rem)",color:SOFT,margin:"0 0 0.4rem",fontWeight:400,textShadow:`0 2px 24px ${ACC}33`}}>
            time capsule letters
          </h2>
          <p style={{fontFamily:SANS,fontSize:"0.88rem",color:`${ACC}77`,margin:0}}>
            write a letter that only unlocks on a date you choose 🔒
          </p>
        </div>

        {/* Saved toast */}
        <AnimatePresence>
          {saved&&(
            <motion.div initial={{opacity:0,y:-10,scale:0.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-10}}
              style={{background:`${ACC}18`,border:`1px solid ${ACC}44`,borderRadius:12,padding:"0.9rem 1.2rem",marginBottom:"1.2rem",textAlign:"center",fontFamily:SANS,fontSize:"0.88rem",color:ACC,boxShadow:`0 0 20px ${ACC}22`}}>
              💌 Letter sealed! It'll appear here on the unlock date.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compose button */}
        {!composing&&(
          <motion.button onClick={()=>setComposing(true)}
            whileHover={{scale:1.02,y:-2}} whileTap={{scale:0.97}}
            style={{
              width:"100%",padding:"1.1rem",marginBottom:"1.5rem",
              background:`${ACC}0d`,border:`1.5px dashed ${ACC}44`,
              borderRadius:18,cursor:"pointer",fontFamily:SERIF,fontStyle:"italic",fontSize:"1.05rem",
              color:ACC,display:"flex",alignItems:"center",justifyContent:"center",gap:"0.6rem",
              boxShadow:`0 0 20px ${ACC}08`,
            }}>
            ✍️ write a new letter
          </motion.button>
        )}

        {/* Compose panel */}
        <AnimatePresence>
          {composing&&(
            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}}
              style={{overflow:"hidden",marginBottom:"1.5rem"}}>
              <div style={{background:"rgba(255,255,255,.03)",border:`1px solid ${ACC}22`,borderRadius:20,padding:"1.6rem",boxShadow:`0 0 40px ${ACC}08`}}>
                {/* From */}
                <p style={{fontFamily:SANS,fontSize:"0.68rem",color:`${ACC}66`,letterSpacing:"0.18em",textTransform:"uppercase",margin:"0 0 0.4rem"}}>From</p>
                <input value={from} onChange={e=>setFrom(e.target.value)} placeholder="your name"
                  style={{width:"100%",padding:"0.7rem 0.9rem",border:`1px solid ${ACC}22`,borderRadius:10,fontFamily:SANS,fontSize:"0.92rem",color:SOFT,outline:"none",background:"rgba(255,255,255,.04)",boxSizing:"border-box",marginBottom:"1rem",caretColor:ACC}}/>

                {/* Unlock date */}
                <p style={{fontFamily:SANS,fontSize:"0.68rem",color:`${ACC}66`,letterSpacing:"0.18em",textTransform:"uppercase",margin:"0 0 0.4rem"}}>Unlock date</p>
                <input type="date" value={unlockDate} onChange={e=>setUnlockDate(e.target.value)}
                  min={new Date(Date.now()+86400000).toISOString().slice(0,10)}
                  style={{width:"100%",padding:"0.7rem 0.9rem",border:`1px solid ${ACC}22`,borderRadius:10,fontFamily:SANS,fontSize:"0.92rem",color:SOFT,outline:"none",background:"rgba(255,255,255,.04)",boxSizing:"border-box",marginBottom:"1rem",colorScheme:"dark"}}/>

                {/* Letter body */}
                <p style={{fontFamily:SANS,fontSize:"0.68rem",color:`${ACC}66`,letterSpacing:"0.18em",textTransform:"uppercase",margin:"0 0 0.4rem"}}>Your letter</p>
                <textarea value={letter} onChange={e=>setLetter(e.target.value)}
                  placeholder={"Dear future us,\n\nI wanted you to know…"}
                  rows={8}
                  style={{
                    width:"100%",padding:"1rem",border:`1px solid ${ACC}22`,
                    borderRadius:12,resize:"vertical",fontFamily:SERIF,fontSize:"clamp(0.92rem,2vw,1.05rem)",
                    color:SOFT,outline:"none",background:"rgba(255,255,255,.03)",
                    boxSizing:"border-box",lineHeight:1.9,caretColor:ACC,
                    marginBottom:"1rem",
                  }}/>

                <div style={{display:"flex",gap:"0.8rem"}}>
                  <motion.button onClick={save} disabled={saving||!letter.trim()||!unlockDate}
                    whileHover={{scale:1.03,y:-2}} whileTap={{scale:0.97}}
                    style={{
                      flex:1,padding:"0.9rem",borderRadius:12,border:"none",cursor:"pointer",
                      background:`linear-gradient(135deg,${ACC}cc,#f59e0b)`,
                      color:"#1a1200",fontFamily:SANS,fontSize:"0.95rem",fontWeight:700,
                      opacity:!letter.trim()||!unlockDate?0.4:1,
                      boxShadow:`0 4px 20px ${ACC}44`,
                    }}>
                    {saving?"sealing…":"seal the letter 🔒"}
                  </motion.button>
                  <motion.button onClick={()=>setComposing(false)} whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                    style={{padding:"0.9rem 1.2rem",borderRadius:12,border:`1px solid ${ACC}22`,background:"transparent",color:`${ACC}88`,fontFamily:SANS,fontSize:"0.88rem",cursor:"pointer"}}>
                    cancel
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pending locked letters */}
        {pending.length>0&&(
          <div style={{marginBottom:"1.5rem"}}>
            <p style={{fontFamily:SANS,fontSize:"0.68rem",color:`${ACC}55`,letterSpacing:"0.16em",textTransform:"uppercase",margin:"0 0 0.8rem"}}>
              locked ({pending.length})
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
              {pending.map((p,i)=>{
                const days=daysUntil(p.unlockDate);
                return (
                  <div key={i} style={{background:"rgba(255,255,255,.03)",border:`1px solid ${ACC}18`,borderRadius:14,padding:"1rem 1.2rem",display:"flex",alignItems:"center",gap:"0.8rem"}}>
                    <motion.span style={{fontSize:"1.4rem"}} animate={{rotate:[0,10,-10,0]}} transition={{repeat:Infinity,duration:4,delay:i*0.5}}>🔒</motion.span>
                    <div style={{flex:1}}>
                      <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.9rem",color:SOFT,margin:0}}>
                        {p.from?`From ${p.from}`:"A letter"} — unlocks {fmt(p.unlockDate)}
                      </p>
                      <p style={{fontFamily:SANS,fontSize:"0.72rem",color:`${ACC}66`,margin:"0.15rem 0 0"}}>
                        {days>0?`${days} day${days!==1?"s":""} to go`:"unlocking soon…"}
                      </p>
                    </div>
                    {/* Progress bar */}
                    <div style={{width:60,height:4,borderRadius:2,background:`${ACC}18`,overflow:"hidden",flexShrink:0}}>
                      <div style={{height:"100%",width:`${Math.max(5,100-Math.min(100,(days/365)*100))}%`,background:`linear-gradient(90deg,${ACC}88,${ACC})`,borderRadius:2}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Unlocked letters */}
        {unlocked.length>0&&(
          <div>
            <p style={{fontFamily:SANS,fontSize:"0.68rem",color:`${ACC}55`,letterSpacing:"0.16em",textTransform:"uppercase",margin:"0 0 0.8rem"}}>
              opened ({unlocked.length})
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:"0.8rem"}}>
              {unlocked.map(c=>{
                const isOpen=opened===c.id;
                return (
                  <motion.div key={c.id} layout
                    style={{background:"rgba(255,255,255,.03)",border:`1px solid ${isOpen?ACC+"44":ACC+"18"}`,borderRadius:18,overflow:"hidden",
                      boxShadow:isOpen?`0 0 30px ${ACC}18`:"none",transition:"border 0.3s, box-shadow 0.3s"}}>
                    <div onClick={()=>setOpened(isOpen?null:c.id)}
                      style={{padding:"1.1rem 1.3rem",display:"flex",alignItems:"center",gap:"0.8rem",cursor:"pointer"}}>
                      <motion.span style={{fontSize:"1.5rem",filter:isOpen?`drop-shadow(0 0 8px ${ACC})`:"none"}}
                        animate={isOpen?{rotate:[0,15,-15,0]}:{}} transition={{duration:0.5}}>💌</motion.span>
                      <div style={{flex:1}}>
                        <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.95rem",color:SOFT,margin:0}}>
                          {c.from?`From ${c.from}`:"A letter to us"}
                        </p>
                        <p style={{fontFamily:SANS,fontSize:"0.7rem",color:`${ACC}55`,margin:"0.1rem 0 0"}}>
                          Unlocked {fmt(c.unlockDate)}
                        </p>
                      </div>
                      <span style={{color:`${ACC}44`,fontSize:"0.8rem"}}>{isOpen?"▲":"▼"}</span>
                    </div>
                    <AnimatePresence>
                      {isOpen&&(
                        <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}
                          style={{overflow:"hidden"}}>
                          <div style={{
                            padding:"0 1.5rem 1.5rem",
                            backgroundImage:`repeating-linear-gradient(transparent,transparent 31px,${ACC}08 31px,${ACC}08 32px)`,
                          }}>
                            <div style={{height:1,background:`linear-gradient(90deg,${ACC}33,transparent)`,marginBottom:"1.2rem"}}/>
                            <p style={{fontFamily:SERIF,fontSize:"clamp(0.92rem,2vw,1.05rem)",color:SOFT,lineHeight:2,margin:0,whiteSpace:"pre-wrap",fontStyle:"italic",opacity:0.85}}>
                              {c.letter}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {unlocked.length===0&&pending.length===0&&!composing&&(
          <div style={{textAlign:"center",padding:"3rem 1rem",color:`${ACC}33`,fontFamily:SANS,fontSize:"0.9rem"}}>
            <div style={{fontSize:"2.5rem",marginBottom:"0.8rem",opacity:0.3}}>💌</div>
            No letters yet — write the first one
          </div>
        )}
      </motion.div>
    </section>
  );
}