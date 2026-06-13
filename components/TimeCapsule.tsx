"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SERIF  = `"Georgia","Times New Roman",serif`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ── Capsule palette 1: soft blush → deep rose ── */
const BG   = "linear-gradient(180deg,#fff0f5 0%,#fce7f3 30%,#f9a8d4 65%,#db2777 100%)";
const ACC  = "#be185d";
const SOFT = "#1a0812";
const MID  = "#9d174d";

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
    fetch("/api/timecapsule").then(r=>r.json()).then((arr:Capsule[])=>{
      const sorted=arr.sort((a,b)=>a.unlockDate.localeCompare(b.unlockDate));
      setUnlocked(sorted);
      // Remove pending entries that are now unlocked in DB
      try{
        const s=localStorage.getItem("capsule_pending");
        if(s){
          const all=JSON.parse(s) as {unlockDate:string;from:string;createdAt:string}[];
          const unlockedDates=new Set(sorted.map(c=>c.unlockDate));
          const still=all.filter(p=>!unlockedDates.has(p.unlockDate)||new Date(p.unlockDate+"T12:00:00")>new Date());
          setPending(still);
          localStorage.setItem("capsule_pending",JSON.stringify(still));
        }
      }catch{}
    }).catch(()=>{
      try{ const s=localStorage.getItem("capsule_pending"); if(s) setPending(JSON.parse(s)); }catch{}
    });
  },[]);

  const save=async()=>{
    if(!letter.trim()||!unlockDate) return;
    setSaving(true);
    await fetch("/api/timecapsule",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({letter,unlockDate,from})});
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
      {/* Floating petals */}
      {Array.from({length:20},(_,i)=>(
        <motion.div key={i}
          animate={{y:[0,-50,0],opacity:[0,0.5,0],x:[0,Math.random()*24-12,0],rotate:[0,180,360]}}
          transition={{repeat:Infinity,duration:5+Math.random()*4,delay:Math.random()*6,ease:"easeInOut"}}
          style={{
            position:"absolute",
            left:`${Math.random()*100}%`,bottom:`${Math.random()*80}%`,
            fontSize:Math.random()>0.5?"1.1rem":"0.8rem",
            pointerEvents:"none",userSelect:"none",
          }}>
          {["🌸","💗","🌷","💕","🩷"][Math.floor(Math.random()*5)]}
        </motion.div>
      ))}

      <motion.div initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{maxWidth:640,width:"100%",position:"relative",zIndex:2}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",marginBottom:"1rem"}}>
            <div style={{width:50,height:1,background:`linear-gradient(90deg,transparent,${ACC}66)`}}/>
            <motion.span style={{fontSize:"2rem",filter:`drop-shadow(0 0 10px rgba(190,24,93,.4))`}}
              animate={{y:[-4,4,-4],rotate:[-6,6,-6]}} transition={{repeat:Infinity,duration:3}}>💌</motion.span>
            <div style={{width:50,height:1,background:`linear-gradient(90deg,${ACC}66,transparent)`}}/>
          </div>
          <h2 style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1.8rem,5vw,2.8rem)",color:ACC,margin:"0 0 0.4rem",fontWeight:400,textShadow:"0 2px 20px rgba(190,24,93,.15)"}}>
            time capsule letters
          </h2>
          <p style={{fontFamily:SANS,fontSize:"0.88rem",color:"rgba(190,24,93,.6)",margin:0}}>
            write a letter that only unlocks on a date you choose 🔒
          </p>
        </div>

        {/* Saved toast */}
        <AnimatePresence>
          {saved&&(
            <motion.div initial={{opacity:0,y:-10,scale:0.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-10}}
              style={{background:"rgba(190,24,93,.08)",border:"1px solid rgba(190,24,93,.3)",borderRadius:12,padding:"0.9rem 1.2rem",marginBottom:"1.2rem",textAlign:"center",fontFamily:SANS,fontSize:"0.88rem",color:ACC}}>
              💌 Letter sealed! It'll appear here on the unlock date.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compose button */}
        {!composing&&(
          <motion.button onClick={()=>setComposing(true)}
            whileHover={{scale:1.02,y:-3,boxShadow:"0 12px 40px rgba(190,24,93,.25)"}}
            whileTap={{scale:0.97}}
            style={{
              width:"100%",padding:"1.2rem",marginBottom:"1.5rem",
              background:"rgba(255,255,255,.85)",
              border:"1.5px dashed rgba(190,24,93,.4)",
              borderRadius:18,cursor:"pointer",fontFamily:SERIF,fontStyle:"italic",fontSize:"1.05rem",
              color:ACC,display:"flex",alignItems:"center",justifyContent:"center",gap:"0.6rem",
              backdropFilter:"blur(8px)",
              boxShadow:"0 4px 20px rgba(190,24,93,.1)",
            }}>
            ✍️ write a new letter
          </motion.button>
        )}

        {/* Compose panel */}
        <AnimatePresence>
          {composing&&(
            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}}
              style={{overflow:"hidden",marginBottom:"1.5rem"}}>
              <div style={{background:"rgba(255,255,255,.88)",border:"1px solid rgba(190,24,93,.2)",borderRadius:22,padding:"1.8rem",boxShadow:"0 8px 40px rgba(190,24,93,.12)",backdropFilter:"blur(12px)"}}>

                <p style={{fontFamily:SANS,fontSize:"0.68rem",color:"rgba(190,24,93,.5)",letterSpacing:"0.18em",textTransform:"uppercase",margin:"0 0 0.4rem"}}>From</p>
                <input value={from} onChange={e=>setFrom(e.target.value)} placeholder="your name"
                  style={{width:"100%",padding:"0.75rem 1rem",border:"1px solid rgba(190,24,93,.2)",borderRadius:10,fontFamily:SANS,fontSize:"0.92rem",color:"#4a1628",outline:"none",background:"rgba(252,231,243,.3)",boxSizing:"border-box",marginBottom:"1rem",caretColor:ACC}}/>

                <p style={{fontFamily:SANS,fontSize:"0.68rem",color:"rgba(190,24,93,.5)",letterSpacing:"0.18em",textTransform:"uppercase",margin:"0 0 0.4rem"}}>Unlock date</p>
                <input type="date" value={unlockDate} onChange={e=>setUnlockDate(e.target.value)}
                  min={new Date().toISOString().slice(0,10)}
                  style={{width:"100%",padding:"0.75rem 1rem",border:"1px solid rgba(190,24,93,.2)",borderRadius:10,fontFamily:SANS,fontSize:"0.92rem",color:"#4a1628",outline:"none",background:"rgba(252,231,243,.3)",boxSizing:"border-box",marginBottom:"1rem"}}/>

                <p style={{fontFamily:SANS,fontSize:"0.68rem",color:"rgba(190,24,93,.5)",letterSpacing:"0.18em",textTransform:"uppercase",margin:"0 0 0.4rem"}}>Your letter</p>
                <textarea value={letter} onChange={e=>setLetter(e.target.value)}
                  placeholder={"Dear future us,\n\nI wanted you to know…"}
                  rows={8}
                  style={{
                    width:"100%",padding:"1rem",border:"1px solid rgba(190,24,93,.2)",
                    borderRadius:12,resize:"vertical",fontFamily:SERIF,fontSize:"clamp(0.95rem,2vw,1.08rem)",
                    color:"#4a1628",outline:"none",background:"rgba(255,248,252,.6)",
                    boxSizing:"border-box",lineHeight:1.95,caretColor:ACC,marginBottom:"1rem",
                    backgroundImage:"repeating-linear-gradient(transparent,transparent 31px,rgba(190,24,93,.06) 31px,rgba(190,24,93,.06) 32px)",
                  }}/>

                <div style={{display:"flex",gap:"0.8rem"}}>
                  <motion.button onClick={save} disabled={saving||!letter.trim()||!unlockDate}
                    whileHover={{scale:1.03,y:-2}} whileTap={{scale:0.97}}
                    style={{
                      flex:1,padding:"0.95rem",borderRadius:12,border:"none",cursor:"pointer",
                      background:"linear-gradient(135deg,#f472b6,#be185d)",
                      color:"#fff",fontFamily:SANS,fontSize:"0.95rem",fontWeight:700,
                      opacity:!letter.trim()||!unlockDate?0.45:1,
                      boxShadow:"0 4px 20px rgba(190,24,93,.35)",
                    }}>
                    {saving?"sealing…":"seal the letter 🔒"}
                  </motion.button>
                  <motion.button onClick={()=>setComposing(false)} whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                    style={{padding:"0.95rem 1.2rem",borderRadius:12,border:"1px solid rgba(190,24,93,.25)",background:"transparent",color:"rgba(190,24,93,.6)",fontFamily:SANS,fontSize:"0.88rem",cursor:"pointer"}}>
                    cancel
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pending */}
        {pending.length>0&&(
          <div style={{marginBottom:"1.5rem"}}>
            <p style={{fontFamily:SANS,fontSize:"0.68rem",color:"rgba(190,24,93,.5)",letterSpacing:"0.16em",textTransform:"uppercase",margin:"0 0 0.8rem"}}>
              locked ({pending.length})
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
              {pending.map((p,i)=>{
                const days=daysUntil(p.unlockDate);
                return (
                  <div key={i} style={{background:"rgba(255,255,255,.7)",border:"1px solid rgba(190,24,93,.18)",borderRadius:14,padding:"1rem 1.2rem",display:"flex",alignItems:"center",gap:"0.8rem",backdropFilter:"blur(8px)"}}>
                    <motion.span style={{fontSize:"1.4rem"}} animate={{rotate:[0,10,-10,0]}} transition={{repeat:Infinity,duration:4,delay:i*0.5}}>🔒</motion.span>
                    <div style={{flex:1}}>
                      <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.9rem",color:"#4a1628",margin:0}}>
                        {p.from?`From ${p.from}`:"A letter"} — unlocks {fmt(p.unlockDate)}
                      </p>
                      <p style={{fontFamily:SANS,fontSize:"0.72rem",color:"rgba(190,24,93,.5)",margin:"0.15rem 0 0"}}>
                        {days>0?`${days} day${days!==1?"s":""} to go`:"unlocking soon…"}
                      </p>
                    </div>
                    <div style={{width:60,height:4,borderRadius:2,background:"rgba(190,24,93,.12)",overflow:"hidden",flexShrink:0}}>
                      <div style={{height:"100%",width:`${Math.max(5,100-Math.min(100,(days/365)*100))}%`,background:"linear-gradient(90deg,#f9a8d4,#be185d)",borderRadius:2}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Unlocked */}
        {unlocked.length>0&&(
          <div>
            <p style={{fontFamily:SANS,fontSize:"0.68rem",color:"rgba(190,24,93,.5)",letterSpacing:"0.16em",textTransform:"uppercase",margin:"0 0 0.8rem"}}>
              opened ({unlocked.length})
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:"0.8rem"}}>
              {unlocked.map(c=>{
                const isOpen=opened===c.id;
                return (
                  <motion.div key={c.id} layout
                    style={{
                      background:"rgba(255,255,255,.78)",
                      border:`1px solid ${isOpen?"rgba(190,24,93,.4)":"rgba(190,24,93,.18)"}`,
                      borderRadius:18,overflow:"hidden",
                      boxShadow:isOpen?"0 8px 32px rgba(190,24,93,.15)":"0 2px 12px rgba(190,24,93,.06)",
                      backdropFilter:"blur(8px)",transition:"border 0.3s,box-shadow 0.3s",
                    }}>
                    <div onClick={()=>setOpened(isOpen?null:c.id)}
                      style={{padding:"1.1rem 1.4rem",display:"flex",alignItems:"center",gap:"0.8rem",cursor:"pointer"}}>
                      <motion.span style={{fontSize:"1.5rem"}}
                        animate={isOpen?{rotate:[0,15,-15,0]}:{}} transition={{duration:0.5}}>💌</motion.span>
                      <div style={{flex:1}}>
                        <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.95rem",color:"#4a1628",margin:0}}>
                          {c.from?`From ${c.from}`:"A letter to us"}
                        </p>
                        <p style={{fontFamily:SANS,fontSize:"0.7rem",color:"rgba(190,24,93,.45)",margin:"0.1rem 0 0"}}>
                          Unlocked {fmt(c.unlockDate)}
                        </p>
                      </div>
                      <span style={{color:"rgba(190,24,93,.35)",fontSize:"0.8rem"}}>{isOpen?"▲":"▼"}</span>
                    </div>
                    <AnimatePresence>
                      {isOpen&&(
                        <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}
                          style={{overflow:"hidden"}}>
                          <div style={{
                            padding:"0 1.5rem 1.6rem",
                            backgroundImage:"repeating-linear-gradient(transparent,transparent 31px,rgba(190,24,93,.05) 31px,rgba(190,24,93,.05) 32px)",
                          }}>
                            <div style={{height:1,background:"linear-gradient(90deg,rgba(190,24,93,.3),transparent)",marginBottom:"1.3rem"}}/>
                            <p style={{fontFamily:SERIF,fontSize:"clamp(0.95rem,2vw,1.08rem)",color:"#4a1628",lineHeight:2,margin:0,whiteSpace:"pre-wrap",fontStyle:"italic"}}>
                              {c.letter}
                            </p>
                            <p style={{fontFamily:SANS,fontSize:"0.8rem",color:"rgba(190,24,93,.4)",textAlign:"right",marginTop:"1rem",marginBottom:0,fontStyle:"italic"}}>
                              — with love 🩷
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
          <div style={{textAlign:"center",padding:"3rem 1rem"}}>
            <div style={{fontSize:"2.5rem",marginBottom:"0.8rem",opacity:0.35}}>💌</div>
            <p style={{fontFamily:SANS,fontSize:"0.9rem",color:"rgba(190,24,93,.45)",margin:0}}>No letters yet — write the first one</p>
          </div>
        )}
      </motion.div>
    </section>
  );
}