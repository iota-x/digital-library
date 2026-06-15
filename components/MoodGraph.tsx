"use client";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Unique aesthetic: dark observatory / star chart ── */
const SERIF  = `"Georgia","Times New Roman",serif`;
const MONO   = `"Courier New", Courier, monospace`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Canvas cannot resolve CSS variables — resolve them at draw time
function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function resolveColor(val: string): string {
  return val.replace(/var\((--[^)]+)\)/g, (_, v) => cssVar(v));
}

// Mood → colour. CSS var entries resolved via resolveColor() at draw time.
const MOOD_COLOR: Record<string,string> = {
  "🥰":"var(--pink)","😊":"#fb923c","🥺":"#a78bfa","😂":"#facc15",
  "🌙":"#818cf8","💗":"var(--pink-deep)","✨":"#e879f9","🎮":"#34d399",
  "🌷":"#86efac","😴":"#94a3b8","🤭":"var(--pink)","💫":"#c084fc",
};
const MOOD_LABEL: Record<string,string> = {
  "🥰":"loved","😊":"happy","🥺":"soft","😂":"laughing",
  "🌙":"moonlit","💗":"love","✨":"sparkling","🎮":"gaming",
  "🌷":"peaceful","😴":"sleepy","🤭":"giggly","💫":"dreamy",
};
const START = new Date("2026-03-11");

interface Entry { date:string; mood:string; note:string; photos:string[]; }
interface DataPoint { date:Date; mood:string; dayNum:number; }

export default function MoodGraph() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const [data,      setData]      = useState<DataPoint[]>([]);
  const [hovered,   setHovered]   = useState<DataPoint|null>(null);
  const [hoverPos,  setHoverPos]  = useState({x:0,y:0});
  const [loaded,    setLoaded]    = useState(false);
  const [viewRange, setViewRange] = useState<"all"|"90"|"30">("90");

  useEffect(()=>{
    fetch("/api/calendar").then(r=>r.json()).then((arr:Entry[])=>{
      const pts = arr
        .filter(e=>e.mood)
        .map(e=>({ date:new Date(e.date+"T12:00:00"), mood:e.mood, dayNum:Math.floor((new Date(e.date+"T12:00:00").getTime()-START.getTime())/86400000)+1 }))
        .sort((a,b)=>a.date.getTime()-b.date.getTime());
      setData(pts);
      setLoaded(true);
    });
  },[]);

  const filtered = data.filter(d=>{
    if (viewRange==="all") return true;
    const cutoff = Date.now() - parseInt(viewRange)*86400000;
    return d.date.getTime() >= cutoff;
  });

  /* Draw constellation-style chart on canvas */
  useEffect(()=>{
    const canvas = canvasRef.current; if(!canvas||!filtered.length) return;
    const ctx = canvas.getContext("2d"); if(!ctx) return;
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = 280;

    ctx.clearRect(0,0,W,H);

    /* Resolve theme colours once per draw */
    const pinkRgb     = cssVar("--pink-rgb");
    const pinkDeepRgb = cssVar("--pink-deep-rgb");

    /* Grid lines */
    ctx.strokeStyle=`rgba(${pinkRgb},0.06)`;
    ctx.lineWidth=1;
    for(let i=0;i<=4;i++){
      const y=30+i*(H-60)/4;
      ctx.beginPath(); ctx.moveTo(40,y); ctx.lineTo(W-20,y); ctx.stroke();
    }

    if(!filtered.length) return;
    const moodList = Object.keys(MOOD_COLOR);
    const minT = filtered[0].date.getTime();
    const maxT = filtered[filtered.length-1].date.getTime() || minT+1;

    const toX = (t:number)=>40+(W-60)*((t-minT)/(maxT-minT||1));
    const toY = (mood:string)=>{
      const idx=moodList.indexOf(mood); if(idx<0) return H/2;
      return 30+(H-60)*(idx/(moodList.length-1));
    };

    /* Connection line */
    ctx.beginPath();
    filtered.forEach((d,i)=>{
      const x=toX(d.date.getTime()), y=toY(d.mood);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    const grad=ctx.createLinearGradient(40,0,W-20,0);
    grad.addColorStop(0,`rgba(${pinkRgb},0.2)`);
    grad.addColorStop(1,`rgba(${pinkDeepRgb},0.5)`);
    ctx.strokeStyle=grad; ctx.lineWidth=1.5;
    ctx.setLineDash([3,5]); ctx.stroke(); ctx.setLineDash([]);

    /* Nodes */
    filtered.forEach(d=>{
      const x=toX(d.date.getTime()), y=toY(d.mood);
      const col = resolveColor(MOOD_COLOR[d.mood] || "var(--pink)");
      /* Glow */
      const radGrad=ctx.createRadialGradient(x,y,0,x,y,14);
      radGrad.addColorStop(0, col.startsWith("#") ? col + "40" : `rgba(${pinkRgb},0.25)`);
      radGrad.addColorStop(1,"transparent");
      ctx.beginPath(); ctx.arc(x,y,14,0,Math.PI*2);
      ctx.fillStyle=radGrad; ctx.fill();
      /* Dot */
      ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2);
      ctx.fillStyle=col; ctx.shadowBlur=8; ctx.shadowColor=col; ctx.fill();
      ctx.shadowBlur=0;
    });

    /* Y-axis mood labels */
    ctx.textAlign="right";
    moodList.forEach((m,i)=>{
      const y=30+(H-60)*(i/(moodList.length-1));
      ctx.font=`13px serif`;
      ctx.fillText(m,34,y+5);
    });

    /* X-axis date labels */
    ctx.fillStyle=`rgba(${pinkRgb},0.4)`;
    ctx.font=`10px ${MONO}`;
    ctx.textAlign="center";
    const step=Math.max(1,Math.floor(filtered.length/5));
    filtered.filter((_,i)=>i%step===0).forEach(d=>{
      const x=toX(d.date.getTime());
      ctx.fillText(`${MONTHS_SHORT[d.date.getMonth()]} ${d.date.getDate()}`,x,H-6);
    });

  },[filtered]);

  /* Hover hit-test */
  const handleMouseMove=(e:React.MouseEvent<HTMLCanvasElement>)=>{
    const canvas=canvasRef.current; if(!canvas||!filtered.length) return;
    const rect=canvas.getBoundingClientRect();
    const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    const W=canvas.offsetWidth, H=280;
    const moodList=Object.keys(MOOD_COLOR);
    const minT=filtered[0].date.getTime(), maxT=filtered[filtered.length-1].date.getTime()||minT+1;
    const toX=(t:number)=>40+(W-60)*((t-minT)/(maxT-minT||1));
    const toY=(mood:string)=>{ const idx=moodList.indexOf(mood); return idx<0?H/2:30+(H-60)*(idx/(moodList.length-1)); };
    let closest:DataPoint|null=null, minDist=Infinity;
    filtered.forEach(d=>{
      const dx=toX(d.date.getTime())-mx, dy=toY(d.mood)-my;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<minDist){minDist=dist;closest=d;}
    });
    if(minDist<20&&closest){setHovered(closest);setHoverPos({x:mx,y:my});}
    else setHovered(null);
  };

  /* Mood frequency for the legend */
  const freqMap:Record<string,number>={};
  filtered.forEach(d=>{ freqMap[d.mood]=(freqMap[d.mood]||0)+1; });
  const topMoods=Object.entries(freqMap).sort((a,b)=>b[1]-a[1]).slice(0,6);

  return (
    <section style={{
      position:"relative", width:"100%", minHeight:"100vh",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"clamp(4rem,8vh,7rem) clamp(1rem,3vw,2rem)",
      background:"linear-gradient(160deg,#0e0408 0%,#1a0812 50%,#0e0408 100%)",
      overflow:"hidden",
    }}>
      {/* Star field bg */}
      {Array.from({length:40},(_,i)=>(
        <motion.div key={i}
          animate={{opacity:[0.2,0.8,0.2]}}
          transition={{repeat:Infinity,duration:2+Math.random()*3,delay:Math.random()*4}}
          style={{
            position:"absolute",
            left:`${Math.random()*100}%`,top:`${Math.random()*100}%`,
            width:Math.random()>0.85?3:1.5,height:Math.random()>0.85?3:1.5,
            borderRadius:"50%",
            background:Object.values(MOOD_COLOR)[i%12],
            pointerEvents:"none",
          }}/>
      ))}

      <motion.div initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{maxWidth:760,width:"100%",margin:"0 auto",position:"relative",zIndex:2}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"1rem",marginBottom:"0.8rem"}}>
            <div style={{width:50,height:1,background:"linear-gradient(90deg,transparent,rgba(var(--pink-rgb),0.5))"}}/>
            <motion.span style={{fontSize:"1.5rem"}}
              animate={{rotate:[0,360]}} transition={{repeat:Infinity,duration:20,ease:"linear"}}>✦</motion.span>
            <div style={{width:50,height:1,background:"linear-gradient(90deg,rgba(var(--pink-rgb),0.5),transparent)"}}/>
          </div>
          <h2 style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"clamp(1.5rem,4vw,2.2rem)",color:"var(--pink-light)",margin:"0 0 0.4rem",fontWeight:400}}>
            mood constellation
          </h2>
          <p style={{fontFamily:MONO,fontSize:"0.75rem",color:"rgba(var(--pink-rgb),0.4)",margin:0,letterSpacing:"0.18em",textTransform:"uppercase"}}>
            charting how we've felt
          </p>
        </div>

        {/* Range selector */}
        <div style={{display:"flex",gap:"0.4rem",justifyContent:"center",marginBottom:"2rem"}}>
          {([["30","30 days"],["90","90 days"],["all","all time"]] as [typeof viewRange,string][]).map(([v,l])=>(
            <motion.button key={v} onClick={()=>setViewRange(v)}
              whileHover={{scale:1.05}} whileTap={{scale:0.95}}
              style={{
                padding:"0.35rem 1rem",borderRadius:20,cursor:"pointer",fontFamily:MONO,fontSize:"0.75rem",
                letterSpacing:"0.1em",
                border:`1px solid ${viewRange===v?"rgba(var(--pink-deep-rgb),0.6)":"rgba(var(--pink-rgb),0.2)"}`,
                background:viewRange===v?"rgba(var(--pink-deep-rgb),0.15)":"transparent",
                color:viewRange===v?"var(--pink)":"rgba(var(--pink-rgb),0.4)",
                transition:"all 0.2s",
              }}>{l}</motion.button>
          ))}
        </div>

        {/* Canvas chart */}
        <div style={{
          position:"relative",
          background:"rgba(255,255,255,0.02)",
          border:"1px solid rgba(var(--pink-rgb),0.1)",
          borderRadius:20,overflow:"hidden",
          boxShadow:"0 0 60px rgba(var(--pink-deep-rgb),0.05), inset 0 0 40px rgba(0,0,0,0.3)",
        }}>
          {loaded&&filtered.length>0?(
            <div style={{position:"relative"}}>
              <canvas ref={canvasRef} onMouseMove={handleMouseMove} onMouseLeave={()=>setHovered(null)}
                style={{width:"100%",height:280,display:"block",cursor:"crosshair"}}/>
              {/* Tooltip */}
              <AnimatePresence>
                {hovered&&(
                  <motion.div initial={{opacity:0,scale:0.88}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.88}}
                    transition={{duration:0.15}}
                    style={{
                      position:"absolute",
                      left:Math.min(hoverPos.x+12, (canvasRef.current?.offsetWidth??300)-160),
                      top:Math.max(hoverPos.y-60,8),
                      background:"rgba(22,6,14,0.95)",
                      border:`1px solid ${MOOD_COLOR[hovered.mood]||"rgba(var(--pink-rgb),0.3)"}`,
                      borderRadius:12,padding:"0.7rem 1rem",
                      pointerEvents:"none",minWidth:140,
                      boxShadow:`0 8px 24px rgba(0,0,0,0.6)`,
                    }}>
                    <div style={{fontSize:"1.4rem",marginBottom:"0.2rem"}}>{hovered.mood}</div>
                    <div style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.85rem",color:"var(--pink-light)"}}>
                      {MOOD_LABEL[hovered.mood]||""}
                    </div>
                    <div style={{fontFamily:MONO,fontSize:"0.68rem",color:"rgba(var(--pink-rgb),0.5)",marginTop:"0.2rem",letterSpacing:"0.1em"}}>
                      {hovered.date.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                    </div>
                    <div style={{fontFamily:MONO,fontSize:"0.65rem",color:"rgba(var(--pink-rgb),0.35)",marginTop:"0.1rem"}}>
                      day {hovered.dayNum}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ):(
            <div style={{height:280,display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(var(--pink-rgb),0.3)",fontFamily:MONO,fontSize:"0.8rem",letterSpacing:"0.12em"}}>
              {loaded?"no mood data yet — start logging in the journal":"loading…"}
            </div>
          )}
        </div>

        {/* Mood legend */}
        {topMoods.length>0&&(
          <div style={{marginTop:"1.8rem"}}>
            <p style={{fontFamily:MONO,fontSize:"0.7rem",color:"rgba(var(--pink-rgb),0.4)",letterSpacing:"0.16em",textTransform:"uppercase",margin:"0 0 1rem",textAlign:"center"}}>
              most felt
            </p>
            <div style={{display:"flex",flexWrap:"wrap",gap:"0.6rem",justifyContent:"center"}}>
              {topMoods.map(([mood,count])=>(
                <motion.div key={mood} whileHover={{scale:1.08,y:-3}}
                  style={{
                    display:"flex",alignItems:"center",gap:"0.5rem",
                    background:`rgba(${hexToRgb(MOOD_COLOR[mood]||"var(--pink)")},0.1)`,
                    border:`1px solid rgba(${hexToRgb(MOOD_COLOR[mood]||"var(--pink)")},0.3)`,
                    borderRadius:30,padding:"0.4rem 0.9rem",
                    boxShadow:`0 0 12px rgba(${hexToRgb(MOOD_COLOR[mood]||"var(--pink)")},0.15)`,
                  }}>
                  <span style={{fontSize:"1.1rem"}}>{mood}</span>
                  <span style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.82rem",color:MOOD_COLOR[mood]||"var(--pink)"}}>{MOOD_LABEL[mood]}</span>
                  <span style={{fontFamily:MONO,fontSize:"0.7rem",color:"rgba(var(--pink-rgb),0.45)"}}>×{count}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </section>
  );
}

/* hex → "r,g,b" for rgba() */
function hexToRgb(hex:string):string{
  const r=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r?`${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}`:"244,114,182";
}