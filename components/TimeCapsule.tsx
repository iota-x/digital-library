"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserData } from "@/lib/userStore";
import { uploadToCloudinary } from "@/lib/cloudUpload";

const SERIF  = `"Georgia","Times New Roman",serif`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const BG     = "linear-gradient(180deg,var(--rose) 0%,var(--pink-light) 30%,var(--pink) 65%,var(--pink-deep) 100%)";
const ACC    = "var(--pink-deep)";

interface Capsule { id:string; letter:string; unlockDate:string; from:string; createdAt:string; imageUrl?:string; }
interface Pending  { id?:string; unlockDate:string; from:string; createdAt:string; imageUrl?:string; }

const LS_READ     = (id: string) => `capsule_read_${id}`;
const LS_ARCHIVED = (id: string) => `capsule_archived_${id}`;

function fmt(d:string){ const dt=new Date(d+"T12:00:00"); return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`; }
function daysUntil(d:string){ return Math.ceil((new Date(d+"T12:00:00").getTime()-Date.now())/86400000); }

export default function TimeCapsule() {
  const userData = useUserData();
  const [unlocked,     setUnlocked]     = useState<Capsule[]>([]);
  const [composing,    setComposing]    = useState(false);
  const [letter,       setLetter]       = useState("");
  const [unlockDate,   setUnlockDate]   = useState("");
  const [from,         setFrom]         = useState(userData?.name ?? "");
  const [saving,       setSaving]       = useState(false);
  const [opened,       setOpened]       = useState<string|null>(null);
  const [saved,        setSaved]        = useState(false);
  const [pending,      setPending]      = useState<Pending[]>([]);
  const [photoUrl,     setPhotoUrl]     = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [showChoices,    setShowChoices]    = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState<string|null>(null);
  // Track which letters this device has marked as archived (mirrors localStorage; state for re-render)
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const choiceTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  useEffect(() => {
    if (userData?.name && !from) setFrom(userData.name);
  }, [userData?.name, from]);

  // Load archived ids from localStorage
  useEffect(() => {
    try {
      const set = new Set<string>();
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith("capsule_archived_") && localStorage.getItem(k) === "1") {
          set.add(k.replace("capsule_archived_", ""));
        }
      }
      setArchivedIds(set);
    } catch {}
  }, []);

  useEffect(()=>{
    fetch("/api/timecapsule").then(r=>r.json()).then((arr:Capsule[])=>{
      const sorted=arr.sort((a,b)=>a.unlockDate.localeCompare(b.unlockDate));
      setUnlocked(sorted);
      try{
        const s=localStorage.getItem("capsule_pending");
        if(s){
          const all=JSON.parse(s) as Pending[];
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

  // Categorise unlocked letters: archived vs ready/just-read
  const { active, archived } = useMemo(() => {
    const a: Capsule[] = [];
    const r: Capsule[] = [];
    unlocked.forEach(c => (archivedIds.has(c.id) ? a : r).push(c));
    return { active: r, archived: a };
  }, [unlocked, archivedIds]);

  const wasRead = (id: string): boolean => {
    try { return !!localStorage.getItem(LS_READ(id)); } catch { return false; }
  };

  const uploadPhoto = async (file: File) => {
    setPhotoUploading(true);
    try {
      const url = await uploadToCloudinary(file, { resourceType: "image", folder: "capsules" });
      setPhotoUrl(url);
    } catch { setPhotoUrl(""); }
    finally { setPhotoUploading(false); }
  };

  const save = async () => {
    if (!letter.trim() || !unlockDate) return;
    setSaving(true);
    const res = await fetch("/api/timecapsule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ letter, unlockDate, from, imageUrl: photoUrl }),
    });
    const { id } = await res.json().catch(() => ({}));
    const np: Pending[] = [...pending, { id, unlockDate, from, createdAt: new Date().toISOString(), imageUrl: photoUrl }];
    setPending(np); localStorage.setItem("capsule_pending", JSON.stringify(np));
    setSaving(false); setSaved(true); setComposing(false);
    setLetter(""); setUnlockDate(""); setFrom(""); setPhotoUrl("");
    setTimeout(()=>setSaved(false), 3500);
  };

  const deletePending = async (idx: number) => {
    const p = pending[idx];
    if (p.id) {
      await fetch("/api/timecapsule", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }) }).catch(()=>{});
    }
    const np = pending.filter((_, i) => i !== idx);
    setPending(np); localStorage.setItem("capsule_pending", JSON.stringify(np));
  };

  const handleOpen = (id: string) => {
    const willOpen = opened !== id;
    setOpened(willOpen ? id : null);
    setShowChoices(false);
    if (choiceTimer.current) clearTimeout(choiceTimer.current);
    if (willOpen) {
      // Mark as read first time
      try { if (!localStorage.getItem(LS_READ(id))) localStorage.setItem(LS_READ(id), String(Date.now())); } catch {}
      // Slight delay so the letter is read before the choices appear
      choiceTimer.current = setTimeout(() => setShowChoices(true), 1800);
    }
  };

  const keepSafe = (id: string) => {
    try { localStorage.setItem(LS_ARCHIVED(id), "1"); } catch {}
    setArchivedIds(prev => { const n = new Set(prev); n.add(id); return n; });
    setOpened(null);
    setShowChoices(false);
  };

  const reopenArchived = (id: string) => {
    try { localStorage.removeItem(LS_ARCHIVED(id)); } catch {}
    setArchivedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const releaseLetter = async (id: string) => {
    setUnlocked(prev => prev.filter(c => c.id !== id));
    setOpened(null);
    setShowChoices(false);
    setConfirmDelete(null);
    try { localStorage.removeItem(LS_READ(id)); localStorage.removeItem(LS_ARCHIVED(id)); } catch {}
    setArchivedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    await fetch("/api/timecapsule", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(()=>{});
  };

  return (
    <section style={{position:"relative",width:"100%",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"clamp(4rem,8vh,7rem) clamp(1rem,4vw,3rem)",background:BG,overflow:"hidden"}}>

      {/* Floating petals */}
      {[3,54,27,62,10,44,68,6,38,18,58,1,46,31,64,13,50,72,22,56].map((l,i)=>(
        <motion.div key={i}
          animate={{y:[0,-48,0],opacity:[0,0.55,0],rotate:[0,180,360]}}
          transition={{repeat:Infinity,duration:5+(i%4)*1.1,delay:(i*0.4)%6,ease:"easeInOut"}}
          style={{position:"absolute",left:`${l}%`,bottom:`${(i*7+10)%80}%`,fontSize:i%3===0?"1.1rem":"0.85rem",pointerEvents:"none",userSelect:"none"}}>
          {["🌸","💗","🌷","💕","🩷"][i%5]}
        </motion.div>
      ))}

      <motion.div initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{maxWidth:640,width:"100%",position:"relative",zIndex:2}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",marginBottom:"1rem"}}>
            <div style={{width:50,height:1,background:`linear-gradient(90deg,transparent,rgba(var(--pink-deep-rgb),.45))`}}/>
            <motion.span style={{fontSize:"2rem",filter:"drop-shadow(0 0 10px rgba(var(--pink-deep-rgb),.4))"}}
              animate={{y:[-4,4,-4],rotate:[-6,6,-6]}} transition={{repeat:Infinity,duration:3}}>💌</motion.span>
            <div style={{width:50,height:1,background:`linear-gradient(90deg,rgba(var(--pink-deep-rgb),.45),transparent)`}}/>
          </div>
          <h2 style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1.8rem,5vw,2.8rem)",color:ACC,margin:"0 0 0.4rem",fontWeight:400,textShadow:"0 2px 20px rgba(var(--pink-deep-rgb),.15)"}}>
            time capsule letters
          </h2>
          <p style={{fontFamily:SANS,fontSize:"0.88rem",color:"var(--muted)",margin:0}}>
            write a letter that only unlocks on a date you choose 🔒
          </p>
        </div>

        {/* Saved toast */}
        <AnimatePresence>
          {saved&&(
            <motion.div initial={{opacity:0,y:-10,scale:0.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-10}}
              style={{background:"var(--cream)",border:"1px solid rgba(var(--pink-deep-rgb),.3)",borderRadius:12,padding:"0.9rem 1.2rem",marginBottom:"1.2rem",textAlign:"center",fontFamily:SANS,fontSize:"0.88rem",color:ACC}}>
              💌 Letter sealed! It&apos;ll appear here on the unlock date.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compose button */}
        {!composing&&(
          <motion.button onClick={()=>setComposing(true)}
            whileHover={{scale:1.02,y:-3,boxShadow:"0 12px 40px rgba(var(--pink-deep-rgb),.25)"}} whileTap={{scale:0.97}}
            style={{width:"100%",padding:"1.2rem",marginBottom:"1.5rem",background:"var(--cream)",border:"1.5px dashed rgba(var(--pink-deep-rgb),.4)",borderRadius:18,cursor:"pointer",fontFamily:SERIF,fontStyle:"italic",fontSize:"1.05rem",color:ACC,display:"flex",alignItems:"center",justifyContent:"center",gap:"0.6rem",boxShadow:"0 4px 20px rgba(var(--pink-deep-rgb),.1)"}}>
            ✍️ write a new letter
          </motion.button>
        )}

        {/* Compose panel */}
        <AnimatePresence>
          {composing&&(
            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}}
              style={{overflow:"hidden",marginBottom:"1.5rem"}}>
              <div style={{background:"var(--cream)",border:"1px solid rgba(var(--pink-deep-rgb),.2)",borderRadius:22,padding:"1.8rem",boxShadow:"0 8px 40px rgba(var(--pink-deep-rgb),.12)"}}>

                <p style={{fontFamily:SANS,fontSize:"0.68rem",color:"var(--muted)",letterSpacing:"0.18em",textTransform:"uppercase",margin:"0 0 0.4rem"}}>From</p>
                <input value={from} onChange={e=>setFrom(e.target.value)} placeholder="your name"
                  style={{width:"100%",padding:"0.75rem 1rem",border:"1px solid rgba(var(--pink-deep-rgb),.25)",borderRadius:10,fontFamily:SANS,fontSize:"0.92rem",color:"var(--text)",outline:"none",background:"rgba(var(--pink-light-rgb),.4)",boxSizing:"border-box",marginBottom:"1rem",caretColor:ACC}}/>

                <p style={{fontFamily:SANS,fontSize:"0.68rem",color:"var(--muted)",letterSpacing:"0.18em",textTransform:"uppercase",margin:"0 0 0.4rem"}}>Unlock date</p>
                <input type="date" value={unlockDate} onChange={e=>setUnlockDate(e.target.value)}
                  min={new Date().toISOString().slice(0,10)}
                  style={{width:"100%",padding:"0.75rem 1rem",border:"1px solid rgba(var(--pink-deep-rgb),.25)",borderRadius:10,fontFamily:SANS,fontSize:"0.92rem",color:"var(--text)",outline:"none",background:"rgba(var(--pink-light-rgb),.4)",boxSizing:"border-box",marginBottom:"1rem"}}/>

                <p style={{fontFamily:SANS,fontSize:"0.68rem",color:"var(--muted)",letterSpacing:"0.18em",textTransform:"uppercase",margin:"0 0 0.4rem"}}>Your letter</p>
                <textarea value={letter} onChange={e=>setLetter(e.target.value)}
                  placeholder={"Dear future us,\n\nI wanted you to know…"}
                  rows={8}
                  style={{width:"100%",padding:"1rem",border:"1px solid rgba(var(--pink-deep-rgb),.25)",borderRadius:12,resize:"vertical",fontFamily:SERIF,fontSize:"clamp(0.95rem,2vw,1.08rem)",color:"var(--text)",outline:"none",background:"rgba(var(--pink-light-rgb),.3)",boxSizing:"border-box",lineHeight:1.95,caretColor:ACC,marginBottom:"1rem",backgroundImage:"repeating-linear-gradient(transparent,transparent 31px,rgba(var(--pink-deep-rgb),.06) 31px,rgba(var(--pink-deep-rgb),.06) 32px)"}}/>

                <p style={{fontFamily:SANS,fontSize:"0.68rem",color:"var(--muted)",letterSpacing:"0.18em",textTransform:"uppercase",margin:"0 0 0.4rem"}}>Photo (optional)</p>
                <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}}
                  onChange={e=>{ const f=e.target.files?.[0]; if(f) uploadPhoto(f); e.target.value=""; }}/>
                {photoUrl ? (
                  <div style={{position:"relative",marginBottom:"1rem",borderRadius:12,overflow:"hidden",maxHeight:180}}>
                    <img src={photoUrl} alt="" style={{width:"100%",height:180,objectFit:"cover",display:"block"}}/>
                    <button onClick={()=>setPhotoUrl("")}
                      style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,.55)",border:"none",borderRadius:"50%",width:28,height:28,color:"#fff",cursor:"pointer",fontSize:"0.8rem",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                  </div>
                ) : (
                  <motion.button onClick={()=>fileRef.current?.click()} disabled={photoUploading}
                    whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                    style={{width:"100%",padding:"0.75rem",marginBottom:"1rem",border:"1px dashed rgba(var(--pink-deep-rgb),.3)",borderRadius:10,background:"rgba(var(--pink-light-rgb),.25)",color:"var(--muted)",fontFamily:SANS,fontSize:"0.85rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.5rem"}}>
                    {photoUploading ? "uploading…" : "📷 add a photo"}
                  </motion.button>
                )}

                <div style={{display:"flex",gap:"0.8rem"}}>
                  <motion.button onClick={save} disabled={saving||!letter.trim()||!unlockDate}
                    whileHover={{scale:1.03,y:-2}} whileTap={{scale:0.97}}
                    style={{flex:1,padding:"0.95rem",borderRadius:12,border:"none",cursor:"pointer",background:"linear-gradient(135deg,var(--pink),var(--pink-deep))",color:"#fff",fontFamily:SANS,fontSize:"0.95rem",fontWeight:700,opacity:!letter.trim()||!unlockDate?0.45:1,boxShadow:"0 4px 20px rgba(var(--pink-deep-rgb),.35)"}}>
                    {saving?"sealing…":"seal the letter 🔒"}
                  </motion.button>
                  <motion.button onClick={()=>{setComposing(false);setPhotoUrl("");}} whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                    style={{padding:"0.95rem 1.2rem",borderRadius:12,border:"1px solid rgba(var(--pink-deep-rgb),.3)",background:"transparent",color:"var(--muted)",fontFamily:SANS,fontSize:"0.88rem",cursor:"pointer"}}>
                    cancel
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SEALED — pending */}
        {pending.length>0&&(
          <div style={{marginBottom:"1.5rem"}}>
            <SectionLabel>🔒 sealed ({pending.length})</SectionLabel>
            <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
              {pending.map((p,i)=>{
                const days=daysUntil(p.unlockDate);
                return (
                  <div key={i} style={{background:"var(--cream)",border:"1px solid rgba(var(--pink-deep-rgb),.2)",borderRadius:14,overflow:"hidden",boxShadow:"0 2px 12px rgba(var(--pink-deep-rgb),.06)"}}>
                    {p.imageUrl && (
                      <div style={{height:80,overflow:"hidden"}}>
                        <img src={p.imageUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block",filter:"blur(6px) brightness(.7)",transform:"scale(1.08)"}}/>
                      </div>
                    )}
                    <div style={{padding:"0.9rem 1.1rem",display:"flex",alignItems:"center",gap:"0.8rem"}}>
                      <motion.span style={{fontSize:"1.3rem"}} animate={{rotate:[0,10,-10,0]}} transition={{repeat:Infinity,duration:4,delay:i*0.5}}>🔒</motion.span>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.88rem",color:"var(--text)",margin:0,overflow:"hidden",textOverflow:"ellipsis"}}>
                          {p.from?`From ${p.from}`:"A letter"} — unlocks {fmt(p.unlockDate)}
                        </p>
                        <p style={{fontFamily:SANS,fontSize:"0.7rem",color:"var(--muted)",margin:"0.1rem 0 0"}}>
                          {days>0?`${days} day${days!==1?"s":""} to go`:"unlocking soon…"}
                        </p>
                      </div>
                      <div style={{width:48,height:4,borderRadius:2,background:"rgba(var(--pink-deep-rgb),.15)",overflow:"hidden",flexShrink:0}}>
                        <div style={{height:"100%",width:`${Math.max(5,100-Math.min(100,(days/365)*100))}%`,background:"linear-gradient(90deg,var(--pink),var(--pink-deep))",borderRadius:2}}/>
                      </div>
                      <motion.button onClick={()=>deletePending(i)}
                        whileHover={{scale:1.1,color:"var(--pink-deep)"}} whileTap={{scale:0.9}}
                        title="delete"
                        style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:"1rem",padding:"2px 4px",flexShrink:0}}>
                        ×
                      </motion.button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* READY TO OPEN — active unlocked, not archived */}
        {active.length>0&&(
          <div style={{marginBottom:archived.length?"1.5rem":0}}>
            <SectionLabel>🔓 ready to open ({active.length})</SectionLabel>
            <div style={{display:"flex",flexDirection:"column",gap:"0.8rem"}}>
              {active.map(c=>{
                const isOpen = opened===c.id;
                const alreadyRead = wasRead(c.id);
                return (
                  <LetterCard key={c.id} c={c} isOpen={isOpen} alreadyRead={alreadyRead} onToggle={()=>handleOpen(c.id)}>
                    {/* Choices appear after a delay so user reads first */}
                    <AnimatePresence>
                      {showChoices && (
                        <motion.div
                          initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} exit={{opacity:0}}
                          transition={{duration:0.4}}
                          style={{
                            marginTop:"1.4rem", paddingTop:"1.2rem",
                            borderTop:"1px dashed rgba(var(--pink-deep-rgb),.25)",
                            display:"flex", flexDirection:"column", gap:"0.7rem",
                          }}
                        >
                          <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.82rem",color:"var(--muted)",textAlign:"center",margin:0,lineHeight:1.6}}>
                            now that you&apos;ve read it…
                          </p>
                          <div style={{display:"flex",gap:"0.7rem",flexWrap:"wrap"}}>
                            <motion.button onClick={()=>keepSafe(c.id)}
                              whileHover={{scale:1.03, y:-2}} whileTap={{scale:0.97}}
                              style={{flex:"1 1 140px",padding:"0.75rem 1rem",borderRadius:12,border:"none",cursor:"pointer",
                                background:"linear-gradient(135deg,var(--pink),var(--pink-deep))",color:"#fff",
                                fontFamily:SANS,fontSize:"0.88rem",fontWeight:600,
                                boxShadow:"0 4px 16px rgba(var(--pink-deep-rgb),.3)"}}>
                              💗 keep it safe
                            </motion.button>
                            <motion.button onClick={()=>setConfirmDelete(c.id)}
                              whileHover={{scale:1.03, y:-2}} whileTap={{scale:0.97}}
                              style={{flex:"1 1 140px",padding:"0.75rem 1rem",borderRadius:12,
                                border:"1px solid rgba(var(--pink-deep-rgb),.3)",background:"transparent",
                                cursor:"pointer",color:"var(--muted)",
                                fontFamily:SANS,fontSize:"0.88rem",fontWeight:600}}>
                              🕊 release it
                            </motion.button>
                          </div>
                          <p style={{fontFamily:SANS,fontSize:"0.68rem",color:"var(--muted)",textAlign:"center",margin:0,lineHeight:1.5,opacity:0.85}}>
                            keep — moves to your archive · release — deletes forever
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </LetterCard>
                );
              })}
            </div>
          </div>
        )}

        {/* ARCHIVED — kept letters, collapsed list at bottom */}
        {archived.length>0&&(
          <div>
            <SectionLabel>🌸 archived ({archived.length})</SectionLabel>
            <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
              {archived.map(c => {
                const isOpen = opened===c.id;
                return (
                  <LetterCard key={c.id} c={c} isOpen={isOpen} alreadyRead onToggle={()=>setOpened(isOpen?null:c.id)} muted>
                    <div style={{marginTop:"1.2rem",paddingTop:"1rem",borderTop:"1px dashed rgba(var(--pink-deep-rgb),.2)",display:"flex",gap:"0.7rem",justifyContent:"flex-end"}}>
                      <button onClick={()=>reopenArchived(c.id)}
                        style={{padding:"0.5rem 1rem",borderRadius:10,border:"1px solid rgba(var(--pink-deep-rgb),.25)",background:"transparent",color:"var(--muted)",fontFamily:SANS,fontSize:"0.78rem",cursor:"pointer"}}>
                        re-open ✨
                      </button>
                      <button onClick={()=>setConfirmDelete(c.id)}
                        style={{padding:"0.5rem 1rem",borderRadius:10,border:"1px solid rgba(var(--pink-deep-rgb),.25)",background:"transparent",color:"var(--muted)",fontFamily:SANS,fontSize:"0.78rem",cursor:"pointer"}}>
                        🕊 release
                      </button>
                    </div>
                  </LetterCard>
                );
              })}
            </div>
          </div>
        )}

        {/* Confirm release modal */}
        <AnimatePresence>
          {confirmDelete && (() => {
            const c = unlocked.find(u=>u.id===confirmDelete);
            return (
              <>
                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                  onClick={()=>setConfirmDelete(null)}
                  style={{position:"fixed",inset:0,zIndex:9000,background:"rgba(0,0,0,.5)",backdropFilter:"blur(6px)"}}/>
                <motion.div initial={{opacity:0,scale:0.9,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95}}
                  style={{
                    position:"fixed",zIndex:9001,
                    top:"50%",left:"50%",transform:"translate(-50%,-50%)",
                    width:"min(420px,92vw)",background:"var(--cream)",
                    border:"1.5px solid var(--pink-mid)",borderRadius:20,
                    padding:"1.8rem",textAlign:"center",
                    boxShadow:"0 32px 80px rgba(var(--pink-deep-rgb),.3)",
                  }}>
                  <div style={{fontSize:"2.6rem",marginBottom:"0.4rem"}}>🕊</div>
                  <h3 style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"1.3rem",color:ACC,margin:"0 0 0.5rem"}}>
                    release this letter?
                  </h3>
                  <p style={{fontFamily:SANS,fontSize:"0.85rem",color:"var(--muted)",margin:"0 0 1.3rem",lineHeight:1.5}}>
                    {c?.from ? `${c.from}'s letter` : "This letter"} from {c?fmt(c.unlockDate):"that day"} will be gone for both of you. There&apos;s no undo.
                  </p>
                  <div style={{display:"flex",gap:"0.7rem"}}>
                    <button onClick={()=>setConfirmDelete(null)}
                      style={{flex:1,padding:"0.75rem",borderRadius:12,border:"1px solid rgba(var(--pink-deep-rgb),.3)",background:"transparent",color:"var(--text)",fontFamily:SANS,fontSize:"0.88rem",cursor:"pointer",fontWeight:600}}>
                      keep it
                    </button>
                    <button onClick={()=>confirmDelete && releaseLetter(confirmDelete)}
                      style={{flex:1,padding:"0.75rem",borderRadius:12,border:"none",
                        background:"linear-gradient(135deg,var(--pink),var(--pink-deep))",color:"#fff",
                        fontFamily:SANS,fontSize:"0.88rem",cursor:"pointer",fontWeight:600,
                        boxShadow:"0 4px 16px rgba(var(--pink-deep-rgb),.3)"}}>
                      release 🕊
                    </button>
                  </div>
                </motion.div>
              </>
            );
          })()}
        </AnimatePresence>

        {unlocked.length===0&&pending.length===0&&!composing&&(
          <div style={{textAlign:"center",padding:"3rem 1rem"}}>
            <div style={{fontSize:"2.5rem",marginBottom:"0.8rem",opacity:0.45}}>💌</div>
            <p style={{fontFamily:SANS,fontSize:"0.9rem",color:"var(--muted)",margin:0}}>No letters yet — write the first one</p>
          </div>
        )}
      </motion.div>
    </section>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{fontFamily:SANS,fontSize:"0.68rem",color:"var(--muted)",letterSpacing:"0.16em",textTransform:"uppercase",margin:"0 0 0.8rem"}}>
      {children}
    </p>
  );
}

function LetterCard({
  c, isOpen, alreadyRead, muted, onToggle, children,
}: {
  c: Capsule;
  isOpen: boolean;
  alreadyRead: boolean;
  muted?: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <motion.div layout
      animate={!isOpen && !muted && !alreadyRead ? { scale: [1, 1.012, 1] } : {}}
      transition={!isOpen && !muted && !alreadyRead ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
      style={{
        background:"var(--cream)",
        border:`1px solid ${isOpen?"rgba(var(--pink-deep-rgb),.45)":"rgba(var(--pink-deep-rgb),.2)"}`,
        borderRadius:18,
        overflow:"hidden",
        boxShadow:isOpen
          ? "0 12px 40px rgba(var(--pink-deep-rgb),.18)"
          : alreadyRead || muted
            ? "0 2px 10px rgba(var(--pink-deep-rgb),.05)"
            : "0 4px 18px rgba(var(--pink-deep-rgb),.15)",
        opacity: muted ? 0.85 : 1,
        transition:"border 0.3s, box-shadow 0.3s, opacity 0.3s",
      }}>
      <div onClick={onToggle}
        style={{padding:"1.1rem 1.4rem",display:"flex",alignItems:"center",gap:"0.85rem",cursor:"pointer"}}>
        <motion.span style={{fontSize:"1.5rem",flexShrink:0}}
          animate={isOpen ? { rotate:[0,15,-15,0] } : !alreadyRead && !muted ? { rotate:[-3,3,-3] } : {}}
          transition={isOpen ? { duration:0.5 } : { repeat: Infinity, duration: 2 }}>
          {isOpen ? "📖" : alreadyRead ? "📜" : "💌"}
        </motion.span>
        <div style={{flex:1,minWidth:0}}>
          <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.95rem",color:"var(--text)",margin:0,overflow:"hidden",textOverflow:"ellipsis"}}>
            {c.from?`From ${c.from}`:"A letter to us"}
            {!alreadyRead && !muted && (
              <span style={{
                marginLeft:"0.6rem",
                fontFamily:SANS,fontSize:"0.6rem",fontWeight:700,
                background:"linear-gradient(135deg,var(--pink),var(--pink-deep))",color:"#fff",
                padding:"0.12rem 0.5rem",borderRadius:50,letterSpacing:"0.08em",textTransform:"uppercase",
                verticalAlign:"middle",
              }}>
                new
              </span>
            )}
          </p>
          <p style={{fontFamily:SANS,fontSize:"0.72rem",color:"var(--muted)",margin:"0.15rem 0 0"}}>
            Unlocked {fmt(c.unlockDate)}
          </p>
        </div>
        <span style={{color:"var(--muted)",fontSize:"0.8rem"}}>{isOpen?"▲":"▼"}</span>
      </div>
      <AnimatePresence>
        {isOpen&&(
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}
            style={{overflow:"hidden"}}>
            {c.imageUrl&&(
              <div style={{maxHeight:280,overflow:"hidden"}}>
                <img src={c.imageUrl} alt="" style={{width:"100%",maxHeight:280,objectFit:"cover",display:"block"}}/>
              </div>
            )}
            <div style={{padding:"0 1.5rem 1.6rem",backgroundImage:"repeating-linear-gradient(transparent,transparent 31px,rgba(var(--pink-deep-rgb),.05) 31px,rgba(var(--pink-deep-rgb),.05) 32px)"}}>
              <div style={{height:1,background:"linear-gradient(90deg,rgba(var(--pink-deep-rgb),.3),transparent)",marginBottom:"1.3rem",marginTop:c.imageUrl?"1rem":"0"}}/>
              <p style={{fontFamily:SERIF,fontSize:"clamp(0.95rem,2vw,1.08rem)",color:"var(--text)",lineHeight:2,margin:0,whiteSpace:"pre-wrap",fontStyle:"italic"}}>
                {c.letter}
              </p>
              <p style={{fontFamily:SANS,fontSize:"0.8rem",color:"var(--muted)",textAlign:"right",marginTop:"1rem",marginBottom:0,fontStyle:"italic"}}>
                — with love 🩷
              </p>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
