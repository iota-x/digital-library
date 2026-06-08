"use client";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SERIF  = `"Georgia","Times New Roman",serif`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
const SCRIPT = `var(--font-caveat),"Segoe Script",cursive`;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface Capsule { id:string; letter:string; unlockDate:string; from:string; createdAt:string; }

export default function TimeCapsule() {
  const [unlocked,  setUnlocked]  = useState<Capsule[]>([]);
  const [composing, setComposing] = useState(false);
  const [letter,    setLetter]    = useState("");
  const [unlockDate,setUnlockDate]= useState("");
  const [from,      setFrom]      = useState("");
  const [saving,    setSaving]    = useState(false);
  const [opened,    setOpened]    = useState<string|null>(null);
  const [saved,     setSaved]     = useState(false);

  // also store "pending" capsules locally (they won't come from API until unlock date)
  const [pending, setPending] = useState<{unlockDate:string;from:string;createdAt:string}[]>([]);

  useEffect(()=>{
    fetch("/api/capsules").then(r=>r.json()).then((arr:Capsule[])=>setUnlocked(arr.sort((a,b)=>a.unlockDate.localeCompare(b.unlockDate))));
    const stored = localStorage.getItem("capsule_pending");
    if (stored) setPending(JSON.parse(stored));
  },[]);

  const save = async () => {
    if (!letter.trim()||!unlockDate) return;
    setSaving(true);
    const res = await fetch("/api/capsules",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({letter,unlockDate,from})});
    const data = await res.json();
    // track locally that we wrote one (without storing the letter)
    const newPending = [...pending,{unlockDate,from,createdAt:new Date().toISOString()}];
    setPending(newPending);
    localStorage.setItem("capsule_pending",JSON.stringify(newPending));
    setSaving(false); setSaved(true); setComposing(false);
    setLetter(""); setUnlockDate(""); setFrom("");
    setTimeout(()=>setSaved(false),3000);
  };

  const fmtDate = (d:string) => { const dt=new Date(d+"T12:00:00"); return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`; };
  const daysUntil = (d:string) => Math.ceil((new Date(d+"T12:00:00").getTime()-Date.now())/86400000);

  return (
    <section style={{
      position:"relative",width:"100%",
      padding:"4rem clamp(1rem,3vw,2rem) 5rem",
      background:"linear-gradient(160deg,#fff5f9,#fce7f3 40%,#fff0f5)",
      overflow:"hidden",
    }}>
      <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{maxWidth:640,margin:"0 auto"}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",marginBottom:"0.8rem"}}>
            <div style={{width:45,height:1,background:"linear-gradient(90deg,transparent,#f9a8d4)"}}/>
            <motion.span style={{fontSize:"1.5rem"}} animate={{y:[-3,3,-3]}} transition={{repeat:Infinity,duration:2.5}}>💌</motion.span>
            <div style={{width:45,height:1,background:"linear-gradient(90deg,#f9a8d4,transparent)"}}/>
          </div>
          <h2 style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1.5rem,4vw,2.2rem)",color:"#be185d",margin:"0 0 0.3rem",fontWeight:400}}>
            time capsule letters
          </h2>
          <p style={{fontFamily:SANS,fontSize:"0.88rem",color:"rgba(190,24,93,.5)",margin:0}}>
            write a letter that only unlocks on a date you choose 🔒
          </p>
        </div>

        {/* Saved confirmation */}
        <AnimatePresence>
          {saved&&(
            <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}
              style={{background:"rgba(236,72,153,.1)",border:"1px solid rgba(236,72,153,.25)",borderRadius:12,padding:"0.9rem 1.2rem",marginBottom:"1.2rem",textAlign:"center",fontFamily:SANS,fontSize:"0.9rem",color:"#be185d"}}>
              💌 Letter sealed and locked! It'll appear here on the unlock date.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compose button */}
        {!composing&&(
          <motion.button onClick={()=>setComposing(true)}
            whileHover={{scale:1.03,y:-2}} whileTap={{scale:0.97}}
            style={{
              width:"100%",padding:"1rem",marginBottom:"1.5rem",
              background:"linear-gradient(135deg,rgba(249,168,212,.15),rgba(253,186,213,.15))",
              border:"1.5px dashed rgba(249,168,212,.5)",borderRadius:16,
              cursor:"pointer",fontFamily:SERIF,fontStyle:"italic",fontSize:"1.05rem",
              color:"#be185d",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.6rem",
            }}>
            ✍️ write a new letter
          </motion.button>
        )}

        {/* Compose panel */}
        <AnimatePresence>
          {composing&&(
            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}}
              style={{overflow:"hidden",marginBottom:"1.5rem"}}>
              <div style={{background:"rgba(255,255,255,.85)",border:"1px solid rgba(249,168,212,.3)",borderRadius:20,padding:"1.6rem",boxShadow:"0 4px 24px rgba(244,114,182,.1)"}}>
                <p style={{fontFamily:SANS,fontSize:"0.72rem",color:"rgba(190,24,93,.5)",letterSpacing:"0.14em",textTransform:"uppercase",margin:"0 0 0.5rem"}}>From</p>
                <input value={from} onChange={e=>setFrom(e.target.value)} placeholder="who's writing this? (e.g. your name)"
                  style={{width:"100%",padding:"0.7rem 0.9rem",border:"1px solid rgba(249,168,212,.3)",borderRadius:10,fontFamily:SANS,fontSize:"0.92rem",color:"#7c3f58",outline:"none",background:"rgba(252,231,243,.2)",boxSizing:"border-box",marginBottom:"1rem"}}/>

                <p style={{fontFamily:SANS,fontSize:"0.72rem",color:"rgba(190,24,93,.5)",letterSpacing:"0.14em",textTransform:"uppercase",margin:"0 0 0.5rem"}}>Unlock date</p>
                <input type="date" value={unlockDate} onChange={e=>setUnlockDate(e.target.value)}
                  min={new Date(Date.now()+86400000).toISOString().slice(0,10)}
                  style={{width:"100%",padding:"0.7rem 0.9rem",border:"1px solid rgba(249,168,212,.3)",borderRadius:10,fontFamily:SANS,fontSize:"0.92rem",color:"#7c3f58",outline:"none",background:"rgba(252,231,243,.2)",boxSizing:"border-box",marginBottom:"1rem"}}/>

                <p style={{fontFamily:SANS,fontSize:"0.72rem",color:"rgba(190,24,93,.5)",letterSpacing:"0.14em",textTransform:"uppercase",margin:"0 0 0.5rem"}}>Your letter</p>
                <textarea value={letter} onChange={e=>setLetter(e.target.value)}
                  placeholder={"Dear future us,\n\nI wanted you to know…"}
                  rows={8}
                  style={{
                    width:"100%",padding:"1rem",border:"1px solid rgba(249,168,212,.3)",
                    borderRadius:12,resize:"vertical",fontFamily:SERIF,fontSize:"clamp(0.92rem,2vw,1.05rem)",
                    color:"#7c3f58",outline:"none",background:"rgba(252,231,243,.15)",
                    boxSizing:"border-box",lineHeight:1.85,caretColor:"#ec4899",
                    marginBottom:"1rem",
                  }}/>

                <div style={{display:"flex",gap:"0.8rem"}}>
                  <motion.button onClick={save} disabled={saving||!letter.trim()||!unlockDate}
                    whileHover={{scale:1.03,y:-2}} whileTap={{scale:0.97}}
                    style={{
                      flex:1,padding:"0.9rem",borderRadius:12,border:"none",cursor:"pointer",
                      background:"linear-gradient(135deg,#f9a8d4,#ec4899)",
                      color:"#fff",fontFamily:SANS,fontSize:"0.95rem",fontWeight:600,
                      opacity:!letter.trim()||!unlockDate?0.5:1,
                      boxShadow:"0 4px 18px rgba(236,72,153,.3)",
                    }}>
                    {saving?"sealing…":"seal the letter 🔒"}
                  </motion.button>
                  <motion.button onClick={()=>setComposing(false)} whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                    style={{padding:"0.9rem 1.2rem",borderRadius:12,border:"1px solid rgba(249,168,212,.3)",background:"transparent",color:"rgba(190,24,93,.5)",fontFamily:SANS,fontSize:"0.88rem",cursor:"pointer"}}>
                    cancel
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pending (locked) capsules */}
        {pending.length>0&&(
          <div style={{marginBottom:"1.5rem"}}>
            <p style={{fontFamily:SANS,fontSize:"0.72rem",color:"rgba(190,24,93,.45)",letterSpacing:"0.14em",textTransform:"uppercase",margin:"0 0 0.8rem"}}>
              Locked letters ({pending.length})
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
              {pending.map((p,i)=>{
                const days=daysUntil(p.unlockDate);
                return (
                  <div key={i} style={{background:"rgba(255,255,255,.6)",border:"1px solid rgba(249,168,212,.2)",borderRadius:14,padding:"1rem 1.2rem",display:"flex",alignItems:"center",gap:"0.8rem"}}>
                    <span style={{fontSize:"1.4rem"}}>🔒</span>
                    <div style={{flex:1}}>
                      <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.92rem",color:"#be185d",margin:0}}>
                        {p.from ? `From ${p.from}` : "A letter"} — unlocks {fmtDate(p.unlockDate)}
                      </p>
                      <p style={{fontFamily:SANS,fontSize:"0.75rem",color:"rgba(190,24,93,.4)",margin:"0.15rem 0 0"}}>
                        {days>0?`${days} day${days!==1?"s":""} to go`:"unlocking soon…"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Unlocked capsules */}
        {unlocked.length>0&&(
          <div>
            <p style={{fontFamily:SANS,fontSize:"0.72rem",color:"rgba(190,24,93,.45)",letterSpacing:"0.14em",textTransform:"uppercase",margin:"0 0 0.8rem"}}>
              Opened letters ({unlocked.length})
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:"0.8rem"}}>
              {unlocked.map(c=>{
                const isOpen=opened===c.id;
                return (
                  <motion.div key={c.id} layout
                    style={{background:"rgba(255,255,255,.82)",border:"1px solid rgba(249,168,212,.28)",borderRadius:18,overflow:"hidden",boxShadow:"0 2px 16px rgba(244,114,182,.1)"}}>
                    <div onClick={()=>setOpened(isOpen?null:c.id)}
                      style={{padding:"1.1rem 1.3rem",display:"flex",alignItems:"center",gap:"0.8rem",cursor:"pointer"}}>
                      <motion.span style={{fontSize:"1.4rem"}} animate={isOpen?{rotate:[0,15,-15,0]}:{}} transition={{duration:0.5}}>💌</motion.span>
                      <div style={{flex:1}}>
                        <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.95rem",color:"#be185d",margin:0}}>
                          {c.from?`From ${c.from}`:"A letter to us"}
                        </p>
                        <p style={{fontFamily:SANS,fontSize:"0.72rem",color:"rgba(190,24,93,.4)",margin:"0.1rem 0 0"}}>
                          Unlocked {fmtDate(c.unlockDate)}
                        </p>
                      </div>
                      <span style={{color:"rgba(190,24,93,.35)",fontSize:"0.8rem"}}>{isOpen?"▲":"▼"}</span>
                    </div>
                    <AnimatePresence>
                      {isOpen&&(
                        <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}
                          style={{overflow:"hidden"}}>
                          <div style={{
                            padding:"0 1.4rem 1.4rem 1.4rem",
                            backgroundImage:"repeating-linear-gradient(transparent,transparent 31px,rgba(249,168,212,.08) 31px,rgba(249,168,212,.08) 32px)",
                          }}>
                            <div style={{height:1,background:"linear-gradient(90deg,rgba(249,168,212,.4),transparent)",marginBottom:"1.2rem"}}/>
                            <p style={{fontFamily:SERIF,fontSize:"clamp(0.92rem,2vw,1.05rem)",color:"#7c3f58",lineHeight:1.9,margin:0,whiteSpace:"pre-wrap",fontStyle:"italic"}}>
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
          <div style={{textAlign:"center",padding:"2rem",color:"rgba(190,24,93,.3)",fontFamily:SANS,fontSize:"0.9rem"}}>
            <div style={{fontSize:"2rem",marginBottom:"0.6rem",opacity:0.4}}>💌</div>
            No letters yet — write the first one!
          </div>
        )}
      </motion.div>
    </section>
  );
}