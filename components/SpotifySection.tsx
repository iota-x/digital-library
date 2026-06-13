"use client";
import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";

const SERIF  = `"Georgia","Times New Roman",serif`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
const SCRIPT = `var(--font-caveat),"Segoe Script",cursive`;
const START  = new Date("2026-03-11");
const ME     = "ankit";
const HER    = "juhi";
const PLAYLIST_ID = "41LuF5qeH9u3erSTc5LkPw";

interface SpotifyTrack {
  added_at: string;
  track: {
    id: string;
    name: string;
    artists: { name: string }[];
    album: { images: { url: string }[] };
    external_urls: { spotify: string };
    duration_ms: number;
  };
}

function dayNum(date: Date) {
  return Math.floor((date.getTime() - START.getTime()) / 86400000) + 1;
}
function isMyTurn(dn: number) { return dn % 2 === 1; }

// Convert added_at to LOCAL date string — fixes UTC vs IST mismatch
function addedDayKey(added_at: string) {
  const d = new Date(added_at);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function fmtDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const EQ_ANIMS = [
  "sp-eq1 1.05s ease-in-out infinite",
  "sp-eq2 0.80s ease-in-out infinite",
  "sp-eq3 1.30s ease-in-out infinite",
  "sp-eq4 0.70s ease-in-out infinite",
  "sp-eq5 0.95s ease-in-out infinite",
];

export default function SpotifySection() {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/spotify")
      .then(r => r.json())
      .then(d => setTracks(d.tracks || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const dn      = useMemo(() => dayNum(new Date()), []);
  const myTurn  = useMemo(() => isMyTurn(dn), [dn]);
  const tk      = useMemo(() => todayKey(), []);

  const sorted = useMemo(
    () => [...tracks].sort((a, b) => a.added_at.localeCompare(b.added_at)),
    [tracks]
  );

  const songOfDay = useMemo(() => {
    const todaySong = sorted.find(t => addedDayKey(t.added_at) === tk);
    return todaySong ?? (sorted.length > 0 ? sorted[sorted.length - 1] : null);
  }, [sorted, tk]);

  const recent   = useMemo(() => sorted.slice(-10).reverse(), [sorted]);
  const albumArt = songOfDay?.track.album.images[0]?.url;

  return (
    <>
      <style>{`
        @keyframes sp-vinyl  { to { transform: rotate(360deg); } }
        @keyframes sp-eq1 { 0%,100%{height:5px}  50%{height:28px} }
        @keyframes sp-eq2 { 0%,100%{height:22px} 50%{height:5px}  }
        @keyframes sp-eq3 { 0%,100%{height:8px}  33%{height:32px} 66%{height:5px} }
        @keyframes sp-eq4 { 0%,100%{height:26px} 50%{height:8px}  }
        @keyframes sp-eq5 { 0%,100%{height:11px} 50%{height:30px} }
        .sp-chip { transition: background 0.18s, transform 0.18s; }
        .sp-chip:hover { background: rgba(255,255,255,.18) !important; transform: translateY(-3px); }
        .sp-open:hover { filter: brightness(1.15); transform: scale(1.05); }
        .sp-open { transition: filter 0.2s, transform 0.2s; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ════════════════════════════════════════════════
          HERO — full viewport, dark immersive
      ════════════════════════════════════════════════ */}
      <section style={{
        position: "relative",
        minHeight: "100svh",
        width: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Blurred album art backdrop */}
        {albumArt && (
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${albumArt})`,
            backgroundSize: "cover", backgroundPosition: "center",
            filter: "blur(50px) saturate(1.8) brightness(0.18)",
            transform: "scale(1.15)",
          }} />
        )}
        {/* Colour overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: albumArt
            ? "linear-gradient(180deg,rgba(8,0,18,.65) 0%,rgba(18,0,32,.78) 70%,rgba(5,0,12,.9) 100%)"
            : "linear-gradient(160deg,#0a0016 0%,#180028 60%,#080012 100%)",
        }} />
        {/* Subtle pink glow */}
        <div style={{ position:"absolute", top:"15%", left:"20%", width:350, height:350, borderRadius:"50%",
          background:"rgba(236,72,153,.055)", filter:"blur(90px)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"25%", right:"15%", width:280, height:280, borderRadius:"50%",
          background:"rgba(168,85,247,.04)", filter:"blur(90px)", pointerEvents:"none" }} />

        {/* ── Main content ── */}
        <div style={{
          position: "relative", zIndex: 1, flex: 1,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "clamp(5.5rem,12vh,8rem) clamp(1rem,5vw,3rem) clamp(7rem,14vh,10rem)",
          gap: "clamp(1rem,2.5vh,1.8rem)",
          textAlign: "center",
        }}>
          {/* Title */}
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"0.8rem",
              justifyContent:"center", marginBottom:"0.6rem" }}>
              <div style={{ height:1, width:36, background:"linear-gradient(90deg,transparent,rgba(249,168,212,.35))" }}/>
              <span style={{ fontFamily:SCRIPT, fontSize:"0.9rem",
                color:"rgba(249,168,212,.35)", letterSpacing:"0.1em" }}>♪ ♫ ♪</span>
              <div style={{ height:1, width:36, background:"linear-gradient(90deg,rgba(249,168,212,.35),transparent)" }}/>
            </div>
            <h2 style={{ fontFamily:SERIF, fontStyle:"italic", fontWeight:400,
              fontSize:"clamp(2.2rem,5.5vw,3.2rem)",
              color:"rgba(255,255,255,.92)", margin:0, letterSpacing:"-0.015em" }}>
              our playlist
            </h2>
          </div>

          {/* Whose turn */}
          <div style={{
            display:"inline-flex", alignItems:"center", gap:"0.55rem",
            background:"rgba(236,72,153,.15)",
            border:"1px solid rgba(249,168,212,.25)",
            borderRadius:50, padding:"0.48rem 1.2rem",
            backdropFilter:"blur(12px)",
          }}>
            <span style={{ fontSize:"0.85rem" }}>🎵</span>
            <span style={{ fontFamily:SANS, fontSize:"0.8rem", fontWeight:700, color:"#f9a8d4" }}>
              {myTurn ? ME : HER}&apos;s turn · day {dn}
            </span>
          </div>

          {/* Vinyl */}
          {!loading && (() => {
            const sz = "clamp(200px,40vw,270px)";
            return (
              <motion.div initial={{opacity:0,scale:.8}} animate={{opacity:1,scale:1}}
                transition={{duration:.9,ease:[0.16,1,0.3,1]}}>
                <div style={{ width:sz, height:sz, borderRadius:"50%", position:"relative",
                  animation:"sp-vinyl 7s linear infinite",
                  background:`radial-gradient(circle at center,
                    transparent 0%,            transparent 23%,
                    #16001f 23%,               #16001f 25%,
                    rgba(200,0,100,.45) 25%,   rgba(200,0,100,.45) 26%,
                    #16001f 26%,               #16001f 33%,
                    rgba(200,0,100,.32) 33%,   rgba(200,0,100,.32) 34%,
                    #16001f 34%,               #16001f 43%,
                    rgba(200,0,100,.22) 43%,   rgba(200,0,100,.22) 44%,
                    #16001f 44%,               #16001f 53%,
                    rgba(200,0,100,.14) 53%,   rgba(200,0,100,.14) 54%,
                    #16001f 54%
                  )`,
                  boxShadow:"0 0 90px rgba(236,72,153,.22), 0 24px 70px rgba(0,0,0,.85)",
                }}>
                  {/* Label */}
                  <div style={{
                    position:"absolute", top:"50%", left:"50%",
                    transform:"translate(-50%,-50%)",
                    width:"46%", height:"46%", borderRadius:"50%", overflow:"hidden",
                    border:"3px solid rgba(249,168,212,.2)",
                    boxShadow:"0 0 0 5px rgba(0,0,0,.55), 0 0 40px rgba(236,72,153,.25)",
                  }}>
                    {songOfDay?.track.album.images[0]
                      ? <img src={songOfDay.track.album.images[0].url} alt=""
                          style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      : <div style={{ width:"100%", height:"100%",
                          background:"linear-gradient(135deg,#ec4899,#9d174d)",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:"1.6rem" }}>🎵</div>
                    }
                  </div>
                  {/* Spindle */}
                  <div style={{
                    position:"absolute", top:"50%", left:"50%",
                    transform:"translate(-50%,-50%)",
                    width:11, height:11, borderRadius:"50%", zIndex:2,
                    background:"rgba(0,0,0,.95)",
                    boxShadow:"0 0 0 2.5px rgba(255,255,255,.12)",
                  }} />
                </div>
              </motion.div>
            );
          })()}

          {/* Song info */}
          <div style={{ maxWidth:"min(520px,90vw)" }}>
            {loading ? (
              <p style={{ fontFamily:SCRIPT, fontSize:"1.3rem", color:"rgba(249,168,212,.35)", margin:0 }}>
                loading our songs… 🌸
              </p>
            ) : songOfDay ? (
              <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:.3}}>
                <p style={{ fontFamily:SANS, fontSize:"0.58rem", fontWeight:700,
                  letterSpacing:"0.24em", textTransform:"uppercase",
                  color:"#ec4899", margin:"0 0 0.5rem" }}>✦ song of the day</p>
                <h3 style={{ fontFamily:SERIF, fontStyle:"italic", fontWeight:400,
                  fontSize:"clamp(1.6rem,4.5vw,2.5rem)",
                  color:"#fff", margin:"0 0 0.35rem", lineHeight:1.2,
                  display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical",
                  overflow:"hidden" }}>
                  {songOfDay.track.name}
                </h3>
                <p style={{ fontFamily:SANS, fontSize:"0.84rem",
                  color:"rgba(249,168,212,.55)", margin:"0 0 1.1rem" }}>
                  {songOfDay.track.artists.map(a=>a.name).join(", ")}
                  {" · "}{fmtDuration(songOfDay.track.duration_ms)}
                </p>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"1.2rem" }}>
                  <div style={{ display:"flex", alignItems:"flex-end", gap:5, height:34 }}>
                    {EQ_ANIMS.map(anim => (
                      <div key={anim} style={{
                        width:5, borderRadius:3,
                        background:"linear-gradient(to top,#be185d,#f9a8d4)",
                        animation:anim,
                      }} />
                    ))}
                  </div>
                  <a href={songOfDay.track.external_urls.spotify}
                    target="_blank" rel="noopener noreferrer"
                    className="sp-open"
                    style={{
                      display:"inline-flex", alignItems:"center", gap:"0.45rem",
                      background:"#1DB954", color:"#fff",
                      fontFamily:SANS, fontSize:"0.78rem", fontWeight:700,
                      padding:"0.52rem 1.25rem", borderRadius:50,
                      textDecoration:"none",
                      boxShadow:"0 4px 22px rgba(29,185,84,.4)",
                    }}>
                    ▶ open
                  </a>
                </div>
              </motion.div>
            ) : (
              <p style={{ fontFamily:SCRIPT, fontSize:"1.2rem", color:"rgba(249,168,212,.35)", margin:0 }}>
                no songs yet 🎵
              </p>
            )}
          </div>
        </div>

        {/* ── Recent picks — pinned bottom strip ── */}
        {recent.length > 0 && (
          <div style={{
            position:"absolute", bottom:0, left:0, right:0, zIndex:2,
            background:"linear-gradient(to top,rgba(0,0,0,.65) 0%,transparent 100%)",
            padding:"1.2rem clamp(1rem,4vw,2.5rem) 1.4rem",
          }}>
            <p style={{ fontFamily:SANS, fontSize:"0.6rem", fontWeight:700,
              letterSpacing:"0.18em", textTransform:"uppercase",
              color:"rgba(249,168,212,.35)", margin:"0 0 0.65rem" }}>
              recent picks
            </p>
            <div style={{ display:"flex", gap:"0.55rem", overflowX:"auto",
              paddingBottom:"0.25rem", scrollbarWidth:"none" }}>
              {recent.map(t => {
                const isSod = songOfDay?.track.id === t.track.id;
                return (
                  <a key={t.track.id}
                    href={t.track.external_urls.spotify}
                    target="_blank" rel="noopener noreferrer"
                    className="sp-chip"
                    style={{
                      flexShrink:0, display:"flex", alignItems:"center", gap:"0.55rem",
                      background: isSod ? "rgba(236,72,153,.22)" : "rgba(255,255,255,.07)",
                      border:`1px solid ${isSod ? "rgba(249,168,212,.4)" : "rgba(255,255,255,.09)"}`,
                      borderRadius:12, padding:"0.4rem 0.65rem 0.4rem 0.4rem",
                      textDecoration:"none", backdropFilter:"blur(14px)",
                    }}>
                    <div style={{ width:34, height:34, borderRadius:7, overflow:"hidden",
                      flexShrink:0, background:"rgba(255,255,255,.08)" }}>
                      {t.track.album.images[0] && (
                        <img src={t.track.album.images[0].url} alt="" loading="lazy" decoding="async"
                          style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      )}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <p style={{ fontFamily:SANS, fontSize:"0.7rem", fontWeight:600,
                        color:"rgba(255,255,255,.88)", margin:0,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:110 }}>
                        {t.track.name}
                      </p>
                      <p style={{ fontFamily:SANS, fontSize:"0.6rem",
                        color:"rgba(249,168,212,.5)", margin:0 }}>
                        {t.track.artists[0]?.name}{isSod ? " 💗" : ""}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════
          EMBED — light section below
      ════════════════════════════════════════════════ */}
      <section style={{
        padding:"clamp(2.5rem,6vw,4.5rem) clamp(1rem,4vw,2.5rem)",
        background:"linear-gradient(160deg,#fff5f9 0%,#fce7f3 55%,#fdf4ff 100%)",
      }}>
        <div style={{ maxWidth:720, margin:"0 auto" }}>
          <p style={{ fontFamily:SANS, fontSize:"0.66rem", fontWeight:700,
            letterSpacing:"0.18em", textTransform:"uppercase",
            color:"rgba(190,24,93,.38)", margin:"0 0 1.1rem", textAlign:"center" }}>
            full playlist
          </p>
          <div style={{
            borderRadius:24, overflow:"hidden",
            boxShadow:"0 20px 60px rgba(190,24,93,.16), 0 0 0 1.5px rgba(249,168,212,.3)",
          }}>
            <iframe
              src={`https://open.spotify.com/embed/playlist/${PLAYLIST_ID}?utm_source=generator&theme=0`}
              width="100%" height="440"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              style={{ display:"block", border:"none" }}
            />
          </div>
        </div>
      </section>
    </>
  );
}
