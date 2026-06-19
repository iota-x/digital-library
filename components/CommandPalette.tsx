"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendarData } from "@/lib/calendarStore";
import { useUserData } from "@/lib/userStore";
import { SERIF, SANS } from "@/lib/typography";
import { useFocusTrap } from "@/lib/useFocusTrap";


const ROUTES = [
  { href:"/",         label:"home",     emoji:"🌸", desc:"photos, memories & our timer"                 },
  { href:"/daily",    label:"question", emoji:"💭", desc:"today's question of the day & past answers"   },
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

interface Hit {
  href: string;
  emoji: string;
  label: string;
  desc: string;
  isEntry?: boolean;
}

// Cache the heavier "search everything" lookups across renders so typing
// doesn't refetch on every keystroke. Refresh ~30s.
let _hitsCache: { at: number; bucket?: Hit[]; watch?: Hit[]; capsules?: Hit[]; voice?: Hit[] } = { at: 0 };
const CACHE_TTL = 30_000;

async function loadAuxData(): Promise<NonNullable<typeof _hitsCache>> {
  if (Date.now() - _hitsCache.at < CACHE_TTL && _hitsCache.bucket) return _hitsCache;
  try {
    const [b, w, c, v] = await Promise.all([
      fetch("/api/bucketlist").then(r => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/watchlist").then(r => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/timecapsule").then(r => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/voicenotes").then(r => r.ok ? r.json() : []).catch(() => []),
    ]);
    const bucket: Hit[] = (Array.isArray(b) ? b : []).map((x: { text?: string; category?: string; completed?: boolean }) => ({
      href: "/shared#bucket",
      emoji: x.completed ? "✅" : "📋",
      label: x.text || "(untitled)",
      desc: `bucket list · ${x.category || "other"}`,
    }));
    const watch: Hit[] = (Array.isArray(w) ? w : []).map((x: { title?: string; type?: string; status?: string }) => ({
      href: "/shared#watchlist",
      emoji: x.type === "anime" ? "🌸" : x.type === "series" ? "📺" : "🎬",
      label: x.title || "(untitled)",
      desc: `watchlist · ${x.status?.replace("-", " ") || ""}`,
    }));
    const capsules: Hit[] = (Array.isArray(c) ? c : []).map((x: { letter?: string; from?: string; unlockDate?: string }) => ({
      href: "/capsule",
      emoji: "💌",
      label: x.from ? `letter from ${x.from}` : "a letter",
      desc: (x.letter || "").slice(0, 72) + (x.letter && x.letter.length > 72 ? "…" : ""),
    }));
    const voice: Hit[] = (Array.isArray(v) ? v : []).map((x: { label?: string; from?: string; createdAt?: string }) => ({
      href: "/#voicenotes",
      emoji: "🎙",
      label: x.label || (x.from ? `voice note from ${x.from}` : "voice note"),
      desc: x.createdAt ? `voice · ${new Date(x.createdAt).toLocaleDateString()}` : "voice note",
    }));
    _hitsCache = { at: Date.now(), bucket, watch, capsules, voice };
  } catch { /* leave cache as-is */ }
  return _hitsCache;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const [aux, setAux] = useState<typeof _hitsCache>({ at: 0 });
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: calData } = useCalendarData();
  const userData = useUserData();

  // Prime auxiliary data lazily so opening the palette feels instant
  useEffect(() => {
    if (open && Date.now() - aux.at > CACHE_TTL) {
      loadAuxData().then(setAux);
    }
  }, [open, aux.at]);

  // Journal entries matching the query (text, date, mood, special label)
  const matchingEntries = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return calData
      .filter(e => {
        const text = [e.note, e.pinnedNote, e.mood, e.specialLabel, e.date, fmtEntry(e.date), e.weather?.label]
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

  // Filter the cached aux hits by query
  function filterHits(hits: Hit[] | undefined, q: string, cap = 4): Hit[] {
    if (!hits || q.length < 2) return [];
    return hits.filter(h => (h.label + " " + h.desc).toLowerCase().includes(q)).slice(0, cap);
  }

  const q = query.trim().toLowerCase();
  const matchingBucket   = useMemo(() => filterHits(aux.bucket,   q), [aux.bucket,   q]);
  const matchingWatch    = useMemo(() => filterHits(aux.watch,    q), [aux.watch,    q]);
  const matchingCapsules = useMemo(() => filterHits(aux.capsules, q), [aux.capsules, q]);
  const matchingVoice    = useMemo(() => filterHits(aux.voice,    q), [aux.voice,    q]);

  // Timeline events live in settings — search them inline (no fetch needed)
  const matchingTimeline = useMemo<Hit[]>(() => {
    if (q.length < 2) return [];
    const evs = userData?.settings?.timelineEvents ?? [];
    return evs
      .filter(e => (e.q + " " + e.tag + " " + e.letter).toLowerCase().includes(q))
      .slice(0, 4)
      .map(e => ({ href: "/timeline", emoji: "🕰", label: e.q, desc: e.tag }));
  }, [q, userData?.settings?.timelineEvents]);

  const filteredRoutes = query.trim()
    ? ROUTES.filter(r =>
        r.label.includes(query.toLowerCase()) ||
        r.desc.toLowerCase().includes(query.toLowerCase())
      )
    : ROUTES;

  const allResults: Hit[] = [
    ...filteredRoutes,
    ...matchingEntries,
    ...matchingTimeline,
    ...matchingCapsules,
    ...matchingBucket,
    ...matchingWatch,
    ...matchingVoice,
  ];
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

  // Trap Tab focus inside the palette. Esc/arrows/Enter are handled by the
  // existing window-level keydown effects, so we don't pass onEscape here.
  const boxRef = useRef<HTMLDivElement>(null);
  useFocusTrap(boxRef, { active: open, initialFocus: inputRef });
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
            ref={boxRef}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette — search and navigate"
            className="cmd-palette"
            initial={{opacity:0,y:-18,scale:.96}} animate={{opacity:1,y:0,scale:1}}
            exit={{opacity:0,y:-18,scale:.96}}
            transition={{duration:.2,ease:[.16,1,.3,1]}}
            onClick={e => e.stopPropagation()}
            style={{
              width:"min(580px,92vw)",
              background:"rgba(255,249,253,.98)",
              border:"1.5px solid rgba(var(--pink-deep-rgb),.22)",
              borderRadius:22,
              boxShadow:"0 28px 80px rgba(var(--pink-deep-rgb),.22),0 0 0 1px rgba(var(--pink-rgb),.15)",
              overflow:"hidden",
            }}>

            {/* Search bar */}
            <div style={{display:"flex",alignItems:"center",gap:"0.8rem",padding:"1rem 1.25rem",borderBottom:"1px solid rgba(var(--pink-deep-rgb),.1)"}}>
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
              {/* Group: pages */}
              {filteredRoutes.length > 0 && (filteredRoutes.length !== ROUTES.length || query.trim()) && (
                <GroupLabel>pages</GroupLabel>
              )}
              {filteredRoutes.map((r, i) => (
                <ResultRow key={`r-${r.href}`} r={r} idx={i} sel={sel} onSelect={setSel}
                  onClick={() => { router.push(r.href); setOpen(false); }}/>
              ))}

              {/* Group: journal entries */}
              {matchingEntries.length > 0 && <GroupLabel>journal entries</GroupLabel>}
              {matchingEntries.map((r, i) => (
                <ResultRow key={`e-${r.href}-${i}`} r={r}
                  idx={filteredRoutes.length + i} sel={sel} onSelect={setSel}
                  onClick={() => { router.push(r.href); setOpen(false); }}/>
              ))}

              {/* Group: timeline */}
              {matchingTimeline.length > 0 && <GroupLabel>timeline</GroupLabel>}
              {matchingTimeline.map((r, i) => (
                <ResultRow key={`t-${i}`} r={r}
                  idx={filteredRoutes.length + matchingEntries.length + i} sel={sel} onSelect={setSel}
                  onClick={() => { router.push(r.href); setOpen(false); }}/>
              ))}

              {/* Group: time capsules */}
              {matchingCapsules.length > 0 && <GroupLabel>capsules</GroupLabel>}
              {matchingCapsules.map((r, i) => (
                <ResultRow key={`c-${i}`} r={r}
                  idx={filteredRoutes.length + matchingEntries.length + matchingTimeline.length + i} sel={sel} onSelect={setSel}
                  onClick={() => { router.push(r.href); setOpen(false); }}/>
              ))}

              {/* Group: bucket list */}
              {matchingBucket.length > 0 && <GroupLabel>bucket list</GroupLabel>}
              {matchingBucket.map((r, i) => (
                <ResultRow key={`b-${i}`} r={r}
                  idx={filteredRoutes.length + matchingEntries.length + matchingTimeline.length + matchingCapsules.length + i} sel={sel} onSelect={setSel}
                  onClick={() => { router.push(r.href); setOpen(false); }}/>
              ))}

              {/* Group: watchlist */}
              {matchingWatch.length > 0 && <GroupLabel>watchlist</GroupLabel>}
              {matchingWatch.map((r, i) => (
                <ResultRow key={`w-${i}`} r={r}
                  idx={filteredRoutes.length + matchingEntries.length + matchingTimeline.length + matchingCapsules.length + matchingBucket.length + i} sel={sel} onSelect={setSel}
                  onClick={() => { router.push(r.href); setOpen(false); }}/>
              ))}

              {/* Group: voice notes */}
              {matchingVoice.length > 0 && <GroupLabel>voice notes</GroupLabel>}
              {matchingVoice.map((r, i) => (
                <ResultRow key={`v-${i}`} r={r}
                  idx={filteredRoutes.length + matchingEntries.length + matchingTimeline.length + matchingCapsules.length + matchingBucket.length + matchingWatch.length + i} sel={sel} onSelect={setSel}
                  onClick={() => { router.push(r.href); setOpen(false); }}/>
              ))}

              {totalItems === 0 && (
                <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"0.95rem",color:"rgba(var(--pink-deep-rgb),.35)",textAlign:"center",padding:"1.5rem",margin:0}}>
                  nothing found 🌸
                </p>
              )}
            </div>

            {/* Footer */}
            <div style={{display:"flex",gap:"1.2rem",justifyContent:"center",alignItems:"center",padding:"0.62rem 1.2rem",borderTop:"1px solid rgba(var(--pink-deep-rgb),.07)",fontFamily:SANS,fontSize:"0.62rem",color:"rgba(var(--pink-deep-rgb),.3)",letterSpacing:"0.04em"}}>
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

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{fontFamily:SANS,fontSize:"0.58rem",color:"rgba(var(--pink-deep-rgb),.4)",letterSpacing:"0.14em",textTransform:"uppercase",padding:"0.75rem 1.25rem 0.25rem",margin:0,fontWeight:700}}>
      {children}
    </p>
  );
}

function ResultRow({ r, idx, sel, onSelect, onClick }: {
  r: { emoji: string; label: string; desc: string; isEntry?: boolean };
  idx: number; sel: number;
  onSelect: (i: number) => void;
  onClick: () => void;
}) {
  const active = sel === idx;
  return (
    <div
      className="cp-row"
      data-selected={active}
      onClick={onClick}
      onMouseEnter={() => onSelect(idx)}
      style={{
        display:"flex", alignItems:"center", gap:"1rem",
        padding:"0.88rem 1.25rem",
        cursor:"pointer",
        background: active ? "rgba(var(--pink-deep-rgb),.07)" : "transparent",
        borderLeft:`3px solid ${active ? "var(--pink-deep)" : "transparent"}`,
        transition:"background .1s",
      }}>
      <span style={{fontSize:r.isEntry?"1rem":"1.25rem",lineHeight:1,flexShrink:0}}>{r.emoji}</span>
      <div style={{flex:1,minWidth:0}}>
        <p className="cp-label" style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"1rem",color:active?"var(--pink-deep)":"#7c3f58",margin:"0 0 0.06rem",fontWeight:400}}>
          {r.label}
        </p>
        <p className="cp-desc" style={{fontFamily:SANS,fontSize:"0.72rem",color:"rgba(var(--pink-deep-rgb),.42)",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {r.desc}
        </p>
      </div>
      {active && <kbd style={KBD}>↵</kbd>}
    </div>
  );
}

const KBD: React.CSSProperties = {
  fontFamily:SANS, fontSize:"0.6rem", fontWeight:700,
  color:"rgba(var(--pink-deep-rgb),.4)", background:"rgba(var(--pink-deep-rgb),.07)",
  border:"1px solid rgba(var(--pink-deep-rgb),.13)", borderRadius:6,
  padding:"0.18rem 0.45rem", flexShrink:0, whiteSpace:"nowrap",
};
