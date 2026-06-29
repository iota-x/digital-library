"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { useUserData, displayName, partnerDisplayName } from "@/lib/userStore";
import { motion, AnimatePresence } from "framer-motion";
import BgAccents from "@/components/BgAccents";
import UpgradeButton from "@/components/UpgradeButton";
import { SERIF, SANS, MONO } from "@/lib/typography";
import { startDateFrom } from "@/lib/relationship";

const MONTHS= ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

/* Theme-adaptive: section uses page theme bg, inner cards are themed cream. */
const ACC = "var(--pink-deep)";
const MID = "var(--pink-deep)";

interface Entry { date:string; note:string; photos:string[]; special:boolean; specialLabel:string; mood:string; }

function fmtDate(d:string){ const dt=new Date(d+"T12:00:00"); return `${MONTHS[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`; }
function fmtDateShort(d:string){ const dt=new Date(d+"T12:00:00"); return `${String(dt.getDate()).padStart(2,"0")}.${String(dt.getMonth()+1).padStart(2,"0")}.${dt.getFullYear()}`; }
function makeDayNum(start: Date){ return (d:string) => Math.floor((new Date(d+"T12:00:00").getTime()-start.getTime())/86400000)+1; }
function dayOfWeek(d:string){ return DAYS[new Date(d+"T12:00:00").getDay()]; }

export default function ExportPDF() {
  const userData = useUserData();
  const startDate = useMemo(() => startDateFrom(userData?.startDate, true), [userData?.startDate]);
  const dayNum = useMemo(() => makeDayNum(startDate), [startDate]);

  const coupleName = userData?.settings?.coupleName?.trim() ||
    (userData?.partnerName ? `${displayName(userData)} & ${partnerDisplayName(userData)}` : "our story");
  // The printable PDF keepsake is premium; previewing on-screen stays free.
  const isPremium = userData?.isPremium !== false;

  const [loading,    setLoading]    = useState(false);
  const [preview,    setPreview]    = useState(false);
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [filter,     setFilter]     = useState<"all"|"special"|"photos"|"notes">("all");
  const [title,      setTitle]      = useState(coupleName);
  const [subtitle,   setSubtitle]   = useState("a collection of days worth keeping");
  const printRef = useRef<HTMLDivElement>(null);

  const filtered = allEntries.filter(e=>{
    if(filter==="special") return e.special;
    if(filter==="photos")  return (e.photos?.length??0)>0;
    if(filter==="notes")   return !!e.note;
    return true;
  });

  const load=async()=>{
    setLoading(true);
    const arr:Entry[]=await fetch("/api/calendar").then(r=>r.json());
    setAllEntries(arr.filter(e=>e.note||(e.photos?.length??0)>0||e.special).sort((a,b)=>a.date.localeCompare(b.date)));
    setLoading(false); setPreview(true);
  };

  /* ── Proper print: inject a styled iframe instead of window.print() ── */
  const handlePrint=()=>{
    const win = window.open("","_blank","width=900,height=700");
    if (!win) return;

    const photoRows = filtered.map(e=>{
      const photos = (e.photos||[]).slice(0,4).map(src=>
        `<img src="${src}" style="width:130px;height:130px;object-fit:cover;border-radius:6px;border:1px solid var(--pink);" alt=""/>`
      ).join("");
      return photos ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">${photos}</div>` : "";
    });

    const entries = filtered.map((e,i)=>`
      <div style="margin-bottom:2.4rem;padding-bottom:2rem;border-bottom:1px solid var(--pink);page-break-inside:avoid;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
          ${e.mood?`<span style="font-size:1.2rem;">${e.mood}</span>`:""}
          ${e.special?`<span style="font-size:0.9rem;">⭐</span>`:""}
          <span style="font-family:Georgia,serif;font-style:italic;font-size:1.1rem;color:var(--pink-deep);">
            ${dayOfWeek(e.date)}, ${fmtDate(e.date)}
          </span>
          <span style="font-family:'Courier New',monospace;font-size:0.7rem;color:rgba(var(--pink-deep-rgb),.5);margin-left:4px;">
            · day ${dayNum(e.date)} · ${fmtDateShort(e.date)}
          </span>
          ${e.specialLabel?`<span style="font-size:0.78rem;color:var(--pink-deep);margin-left:4px;">${e.specialLabel}</span>`:""}
        </div>
        ${e.note?`<p style="font-family:Georgia,serif;font-style:italic;font-size:1rem;line-height:1.95;color:#2d0a1e;margin:0;white-space:pre-wrap;">${e.note}</p>`:""}
        ${photoRows[i]}
      </div>
    `).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>${title}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:Georgia,serif; background:#fff; color:#2d0a1e; padding:2.5cm 2cm; }
      @page { margin:2cm 1.8cm; size:A4; }
      @media print { body { padding:0; } }
    </style>
    </head><body>
      <!-- Cover -->
      <div style="text-align:center;padding:3rem 0 3.5rem;border-bottom:3px double var(--pink);margin-bottom:3rem;">
        <p style="font-family:'Courier New',monospace;font-size:0.6rem;letter-spacing:0.3em;text-transform:uppercase;color:rgba(var(--pink-deep-rgb),.45);margin-bottom:0.8rem;">
          made with love
        </p>
        <div style="font-size:2rem;margin-bottom:0.8rem;">💗</div>
        <h1 style="font-family:Georgia,serif;font-style:italic;font-size:2.8rem;color:var(--pink-deep);margin-bottom:0.5rem;font-weight:400;">
          ${title}
        </h1>
        <p style="font-family:Georgia,serif;font-style:italic;font-size:1rem;color:rgba(var(--pink-deep-rgb),.55);margin-bottom:0.3rem;">${subtitle}</p>
        <p style="font-family:'Courier New',monospace;font-size:0.7rem;color:rgba(var(--pink-deep-rgb),.38);letter-spacing:0.1em;">
          march 11, 2026 → forever &nbsp;·&nbsp; ${filtered.length} memories
        </p>
      </div>

      <!-- Table of contents -->
      ${filtered.filter(e=>e.special).length>0?`
      <div style="margin-bottom:3rem;padding-bottom:2rem;border-bottom:1px solid rgba(var(--pink-deep-rgb),.15);">
        <p style="font-family:'Courier New',monospace;font-size:0.65rem;letter-spacing:0.2em;text-transform:uppercase;color:rgba(var(--pink-deep-rgb),.4);margin-bottom:1rem;">Special days</p>
        ${filtered.filter(e=>e.special).map(e=>`
          <div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-bottom:1px dashed rgba(var(--pink-deep-rgb),.08);">
            <span style="font-size:0.85rem;">⭐</span>
            <span style="font-family:Georgia,serif;font-style:italic;font-size:0.9rem;color:var(--pink-deep);">${fmtDate(e.date)}</span>
            ${e.specialLabel?`<span style="font-size:0.75rem;color:rgba(var(--pink-deep-rgb),.5);">${e.specialLabel}</span>`:""}
          </div>
        `).join("")}
      </div>`:""}

      <!-- Entries -->
      ${entries}

      <!-- Footer -->
      <div style="text-align:center;margin-top:3rem;padding-top:1.5rem;border-top:2px solid rgba(var(--pink-deep-rgb),.15);">
        <p style="font-family:Georgia,serif;font-style:italic;font-size:0.9rem;color:rgba(var(--pink-deep-rgb),.45);">
          made with 💗 — ${filtered.length} memories, one story
        </p>
        <p style="font-family:'Courier New',monospace;font-size:0.65rem;color:rgba(var(--pink-deep-rgb),.3);margin-top:4px;">
          march 11, 2026 → forever
        </p>
      </div>
    </body></html>`;

    win.document.write(html);
    win.document.close();
    win.onload=()=>{ win.focus(); win.print(); };
  };

  return (
    <section style={{
      position:"relative",width:"100%",minHeight:"100dvh",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:"clamp(4rem,8vh,7rem) clamp(1rem,4vw,3rem)",
      overflow:"hidden",
    }}>
      {/* Themed glowing gradient — breathes softly */}
      <BgAccents variant="glow" />

      <motion.div initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{maxWidth:680,width:"100%",position:"relative",zIndex:2}}>

        {/* Masthead */}
        <div style={{textAlign:"center",marginBottom:"2.5rem",paddingBottom:"1.8rem",borderBottom:"1px solid rgba(var(--pink-rgb),.25)"}}>
          <p style={{fontFamily:MONO,fontSize:"0.6rem",color:"var(--muted)",letterSpacing:"0.35em",textTransform:"uppercase",margin:"0 0 0.6rem"}}>
            the memory gazette
          </p>
          <h2 style={{fontFamily:SERIF,fontSize:"clamp(1.8rem,5vw,2.8rem)",color:ACC,margin:"0 0 0.4rem",fontWeight:700,letterSpacing:"-0.02em",textShadow:"0 2px 20px rgba(var(--pink-rgb),.15)"}}>
            Export Memory Book
          </h2>
          <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.95rem",color:"var(--muted)",margin:0}}>
            print every memory as a beautiful keepsake 🌸
          </p>
        </div>

        {/* Customise */}
        <div style={{background:"var(--cream)",border:"1px solid rgba(var(--pink-rgb),.22)",borderRadius:20,padding:"1.6rem",marginBottom:"1.5rem",boxShadow:"0 4px 18px rgba(var(--pink-deep-rgb),.08)"}}>
          <p style={{fontFamily:MONO,fontSize:"0.62rem",color:"var(--muted)",letterSpacing:"0.2em",textTransform:"uppercase",margin:"0 0 1.1rem"}}>
            customise
          </p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.8rem",marginBottom:"1.1rem"}}>
            {[["Book title",title,(v:string)=>setTitle(v)],["Subtitle",subtitle,(v:string)=>setSubtitle(v)]].map(([l,v,fn],i)=>(
              <div key={i}>
                <label style={{fontFamily:SANS,fontSize:"0.7rem",color:"var(--muted)",display:"block",marginBottom:"0.3rem"}}>{l as string}</label>
                <input value={v as string} onChange={e=>(fn as (v:string)=>void)(e.target.value)}
                  style={{width:"100%",padding:"0.65rem 0.9rem",border:"1px solid rgba(var(--pink-rgb),.3)",borderRadius:9,fontFamily:SERIF,fontStyle:"italic",fontSize:"0.92rem",color:"var(--text)",outline:"none",background:"rgba(var(--pink-light-rgb),.4)",boxSizing:"border-box",caretColor:MID}}/>
              </div>
            ))}
          </div>
          <p style={{fontFamily:SANS,fontSize:"0.7rem",color:"var(--muted)",margin:"0 0 0.5rem"}}>Include</p>
          <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
            {([["all","All memories"],["special","Special only"],["photos","With photos"],["notes","With notes"]] as ["all"|"special"|"photos"|"notes",string][]).map(([v,l])=>(
              <button key={v} onClick={()=>setFilter(v)}
                style={{
                  padding:"0.3rem 0.9rem",borderRadius:16,cursor:"pointer",fontFamily:SANS,fontSize:"0.78rem",
                  border:`1px solid ${filter===v?"rgba(var(--pink-rgb),.5)":"rgba(var(--pink-rgb),.15)"}`,
                  background:filter===v?"rgba(var(--pink-rgb),.15)":"transparent",
                  color:filter===v?ACC:"rgba(var(--pink-rgb),.4)",transition:"all 0.18s",
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
              background:"linear-gradient(135deg,var(--pink),var(--pink-deep),var(--pink-deep))",
              color:"#fff",fontFamily:SERIF,fontStyle:"italic",fontSize:"1rem",fontWeight:700,
              boxShadow:"0 4px 24px rgba(var(--pink-deep-rgb),.45)",
            }}>
            {loading?"loading memories…":"preview memory book 📖"}
          </motion.button>
          {preview && (isPremium ? (
            <motion.button onClick={handlePrint}
              whileHover={{scale:1.03,y:-2}} whileTap={{scale:0.97}}
              style={{padding:"1rem 1.4rem",borderRadius:12,cursor:"pointer",border:"1.5px solid rgba(var(--pink-rgb),.4)",background:"var(--cream)",color:ACC,fontFamily:SERIF,fontStyle:"italic",fontSize:"1rem"}}>
              print / PDF 🖨️
            </motion.button>
          ) : (
            <UpgradeButton style={{padding:"1rem 1.4rem",borderRadius:12,fontFamily:SERIF,fontStyle:"italic",fontSize:"1rem"}}>
              🔒 unlock PDF — premium
            </UpgradeButton>
          ))}
        </div>

        {/* Preview */}
        <AnimatePresence>
          {preview&&(
            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}}
              style={{overflow:"hidden"}}>
              <p style={{fontFamily:MONO,fontSize:"0.66rem",color:"var(--muted)",letterSpacing:"0.14em",textTransform:"uppercase",margin:"0 0 1rem",textAlign:"center"}}>
                {filtered.length} entr{filtered.length!==1?"ies":"y"} · click print to open formatted book
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:"0.5rem",maxHeight:360,overflowY:"auto"}}>
                {filtered.slice(0,12).map(e=>(
                  <div key={e.date} style={{display:"flex",gap:"0.8rem",alignItems:"flex-start",padding:"0.8rem 1rem",background:"var(--cream)",border:"1px solid rgba(var(--pink-rgb),.18)",borderRadius:12}}>
                    <span style={{fontSize:"0.95rem",flexShrink:0,marginTop:2}}>{e.special?"⭐":e.mood||"📅"}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.85rem",color:MID,margin:"0 0 0.15rem"}}>
                        {dayOfWeek(e.date)}, {fmtDate(e.date)}
                        <span style={{fontFamily:MONO,fontSize:"0.65rem",color:"var(--muted)",marginLeft:"0.5rem"}}>· day {dayNum(e.date)}</span>
                      </p>
                      {e.specialLabel&&<p style={{fontFamily:SANS,fontSize:"0.72rem",color:"var(--muted)",margin:"0 0 0.15rem"}}>{e.specialLabel}</p>}
                      {e.note&&<p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.8rem",color:"var(--text)",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.note}</p>}
                    </div>
                    {(e.photos?.length??0)>0&&(
                      <span style={{fontFamily:MONO,fontSize:"0.65rem",color:"var(--muted)",flexShrink:0,marginTop:2}}>
                        📸×{e.photos.length}
                      </span>
                    )}
                  </div>
                ))}
                {filtered.length>12&&(
                  <p style={{fontFamily:MONO,fontSize:"0.66rem",color:"var(--muted)",textAlign:"center",margin:"0.4rem 0 0"}}>
                    +{filtered.length-12} more in the full book
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}