"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEscKey } from "@/lib/useEscKey";
import Tip from "@/components/Tip";
import EmptyState from "@/components/EmptyState";
import { WatchlistStore } from "@/lib/resourceStores";
import { cldImg, cldSrcSet } from "@/lib/cldImg";
import { useSoftDelete } from "@/lib/softDelete";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";


type WatchStatus = "plan-to-watch" | "watching" | "completed";
type WatchType   = "movie" | "series" | "anime";

interface WatchItem {
  _id: string; title: string; type: WatchType; status: WatchStatus;
  coverImage?: string; notes?: string; rating?: number; addedAt: string;
}

const STATUS: Record<WatchStatus,{label:string;bg:string;text:string}> = {
  "plan-to-watch": {label:"plan to watch",bg:"rgba(var(--pink-rgb),.28)",  text:"var(--pink-deep)"},
  watching:        {label:"watching",      bg:"rgba(251,191,36,.22)",   text:"#78350f"},
  completed:       {label:"completed ✓",   bg:"rgba(52,211,153,.22)",   text:"#065f46"},
};
const TYPE_EMOJI: Record<WatchType,string> = {movie:"🎬",series:"📺",anime:"✨"};

const TABS: {key:WatchStatus|"all";label:string}[] = [
  {key:"all",           label:"all 🎞️"},
  {key:"plan-to-watch", label:"plan to watch 📋"},
  {key:"watching",      label:"watching 👀"},
  {key:"completed",     label:"done ✓"},
];

const BLANK = {title:"",type:"movie" as WatchType,status:"plan-to-watch" as WatchStatus,coverImage:"",notes:"",rating:""};

async function fetchPoster(title:string,type:WatchType):Promise<string[]> {
  try {
    const r = await fetch(`/api/poster-search?title=${encodeURIComponent(title)}&type=${type}`);
    const d = await r.json() as { urls?: string[] };
    return d.urls ?? [];
  } catch { return []; }
}

/** Whether a string already points straight at an image (so it can render as-is). */
function looksLikeImage(url:string):boolean {
  return /^data:image\//i.test(url) || /\.(jpe?g|png|webp|gif|avif|bmp|svg)(\?|$)/i.test(url);
}

/** Turn a pasted *page* link (e.g. an IMDb title page) into its real poster
 *  image via the server's og:image unfurl. Direct image URLs pass through. */
async function resolvePosterUrl(url:string):Promise<string> {
  const u = url.trim();
  if(!u || !/^https?:\/\//i.test(u) || looksLikeImage(u)) return u;
  try {
    const r = await fetch(`/api/poster-search?url=${encodeURIComponent(u)}`);
    const d = await r.json() as { url?: string };
    return d.url || u;
  } catch { return u; }
}

export default function WatchlistSection() {
  const softDelete = useSoftDelete<WatchItem>();
  const { data: items, loading } = WatchlistStore.useResource() as { data: WatchItem[]; loading: boolean };
  const load = () => WatchlistStore.refresh();
  const [tab,    setTab]     = useState<WatchStatus|"all">("all");
  const [showForm,setShowForm] = useState(false);
  const [form,   setForm]    = useState(BLANK);
  const [saving, setSaving]  = useState(false);
  const [editId, setEditId]  = useState<string|null>(null);
  const [posters,setPosters] = useState<string[]>([]);
  const [searching,setSearching] = useState(false);
  const [resolving,setResolving] = useState(false);
  const [coverBroken,setCoverBroken] = useState(false);

  const visible = tab==="all"?items:items.filter(i=>i.status===tab);

  const findPosters = useCallback(async()=>{
    if(!form.title.trim())return;
    setSearching(true); setPosters([]);
    const results = await fetchPoster(form.title.trim(),form.type);
    setPosters(results); setSearching(false);
    if(results[0]&&!form.coverImage) setForm(f=>({...f,coverImage:results[0]}));
  },[form.title,form.type,form.coverImage]);

  // When the poster field holds a page link rather than an image, swap in the
  // real poster (og:image). Runs on blur so a paste resolves once you click away.
  const resolveCover = useCallback(async()=>{
    const u = form.coverImage.trim();
    if(!u||looksLikeImage(u)||!/^https?:\/\//i.test(u))return;
    setResolving(true);
    const resolved = await resolvePosterUrl(u);
    setResolving(false);
    if(resolved&&resolved!==u) setForm(f=>f.coverImage.trim()===u?{...f,coverImage:resolved}:f);
  },[form.coverImage]);

  async function save() {
    if(!form.title.trim())return;
    setSaving(true);
    // Resolve a pasted page link to its poster before saving (covers paste →
    // straight to save without blurring the field first).
    const cover = await resolvePosterUrl(form.coverImage);
    const body = {
      title:form.title.trim(),type:form.type,status:form.status,
      ...(cover.trim()&&{coverImage:cover.trim()}),
      ...(form.notes.trim()&&{notes:form.notes.trim()}),
      ...(form.rating&&{rating:Number(form.rating)}),
    };
    await fetch("/api/watchlist",{
      method:editId?"PUT":"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(editId?{_id:editId,...body}:body),
    });
    setSaving(false);setShowForm(false);setEditId(null);setForm(BLANK);setPosters([]);
    load();
  }

  function startEdit(item:WatchItem){
    setForm({title:item.title,type:item.type,status:item.status,
      coverImage:item.coverImage??"",notes:item.notes??"",
      rating:item.rating!=null?String(item.rating):""});
    setEditId(item._id);setShowForm(true);setPosters([]);
  }

  function closeForm(){setShowForm(false);setEditId(null);setForm(BLANK);setPosters([]);}
  useEscKey(closeForm, showForm);

  async function del(id:string){
    const item = items.find(i=>i._id===id);
    await softDelete({
      currentItems: items,
      setCache: WatchlistStore.setCache,
      predicate: (x: WatchItem) => x._id === id,
      toastTitle: "removed from watchlist",
      toastMessage: item ? `"${item.title}" — tap Undo.` : "Tap Undo to keep it.",
      commit: async () => {
        await fetch("/api/watchlist",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({_id:id})});
        WatchlistStore.refresh();
      },
    });
  }

  const done    = items.filter(i=>i.status==="completed").length;
  const planned = items.filter(i=>i.status==="plan-to-watch").length;

  return (
    <section style={{
      position:"relative",width:"100%",minHeight:"100vh",
      padding:"clamp(3.5rem,7vh,5.5rem) clamp(1rem,4vw,2.5rem)",
      background:"linear-gradient(160deg,var(--pink-light) 0%,var(--pink-light) 55%,var(--rose) 100%)",
      overflow:"hidden",
    }}>
      <style>{`
        .wl-card { transition: transform .2s ease, box-shadow .2s ease; }
        .wl-card:hover { transform: translateY(-6px) scale(1.02) !important;
          box-shadow: 0 20px 48px rgba(var(--pink-deep-rgb),.16) !important; }
        .wl-actions { opacity:0; transition: opacity .18s; }
        .wl-card:hover .wl-actions { opacity:1; }
        .wl-inp:focus { border-color:rgba(var(--pink-deep-rgb),.45)!important;
          box-shadow:0 0 0 3px rgba(var(--pink-deep-rgb),.1)!important;outline:none; }
        .wl-tab  { transition: all .18s; cursor:pointer; }
        .wl-poster:hover { transform:scale(1.07); box-shadow:0 8px 24px rgba(0,0,0,.22)!important; }
        .wl-poster { transition: transform .15s, box-shadow .15s; cursor:pointer; }
      `}</style>

      {/* Orbs */}
      {[{l:"5%",t:"4%",c:"rgba(var(--pink-rgb),.16)",w:260},{l:"70%",t:"6%",c:"rgba(var(--pink-deep-rgb),.12)",w:200},{l:"45%",t:"68%",c:"rgba(var(--pink-rgb),.09)",w:230}].map((o,i)=>(
        <div key={i} style={{position:"absolute",left:o.l,top:o.t,width:o.w,height:o.w,
          borderRadius:"50%",background:o.c,filter:"blur(60px)",pointerEvents:"none",zIndex:0}} />
      ))}

      <div style={{maxWidth:1100,margin:"0 auto",position:"relative",zIndex:1}}>

        {/* ── Header (same style as SpotifySection) ── */}
        <div style={{textAlign:"center",marginBottom:"2.2rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"0.9rem",marginBottom:"0.8rem"}}>
            <div style={{flex:1,maxWidth:55,height:1,background:"linear-gradient(90deg,transparent,rgba(var(--pink-deep-rgb),.28))"}}/>
            <span style={{fontFamily:SCRIPT,fontSize:"1rem",color:"rgba(var(--pink-deep-rgb),.38)",letterSpacing:"0.08em"}}>🎬 ✦ 🍿</span>
            <div style={{flex:1,maxWidth:55,height:1,background:"linear-gradient(90deg,rgba(var(--pink-deep-rgb),.28),transparent)"}}/>
          </div>
          <h2 style={{fontFamily:SERIF,fontStyle:"italic",fontWeight:400,
            fontSize:"clamp(2rem,5vw,2.8rem)",color:"var(--pink-deep)",margin:"0 0 0.4rem",letterSpacing:"-0.01em"}}>
            our watchlist
          </h2>
          <p style={{fontFamily:SCRIPT,fontSize:"clamp(1rem,2.5vw,1.2rem)",color:"rgba(var(--pink-deep-rgb),.45)",margin:"0 0 1.1rem"}}>
            movies, series & anime to watch together 🌸
          </p>

          {/* Stats */}
          {items.length > 0 && (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"0.55rem",flexWrap:"wrap"}}>
              {done>0 && <span style={PILL_STYLE("rgba(52,211,153,.18)","rgba(52,211,153,.35)","#065f46")}>✓ {done} watched</span>}
              {planned>0 && <span style={PILL_STYLE("rgba(var(--pink-rgb),.2)","rgba(var(--pink-rgb),.4)","var(--pink-deep)")}>📋 {planned} planned</span>}
            </div>
          )}
        </div>

        {/* ── Tabs + Add ── */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          flexWrap:"wrap",gap:"0.75rem",marginBottom:"1.6rem"}}>
          <div style={{display:"flex",gap:"0.28rem",
            background:"rgba(var(--pink-rgb),.12)",border:"1px solid rgba(var(--pink-rgb),.28)",
            borderRadius:50,padding:"0.28rem",flexWrap:"wrap"}}>
            {TABS.map(t=>{
              const active=tab===t.key;
              const cnt=t.key==="all"?items.length:items.filter(i=>i.status===t.key).length;
              return (
                <button key={t.key} onClick={()=>setTab(t.key)} className="wl-tab" style={{
                  fontFamily:SANS,fontSize:"0.73rem",fontWeight:active?700:500,
                  color:active?"#fff":"var(--text)",
                  background:active?"linear-gradient(135deg,var(--pink),var(--pink-deep))":"transparent",
                  boxShadow:active?"0 2px 12px rgba(var(--pink-deep-rgb),.3)":"none",
                  border:"none",borderRadius:40,
                  padding:"0.38rem 0.8rem",
                  display:"flex",alignItems:"center",gap:"0.3rem",
                  opacity:active?1:0.85,
                }}>
                  {t.label}
                  {cnt>0&&<span style={{background:active?"rgba(255,255,255,.25)":"rgba(var(--pink-rgb),.2)",
                    borderRadius:50,padding:"0.02rem 0.38rem",fontSize:"0.62rem",fontWeight:700,
                    color:active?"#fff":"var(--text)"}}>{cnt}</span>}
                </button>
              );
            })}
          </div>
          <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.96}}
            onClick={()=>{setShowForm(true);setEditId(null);setForm(BLANK);setPosters([]);}}
            style={{fontFamily:SANS,fontSize:"0.82rem",fontWeight:700,color:"#fff",
              background:"linear-gradient(135deg,var(--pink),var(--pink-deep))",
              border:"none",borderRadius:50,padding:"0.55rem 1.4rem",cursor:"pointer",
              boxShadow:"0 4px 18px rgba(var(--pink-deep-rgb),.3)",
              display:"flex",alignItems:"center",gap:"0.45rem"}}>
            <span style={{fontSize:"1.1rem",lineHeight:1}}>+</span> add
          </motion.button>
        </div>

        {/* ── Form ── */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{opacity:0,y:-14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-14}}
              style={{
                background:"var(--cream)",border:"1.5px solid rgba(var(--pink-rgb),.3)",
                borderRadius:24,padding:"clamp(1.2rem,4vw,1.8rem)",marginBottom:"1.5rem",
                boxShadow:"0 12px 48px rgba(var(--pink-deep-rgb),.1)",
              }}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.1rem"}}>
                <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"1.1rem",color:"var(--pink-deep)",margin:0}}>
                  {editId?"edit entry":"add to the queue"}
                </p>
                <Tip label="close" placement="left">
                  <button onClick={closeForm} aria-label="close form" style={{background:"none",border:"none",cursor:"pointer",
                    fontSize:"1.1rem",color:"var(--pink-deep)",lineHeight:1}}>✕</button>
                </Tip>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:"0.7rem"}}>
                <input placeholder="title *" value={form.title}
                  onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                  className="wl-inp" style={{...INP,gridColumn:"1/-1"}} />
                <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value as WatchType}))}
                  className="wl-inp" style={INP}>
                  <option value="movie">🎬 movie</option>
                  <option value="series">📺 series</option>
                  <option value="anime">✨ anime</option>
                </select>
                <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value as WatchStatus}))}
                  className="wl-inp" style={INP}>
                  <option value="plan-to-watch">📋 plan to watch</option>
                  <option value="watching">👀 watching</option>
                  <option value="completed">✓ completed</option>
                </select>
                <input placeholder="rating 1–10 (optional)" value={form.rating} type="number" min={1} max={10}
                  onChange={e=>setForm(f=>({...f,rating:e.target.value}))}
                  className="wl-inp" style={INP} />
                <textarea placeholder="notes (optional)" value={form.notes} rows={2}
                  onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                  className="wl-inp" style={{...INP,gridColumn:"1/-1",resize:"vertical"}} />
              </div>

              {/* Cover art */}
              <div style={{marginTop:"1rem"}}>
                <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"0.7rem"}}>
                  <span style={{fontFamily:SANS,fontSize:"0.66rem",fontWeight:700,
                    letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(var(--pink-deep-rgb),.4)"}}>
                    poster
                  </span>
                  <div style={{flex:1,height:1,background:"rgba(var(--pink-deep-rgb),.15)"}}/>
                  <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.96}}
                    onClick={findPosters} disabled={!form.title.trim()||searching}
                    style={{fontFamily:SANS,fontSize:"0.7rem",fontWeight:700,
                      color:"var(--pink-deep)",background:"rgba(var(--pink-deep-rgb),.1)",
                      border:"1px solid rgba(var(--pink-deep-rgb),.22)",borderRadius:50,
                      padding:"0.33rem 0.85rem",cursor:"pointer",
                      opacity:!form.title.trim()||searching?0.5:1}}>
                    {searching?"searching…":"🔍 find poster"}
                  </motion.button>
                </div>

                {posters.length>0&&(
                  <div style={{marginBottom:"0.7rem"}}>
                    <p style={{fontFamily:SANS,fontSize:"0.66rem",color:"rgba(var(--pink-deep-rgb),.4)",margin:"0 0 0.5rem"}}>
                      click to select
                    </p>
                    <div style={{display:"flex",gap:"0.55rem",overflowX:"auto",paddingBottom:"0.4rem",scrollbarWidth:"none"}}>
                      {posters.map((url,i)=>(
                        <div key={i} className="wl-poster"
                          onClick={()=>setForm(f=>({...f,coverImage:url}))}
                          style={{flexShrink:0,width:72,height:108,borderRadius:10,overflow:"hidden",
                            border:`2.5px solid ${form.coverImage===url?"var(--pink-deep)":"transparent"}`,
                            boxShadow:"0 4px 14px rgba(0,0,0,.18)"}}>
                          <img src={url} alt="" loading="lazy" decoding="async"
                            style={{width:"100%",height:"100%",objectFit:"cover"}} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <input placeholder="or paste an image or page link (e.g. IMDb)"
                  value={form.coverImage}
                  onChange={e=>{setCoverBroken(false);setForm(f=>({...f,coverImage:e.target.value}));}}
                  onBlur={resolveCover}
                  className="wl-inp" style={{...INP,width:"100%",boxSizing:"border-box"}} />

                {form.coverImage&&(
                  <div style={{marginTop:"0.55rem",display:"flex",alignItems:"center",gap:"0.65rem"}}>
                    <div style={{width:42,height:64,borderRadius:8,overflow:"hidden",flexShrink:0,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      background:"rgba(var(--pink-deep-rgb),.06)",
                      border:"1.5px solid rgba(var(--pink-deep-rgb),.2)"}}>
                      {resolving?(
                        <span style={{fontSize:"1rem"}}>⏳</span>
                      ):coverBroken?(
                        <span title="couldn't load this image" style={{fontSize:"1.1rem"}}>🖼️</span>
                      ):(
                        <img src={form.coverImage} alt="" loading="lazy" decoding="async"
                          onError={()=>setCoverBroken(true)}
                          style={{width:"100%",height:"100%",objectFit:"cover"}} />
                      )}
                    </div>
                    <button onClick={()=>{setCoverBroken(false);setForm(f=>({...f,coverImage:""}));}}
                      style={{fontFamily:SANS,fontSize:"0.68rem",color:"var(--pink-deep)",
                        background:"rgba(var(--pink-deep-rgb),.08)",border:"none",
                        borderRadius:8,padding:"0.25rem 0.6rem",cursor:"pointer"}}>
                      remove
                    </button>
                    {coverBroken&&!resolving&&(
                      <span style={{fontFamily:SANS,fontSize:"0.66rem",color:"rgba(var(--pink-deep-rgb),.55)"}}>
                        couldn&apos;t load — try “find poster” or a direct image link
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div style={{display:"flex",gap:"0.6rem",marginTop:"1.2rem",justifyContent:"flex-end"}}>
                <button onClick={closeForm}
                  style={{...BTN,background:"rgba(var(--pink-deep-rgb),.08)",color:"var(--pink-deep)"}}>cancel</button>
                <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.96}}
                  onClick={save} disabled={saving||!form.title.trim()}
                  style={{...BTN,background:"linear-gradient(135deg,var(--pink),var(--pink-deep))",color:"#fff",
                    opacity:saving||!form.title.trim()?0.55:1}}>
                  {saving?"saving…":"save"}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Grid ── */}
        {loading ? (
          <div style={{textAlign:"center",padding:"5rem",
            fontFamily:SCRIPT,fontSize:"1.2rem",color:"rgba(var(--pink-deep-rgb),.35)"}}>
            loading… 🌸
          </div>
        ) : visible.length===0 ? (
          <EmptyState
            emoji="🎬"
            title="nothing on the list yet"
            hint="Add a film, show, or anime you want to watch together — and track it from 'plan' all the way to 'watched'. ✨"
            action={{ label: "+ add your first", onClick: () => setShowForm(true) }}
          />
        ) : (
          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(min(155px,42vw),1fr))",
            gap:"clamp(0.75rem,2vw,1.1rem)",
          }}>
            <AnimatePresence>
              {visible.map((item,i)=>{
                const sm = STATUS[item.status];
                const stars = item.rating!=null?Math.round(item.rating/2):null;
                return (
                  <motion.div key={item._id}
                    initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:.9}}
                    transition={{delay:i*.04}}
                    className="wl-card"
                    style={{
                      borderRadius:18,overflow:"hidden",
                      background:"var(--cream)",
                      border:"1.5px solid rgba(var(--pink-rgb),.3)",
                      boxShadow:"0 4px 22px rgba(var(--pink-deep-rgb),.15)",
                      display:"flex",flexDirection:"column",
                    }}>
                    {/* Poster */}
                    <div style={{width:"100%",aspectRatio:"2/3",position:"relative",overflow:"hidden",
                      background:"linear-gradient(160deg,var(--pink-light),var(--pink-light))",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {item.coverImage ? (
                        <>
                          <img
                            src={cldImg(item.coverImage, { w: 360 })}
                            srcSet={cldSrcSet(item.coverImage, [180, 280, 360, 480])}
                            sizes="(max-width: 480px) 45vw, 220px"
                            alt="" loading="lazy" decoding="async"
                            style={{width:"100%",height:"100%",objectFit:"cover"}} />
                          <div style={{position:"absolute",bottom:0,left:0,right:0,height:"48%",
                            background:"linear-gradient(to top,rgba(0,0,0,.78),transparent)"}} />
                          <div className="wl-pill" data-status={item.status}
                            style={{position:"absolute",bottom:"0.5rem",left:"0.55rem",
                            background:sm.bg,backdropFilter:"blur(8px)",
                            borderRadius:6,padding:"0.15rem 0.5rem"}}>
                            <span style={{fontFamily:SANS,fontSize:"0.6rem",fontWeight:700,color:sm.text}}>
                              {sm.label}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",
                          alignItems:"center",justifyContent:"center",gap:"0.5rem",position:"relative"}}>
                          <span style={{fontSize:"2.6rem"}}>{TYPE_EMOJI[item.type]}</span>
                          <div className="wl-pill" data-status={item.status}
                            style={{position:"absolute",bottom:"0.5rem",left:"0.55rem",
                            background:sm.bg,borderRadius:6,padding:"0.15rem 0.5rem"}}>
                            <span style={{fontFamily:SANS,fontSize:"0.6rem",fontWeight:700,color:sm.text}}>
                              {sm.label}
                            </span>
                          </div>
                        </div>
                      )}
                      {/* Hover actions */}
                      <div className="wl-actions" style={{position:"absolute",top:"0.5rem",right:"0.5rem",
                        display:"flex",flexDirection:"column",gap:"0.3rem"}}>
                        <button onClick={()=>startEdit(item)} style={ICON_BTN}>✏️</button>
                        <button onClick={()=>del(item._id)}   style={ICON_BTN}>🗑️</button>
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{padding:"0.65rem 0.75rem 0.8rem",flex:1,display:"flex",
                      flexDirection:"column",gap:"0.3rem"}}>
                      <p style={{fontFamily:SANS,fontSize:"0.82rem",fontWeight:700,color:"var(--text)",
                        margin:0,lineHeight:1.3,overflow:"hidden",display:"-webkit-box",
                        WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
                        {item.title}
                      </p>
                      <span style={{fontFamily:SANS,fontSize:"0.66rem",color:"var(--muted)",fontWeight:600,letterSpacing:"0.04em"}}>
                        {TYPE_EMOJI[item.type]} {item.type}
                      </span>
                      {stars!=null&&(
                        <p style={{fontFamily:SANS,fontSize:"0.72rem",color:"var(--pink-deep)",margin:0,fontWeight:600}}>
                          {"★".repeat(stars)}{"☆".repeat(5-stars)} <span style={{color:"var(--muted)",fontWeight:500}}>{item.rating}/10</span>
                        </p>
                      )}
                      {item.notes&&(
                        <p style={{fontFamily:SCRIPT,fontSize:"0.8rem",color:"var(--text)",opacity:0.7,
                          margin:0,overflow:"hidden",display:"-webkit-box",
                          WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
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

function PILL_STYLE(bg:string,border:string,color:string):React.CSSProperties {
  return {fontFamily:SANS,fontSize:"0.7rem",fontWeight:700,color,
    background:bg,border:`1px solid ${border}`,borderRadius:50,padding:"0.3rem 0.85rem"};
}
const INP:React.CSSProperties = {
  fontFamily:SANS,fontSize:"0.85rem",color:"var(--text)",
  background:"rgba(var(--pink-rgb),.1)",border:"1px solid rgba(var(--pink-rgb),.3)",
  borderRadius:10,padding:"0.6rem 0.9rem",
  width:"100%",boxSizing:"border-box",transition:"border-color .2s,box-shadow .2s",
};
const BTN:React.CSSProperties = {
  fontFamily:SANS,fontSize:"0.82rem",fontWeight:700,
  border:"none",borderRadius:50,padding:"0.55rem 1.2rem",cursor:"pointer",
};
const ICON_BTN:React.CSSProperties = {
  // 38×38 visual; CSS guard (.touch-target in globals) bumps to 44 hit area on touch devices
  width:38,height:38,border:"none",borderRadius:10,background:"rgba(0,0,0,.55)",
  cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
  fontSize:"0.95rem",boxShadow:"0 2px 8px rgba(0,0,0,.3)",
  backdropFilter:"blur(6px)",
};
