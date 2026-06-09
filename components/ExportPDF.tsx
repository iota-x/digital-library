"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SERIF = `"Georgia","Times New Roman",serif`;
const MONO  = `"Courier New",Courier,monospace`;
const SANS  = `var(--font-lato),"Inter",system-ui,sans-serif`;
const MONTHS= ["January","February","March","April","May","June","July","August","September","October","November","December"];
const START = new Date("2026-03-11");

/* ── PALETTE: warm cream / editorial — capsule section 2 ── */
const BG  = "linear-gradient(160deg,#1a1208 0%,#241a0a 50%,#1a1208 100%)";
const ACC = "#fb923c";
const SOFT= "#fff7ed";

interface Entry { date:string; note:string; photos:string[]; special:boolean; specialLabel:string; mood:string; }

function fmtDate(d:string){ const dt=new Date(d+"T12:00:00"); return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`; }
function dayNum(d:string){ return Math.floor((new Date(d+"T12:00:00").getTime()-START.getTime())/86400000)+1; }

export default function ExportPDF() {
  const [loading,    setLoading]    = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview,    setPreview]    = useState(false);
  const [entries,    setEntries]    = useState<Entry[]>([]);
  const [filter,     setFilter]     = useState<"all"|"special"|"photos"|"notes">("all");
  const [title,      setTitle]      = useState("our story");
  const [subtitle,   setSubtitle]   = useState("a collection of days worth keeping");

  const load=async()=>{
    setLoading(true);
    const arr:Entry[]=await fetch("/api/calendar").then(r=>r.json());
    setEntries(arr.filter(e=>e.note||(e.photos?.length??0)>0||e.special).sort((a,b)=>a.date.localeCompare(b.date)));
    setLoading(false); setPreview(true);
  };

  const filtered=entries.filter(e=>{
    if(filter==="special") return e.special;
    if(filter==="photos")  return (e.photos?.length??0)>0;
    if(filter==="notes")   return !!e.note;
    return true;
  });

  const print=()=>{ setGenerating(true); setTimeout(()=>{ window.print(); setGenerating(false); },300); };

  return (
    <>
      <section style={{
        position:"relative",width:"100%",minHeight:"100vh",
        display:"flex",alignItems:"center",justifyContent:"center",
        padding:"clamp(4rem,8vh,7rem) clamp(1rem,4vw,3rem)",
        background:BG, overflow:"hidden",
      }}>
        {/* Ink spatter particles */}
        {Array.from({length:18},(_,i)=>(
          <motion.div key={i}
            animate={{opacity:[0.02,0.12,0.02],scale:[0.8,1.1,0.8]}}
            transition={{repeat:Infinity,duration:5+Math.random()*4,delay:Math.random()*5}}
            style={{
              position:"absolute",
              left:`${Math.random()*100}%`,top:`${Math.random()*100}%`,
              width:Math.random()*40+10,height:Math.random()*40+10,
              borderRadius:"50%",background:ACC,filter:"blur(20px)",
              pointerEvents:"none",
            }}/>
        ))}

        <motion.div initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
          style={{maxWidth:680,width:"100%",position:"relative",zIndex:2}}>

          {/* Header — editorial masthead */}
          <div style={{textAlign:"center",marginBottom:"2.5rem",paddingBottom:"1.5rem",borderBottom:`2px solid ${ACC}22`}}>
            <p style={{fontFamily:MONO,fontSize:"0.6rem",color:`${ACC}66`,letterSpacing:"0.35em",textTransform:"uppercase",margin:"0 0 0.5rem"}}>
              the memory gazette
            </p>
            <h2 style={{fontFamily:SERIF,fontSize:"clamp(1.8rem,5vw,2.8rem)",color:SOFT,margin:"0 0 0.4rem",fontWeight:700,letterSpacing:"-0.02em"}}>
              Export Memory Book
            </h2>
            <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.95rem",color:`${ACC}88`,margin:0}}>
              print every memory as a beautiful keepsake
            </p>
          </div>

          {/* Customise */}
          <div style={{background:"rgba(255,255,255,.03)",border:`1px solid ${ACC}22`,borderRadius:18,padding:"1.6rem",marginBottom:"1.5rem"}}>
            <p style={{fontFamily:MONO,fontSize:"0.65rem",color:`${ACC}55`,letterSpacing:"0.2em",textTransform:"uppercase",margin:"0 0 1rem"}}>
              customise your book
            </p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.8rem",marginBottom:"1rem"}}>
              {[["Book title",title,setTitle],["Subtitle",subtitle,setSubtitle]].map(([l,v,fn],i)=>(
                <div key={i}>
                  <label style={{fontFamily:SANS,fontSize:"0.72rem",color:`${ACC}66`,display:"block",marginBottom:"0.3rem"}}>{l as string}</label>
                  <input value={v as string} onChange={e=>(fn as Function)(e.target.value)}
                    style={{width:"100%",padding:"0.6rem 0.8rem",border:`1px solid ${ACC}22`,borderRadius:8,fontFamily:SERIF,fontStyle:"italic",fontSize:"0.95rem",color:SOFT,outline:"none",background:"rgba(255,255,255,.04)",boxSizing:"border-box",caretColor:ACC}}/>
                </div>
              ))}
            </div>
            <p style={{fontFamily:SANS,fontSize:"0.72rem",color:`${ACC}66`,margin:"0 0 0.5rem"}}>Include</p>
            <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
              {([["all","All memories"],["special","Special only"],["photos","With photos"],["notes","With notes"]] as [typeof filter,string][]).map(([v,l])=>(
                <button key={v} onClick={()=>setFilter(v)}
                  style={{
                    padding:"0.3rem 0.85rem",borderRadius:16,cursor:"pointer",fontFamily:SANS,fontSize:"0.78rem",
                    border:`1px solid ${filter===v?ACC:`${ACC}22`}`,
                    background:filter===v?`${ACC}22`:"transparent",
                    color:filter===v?ACC:`${ACC}55`,transition:"all 0.18s",
                  }}>{l}</button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{display:"flex",gap:"0.8rem",marginBottom:preview?"1.5rem":"0"}}>
            <motion.button onClick={load} disabled={loading}
              whileHover={{scale:1.03,y:-2}} whileTap={{scale:0.97}}
              style={{
                flex:1,padding:"1rem",borderRadius:12,border:"none",cursor:"pointer",
                background:`linear-gradient(135deg,${ACC},#f97316)`,
                color:"#1a0800",fontFamily:SERIF,fontStyle:"italic",fontSize:"1rem",fontWeight:700,
                boxShadow:`0 4px 20px ${ACC}44`,
              }}>
              {loading?"loading…":"preview memory book 📖"}
            </motion.button>
            {preview&&(
              <motion.button onClick={print} disabled={generating}
                whileHover={{scale:1.03,y:-2}} whileTap={{scale:0.97}}
                style={{padding:"1rem 1.4rem",borderRadius:12,cursor:"pointer",border:`1.5px solid ${ACC}`,background:"transparent",color:ACC,fontFamily:SERIF,fontStyle:"italic",fontSize:"1rem"}}>
                {generating?"preparing…":"print / PDF 🖨️"}
              </motion.button>
            )}
          </div>

          {/* Preview list */}
          <AnimatePresence>
            {preview&&(
              <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}}
                style={{overflow:"hidden"}}>
                <p style={{fontFamily:MONO,fontSize:"0.68rem",color:`${ACC}55`,letterSpacing:"0.14em",textTransform:"uppercase",margin:"0 0 1rem",textAlign:"center"}}>
                  {filtered.length} entr{filtered.length!==1?"ies":"y"} included
                </p>
                <div style={{display:"flex",flexDirection:"column",gap:"0.5rem",maxHeight:340,overflowY:"auto"}}>
                  {filtered.slice(0,10).map(e=>(
                    <div key={e.date} style={{display:"flex",gap:"0.8rem",alignItems:"flex-start",padding:"0.7rem 0.9rem",background:"rgba(255,255,255,.03)",border:`1px solid ${ACC}15`,borderRadius:10}}>
                      <span style={{fontSize:"0.9rem",flexShrink:0}}>{e.special?"⭐":e.mood||"📅"}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.85rem",color:ACC,margin:"0 0 0.15rem"}}>{fmtDate(e.date)} · Day {dayNum(e.date)}</p>
                        {e.note&&<p style={{fontFamily:SERIF,fontSize:"0.8rem",color:`${SOFT}88`,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontStyle:"italic"}}>{e.note}</p>}
                      </div>
                      {(e.photos?.length??0)>0&&<span style={{fontFamily:MONO,fontSize:"0.65rem",color:`${ACC}55`,flexShrink:0}}>📸×{e.photos.length}</span>}
                    </div>
                  ))}
                  {filtered.length>10&&<p style={{fontFamily:MONO,fontSize:"0.68rem",color:`${ACC}44`,textAlign:"center",margin:"0.5rem 0 0"}}>+{filtered.length-10} more in full book</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(.print-book) { display:none!important; }
          .print-book { display:block!important; }
          @page { margin:1.5cm; size:A4; }
        }
        .print-book { display:none; }
      `}</style>

      <div className="print-book" style={{fontFamily:SERIF,maxWidth:700,margin:"0 auto",padding:"2rem"}}>
        <div style={{textAlign:"center",borderBottom:"3px double #be185d",paddingBottom:"1.5rem",marginBottom:"2rem"}}>
          <p style={{fontFamily:MONO,fontSize:"0.6rem",letterSpacing:"0.3em",textTransform:"uppercase",color:"rgba(190,24,93,.5)"}}>printed with love</p>
          <h1 style={{fontSize:"2.5rem",fontStyle:"italic",color:"#1a0812",margin:"0.5rem 0"}}>{title}</h1>
          <p style={{fontStyle:"italic",color:"rgba(90,40,60,.6)",fontSize:"1rem"}}>{subtitle}</p>
          <p style={{fontFamily:MONO,fontSize:"0.7rem",color:"rgba(190,24,93,.4)",marginTop:"0.5rem"}}>march 11, 2026 → forever</p>
        </div>
        {filtered.map(e=>(
          <div key={e.date} style={{marginBottom:"2rem",paddingBottom:"1.5rem",borderBottom:"1px solid rgba(190,24,93,.1)"}}>
            <div style={{display:"flex",gap:"0.5rem",alignItems:"center",marginBottom:"0.5rem"}}>
              {e.mood&&<span>{e.mood}</span>}{e.special&&<span>⭐</span>}
              <h3 style={{fontStyle:"italic",fontSize:"1.1rem",color:"#be185d",margin:0,flex:1}}>{fmtDate(e.date)} · Day {dayNum(e.date)}</h3>
              {e.specialLabel&&<span style={{fontSize:"0.8rem",color:"rgba(190,24,93,.5)"}}>{e.specialLabel}</span>}
            </div>
            {e.note&&<p style={{lineHeight:1.9,color:"rgba(20,5,12,.8)",margin:"0.5rem 0",fontSize:"0.95rem",whiteSpace:"pre-wrap",fontStyle:"italic"}}>{e.note}</p>}
            {(e.photos?.length??0)>0&&(
              <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginTop:"0.8rem"}}>
                {e.photos.slice(0,4).map((src,pi)=>(
                  <img key={pi} src={src} style={{width:120,height:120,objectFit:"cover",borderRadius:4,border:"1px solid rgba(190,24,93,.15)"}} alt=""/>
                ))}
              </div>
            )}
          </div>
        ))}
        <div style={{textAlign:"center",marginTop:"3rem",borderTop:"2px solid rgba(190,24,93,.15)",paddingTop:"1rem",fontStyle:"italic",color:"rgba(190,24,93,.5)",fontSize:"0.9rem"}}>
          made with 💗 — {filtered.length} memories, one story
        </div>
      </div>
    </>
  );
}