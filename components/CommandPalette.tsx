"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendarData } from "@/lib/calendarStore";

const SERIF = `"Georgia","Times New Roman",serif`;
const SANS  = `var(--font-lato),"Inter",system-ui,sans-serif`;

const ROUTES = [
  { href:"/",         label:"home",     emoji:"🌸", desc:"photos, memories & our timer"                 },
  { href:"/timeline", label:"our story", emoji:"🕰️",  desc:"memories from before this app — where it all began" },
  { href:"/journal",  label:"journal",  emoji:"📖", desc:"calendar, streaks & monthly recap"             },
  { href:"/capsule",  label:"capsule",  emoji:"💌", desc:"time capsule letters to each other"            },
  { href:"/shared",   label:"shared",   emoji:"🎬", desc:"bucket list, our playlist & watchlist"         },
  { href:"/map",      label:"memories", emoji:"📸", desc:"our story so far — scattered photos & notes"   },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtEntry(date: string) {
  const d = new Date(date + "T12:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: calData } = useCalendarData();

  // Journal entries matching the query (text, date, mood, special label)
  const matchingEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return calData
      .filter(e => {
        const text = [e.note, e.pinnedNote, e.mood, e.specialLabel, e.date, fmtEntry(e.date)]
          .join(" ").toLowerCase();
        return text.includes(q) && (e.note || (e.photos?.length ?? 0) > 0);
      })
      .slice(0, 5)
      .map(e => ({
        href: `/journal?date=${e.date}`,
        label: fmtEntry(e.date),
        emoji: e.mood || "📖",
        desc: e.pinnedNote || e.note?.slice(0, 72) || "journal entry",
        isEntry: true,
      }));
  }, [query, calData]);

  const filteredRoutes = query.trim()
    ? ROUTES.filter(r =>
        r.label.includes(query.toLowerCase()) ||
        r.desc.toLowerCase().includes(query.toLowerCase())
      )
    : ROUTES;

  const allResults = [...filteredRoutes, ...matchingEntries];
  const totalItems = allResults.length;

  // Ctrl+K / Cmd+K
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

  // Arrow nav + Enter
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(s + 1, totalItems - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
      if (e.key === "Enter") {
        e.preventDefault();
        const r = allResults[sel];
        if (r) { router.push(r.href); setOpen(false); }
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, allResults, sel, totalItems, router]);

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
            backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
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
            <div style={{display:"flex",alignItems:"center",gap:"0.8rem",padding:"1rem 1.25rem",borderBottom:"1px solid rgba(236,72,153,.1)"}}>
              <span style={{fontSize:"1rem",opacity:.4,flexShrink:0,lineHeight:1}}>🔍</span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="go somewhere or search memories…"
                style={{flex:1,fontFamily:SERIF,fontStyle:"italic",fontSize:"1rem",color:"#7c3f58",background:"transparent",border:"none",outline:"none"}}
              />
              <kbd style={KBD}>esc</kbd>
            </div>

            {/* Results */}
            <div style={{maxHeight:380, overflowY:"auto", scrollbarWidth:"none" as const}}>
              {/* Entries section header */}
              {filteredRoutes.length > 0 && matchingEntries.length > 0 && (
                <p style={{fontFamily:SANS,fontSize:"0.58rem",color:"rgba(190,24,93,.35)",letterSpacing:"0.14em",textTransform:"uppercase",padding:"0.7rem 1.25rem 0.2rem",margin:0}}>
                  pages
                </p>
              )}

              {/* Routes */}
              {filteredRoutes.map((r, i) => (
                <ResultRow key={r.href} r={r} idx={i} sel={sel} onSelect={setSel}
                  onClick={() => { router.push(r.href); setOpen(false); }}/>
              ))}

              {/* Journal entries section header */}
              {matchingEntries.length > 0 && (
                <p style={{fontFamily:SANS,fontSize:"0.58rem",color:"rgba(190,24,93,.35)",letterSpacing:"0.14em",textTransform:"uppercase",padding:"0.7rem 1.25rem 0.2rem",margin:0}}>
                  journal entries
                </p>
              )}

              {/* Matching journal entries */}
              {matchingEntries.map((r, i) => (
                <ResultRow key={r.href} r={r} idx={filteredRoutes.length + i} sel={sel} onSelect={setSel}
                  onClick={() => { router.push(r.href); setOpen(false); }}/>
              ))}

              {totalItems === 0 && (
                <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.95rem",color:"rgba(157,23,77,.35)",textAlign:"center",padding:"1.5rem",margin:0}}>
                  nothing found 🌸
                </p>
              )}
            </div>

            {/* Footer */}
            <div style={{display:"flex",gap:"1.2rem",justifyContent:"center",alignItems:"center",padding:"0.62rem 1.2rem",borderTop:"1px solid rgba(236,72,153,.07)",fontFamily:SANS,fontSize:"0.62rem",color:"rgba(190,24,93,.3)",letterSpacing:"0.04em"}}>
              <span>↑↓ navigate</span>
              <span style={{opacity:.4}}>·</span>
              <span>↵ open</span>
              <span style={{opacity:.4}}>·</span>
              <span>esc close</span>
              {query.length >= 2 && matchingEntries.length === 0 && filteredRoutes.length > 0 && (
                <><span style={{opacity:.4}}>·</span><span>type more to search memories</span></>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ResultRow({ r, idx, sel, onSelect, onClick }: {
  r: { emoji: string; label: string; desc: string; isEntry?: boolean };
  idx: number; sel: number;
  onSelect: (i: number) => void;
  onClick: () => void;
}) {
  return (
    <div onClick={onClick} onMouseEnter={() => onSelect(idx)}
      style={{
        display:"flex", alignItems:"center", gap:"1rem",
        padding:"0.88rem 1.25rem",
        cursor:"pointer",
        background: sel === idx ? "rgba(236,72,153,.07)" : "transparent",
        borderLeft:`3px solid ${sel === idx ? "#ec4899" : "transparent"}`,
        transition:"background .1s",
      }}>
      <span style={{fontSize:r.isEntry?"1rem":"1.25rem",lineHeight:1,flexShrink:0}}>{r.emoji}</span>
      <div style={{flex:1,minWidth:0}}>
        <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"1rem",color:sel===idx?"#9d174d":"#7c3f58",margin:"0 0 0.06rem",fontWeight:400}}>
          {r.label}
        </p>
        <p style={{fontFamily:SANS,fontSize:"0.72rem",color:"rgba(157,23,77,.42)",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {r.desc}
        </p>
      </div>
      {sel === idx && <kbd style={KBD}>↵</kbd>}
    </div>
  );
}

const KBD: React.CSSProperties = {
  fontFamily:SANS, fontSize:"0.6rem", fontWeight:700,
  color:"rgba(190,24,93,.4)", background:"rgba(190,24,93,.07)",
  border:"1px solid rgba(190,24,93,.13)", borderRadius:6,
  padding:"0.18rem 0.45rem", flexShrink:0, whiteSpace:"nowrap",
};
