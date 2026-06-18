"use client";
import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";
import { defaultStartDate } from "@/lib/relationship";
import { useUserData } from "@/lib/userStore";
import { isOriginalCouple, resolvePlaylistId } from "@/lib/spotify";

const START  = defaultStartDate();
const ME     = "ankit";
const HER    = "juhi";

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
function fmtDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
}

const EQ = [
  { h:"sp-eq1 1.0s ease-in-out infinite" },
  { h:"sp-eq2 0.8s ease-in-out infinite" },
  { h:"sp-eq3 1.3s ease-in-out infinite" },
  { h:"sp-eq4 0.7s ease-in-out infinite" },
  { h:"sp-eq5 0.95s ease-in-out infinite" },
];

export default function SpotifySection() {
  const user = useUserData();
  // Turn-taking, the add-song button, and the ankit/juhi attribution are personal
  // to the original couple. Every other couple just gets their own playlist —
  // and never the original couple's leaked default (→ "add a playlist" prompt).
  const isUs = useMemo(() => isOriginalCouple(user?.name, user?.partnerName), [user?.name, user?.partnerName]);
  const playlistId = useMemo(
    () => resolvePlaylistId(user?.settings?.spotifyPlaylistId, user?.name, user?.partnerName),
    [user?.settings?.spotifyPlaylistId, user?.name, user?.partnerName],
  );

  const [tracks, setTracks]   = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playlistId) { setTracks([]); setLoading(false); return; }
    setLoading(true);
    fetch("/api/spotify")
      .then(r => r.json())
      .then(d => setTracks(d.tracks || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [playlistId]);

  const dn     = useMemo(() => dayNum(new Date()), []);
  const myTurn = useMemo(() => isMyTurn(dn), [dn]);

  const sorted = useMemo(
    () => [...tracks]
      .filter(t => t.track != null)
      .sort((a,b) => a.added_at.localeCompare(b.added_at)),
    [tracks]
  );

  // Always the most recently added track
  const songOfDay = useMemo(() => sorted.length ? sorted[sorted.length-1] : null, [sorted]);

  // Who added the song of the day, based on that day's turn
  const sodAdder = useMemo(() => {
    if (!songOfDay) return null;
    return isMyTurn(dayNum(new Date(songOfDay.added_at))) ? ME : HER;
  }, [songOfDay]);

  const recent = useMemo(() => sorted.slice(-8).reverse(), [sorted]);

  return (
    <section style={{
      position:"relative", width:"100%",
      padding:"clamp(3.5rem,7vh,5.5rem) clamp(1rem,4vw,2.5rem)",
      background:"linear-gradient(160deg,var(--rose) 0%,var(--pink-light) 55%,var(--pink-light) 100%)",
      overflow:"hidden",
    }}>
      <style>{`
        @keyframes sp-spin { to { transform: rotate(360deg); } }
        @keyframes sp-eq1  { 0%,100%{height:5px}  50%{height:26px} }
        @keyframes sp-eq2  { 0%,100%{height:20px} 50%{height:5px}  }
        @keyframes sp-eq3  { 0%,100%{height:7px}  33%{height:28px} 66%{height:5px} }
        @keyframes sp-eq4  { 0%,100%{height:22px} 50%{height:7px}  }
        @keyframes sp-eq5  { 0%,100%{height:10px} 50%{height:24px} }
        .sp-recent-chip:hover { background:rgba(var(--pink-deep-rgb),.1) !important; transform:translateY(-2px); }
        .sp-recent-chip { transition: background .18s, transform .18s; }
        .sp-open-btn:hover { filter:brightness(1.12); transform:scale(1.04); }
        .sp-open-btn { transition: filter .2s, transform .2s; }
      `}</style>

      {/* Orbs */}
      {[{l:"3%",t:"5%",c:"rgba(var(--pink-rgb),.2)",w:260},{l:"68%",t:"3%",c:"rgba(var(--pink-rgb),.12)",w:200},{l:"40%",t:"72%",c:"rgba(216,180,254,.1)",w:220}].map((o,i)=>(
        <div key={i} style={{position:"absolute",left:o.l,top:o.t,width:o.w,height:o.w,
          borderRadius:"50%",background:o.c,filter:"blur(60px)",pointerEvents:"none",zIndex:0}} />
      ))}

      <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
        style={{maxWidth:700,margin:"0 auto",position:"relative",zIndex:1}}>

        {/* ── Header ── */}
        <div style={{textAlign:"center",marginBottom:"2.2rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"0.9rem",marginBottom:"0.8rem"}}>
            <div style={{flex:1,maxWidth:55,height:1,background:"linear-gradient(90deg,transparent,rgba(var(--pink-deep-rgb),.28))"}}/>
            <span style={{fontFamily:SCRIPT,fontSize:"1rem",color:"rgba(var(--pink-deep-rgb),.38)",letterSpacing:"0.08em"}}>♪ ♫ ♪</span>
            <div style={{flex:1,maxWidth:55,height:1,background:"linear-gradient(90deg,rgba(var(--pink-deep-rgb),.28),transparent)"}}/>
          </div>
          <h2 style={{fontFamily:SERIF,fontStyle:"italic",fontWeight:400,
            fontSize:"clamp(2rem,5vw,2.8rem)",color:"var(--pink-deep)",margin:"0 0 0.4rem",letterSpacing:"-0.01em"}}>
            our playlist
          </h2>
          <p style={{fontFamily:SCRIPT,fontSize:"clamp(1rem,2.5vw,1.2rem)",color:"rgba(var(--pink-deep-rgb),.45)",margin:0}}>
            one song a day, always thinking of you 🌸
          </p>
        </div>

        {!playlistId ? (
          /* ── No playlist set yet — invite the couple to add one ── */
          <div style={{
            textAlign:"center",padding:"2.4rem 1.4rem",
            background:"rgba(255,255,255,.72)",
            border:"1.5px solid rgba(var(--pink-deep-rgb),.16)",
            borderRadius:24,boxShadow:"0 8px 36px rgba(var(--pink-deep-rgb),.08)",
          }}>
            <div style={{fontSize:"2.4rem",marginBottom:"0.5rem"}}>🎶</div>
            <p style={{fontFamily:SERIF,fontStyle:"italic",fontSize:"1.25rem",color:"var(--pink-deep)",margin:"0 0 0.4rem"}}>
              no playlist yet
            </p>
            <p style={{fontFamily:SANS,fontSize:"0.85rem",color:"rgba(var(--pink-deep-rgb),.55)",margin:"0 auto 1.4rem",maxWidth:340,lineHeight:1.5}}>
              link a shared Spotify playlist and your songs will live here together.
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("annapp:settings", { detail: { focus: "spotify" } }))}
              className="sp-open-btn"
              style={{
                display:"inline-flex",alignItems:"center",gap:"0.45rem",border:"none",cursor:"pointer",
                background:"linear-gradient(135deg,var(--pink),var(--pink-deep))",
                color:"#fff",fontFamily:SANS,fontSize:"0.85rem",fontWeight:700,
                borderRadius:50,padding:"0.6rem 1.4rem",
                boxShadow:"0 6px 20px rgba(var(--pink-deep-rgb),.28)",
              }}>
              <span aria-hidden style={{fontSize:"0.95rem"}}>🎧</span>
              add a playlist
            </button>
          </div>
        ) : (
        <>
        {/* ── Whose turn + add-song — original couple only ── */}
        {isUs && (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"0.45rem",marginBottom:"2rem"}}>
            <div style={{
              display:"inline-flex",alignItems:"center",gap:"0.55rem",
              background:"linear-gradient(135deg,rgba(var(--pink-rgb),.28),rgba(var(--pink-deep-rgb),.16))",
              border:"1.5px solid rgba(var(--pink-deep-rgb),.28)",
              borderRadius:50,padding:"0.55rem 1.5rem",
              boxShadow:"0 4px 20px rgba(var(--pink-deep-rgb),.12)",
            }}>
              <span style={{fontSize:"1.1rem"}}>🎵</span>
              <span style={{fontFamily:SANS,fontSize:"0.88rem",fontWeight:700,color:"var(--pink-deep)"}}>
                {myTurn ? ME : HER}&apos;s turn today
              </span>
            </div>
            <span style={{fontFamily:SANS,fontSize:"0.7rem",color:"rgba(var(--pink-deep-rgb),.38)",letterSpacing:"0.12em"}}>
              day {dn} of us · {myTurn ? `${ME} adds a song` : `${HER} adds a song`}
            </span>
            <a
              href={`https://open.spotify.com/playlist/${playlistId}`}
              target="_blank" rel="noopener noreferrer"
              className="sp-open-btn"
              style={{
                marginTop:"0.55rem",
                display:"inline-flex",alignItems:"center",gap:"0.45rem",
                textDecoration:"none",
                background:"linear-gradient(135deg,var(--pink),var(--pink-deep))",
                color:"#fff",fontFamily:SANS,fontSize:"0.82rem",fontWeight:700,
                borderRadius:50,padding:"0.5rem 1.15rem",
                boxShadow:"0 6px 20px rgba(var(--pink-deep-rgb),.28)",
              }}>
              <span aria-hidden style={{fontSize:"0.95rem"}}>🎧</span>
              add today&apos;s song →
            </a>
          </div>
        )}

        {/* ── Song of the day card ── */}
        {!loading && songOfDay && (
          <motion.div initial={{opacity:0,y:16}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
            style={{
              display:"flex",alignItems:"center",gap:"1.2rem",
              background:"rgba(255,255,255,.88)",
              border:"1.5px solid rgba(var(--pink-deep-rgb),.2)",
              borderRadius:24,padding:"1.2rem 1.4rem",
              marginBottom:"2rem",
              boxShadow:"0 8px 40px rgba(var(--pink-deep-rgb),.1),0 0 0 1px rgba(var(--pink-rgb),.15)",
              overflow:"hidden",position:"relative",
            }}>
            {/* Pink gradient accent strip */}
            <div style={{position:"absolute",left:0,top:0,bottom:0,width:4,
              background:"linear-gradient(180deg,var(--pink),var(--pink-deep),var(--pink-deep))"}} />

            {/* Album art — spinning circle */}
            <div style={{
              flexShrink:0,
              width:"clamp(80px,18vw,110px)",height:"clamp(80px,18vw,110px)",
              borderRadius:"50%",overflow:"hidden",
              animation:"sp-spin 10s linear infinite",
              border:"3px solid rgba(var(--pink-deep-rgb),.22)",
              boxShadow:"0 0 0 6px rgba(var(--pink-rgb),.12),0 8px 28px rgba(var(--pink-deep-rgb),.18)",
            }}>
              {songOfDay.track.album.images[0]
                ? <img src={songOfDay.track.album.images[0].url} alt="" loading="eager"
                    style={{width:"100%",height:"100%",objectFit:"cover"}} />
                : <div style={{width:"100%",height:"100%",
                    background:"linear-gradient(135deg,var(--pink),var(--pink-deep))",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.8rem"}}>🎵</div>
              }
            </div>

            {/* Info */}
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.4rem",marginBottom:"0.3rem",flexWrap:"wrap"}}>
                <span style={{fontFamily:SANS,fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.15em",
                  textTransform:"uppercase",color:"var(--pink-deep)",
                  background:"rgba(var(--pink-deep-rgb),.1)",borderRadius:6,padding:"0.1rem 0.5rem"}}>
                  ✨ song of the day
                </span>
                {isUs && (
                  <span style={{fontFamily:SANS,fontSize:"0.6rem",color:"rgba(var(--pink-deep-rgb),.4)"}}>
                    added by {sodAdder} 💗
                  </span>
                )}
              </div>
              <p style={{fontFamily:SERIF,fontStyle:"italic",
                fontSize:"clamp(1rem,2.8vw,1.2rem)",color:"#7c3f58",
                margin:"0 0 0.18rem",lineHeight:1.3,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {songOfDay.track.name}
              </p>
              <p style={{fontFamily:SANS,fontSize:"0.78rem",color:"rgba(var(--pink-deep-rgb),.5)",margin:"0 0 0.7rem"}}>
                {songOfDay.track.artists.map(a=>a.name).join(", ")} · {fmtDuration(songOfDay.track.duration_ms)}
              </p>

              {/* EQ bars + open */}
              <div style={{display:"flex",alignItems:"flex-end",gap:"0.75rem"}}>
                <div style={{display:"flex",alignItems:"flex-end",gap:4,height:30}}>
                  {EQ.map(b => (
                    <div key={b.h} style={{width:4,borderRadius:3,
                      background:"linear-gradient(to top,var(--pink-deep),var(--pink))",
                      animation:b.h}} />
                  ))}
                </div>
                <a href={songOfDay.track.external_urls.spotify}
                  target="_blank" rel="noopener noreferrer"
                  className="sp-open-btn"
                  style={{
                    display:"inline-flex",alignItems:"center",gap:"0.35rem",
                    background:"#1DB954",color:"#fff",
                    fontFamily:SANS,fontSize:"0.72rem",fontWeight:700,
                    padding:"0.42rem 1rem",borderRadius:50,textDecoration:"none",
                    boxShadow:"0 3px 14px rgba(29,185,84,.38)",
                  }}>
                  ▶ open
                </a>
              </div>
            </div>
          </motion.div>
        )}

        {loading && (
          <div style={{textAlign:"center",padding:"2.5rem",
            fontFamily:SCRIPT,fontSize:"1.15rem",color:"rgba(var(--pink-deep-rgb),.38)"}}>
            loading our playlist… 🌸
          </div>
        )}

        {/* ── Spotify embed ── */}
        <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
          transition={{delay:.08}}
          style={{
            borderRadius:22,overflow:"hidden",marginBottom:"2rem",
            boxShadow:"0 16px 52px rgba(var(--pink-deep-rgb),.14),0 0 0 1.5px rgba(var(--pink-rgb),.28)",
          }}>
          <iframe
            src={`https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`}
            width="100%" height="420"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy" style={{display:"block",border:"none"}}
          />
        </motion.div>

        {/* ── Recent picks ── */}
        {recent.length > 1 && (
          <motion.div initial={{opacity:0,y:14}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
            transition={{delay:.1}}>
            <p style={{fontFamily:SANS,fontSize:"0.66rem",fontWeight:700,letterSpacing:"0.16em",
              textTransform:"uppercase",color:"rgba(var(--pink-deep-rgb),.4)",margin:"0 0 0.8rem"}}>
              recent picks
            </p>
            <div style={{
              background:"rgba(255,255,255,.72)",
              border:"1px solid rgba(var(--pink-deep-rgb),.14)",
              borderRadius:20,overflow:"hidden",
            }}>
              {recent.slice(0,6).map((t,i) => {
                const isSod = songOfDay?.track.id === t.track.id;
                const isMe  = isMyTurn(dayNum(new Date(t.added_at)));
                return (
                  <a key={t.track.id}
                    href={t.track.external_urls.spotify}
                    target="_blank" rel="noopener noreferrer"
                    className="sp-recent-chip"
                    style={{
                      display:"flex",alignItems:"center",gap:"0.85rem",
                      padding:"0.72rem 1.1rem",
                      borderBottom:i<Math.min(recent.length,6)-1?"1px solid rgba(var(--pink-deep-rgb),.08)":"none",
                      background:isSod?"rgba(var(--pink-deep-rgb),.05)":"transparent",
                      textDecoration:"none",
                    }}>
                    <div style={{width:40,height:40,borderRadius:9,overflow:"hidden",
                      flexShrink:0,background:"var(--pink-light)",border:"1px solid rgba(var(--pink-deep-rgb),.14)"}}>
                      {t.track.album.images[0] && (
                        <img src={t.track.album.images[0].url} alt="" loading="lazy" decoding="async"
                          style={{width:"100%",height:"100%",objectFit:"cover"}} />
                      )}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontFamily:SANS,fontSize:"0.84rem",fontWeight:500,color:"#7c3f58",
                        margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {t.track.name}
                      </p>
                      <p style={{fontFamily:SANS,fontSize:"0.72rem",color:"rgba(var(--pink-deep-rgb),.48)",margin:0}}>
                        {t.track.artists.map(a=>a.name).join(", ")}
                      </p>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2,flexShrink:0}}>
                      {isUs && (
                        <span style={{fontFamily:SANS,fontSize:"0.64rem",color:"rgba(var(--pink-deep-rgb),.42)"}}>
                          {isMe?ME:HER}
                        </span>
                      )}
                      {isSod && <span style={{fontSize:"0.7rem"}}>💗</span>}
                    </div>
                  </a>
                );
              })}
            </div>
          </motion.div>
        )}
        </>
        )}
      </motion.div>
    </section>
  );
}
