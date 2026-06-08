"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SERIF  = `"Georgia","Times New Roman",serif`;
const MONO   = `"Courier New",Courier,monospace`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const START  = new Date("2026-03-11");

interface Entry { date:string; note:string; photos:string[]; special:boolean; specialLabel:string; mood:string; }

function fmtDate(d:string){ const dt=new Date(d+"T12:00:00"); return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`; }
function dayNum(d:string){ return Math.floor((new Date(d+"T12:00:00").getTime()-START.getTime())/86400000)+1; }

export default function ExportPDF() {
  const [loading,   setLoading]   = useState(false);
  const [generating,setGenerating]= useState(false);
  const [preview,   setPreview]   = useState(false);
  const [entries,   setEntries]   = useState<Entry[]>([]);
  const [filter,    setFilter]    = useState<"all"|"special"|"photos"|"notes">("all");
  const [title,     setTitle]     = useState("our story");
  const [subtitle,  setSubtitle]  = useState("a collection of days worth keeping");

  const load = async () => {
    setLoading(true);
    const arr:Entry[] = await fetch("/api/calendar").then(r=>r.json());
    const sorted = arr.filter(e=>e.note||(e.photos?.length??0)>0||e.special)
      .sort((a,b)=>a.date.localeCompare(b.date));
    setEntries(sorted);
    setLoading(false);
    setPreview(true);
  };

  const filtered = entries.filter(e=>{
    if(filter==="special") return e.special;
    if(filter==="photos")  return (e.photos?.length??0)>0;
    if(filter==="notes")   return !!e.note;
    return true;
  });

  const handlePrint = () => {
    setGenerating(true);
    setTimeout(()=>{ window.print(); setGenerating(false); },300);
  };

  return (
    <>
      <section style={{
        position:"relative",width:"100%",
        padding:"5rem clamp(1rem,3vw,2rem) 6rem",
        /* Unique: aged newspaper / editorial look */
        background:"linear-gradient(160deg,#fdf8f0 0%,#fef3e8 50%,#fdf8f0 100%)",
        overflow:"hidden",
      }}>
        {/* Decorative ink blots */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:4,background:"linear-gradient(90deg,#be185d,#f9a8d4,#be185d)"}}/>
        <div style={{position:"absolute",top:"15%",right:"-5%",width:220,height:220,borderRadius:"50%",background:"rgba(190,24,93,0.04)",filter:"blur(40px)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:"20%",left:"-5%",width:180,height:180,borderRadius:"50%",background:"rgba(244,114,182,0.06)",filter:"blur(40px)",pointerEvents:"none"}}/>

        <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
          style={{maxWidth:680,margin:"0 auto",position:"relative",zIndex:2}}>

          {/* Editorial header */}
          <div style={{textAlign:"center",marginBottom:"2.5rem",borderBottom:"3px double rgba(190,24,93,0.3)",paddingBottom:"1.5rem"}}>
            <p style={{fontFamily:MONO,fontSize:"0.65rem",color:"rgba(190,24,93,0.45)",letterSpacing:"0.3em",textTransform:"uppercase",margin:"0 0 0.6rem"}}>
              the memory gazette
            </p>
            <h2 style={{fontFamily:SERIF,fontSize:"clamp(1.8rem,5vw,2.8rem)",color:"#1a0812",margin:"0 0 0.4rem",fontWeight:700,letterSpacing:"-0.02em"}}>
              Export Your Memory Book
            </h2>
            <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.95rem",color:"rgba(90,40,60,0.6)",margin:0}}>
              print or save every memory as a beautiful keepsake
            </p>
          </div>

          {/* Customise */}
          <div style={{
            background:"rgba(255,255,255,0.7)",
            border:"1px solid rgba(190,24,93,0.12)",
            borderRadius:16,padding:"1.5rem",marginBottom:"1.5rem",
            boxShadow:"0 2px 16px rgba(190,24,93,0.06)",
          }}>
            <p style={{fontFamily:MONO,fontSize:"0.68rem",color:"rgba(190,24,93,0.45)",letterSpacing:"0.18em",textTransform:"uppercase",margin:"0 0 1rem"}}>
              customise your book
            </p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.8rem",marginBottom:"1rem"}}>
              <div>
                <label style={{fontFamily:SANS,fontSize:"0.75rem",color:"rgba(90,40,60,0.5)",display:"block",marginBottom:"0.3rem"}}>Book title</label>
                <input value={title} onChange={e=>setTitle(e.target.value)}
                  style={{width:"100%",padding:"0.6rem 0.8rem",border:"1px solid rgba(190,24,93,0.15)",borderRadius:8,fontFamily:SERIF,fontStyle:"italic",fontSize:"0.95rem",color:"#1a0812",outline:"none",background:"rgba(252,231,243,0.2)",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{fontFamily:SANS,fontSize:"0.75rem",color:"rgba(90,40,60,0.5)",display:"block",marginBottom:"0.3rem"}}>Subtitle</label>
                <input value={subtitle} onChange={e=>setSubtitle(e.target.value)}
                  style={{width:"100%",padding:"0.6rem 0.8rem",border:"1px solid rgba(190,24,93,0.15)",borderRadius:8,fontFamily:SANS,fontSize:"0.88rem",color:"#1a0812",outline:"none",background:"rgba(252,231,243,0.2)",boxSizing:"border-box"}}/>
              </div>
            </div>
            {/* Filter */}
            <p style={{fontFamily:SANS,fontSize:"0.75rem",color:"rgba(90,40,60,0.5)",margin:"0 0 0.5rem"}}>Include</p>
            <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
              {([["all","All memories"],["special","Special days only"],["photos","With photos"],["notes","With notes"]] as [typeof filter,string][]).map(([v,l])=>(
                <button key={v} onClick={()=>setFilter(v)}
                  style={{
                    padding:"0.3rem 0.8rem",borderRadius:16,cursor:"pointer",fontFamily:SANS,fontSize:"0.78rem",
                    border:`1px solid ${filter===v?"#be185d":"rgba(190,24,93,0.18)"}`,
                    background:filter===v?"#be185d":"transparent",
                    color:filter===v?"#fff":"rgba(90,40,60,0.6)",
                    transition:"all 0.18s",
                  }}>{l}</button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div style={{display:"flex",gap:"0.8rem",marginBottom:preview?"2rem":"0"}}>
            <motion.button onClick={load} disabled={loading}
              whileHover={{scale:1.03,y:-2}} whileTap={{scale:0.97}}
              style={{
                flex:1,padding:"1rem",borderRadius:12,border:"none",cursor:"pointer",
                background:"linear-gradient(135deg,#be185d,#9d174d)",
                color:"#fff",fontFamily:SERIF,fontStyle:"italic",fontSize:"1rem",
                boxShadow:"0 4px 20px rgba(190,24,93,0.3)",
              }}>
              {loading?"loading memories…":"preview memory book 📖"}
            </motion.button>
            {preview&&(
              <motion.button onClick={handlePrint} disabled={generating}
                whileHover={{scale:1.03,y:-2}} whileTap={{scale:0.97}}
                style={{
                  padding:"1rem 1.4rem",borderRadius:12,cursor:"pointer",
                  border:"2px solid #be185d",background:"transparent",
                  color:"#be185d",fontFamily:SERIF,fontStyle:"italic",fontSize:"1rem",
                }}>
                {generating?"preparing…":"print / save PDF 🖨️"}
              </motion.button>
            )}
          </div>

          {/* Preview */}
          <AnimatePresence>
            {preview&&(
              <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}}
                style={{overflow:"hidden"}}>
                {/* Preview count */}
                <p style={{fontFamily:MONO,fontSize:"0.72rem",color:"rgba(190,24,93,0.45)",letterSpacing:"0.12em",textTransform:"uppercase",margin:"0 0 1.2rem",textAlign:"center"}}>
                  {filtered.length} entr{filtered.length!==1?"ies":"y"} will be included
                </p>
                {/* Sample entries */}
                <div style={{display:"flex",flexDirection:"column",gap:"0.6rem",maxHeight:320,overflowY:"auto"}}>
                  {filtered.slice(0,8).map(e=>(
                    <div key={e.date} style={{display:"flex",gap:"0.8rem",alignItems:"flex-start",padding:"0.7rem",background:"rgba(255,255,255,0.6)",border:"1px solid rgba(190,24,93,0.08)",borderRadius:10}}>
                      {e.special&&<span style={{fontSize:"1rem",flexShrink:0}}>⭐</span>}
                      {e.mood&&<span style={{fontSize:"1rem",flexShrink:0}}>{e.mood}</span>}
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.88rem",color:"#be185d",margin:"0 0 0.2rem"}}>
                          {fmtDate(e.date)} — Day {dayNum(e.date)}
                        </p>
                        {e.specialLabel&&<p style={{fontFamily:SANS,fontSize:"0.75rem",color:"rgba(190,24,93,0.5)",margin:"0 0 0.2rem"}}>{e.specialLabel}</p>}
                        {e.note&&<p style={{fontFamily:SERIF,fontSize:"0.82rem",color:"rgba(90,40,60,0.7)",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.note}</p>}
                      </div>
                      {(e.photos?.length??0)>0&&<span style={{fontFamily:MONO,fontSize:"0.68rem",color:"rgba(190,24,93,0.4)",flexShrink:0}}>📸×{e.photos.length}</span>}
                    </div>
                  ))}
                  {filtered.length>8&&<p style={{fontFamily:MONO,fontSize:"0.72rem",color:"rgba(190,24,93,0.35)",textAlign:"center",margin:"0.5rem 0 0"}}>+{filtered.length-8} more entries in the full book</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* Print styles — this renders when window.print() is called */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-book { display: block !important; }
          @page { margin: 1.5cm; size: A4; }
        }
        .print-book { display: none; }
      `}</style>

      {/* Hidden print-ready book */}
      <div className="print-book" style={{fontFamily:SERIF,maxWidth:700,margin:"0 auto",padding:"2rem"}}>
        <div style={{textAlign:"center",borderBottom:"3px double #be185d",paddingBottom:"1.5rem",marginBottom:"2rem"}}>
          <p style={{fontFamily:MONO,fontSize:"0.6rem",letterSpacing:"0.3em",textTransform:"uppercase",color:"rgba(190,24,93,0.5)"}}>
            printed with love
          </p>
          <h1 style={{fontSize:"2.5rem",fontStyle:"italic",color:"#1a0812",margin:"0.5rem 0"}}>{title}</h1>
          <p style={{fontStyle:"italic",color:"rgba(90,40,60,0.6)",fontSize:"1rem"}}>{subtitle}</p>
          <p style={{fontFamily:MONO,fontSize:"0.7rem",color:"rgba(190,24,93,0.4)",letterSpacing:"0.1em",marginTop:"0.5rem"}}>
            march 11, 2026 → forever
          </p>
        </div>
        {filtered.map((e,i)=>(
          <div key={e.date} style={{marginBottom:"2rem",paddingBottom:"1.5rem",borderBottom:"1px solid rgba(190,24,93,0.1)"}}>
            <div style={{display:"flex",gap:"0.5rem",alignItems:"center",marginBottom:"0.5rem"}}>
              {e.mood&&<span>{e.mood}</span>}
              {e.special&&<span>⭐</span>}
              <h3 style={{fontStyle:"italic",fontSize:"1.1rem",color:"#be185d",margin:0,flex:1}}>
                {fmtDate(e.date)} · Day {dayNum(e.date)}
              </h3>
              {e.specialLabel&&<span style={{fontSize:"0.8rem",color:"rgba(190,24,93,0.5)"}}>{e.specialLabel}</span>}
            </div>
            {e.note&&<p style={{lineHeight:1.9,color:"rgba(20,5,12,0.8)",margin:"0.5rem 0",fontSize:"0.95rem",whiteSpace:"pre-wrap",fontStyle:"italic"}}>{e.note}</p>}
            {(e.photos?.length??0)>0&&(
              <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginTop:"0.8rem"}}>
                {e.photos.slice(0,4).map((src,pi)=>(
                  <img key={pi} src={src} style={{width:120,height:120,objectFit:"cover",borderRadius:4,border:"1px solid rgba(190,24,93,0.15)"}} alt=""/>
                ))}
              </div>
            )}
          </div>
        ))}
        <div style={{textAlign:"center",marginTop:"3rem",borderTop:"2px solid rgba(190,24,93,0.15)",paddingTop:"1rem",fontStyle:"italic",color:"rgba(190,24,93,0.5)",fontSize:"0.9rem"}}>
          made with 💗 — {filtered.length} memories, one story
        </div>
      </div>
    </>
  );
}