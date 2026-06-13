"use client";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEscKey } from "@/lib/useEscKey";

const SERIF  = `"Georgia","Times New Roman",serif`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
const SCRIPT = `var(--font-caveat),"Segoe Script",cursive`;

type Category = "dates" | "travel" | "experiences" | "firsts" | "other";

interface BucketItem {
  _id: string;
  text: string;
  category: Category;
  completed: boolean;
  addedAt: string;
  completedAt?: string | null;
}

const CATS: { key: Category; label: string; emoji: string; color: string; bg: string }[] = [
  { key:"dates",       label:"dates",       emoji:"💕", color:"#be185d", bg:"rgba(249,168,212,.25)" },
  { key:"travel",      label:"travel",      emoji:"✈️",  color:"#0369a1", bg:"rgba(186,230,253,.3)"  },
  { key:"experiences", label:"experiences", emoji:"🌟", color:"#92400e", bg:"rgba(253,230,138,.3)"  },
  { key:"firsts",      label:"firsts",      emoji:"🎊", color:"#5b21b6", bg:"rgba(221,214,254,.3)"  },
  { key:"other",       label:"other",       emoji:"✨", color:"#065f46", bg:"rgba(167,243,208,.3)"  },
];

const TABS: { key: "all" | "pending" | "done"; label: string }[] = [
  { key:"all",     label:"all" },
  { key:"pending", label:"in our dreams" },
  { key:"done",    label:"done together ✓" },
];

export default function BucketList() {
  const [items,   setItems]   = useState<BucketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<"all"|"pending"|"done">("all");
  const [newText, setNewText] = useState("");
  const [newCat,  setNewCat]  = useState<Category>("dates");
  const [adding,  setAdding]  = useState(false);
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const r = await fetch("/api/bucketlist");
    const d = await r.json();
    setItems(Array.isArray(d) ? d : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (showInput) setTimeout(() => inputRef.current?.focus(), 80);
  }, [showInput]);
  useEscKey(() => { setShowInput(false); setNewText(""); }, showInput);

  const visible = items.filter(i => {
    if (tab === "pending") return !i.completed;
    if (tab === "done")    return i.completed;
    return true;
  });

  const doneCount = items.filter(i => i.completed).length;

  async function toggle(item: BucketItem) {
    const next = !item.completed;
    setItems(prev => prev.map(x => x._id === item._id ? { ...x, completed: next } : x));
    await fetch("/api/bucketlist", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: item._id, completed: next }),
    });
  }

  async function addItem() {
    if (!newText.trim()) return;
    setAdding(true);
    await fetch("/api/bucketlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText.trim(), category: newCat }),
    });
    setNewText(""); setAdding(false); setShowInput(false);
    load();
  }

  async function del(id: string) {
    setItems(prev => prev.filter(x => x._id !== id));
    await fetch("/api/bucketlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: id }),
    });
  }

  const getCat = (key: Category) => CATS.find(c => c.key === key)!;

  return (
    <section style={{
      position: "relative", width: "100%", minHeight: "100vh",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes bl-check { 0%{transform:scale(0) rotate(-20deg)} 60%{transform:scale(1.3) rotate(5deg)} 100%{transform:scale(1) rotate(0)} }
        @keyframes bl-line  { from{width:0} to{width:100%} }
        @keyframes bl-float { 0%,100%{transform:translateY(0) rotate(0deg);opacity:.3} 50%{transform:translateY(-12px) rotate(6deg);opacity:.55} }
        .bl-item:hover .bl-del { opacity:1; }
        .bl-del { opacity:0; transition:opacity .18s; }
        .bl-item { transition:background .18s; }
        .bl-item:hover { background:rgba(236,72,153,.04) !important; }
        .bl-check-btn { transition:transform .15s; cursor:pointer; }
        .bl-check-btn:hover { transform:scale(1.2); }
        .bl-tab { transition:all .18s; cursor:pointer; }
      `}</style>

      {/* Diary paper background */}
      <div style={{
        position: "absolute", inset: 0,
        background: "#fffdf8",
        backgroundImage: `
          repeating-linear-gradient(
            180deg,
            transparent,
            transparent 31px,
            rgba(190,24,93,.07) 31px,
            rgba(190,24,93,.07) 32px
          )
        `,
        backgroundSize: "100% 32px",
        backgroundPositionY: "72px",
      }} />
      {/* Left margin line */}
      <div style={{
        position: "absolute", left: "clamp(48px,10vw,88px)", top: 0, bottom: 0, width: 2,
        background: "rgba(236,72,153,.12)",
      }} />

      {/* Floating doodles */}
      {["💕","✨","🌸","⭐","💫","🌷"].map((e,i) => (
        <span key={i} aria-hidden style={{
          position:"absolute",
          top: `${12+i*14}%`, left: `${i%2===0?"2%":"93%"}`,
          fontSize:`${0.9+i*.1}rem`,
          animation:`bl-float ${2.5+i*.4}s ease-in-out infinite`,
          animationDelay:`${i*.5}s`,
          userSelect:"none", pointerEvents:"none",
        }}>{e}</span>
      ))}

      <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto",
        padding: "clamp(3.5rem,7vh,5.5rem) clamp(1rem,4vw,2.5rem)" }}>

        {/* ── Header ── */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          {/* Diary title decoration */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"0.8rem", marginBottom:"0.7rem" }}>
            <div style={{ flex:1, maxWidth:55, height:1, background:"linear-gradient(90deg,transparent,rgba(190,24,93,.25))" }}/>
            <span style={{ fontFamily:SCRIPT, fontSize:"1rem", color:"rgba(190,24,93,.38)", letterSpacing:"0.08em" }}>💕 ✦ 💕</span>
            <div style={{ flex:1, maxWidth:55, height:1, background:"linear-gradient(90deg,rgba(190,24,93,.25),transparent)" }}/>
          </div>
          <h2 style={{ fontFamily:SERIF, fontStyle:"italic", fontWeight:400,
            fontSize:"clamp(2rem,5vw,2.8rem)", color:"#9d174d", margin:"0 0 0.35rem", letterSpacing:"-0.01em" }}>
            our bucket list
          </h2>
          <p style={{ fontFamily:SCRIPT, fontSize:"clamp(1rem,2.5vw,1.2rem)", color:"rgba(157,23,77,.45)", margin:"0 0 1rem" }}>
            dreams we want to live together 🌸
          </p>

          {/* Progress */}
          {items.length > 0 && (
            <div style={{ display:"inline-flex", flexDirection:"column", alignItems:"center", gap:"0.4rem" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"0.55rem" }}>
                <span style={{ fontFamily:SCRIPT, fontSize:"1rem", color:"rgba(157,23,77,.5)" }}>
                  {doneCount} of {items.length} done
                </span>
                <span style={{ fontSize:"0.9rem" }}>{doneCount === items.length && items.length > 0 ? "🎉" : "💗"}</span>
              </div>
              {/* Progress bar */}
              <div style={{ width:160, height:5, background:"rgba(236,72,153,.12)", borderRadius:10, overflow:"hidden" }}>
                <div style={{
                  height:"100%", borderRadius:10,
                  background:"linear-gradient(90deg,#f9a8d4,#ec4899)",
                  width:`${items.length ? (doneCount/items.length)*100 : 0}%`,
                  transition:"width .5s ease",
                }} />
              </div>
            </div>
          )}
        </div>

        {/* ── Tabs + Add ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          flexWrap:"wrap", gap:"0.75rem", marginBottom:"1.6rem" }}>
          <div style={{ display:"flex", gap:"0.25rem",
            background:"rgba(255,255,255,.7)", border:"1px solid rgba(236,72,153,.18)",
            borderRadius:50, padding:"0.28rem" }}>
            {TABS.map(t => {
              const active = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)} className="bl-tab" style={{
                  fontFamily:SANS, fontSize:"0.76rem", fontWeight: active ? 700 : 500,
                  color: active ? "#fff" : "rgba(190,24,93,.65)",
                  background: active ? "linear-gradient(135deg,#f9a8d4,#ec4899)" : "transparent",
                  boxShadow: active ? "0 2px 12px rgba(236,72,153,.3)" : "none",
                  border:"none", borderRadius:40, padding:"0.38rem 0.9rem", cursor:"pointer",
                }}>
                  {t.label}
                </button>
              );
            })}
          </div>
          <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.96}}
            onClick={() => setShowInput(s => !s)}
            style={{
              fontFamily:SANS, fontSize:"0.82rem", fontWeight:700, color:"#fff",
              background:"linear-gradient(135deg,#f9a8d4,#ec4899)",
              border:"none", borderRadius:50, padding:"0.5rem 1.3rem",
              cursor:"pointer", boxShadow:"0 4px 18px rgba(236,72,153,.28)",
              display:"flex", alignItems:"center", gap:"0.4rem",
            }}>
            ✏️ write a dream
          </motion.button>
        </div>

        {/* ── Add form ── */}
        <AnimatePresence>
          {showInput && (
            <motion.div initial={{opacity:0,y:-12,height:0}} animate={{opacity:1,y:0,height:"auto"}} exit={{opacity:0,y:-12,height:0}}
              style={{ marginBottom:"1.5rem", overflow:"hidden" }}>
              <div style={{
                background:"rgba(255,255,255,.88)",
                border:"1.5px solid rgba(236,72,153,.2)",
                borderRadius:20, padding:"1.3rem 1.5rem",
                boxShadow:"0 8px 32px rgba(190,24,93,.08)",
              }}>
                <p style={{ fontFamily:SCRIPT, fontSize:"1.15rem", color:"#9d174d", margin:"0 0 1rem" }}>
                  ✍️ add a dream…
                </p>
                <input ref={inputRef}
                  placeholder="something we want to do together…"
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && addItem()}
                  style={{
                    width:"100%", boxSizing:"border-box",
                    fontFamily:SANS, fontSize:"1rem", color:"#7c3f58",
                    background:"transparent",
                    border:"none", borderBottom:"2px solid rgba(236,72,153,.25)",
                    padding:"0.4rem 0", outline:"none",
                    marginBottom:"1rem",
                  }} />
                {/* Category picker */}
                <div style={{ display:"flex", flexWrap:"wrap", gap:"0.45rem", marginBottom:"1rem" }}>
                  {CATS.map(c => (
                    <button key={c.key} onClick={() => setNewCat(c.key)} style={{
                      fontFamily:SANS, fontSize:"0.76rem", fontWeight:600,
                      color: newCat===c.key ? "#fff" : c.color,
                      background: newCat===c.key ? `linear-gradient(135deg,${c.color}cc,${c.color})` : c.bg,
                      border:`1.5px solid ${newCat===c.key ? c.color : "transparent"}`,
                      borderRadius:50, padding:"0.3rem 0.8rem",
                      cursor:"pointer", transition:"all .18s",
                    }}>
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
                <div style={{ display:"flex", gap:"0.55rem", justifyContent:"flex-end" }}>
                  <button onClick={() => { setShowInput(false); setNewText(""); }}
                    style={{ fontFamily:SANS, fontSize:"0.8rem", fontWeight:500, color:"rgba(190,24,93,.5)",
                      background:"none", border:"none", cursor:"pointer" }}>
                    cancel
                  </button>
                  <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.96}}
                    onClick={addItem} disabled={adding || !newText.trim()}
                    style={{
                      fontFamily:SANS, fontSize:"0.82rem", fontWeight:700, color:"#fff",
                      background:"linear-gradient(135deg,#f9a8d4,#ec4899)",
                      border:"none", borderRadius:50, padding:"0.45rem 1.2rem",
                      cursor:"pointer", opacity:adding||!newText.trim()?0.55:1,
                    }}>
                    {adding ? "adding…" : "✓ add it"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── List ── */}
        {loading ? (
          <div style={{ textAlign:"center", padding:"4rem",
            fontFamily:SCRIPT, fontSize:"1.2rem", color:"rgba(190,24,93,.35)" }}>
            opening the diary… 🌸
          </div>
        ) : visible.length === 0 ? (
          <motion.div initial={{opacity:0}} animate={{opacity:1}}
            style={{ textAlign:"center", padding:"4rem 2rem" }}>
            <div style={{ fontSize:"3rem", marginBottom:"0.8rem" }}>📖</div>
            <p style={{ fontFamily:SERIF, fontStyle:"italic", fontSize:"1.2rem",
              color:"rgba(157,23,77,.38)", margin:"0 0 0.3rem" }}>
              {tab==="done" ? "nothing done yet — go make memories!" : "this page is empty"}
            </p>
            <p style={{ fontFamily:SCRIPT, fontSize:"1.05rem", color:"rgba(157,23,77,.3)", margin:0 }}>
              {tab==="done" ? "" : "write your first dream together ✨"}
            </p>
          </motion.div>
        ) : (
          <div style={{
            background:"rgba(255,255,255,.6)",
            border:"1px solid rgba(236,72,153,.14)",
            borderRadius:20, overflow:"hidden",
          }}>
            <AnimatePresence initial={false}>
              {visible.map((item, i) => {
                const cat = getCat(item.category);
                return (
                  <motion.div key={item._id}
                    initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:16,height:0}}
                    transition={{delay:i*.03}}
                    className="bl-item"
                    style={{
                      display:"flex", alignItems:"center", gap:"0.9rem",
                      padding:"0.9rem 1.1rem",
                      borderBottom: i<visible.length-1 ? "1px solid rgba(236,72,153,.07)" : "none",
                      background: item.completed ? "rgba(236,72,153,.025)" : "transparent",
                    }}>

                    {/* Checkbox — heart toggle */}
                    <button className="bl-check-btn" onClick={() => toggle(item)}
                      style={{ flexShrink:0, background:"none", border:"none", padding:0,
                        fontSize:"1.4rem", lineHeight:1, width:28 }}>
                      {item.completed
                        ? <motion.span initial={{scale:0}} animate={{scale:1}}
                            style={{display:"inline-block",animation:"bl-check .4s ease both"}}>
                            💗
                          </motion.span>
                        : <span style={{opacity:.35}}>🤍</span>
                      }
                    </button>

                    {/* Text */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{
                        fontFamily:SANS, fontSize:"0.95rem", fontWeight:500,
                        color: item.completed ? "rgba(157,23,77,.38)" : "#7c3f58",
                        margin:0, lineHeight:1.45, position:"relative",
                        textDecoration: item.completed ? "line-through" : "none",
                        textDecorationColor: "rgba(190,24,93,.4)",
                      }}>
                        {item.text}
                      </p>
                      <div style={{ display:"flex", alignItems:"center", gap:"0.4rem", marginTop:"0.15rem" }}>
                        <span style={{
                          fontFamily:SANS, fontSize:"0.62rem", fontWeight:700,
                          color: cat.color, background: cat.bg,
                          borderRadius:6, padding:"0.08rem 0.42rem",
                        }}>
                          {cat.emoji} {cat.label}
                        </span>
                        {item.completed && item.completedAt && (
                          <span style={{ fontFamily:SCRIPT, fontSize:"0.78rem", color:"rgba(157,23,77,.4)" }}>
                            done ✓
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete */}
                    <button className="bl-del" onClick={() => del(item._id)}
                      style={{ background:"none", border:"none", cursor:"pointer",
                        fontSize:"0.9rem", color:"rgba(190,24,93,.3)", flexShrink:0,
                        padding:"0.2rem 0.3rem", borderRadius:6,
                        lineHeight:1 }}>
                      ✕
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Done celebration */}
        {doneCount > 0 && doneCount === items.length && !loading && (
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
            style={{ textAlign:"center", padding:"1.5rem 0 0" }}>
            <p style={{ fontFamily:SCRIPT, fontSize:"1.3rem", color:"rgba(157,23,77,.55)", margin:0 }}>
              you did everything! time to dream bigger 🎉💕
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}
