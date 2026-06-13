"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SERIF  = `"Georgia","Times New Roman",serif`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
const SCRIPT = `var(--font-caveat),"Segoe Script",cursive`;

type WatchStatus = "plan-to-watch" | "watching" | "completed";
type WatchType   = "movie" | "series" | "anime";

interface WatchItem {
  _id: string;
  title: string;
  type: WatchType;
  status: WatchStatus;
  coverImage?: string;
  notes?: string;
  rating?: number;
  addedAt: string;
}

const STATUS_META: Record<WatchStatus, { label:string; bg:string; text:string }> = {
  "plan-to-watch": { label:"plan to watch", bg:"rgba(249,168,212,.3)",  text:"#9d174d" },
  watching:        { label:"watching",       bg:"rgba(251,191,36,.25)",  text:"#78350f" },
  completed:       { label:"completed ✓",    bg:"rgba(52,211,153,.22)",  text:"#065f46" },
};
const TYPE_EMOJI: Record<WatchType, string> = {
  movie:"🎬", series:"📺", anime:"✨",
};

const TABS: { key: WatchStatus | "all"; label:string; emoji:string }[] = [
  { key:"all",           label:"all",           emoji:"🎞️" },
  { key:"plan-to-watch", label:"plan to watch", emoji:"📋" },
  { key:"watching",      label:"watching",      emoji:"👀" },
  { key:"completed",     label:"done",          emoji:"✓"  },
];

const BLANK = {
  title:"", type:"movie" as WatchType,
  status:"plan-to-watch" as WatchStatus,
  coverImage:"", notes:"", rating:"",
};

// ── Cover art search via public free APIs ──
async function searchCoverArt(title: string, type: WatchType): Promise<string[]> {
  try {
    if (type === "anime") {
      const r = await fetch(
        `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=6&sfw=true`
      );
      const d = await r.json() as { data?: { images?: { jpg?: { large_image_url?: string } } }[] };
      return (d.data ?? [])
        .map(a => a.images?.jpg?.large_image_url ?? "")
        .filter(Boolean);
    } else {
      const entity = type === "movie" ? "movie" : "tvSeason";
      const r = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(title)}&entity=${entity}&limit=6&country=in`
      );
      const d = await r.json() as { results?: { artworkUrl100?: string }[] };
      return (d.results ?? [])
        .map(x => (x.artworkUrl100 ?? "").replace("100x100bb", "600x600bb"))
        .filter(Boolean);
    }
  } catch {
    return [];
  }
}

export default function WatchlistSection() {
  const [items, setItems]         = useState<WatchItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<WatchStatus | "all">("all");
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(BLANK);
  const [saving, setSaving]       = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [posterResults, setPosterResults] = useState<string[]>([]);
  const [searchingArt, setSearchingArt]   = useState(false);

  async function load() {
    const r = await fetch("/api/watchlist");
    const d = await r.json();
    setItems(Array.isArray(d) ? d : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const handleSearchArt = useCallback(async () => {
    if (!form.title.trim()) return;
    setSearchingArt(true);
    setPosterResults([]);
    const results = await searchCoverArt(form.title.trim(), form.type);
    setPosterResults(results);
    setSearchingArt(false);
    if (results[0] && !form.coverImage) {
      setForm(f => ({ ...f, coverImage: results[0] }));
    }
  }, [form.title, form.type, form.coverImage]);

  const visible = tab === "all" ? items : items.filter(i => i.status === tab);

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    const body = {
      title: form.title.trim(), type: form.type, status: form.status,
      ...(form.coverImage.trim() && { coverImage: form.coverImage.trim() }),
      ...(form.notes.trim()      && { notes: form.notes.trim() }),
      ...(form.rating            && { rating: Number(form.rating) }),
    };
    const method = editId ? "PUT" : "POST";
    await fetch("/api/watchlist", {
      method,
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(editId ? { _id:editId, ...body } : body),
    });
    setSaving(false); setShowForm(false); setEditId(null);
    setForm(BLANK); setPosterResults([]);
    load();
  }

  function startEdit(item: WatchItem) {
    setForm({
      title:item.title, type:item.type, status:item.status,
      coverImage:item.coverImage ?? "", notes:item.notes ?? "",
      rating: item.rating != null ? String(item.rating) : "",
    });
    setEditId(item._id); setShowForm(true); setPosterResults([]);
  }

  function closeForm() {
    setShowForm(false); setEditId(null); setForm(BLANK); setPosterResults([]);
  }

  async function del(id: string) {
    await fetch("/api/watchlist", {
      method:"DELETE", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ _id:id }),
    });
    load();
  }

  const completedCount  = items.filter(i => i.status === "completed").length;
  const plannedCount    = items.filter(i => i.status === "plan-to-watch").length;
  const watchingCount   = items.filter(i => i.status === "watching").length;

  return (
    <section style={{ position:"relative", width:"100%", overflow:"hidden",
      background:"linear-gradient(170deg,#f5f0ff 0%,#ede7f6 40%,#fce7f3 100%)" }}>
      <style>{`
        .wl-card { transition: transform 0.22s ease, box-shadow 0.22s ease; cursor:default; }
        .wl-card:hover { transform: translateY(-8px) scale(1.02) !important;
          box-shadow: 0 24px 56px rgba(109,40,217,.22) !important; }
        .wl-card-actions { opacity:0; transition: opacity 0.2s; }
        .wl-card:hover .wl-card-actions { opacity:1; }
        .wl-inp:focus { border-color: rgba(139,92,246,.55) !important;
          box-shadow: 0 0 0 3px rgba(139,92,246,.1) !important; outline:none; }
        .wl-poster-opt { transition: transform 0.15s, box-shadow 0.15s; cursor:pointer; }
        .wl-poster-opt:hover { transform: scale(1.08); box-shadow: 0 8px 24px rgba(0,0,0,.3) !important; }
        .wl-tab { transition: all 0.2s; cursor:pointer; }
      `}</style>

      {/* ══════════════════════════════════════════
          FULL-WIDTH CINEMA HEADER
      ══════════════════════════════════════════ */}
      <div style={{
        position:"relative", width:"100%", overflow:"hidden",
        background:"linear-gradient(135deg, #0d001a 0%, #1a0530 50%, #09001a 100%)",
        padding:"clamp(2.5rem,6vh,4.5rem) clamp(1.5rem,5vw,4rem)",
      }}>
        {/* Film strip top */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:16,
          background:"repeating-linear-gradient(90deg,transparent 0,transparent 18px,rgba(255,255,255,.07) 18px,rgba(255,255,255,.07) 34px)" }} />
        {/* Film strip bottom */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:16,
          background:"repeating-linear-gradient(90deg,transparent 0,transparent 18px,rgba(255,255,255,.07) 18px,rgba(255,255,255,.07) 34px)" }} />

        {/* Star dots */}
        {[{t:"22%",l:"6%"},{t:"60%",l:"10%"},{t:"20%",l:"88%"},
          {t:"68%",l:"84%"},{t:"40%",l:"95%"},{t:"78%",l:"40%"}].map((p,i)=>(
          <div key={i} style={{ position:"absolute",top:p.t,left:p.l,
            width:2,height:2,borderRadius:"50%",background:"rgba(216,180,254,.35)" }}/>
        ))}
        {/* Glow orb */}
        <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
          width:400,height:200,borderRadius:"50%",
          background:"rgba(168,85,247,.06)",filter:"blur(60px)",pointerEvents:"none" }} />

        <div style={{ position:"relative",zIndex:1,textAlign:"center",maxWidth:900,margin:"0 auto",
          padding:"0.8rem 0" }}>
          {/* Label */}
          <div style={{ display:"flex",alignItems:"center",justifyContent:"center",
            gap:"1rem",marginBottom:"0.8rem" }}>
            <div style={{ height:1,width:50,background:"linear-gradient(90deg,transparent,rgba(216,180,254,.25))" }}/>
            <span style={{ fontFamily:SCRIPT,fontSize:"0.9rem",
              color:"rgba(216,180,254,.35)",letterSpacing:"0.1em" }}>
              our date night queue
            </span>
            <div style={{ height:1,width:50,background:"linear-gradient(90deg,rgba(216,180,254,.25),transparent)" }}/>
          </div>

          <h2 style={{ fontFamily:SERIF,fontStyle:"italic",fontWeight:400,
            fontSize:"clamp(2.2rem,5.5vw,3.4rem)",
            color:"rgba(255,255,255,.92)",margin:"0 0 0.5rem",letterSpacing:"-0.015em" }}>
            our watchlist
          </h2>
          <p style={{ fontFamily:SCRIPT,fontSize:"clamp(1rem,2.5vw,1.25rem)",
            color:"rgba(216,180,254,.4)",margin:"0 0 1.5rem" }}>
            movies, series & anime to watch together 🍿
          </p>

          {/* Stats pills */}
          <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:"0.6rem",flexWrap:"wrap" }}>
            {[
              { val:watchingCount,  label:"watching",      color:"rgba(251,191,36,.18)", border:"rgba(251,191,36,.3)",  text:"rgba(253,230,138,.8)" },
              { val:plannedCount,   label:"planned",       color:"rgba(249,168,212,.12)",border:"rgba(249,168,212,.25)",text:"rgba(249,168,212,.75)" },
              { val:completedCount, label:"watched",       color:"rgba(52,211,153,.12)", border:"rgba(52,211,153,.25)", text:"rgba(110,231,183,.8)" },
            ].map(s => s.val > 0 && (
              <div key={s.label} style={{
                display:"inline-flex",alignItems:"center",gap:"0.4rem",
                background:s.color,border:`1px solid ${s.border}`,
                borderRadius:50,padding:"0.32rem 0.9rem",
              }}>
                <span style={{ fontFamily:SANS,fontSize:"0.7rem",fontWeight:700,color:s.text }}>
                  {s.val} {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          BODY
      ══════════════════════════════════════════ */}
      <div style={{ padding:"clamp(1.5rem,4vw,2.5rem) clamp(1rem,4vw,2rem)",
        maxWidth:1200, margin:"0 auto" }}>

        {/* Orbs */}
        {[{l:"3%",t:"5%",c:"rgba(167,139,250,.1)",w:280},{l:"72%",t:"3%",c:"rgba(196,181,253,.08)",w:220}].map((o,i)=>(
          <div key={i} style={{ position:"absolute",left:o.l,top:o.t,width:o.w,height:o.w,
            borderRadius:"50%",background:o.c,filter:"blur(60px)",pointerEvents:"none",zIndex:0 }} />
        ))}

        {/* Toolbar */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
          flexWrap:"wrap",gap:"0.75rem",marginBottom:"1.5rem",position:"relative",zIndex:1 }}>
          {/* Tabs */}
          <div style={{ display:"flex",gap:"0.25rem",
            background:"rgba(237,233,254,.65)",border:"1px solid rgba(167,139,250,.22)",
            borderRadius:50,padding:"0.28rem",flexWrap:"wrap" }}>
            {TABS.map(t => {
              const active = tab === t.key;
              const cnt = t.key === "all" ? items.length
                : items.filter(i => i.status === t.key).length;
              return (
                <button key={t.key} onClick={()=>setTab(t.key)} className="wl-tab" style={{
                  fontFamily:SANS,fontSize:"0.73rem",fontWeight:active?700:500,
                  color:active?"#fff":"rgba(109,40,217,.7)",
                  background:active?"linear-gradient(135deg,#a78bfa,#7c3aed)":"transparent",
                  boxShadow:active?"0 2px 14px rgba(124,58,237,.35)":"none",
                  border:"none",borderRadius:40,padding:"0.38rem 0.85rem",
                  display:"flex",alignItems:"center",gap:"0.35rem",
                }}>
                  <span>{t.emoji}</span><span>{t.label}</span>
                  {cnt > 0 && (
                    <span style={{
                      background:active?"rgba(255,255,255,.22)":"rgba(109,40,217,.1)",
                      borderRadius:50,padding:"0.04rem 0.4rem",
                      fontSize:"0.62rem",fontWeight:700,
                      color:active?"#fff":"rgba(109,40,217,.6)",
                    }}>{cnt}</span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Add button */}
          <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.96}}
            onClick={()=>{setShowForm(true);setEditId(null);setForm(BLANK);setPosterResults([]);}}
            style={{
              fontFamily:SANS,fontSize:"0.82rem",fontWeight:700,color:"#fff",
              background:"linear-gradient(135deg,#a78bfa,#7c3aed)",
              border:"none",borderRadius:50,padding:"0.55rem 1.4rem",cursor:"pointer",
              boxShadow:"0 4px 20px rgba(124,58,237,.35)",
              display:"flex",alignItems:"center",gap:"0.45rem",
            }}>
            <span style={{fontSize:"1.1rem",lineHeight:1}}>+</span> add
          </motion.button>
        </div>

        {/* ── Add / Edit form ── */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{opacity:0,y:-16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}}
              style={{
                background:"rgba(255,255,255,.97)",
                border:"1.5px solid rgba(167,139,250,.22)",
                borderRadius:22,padding:"clamp(1.2rem,4vw,1.8rem)",
                marginBottom:"1.5rem",
                boxShadow:"0 12px 48px rgba(109,40,217,.12)",
                position:"relative",zIndex:1,
              }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.2rem" }}>
                <p style={{ fontFamily:SERIF,fontStyle:"italic",fontSize:"1.15rem",color:"#6d28d9",margin:0 }}>
                  {editId ? "edit entry" : "add to the queue"}
                </p>
                <button onClick={closeForm} style={{ background:"none",border:"none",cursor:"pointer",
                  fontSize:"1.2rem",color:"rgba(109,40,217,.4)",lineHeight:1 }}>✕</button>
              </div>

              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"0.75rem" }}>
                {/* Title */}
                <input placeholder="title *" value={form.title}
                  onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                  className="wl-inp" style={{ ...INP,gridColumn:"1/-1" }} />

                {/* Type + Status */}
                <select value={form.type}
                  onChange={e=>setForm(f=>({...f,type:e.target.value as WatchType}))}
                  className="wl-inp" style={INP}>
                  <option value="movie">🎬 movie</option>
                  <option value="series">📺 series</option>
                  <option value="anime">✨ anime</option>
                </select>
                <select value={form.status}
                  onChange={e=>setForm(f=>({...f,status:e.target.value as WatchStatus}))}
                  className="wl-inp" style={INP}>
                  <option value="plan-to-watch">📋 plan to watch</option>
                  <option value="watching">👀 watching</option>
                  <option value="completed">✓ completed</option>
                </select>

                {/* Rating */}
                <input placeholder="rating 1–10 (optional)" value={form.rating}
                  type="number" min={1} max={10}
                  onChange={e=>setForm(f=>({...f,rating:e.target.value}))}
                  className="wl-inp" style={INP} />

                {/* Notes */}
                <textarea placeholder="notes or thoughts (optional)" value={form.notes} rows={2}
                  onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                  className="wl-inp" style={{ ...INP,gridColumn:"1/-1",resize:"vertical" }} />
              </div>

              {/* ── Cover art search ── */}
              <div style={{ marginTop:"1rem" }}>
                <div style={{ display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"0.75rem" }}>
                  <span style={{ fontFamily:SANS,fontSize:"0.7rem",fontWeight:700,
                    letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(109,40,217,.45)" }}>
                    cover art
                  </span>
                  <div style={{ flex:1,height:1,background:"rgba(167,139,250,.2)" }}/>
                  <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.96}}
                    onClick={handleSearchArt} disabled={!form.title.trim()||searchingArt}
                    style={{
                      fontFamily:SANS,fontSize:"0.72rem",fontWeight:700,
                      color:"#7c3aed",background:"rgba(167,139,250,.14)",
                      border:"1px solid rgba(167,139,250,.3)",borderRadius:50,
                      padding:"0.35rem 0.9rem",cursor:"pointer",
                      opacity:!form.title.trim()||searchingArt ? 0.5 : 1,
                    }}>
                    {searchingArt ? "searching…" : "🔍 find poster"}
                  </motion.button>
                </div>

                {/* Poster results */}
                {posterResults.length > 0 && (
                  <div style={{ marginBottom:"0.75rem" }}>
                    <p style={{ fontFamily:SANS,fontSize:"0.68rem",color:"rgba(109,40,217,.45)",margin:"0 0 0.5rem" }}>
                      click to select
                    </p>
                    <div style={{ display:"flex",gap:"0.6rem",overflowX:"auto",paddingBottom:"0.4rem",scrollbarWidth:"none" }}>
                      {posterResults.map((url,i) => (
                        <div key={i} className="wl-poster-opt"
                          onClick={()=>setForm(f=>({...f,coverImage:url}))}
                          style={{
                            flexShrink:0,width:80,height:120,borderRadius:10,overflow:"hidden",
                            border:`2.5px solid ${form.coverImage===url ? "#7c3aed" : "transparent"}`,
                            boxShadow:"0 4px 16px rgba(0,0,0,.2)",
                          }}>
                          <img src={url} alt="" loading="lazy" decoding="async"
                            style={{ width:"100%",height:"100%",objectFit:"cover" }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual URL fallback */}
                <input placeholder="or paste image URL manually"
                  value={form.coverImage}
                  onChange={e=>setForm(f=>({...f,coverImage:e.target.value}))}
                  className="wl-inp" style={{ ...INP,width:"100%",boxSizing:"border-box" }} />

                {/* Preview */}
                {form.coverImage && (
                  <div style={{ marginTop:"0.6rem",display:"flex",alignItems:"center",gap:"0.7rem" }}>
                    <div style={{ width:48,height:72,borderRadius:8,overflow:"hidden",
                      border:"1.5px solid rgba(167,139,250,.25)",flexShrink:0 }}>
                      <img src={form.coverImage} alt="" loading="lazy" decoding="async"
                        style={{ width:"100%",height:"100%",objectFit:"cover" }} />
                    </div>
                    <div>
                      <p style={{ fontFamily:SANS,fontSize:"0.72rem",color:"rgba(109,40,217,.5)",margin:"0 0 0.25rem" }}>
                        selected poster
                      </p>
                      <button onClick={()=>setForm(f=>({...f,coverImage:""}))}
                        style={{ fontFamily:SANS,fontSize:"0.68rem",color:"#be185d",
                          background:"rgba(190,24,93,.07)",border:"none",
                          borderRadius:6,padding:"0.22rem 0.55rem",cursor:"pointer" }}>
                        remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display:"flex",gap:"0.6rem",marginTop:"1.2rem",justifyContent:"flex-end" }}>
                <button onClick={closeForm}
                  style={{ ...BTN,background:"rgba(109,40,217,.07)",color:"#7c3aed" }}>
                  cancel
                </button>
                <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.96}}
                  onClick={save} disabled={saving||!form.title.trim()}
                  style={{ ...BTN,background:"linear-gradient(135deg,#a78bfa,#7c3aed)",color:"#fff",
                    opacity:saving||!form.title.trim()?0.55:1 }}>
                  {saving?"saving…":"save"}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Grid ── */}
        {loading ? (
          <div style={{ textAlign:"center",padding:"5rem",
            fontFamily:SCRIPT,fontSize:"1.2rem",color:"rgba(109,40,217,.3)" }}>
            loading… 🌸
          </div>
        ) : visible.length === 0 ? (
          <motion.div initial={{opacity:0}} animate={{opacity:1}}
            style={{ textAlign:"center",padding:"5rem 2rem" }}>
            <div style={{ fontSize:"3.5rem",marginBottom:"1rem" }}>🎞️</div>
            <p style={{ fontFamily:SERIF,fontStyle:"italic",fontSize:"1.3rem",
              color:"rgba(109,40,217,.35)",margin:"0 0 0.4rem" }}>nothing here yet</p>
            <p style={{ fontFamily:SCRIPT,fontSize:"1.05rem",color:"rgba(109,40,217,.28)",margin:0 }}>
              add something to watch together ✨
            </p>
          </motion.div>
        ) : (
          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(min(160px,43vw),1fr))",
            gap:"clamp(0.75rem,2vw,1.1rem)",
            position:"relative",zIndex:1,
          }}>
            <AnimatePresence>
              {visible.map((item,i) => {
                const sm = STATUS_META[item.status];
                const stars = item.rating != null ? Math.round(item.rating / 2) : null;
                return (
                  <motion.div key={item._id}
                    initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:.88}}
                    transition={{delay:i*0.035}}
                    className="wl-card"
                    style={{
                      borderRadius:18,overflow:"hidden",
                      background:"rgba(255,255,255,.92)",
                      border:"1.5px solid rgba(167,139,250,.15)",
                      boxShadow:"0 4px 24px rgba(109,40,217,.07)",
                      display:"flex",flexDirection:"column",
                    }}>
                    {/* Poster */}
                    <div style={{ width:"100%",aspectRatio:"2/3",position:"relative",overflow:"hidden",
                      background:"linear-gradient(160deg,#ede7f6,#ddd6fe)",
                      display:"flex",alignItems:"center",justifyContent:"center" }}>
                      {item.coverImage ? (
                        <>
                          <img src={item.coverImage} alt="" loading="lazy" decoding="async"
                            style={{ width:"100%",height:"100%",objectFit:"cover" }} />
                          {/* Bottom gradient */}
                          <div style={{ position:"absolute",bottom:0,left:0,right:0,height:"50%",
                            background:"linear-gradient(to top,rgba(15,0,30,.8),transparent)" }} />
                          {/* Status badge overlay */}
                          <div style={{ position:"absolute",bottom:"0.55rem",left:"0.55rem",
                            background:sm.bg,backdropFilter:"blur(10px)",
                            borderRadius:6,padding:"0.12rem 0.5rem" }}>
                            <span style={{ fontFamily:SANS,fontSize:"0.6rem",fontWeight:700,color:sm.text }}>
                              {sm.label}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div style={{ width:"100%",height:"100%",position:"relative",
                          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"0.5rem" }}>
                          <span style={{ fontSize:"2.8rem" }}>{TYPE_EMOJI[item.type]}</span>
                          <div style={{ position:"absolute",bottom:"0.55rem",left:"0.55rem",
                            background:sm.bg,borderRadius:6,padding:"0.12rem 0.5rem" }}>
                            <span style={{ fontFamily:SANS,fontSize:"0.6rem",fontWeight:700,color:sm.text }}>
                              {sm.label}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Edit/Delete on hover */}
                      <div className="wl-card-actions" style={{
                        position:"absolute",top:"0.5rem",right:"0.5rem",
                        display:"flex",flexDirection:"column",gap:"0.35rem",
                      }}>
                        <button onClick={()=>startEdit(item)}
                          style={{ ...ICON_BTN, background:"rgba(255,255,255,.85)" }}>✏️</button>
                        <button onClick={()=>del(item._id)}
                          style={{ ...ICON_BTN, background:"rgba(255,255,255,.85)" }}>🗑️</button>
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ padding:"0.7rem 0.8rem 0.8rem",flex:1,
                      display:"flex",flexDirection:"column",gap:"0.35rem" }}>
                      <p style={{ fontFamily:SANS,fontSize:"0.84rem",fontWeight:700,color:"#4c1d95",
                        margin:0,lineHeight:1.3,overflow:"hidden",display:"-webkit-box",
                        WebkitLineClamp:2,WebkitBoxOrient:"vertical" }}>
                        {item.title}
                      </p>
                      <span style={{ fontFamily:SANS,fontSize:"0.65rem",color:"rgba(109,40,217,.4)" }}>
                        {TYPE_EMOJI[item.type]} {item.type}
                      </span>
                      {stars != null && (
                        <p style={{ fontFamily:SANS,fontSize:"0.7rem",color:"rgba(109,40,217,.5)",margin:0 }}>
                          {"★".repeat(stars)}{"☆".repeat(5-stars)} {item.rating}/10
                        </p>
                      )}
                      {item.notes && (
                        <p style={{ fontFamily:SCRIPT,fontSize:"0.78rem",color:"rgba(109,40,217,.42)",
                          margin:0,overflow:"hidden",display:"-webkit-box",
                          WebkitLineClamp:2,WebkitBoxOrient:"vertical" }}>
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}

const INP: React.CSSProperties = {
  fontFamily:SANS, fontSize:"0.85rem", color:"#4c1d95",
  background:"rgba(237,233,254,.4)", border:"1px solid rgba(167,139,250,.22)",
  borderRadius:10, padding:"0.6rem 0.9rem",
  width:"100%", boxSizing:"border-box",
  transition:"border-color 0.2s, box-shadow 0.2s",
};
const BTN: React.CSSProperties = {
  fontFamily:SANS, fontSize:"0.82rem", fontWeight:700,
  border:"none", borderRadius:50, padding:"0.55rem 1.2rem", cursor:"pointer",
};
const ICON_BTN: React.CSSProperties = {
  width:30, height:30, border:"none", borderRadius:8,
  cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
  fontSize:"0.8rem", boxShadow:"0 2px 8px rgba(0,0,0,.15)",
};
