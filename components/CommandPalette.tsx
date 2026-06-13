"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const SERIF = `"Georgia","Times New Roman",serif`;
const SANS  = `var(--font-lato),"Inter",system-ui,sans-serif`;

const ROUTES = [
  { href:"/",         label:"home",     emoji:"🌸", desc:"photos, memories & our timer"           },
  { href:"/timeline", label:"timeline", emoji:"🕰️",  desc:"our story from the very beginning"       },
  { href:"/journal",  label:"journal",  emoji:"📖", desc:"calendar, streaks & monthly recap"       },
  { href:"/capsule",  label:"capsule",  emoji:"💌", desc:"time capsule letters to each other"      },
  { href:"/shared",   label:"shared",   emoji:"🎬", desc:"bucket list, our playlist & watchlist"   },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? ROUTES.filter(r =>
        r.label.includes(query.toLowerCase()) ||
        r.desc.toLowerCase().includes(query.toLowerCase())
      )
    : ROUTES;

  // Ctrl+K / Cmd+K to toggle
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => { if (!o) { setQuery(""); setSel(0); } return !o; });
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  // Arrow nav + Enter — only when open
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(s+1, filtered.length-1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSel(s => Math.max(s-1, 0)); }
      if (e.key === "Enter") {
        e.preventDefault();
        const r = filtered[sel];
        if (r) { router.push(r.href); setOpen(false); }
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, filtered, sel, router]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 60); }, [open]);
  useEffect(() => { setSel(0); }, [query]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cp-bg"
          initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          transition={{duration:.14}}
          onClick={() => setOpen(false)}
          style={{
            position:"fixed", inset:0, zIndex:9999,
            background:"rgba(50,0,25,.42)",
            backdropFilter:"blur(10px)",
            WebkitBackdropFilter:"blur(10px)",
            display:"flex", alignItems:"flex-start", justifyContent:"center",
            paddingTop:"clamp(80px,16vh,150px)",
          }}>
          <motion.div
            key="cp-box"
            initial={{opacity:0,y:-18,scale:.96}} animate={{opacity:1,y:0,scale:1}}
            exit={{opacity:0,y:-18,scale:.96}}
            transition={{duration:.2,ease:[.16,1,.3,1]}}
            onClick={e => e.stopPropagation()}
            style={{
              width:"min(580px,92vw)",
              background:"rgba(255,249,253,.98)",
              border:"1.5px solid rgba(236,72,153,.22)",
              borderRadius:22,
              boxShadow:"0 28px 80px rgba(190,24,93,.22),0 0 0 1px rgba(249,168,212,.15)",
              overflow:"hidden",
            }}>

            {/* Search bar */}
            <div style={{
              display:"flex", alignItems:"center", gap:"0.8rem",
              padding:"1rem 1.25rem",
              borderBottom:"1px solid rgba(236,72,153,.1)",
            }}>
              <span style={{fontSize:"1rem",opacity:.4,flexShrink:0,lineHeight:1}}>🔍</span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="go somewhere…"
                style={{
                  flex:1, fontFamily:SERIF, fontStyle:"italic",
                  fontSize:"1rem", color:"#7c3f58",
                  background:"transparent", border:"none", outline:"none",
                }}
              />
              <kbd style={KBD}>esc</kbd>
            </div>

            {/* Route list */}
            <div style={{maxHeight:340, overflowY:"auto", scrollbarWidth:"none"}}>
              {filtered.length === 0 ? (
                <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.95rem",
                  color:"rgba(157,23,77,.35)",textAlign:"center",padding:"1.5rem",margin:0}}>
                  no pages found
                </p>
              ) : filtered.map((r, i) => (
                <div key={r.href}
                  onClick={() => { router.push(r.href); setOpen(false); }}
                  onMouseEnter={() => setSel(i)}
                  style={{
                    display:"flex", alignItems:"center", gap:"1rem",
                    padding:"0.88rem 1.25rem",
                    cursor:"pointer",
                    background: sel===i ? "rgba(236,72,153,.07)" : "transparent",
                    borderLeft:`3px solid ${sel===i ? "#ec4899" : "transparent"}`,
                    transition:"background .1s",
                  }}>
                  <span style={{fontSize:"1.25rem",lineHeight:1,flexShrink:0}}>{r.emoji}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"1rem",
                      color:sel===i?"#9d174d":"#7c3f58",margin:"0 0 0.06rem",fontWeight:400}}>
                      {r.label}
                    </p>
                    <p style={{fontFamily:SANS,fontSize:"0.72rem",
                      color:"rgba(157,23,77,.42)",margin:0}}>
                      {r.desc}
                    </p>
                  </div>
                  {sel===i && <kbd style={KBD}>↵</kbd>}
                </div>
              ))}
            </div>

            {/* Hint footer */}
            <div style={{
              display:"flex", gap:"1.2rem", justifyContent:"center", alignItems:"center",
              padding:"0.62rem 1.2rem",
              borderTop:"1px solid rgba(236,72,153,.07)",
              fontFamily:SANS, fontSize:"0.62rem",
              color:"rgba(190,24,93,.3)", letterSpacing:"0.04em",
            }}>
              <span>↑↓ navigate</span>
              <span style={{opacity:.4}}>·</span>
              <span>↵ open</span>
              <span style={{opacity:.4}}>·</span>
              <span>esc close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const KBD: React.CSSProperties = {
  fontFamily:SANS, fontSize:"0.6rem", fontWeight:700,
  color:"rgba(190,24,93,.4)", background:"rgba(190,24,93,.07)",
  border:"1px solid rgba(190,24,93,.13)", borderRadius:6,
  padding:"0.18rem 0.45rem", flexShrink:0, whiteSpace:"nowrap",
};
