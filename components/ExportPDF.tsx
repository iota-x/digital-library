"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SERIF  = `"Georgia","Times New Roman",serif`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const START  = new Date("2026-03-11");

interface CalEntry { date:string; note:string; photos:string[]; special:boolean; specialLabel:string; mood:string; }

function dayNum(key:string){ return Math.floor((new Date(key+"T12:00:00").getTime()-START.getTime())/86400000)+1; }

function fmtFull(key:string){
  const d=new Date(key+"T12:00:00");
  return `${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function ExportPDF() {
  const [exporting, setExporting] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [done,      setDone]      = useState(false);
  const [filterYear, setFilterYear] = useState<number|"all">("all");

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - START.getFullYear() + 1 },
    (_, i) => START.getFullYear() + i
  );

  const exportPDF = async () => {
    setExporting(true);
    setProgress(0);
    setDone(false);

    // Dynamically import jsPDF (install: npm install jspdf)
    const { jsPDF } = await import("jspdf");

    setProgress(10);

    // Fetch all entries
    const res  = await fetch("/api/calendar");
    const all: CalEntry[] = await res.json();

    // Filter + sort
    let entries = all
      .filter(e => e.note || (e.photos?.length ?? 0) > 0)
      .filter(e => filterYear === "all" || new Date(e.date+"T12:00:00").getFullYear() === filterYear)
      .sort((a, b) => a.date.localeCompare(b.date));

    setProgress(20);

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210, H = 297;
    const MARGIN = 18;
    const CONTENT_W = W - MARGIN * 2;

    // ── Cover page ──────────────────────────────────────────────
    doc.setFillColor(252, 231, 243);
    doc.rect(0, 0, W, H, "F");

    // Pink gradient strip
    doc.setFillColor(244, 114, 182);
    doc.rect(0, 0, W, 6, "F");
    doc.setFillColor(253, 186, 213);
    doc.rect(0, 6, W, 3, "F");

    doc.setFont("times", "bolditalic");
    doc.setFontSize(32);
    doc.setTextColor(190, 24, 93);
    doc.text("our days together", W/2, 90, { align: "center" });

    doc.setFont("times", "italic");
    doc.setFontSize(14);
    doc.setTextColor(157, 63, 104);
    doc.text("a memory book", W/2, 102, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(190, 24, 93, 0.5 as any);
    doc.text(`march 11, 2026 → ${filterYear === "all" ? "forever" : filterYear}`, W/2, 115, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(200, 130, 160);
    doc.text(`${entries.length} memories`, W/2, 125, { align: "center" });

    // Bottom strip
    doc.setFillColor(244, 114, 182);
    doc.rect(0, H-6, W, 6, "F");

    setProgress(30);

    // ── Memory pages ─────────────────────────────────────────────
    const total = entries.length;
    for (let idx = 0; idx < entries.length; idx++) {
      const e = entries[idx];
      doc.addPage();

      // Soft pink bg
      doc.setFillColor(255, 245, 249);
      doc.rect(0, 0, W, H, "F");

      // Top accent line
      doc.setFillColor(249, 168, 212);
      doc.rect(MARGIN, 10, CONTENT_W, 0.5, "F");

      // Day number badge
      const dn = dayNum(e.date);
      doc.setFillColor(252, 231, 243);
      doc.roundedRect(MARGIN, 13, 32, 7, 3, 3, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(190, 24, 93);
      doc.text(`day ${dn} of us 🌸`, MARGIN + 2, 18);

      // Special badge
      if (e.special && e.specialLabel) {
        doc.setFillColor(253, 164, 175);
        doc.roundedRect(MARGIN + 35, 13, 55, 7, 3, 3, "F");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text(e.specialLabel, MARGIN + 37, 18);
      }

      // Date heading
      doc.setFont("times", "italic");
      doc.setFontSize(16);
      doc.setTextColor(190, 24, 93);
      doc.text(fmtFull(e.date), MARGIN, 30);

      let y = 36;

      // Mood
      if (e.mood) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(18);
        doc.text(e.mood, MARGIN, y + 2);
        y += 10;
      }

      // Photo (first one only — base64 → dataURL)
      if ((e.photos?.length ?? 0) > 0) {
        try {
          const imgData = e.photos[0];
          const ext = imgData.startsWith("data:image/png") ? "PNG" : "JPEG";
          const imgH = 70;
          const imgW = Math.min(CONTENT_W, 100);
          doc.addImage(imgData, ext, MARGIN, y, imgW, imgH, undefined, "MEDIUM");
          y += imgH + 4;
          if (e.photos.length > 1) {
            doc.setFontSize(8);
            doc.setTextColor(180, 120, 150);
            doc.text(`+ ${e.photos.length - 1} more photo${e.photos.length > 2 ? "s" : ""}`, MARGIN, y);
            y += 6;
          }
        } catch { /* skip bad image */ }
      }

      // Ruled note lines
      if (e.note) {
        y += 4;
        // Left margin line
        doc.setDrawColor(244, 114, 182, 0.2 as any);
        doc.setLineWidth(0.3);
        doc.line(MARGIN + 8, y, MARGIN + 8, H - 22);

        // Ruled lines
        doc.setDrawColor(249, 168, 212, 0.2 as any);
        doc.setLineWidth(0.2);
        const LINE_H = 6;
        for (let ly = y + LINE_H; ly < H - 22; ly += LINE_H) {
          doc.line(MARGIN + 10, ly, W - MARGIN, ly);
        }

        // Note text
        doc.setFont("times", "italic");
        doc.setFontSize(10.5);
        doc.setTextColor(124, 63, 88);
        const lines = doc.splitTextToSize(e.note, CONTENT_W - 14);
        doc.text(lines, MARGIN + 12, y + LINE_H - 1);
        y += lines.length * LINE_H + 8;
      }

      // Bottom divider + page number
      doc.setDrawColor(249, 168, 212);
      doc.setLineWidth(0.4);
      doc.line(MARGIN, H - 15, W - MARGIN, H - 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(190, 130, 160);
      doc.text(`${e.date}  ·  ${idx + 1} of ${total}`, W/2, H - 10, { align: "center" });

      setProgress(30 + Math.round((idx / total) * 65));
    }

    // ── Back cover ───────────────────────────────────────────────
    doc.addPage();
    doc.setFillColor(252, 231, 243);
    doc.rect(0, 0, W, H, "F");
    doc.setFillColor(244, 114, 182);
    doc.rect(0, 0, W, 6, "F");
    doc.rect(0, H-6, W, 6, "F");

    doc.setFont("times", "italic");
    doc.setFontSize(18);
    doc.setTextColor(190, 24, 93);
    doc.text(`${entries.length} memories.`, W/2, H/2 - 8, { align: "center" });
    doc.setFontSize(12);
    doc.text("every one of them worth keeping. 🩷", W/2, H/2 + 4, { align: "center" });
    doc.setFontSize(9);
    doc.setTextColor(180, 130, 160);
    doc.text(`march 11, 2026 → forever`, W/2, H/2 + 16, { align: "center" });

    setProgress(100);

    const filename = `our-days-${filterYear === "all" ? "all" : filterYear}.pdf`;
    doc.save(filename);

    setExporting(false);
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  };

  return (
    <section style={{
      position:"relative",width:"100%",
      padding:"4rem clamp(1rem,3vw,2rem) 5rem",
      background:"linear-gradient(160deg,#fff5f9,#fce7f3 40%,#fff0f5)",
      overflow:"hidden",
    }}>
      <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{maxWidth:560,margin:"0 auto",textAlign:"center"}}>

        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",marginBottom:"0.8rem"}}>
          <div style={{width:45,height:1,background:"linear-gradient(90deg,transparent,#f9a8d4)"}}/>
          <motion.span style={{fontSize:"1.5rem"}} animate={{rotate:[-5,5,-5]}} transition={{repeat:Infinity,duration:3}}>📖</motion.span>
          <div style={{width:45,height:1,background:"linear-gradient(90deg,#f9a8d4,transparent)"}}/>
        </div>

        <h2 style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1.5rem,4vw,2.2rem)",color:"#be185d",margin:"0 0 0.4rem",fontWeight:400}}>
          export memory book
        </h2>
        <p style={{fontFamily:SANS,fontSize:"0.88rem",color:"rgba(190,24,93,.5)",margin:"0 0 2rem",lineHeight:1.5}}>
          download a beautiful printable PDF of all your memories 🌸<br/>
          each page is a day — your photos, notes, and moods all in one book.
        </p>

        {/* Year filter */}
        <div style={{display:"flex",gap:"0.6rem",justifyContent:"center",flexWrap:"wrap",marginBottom:"2rem"}}>
          {["all" as const, ...years].map(y=>(
            <motion.button key={y} onClick={()=>setFilterYear(y)}
              whileHover={{scale:1.06}} whileTap={{scale:0.95}}
              style={{
                padding:"0.35rem 1rem",borderRadius:20,fontFamily:SANS,fontSize:"0.82rem",cursor:"pointer",
                border:`1.5px solid ${filterYear===y?"#ec4899":"rgba(249,168,212,.35)"}`,
                background:filterYear===y?"linear-gradient(135deg,rgba(244,114,182,.2),rgba(236,72,153,.15))":"rgba(255,255,255,.6)",
                color:filterYear===y?"#be185d":"rgba(190,24,93,.5)",transition:"all 0.18s",
              }}>
              {y === "all" ? "all time" : y}
            </motion.button>
          ))}
        </div>

        {/* Progress */}
        <AnimatePresence>
          {exporting && (
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
              style={{marginBottom:"1.5rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.4rem"}}>
                <span style={{fontFamily:SANS,fontSize:"0.78rem",color:"rgba(190,24,93,.5)"}}>building your book…</span>
                <span style={{fontFamily:SANS,fontSize:"0.78rem",color:"#ec4899"}}>{progress}%</span>
              </div>
              <div style={{height:6,borderRadius:3,background:"rgba(249,168,212,.2)",overflow:"hidden"}}>
                <motion.div animate={{width:`${progress}%`}} transition={{duration:0.3}}
                  style={{height:"100%",borderRadius:3,background:"linear-gradient(90deg,#f9a8d4,#ec4899)"}}/>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {done && (
            <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0}}
              style={{marginBottom:"1.2rem",background:"rgba(236,72,153,.1)",border:"1px solid rgba(236,72,153,.25)",borderRadius:12,padding:"0.9rem",fontFamily:SANS,fontSize:"0.9rem",color:"#be185d"}}>
              ✅ PDF downloaded! check your downloads folder 🌸
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button onClick={exportPDF} disabled={exporting}
          whileHover={exporting?{}:{scale:1.04,y:-3}} whileTap={exporting?{}:{scale:0.97}}
          style={{
            padding:"1.1rem 2.8rem",borderRadius:50,border:"none",cursor:exporting?"not-allowed":"pointer",
            background:"linear-gradient(135deg,#f9a8d4,#ec4899)",
            color:"#fff",fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1rem,2.5vw,1.2rem)",
            boxShadow:"0 6px 28px rgba(236,72,153,.38)",
            opacity:exporting?0.7:1,transition:"opacity 0.2s",
          }}>
          {exporting ? `generating… ${progress}%` : "download memory book 📖"}
        </motion.button>

        <p style={{fontFamily:SANS,fontSize:"0.75rem",color:"rgba(190,24,93,.35)",marginTop:"1rem"}}>
          installs jsPDF client-side · nothing leaves your device
        </p>
      </motion.div>
    </section>
  );
}