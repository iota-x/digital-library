"use client";
import PasswordGate     from "@/components/PasswordGate";
import SpotifySection   from "@/components/SpotifySection";
import WatchlistSection from "@/components/WatchlistSection";
import LoveJar          from "@/components/LoveJar";
import BucketList       from "@/components/BucketList";
import Ideas            from "@/components/Ideas";
import SectionNav, { type Section } from "@/components/SectionNav";
import { useUserData }  from "@/lib/userStore";
import { sectionVisible } from "@/lib/themes";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";


function SharedHero() {
  const floaters = [
    { t:"18%", l:"7%",  s:"1.4rem", a:"2.8s", c:"♪" },
    { t:"60%", l:"4%",  s:"1rem",   a:"3.5s", c:"✦" },
    { t:"25%", l:"91%", s:"1.2rem", a:"3.1s", c:"♫" },
    { t:"72%", l:"88%", s:"0.9rem", a:"2.5s", c:"✦" },
    { t:"45%", l:"93%", s:"1.1rem", a:"3.8s", c:"♪" },
    { t:"80%", l:"12%", s:"1rem",   a:"2.9s", c:"♬" },
  ];

  return (
    <div className="dk-shared-hero" style={{
      position:"relative", textAlign:"center", overflow:"hidden",
      padding:"clamp(3.5rem,8vh,6rem) clamp(1rem,4vw,2rem) clamp(2rem,5vh,3.5rem)",
      background:`linear-gradient(180deg,var(--rose) 0%,var(--pink-light) 60%,rgba(var(--pink-light-rgb),0) 100%)`,
    }}>
      <style>{`
        @keyframes sh-float {
          0%,100% { transform: translateY(0) rotate(0deg); opacity: 0.35; }
          50%      { transform: translateY(-14px) rotate(8deg); opacity: 0.6; }
        }
        @keyframes sh-fade-up {
          from { opacity:0; transform: translateY(18px); }
          to   { opacity:1; transform: translateY(0); }
        }
      `}</style>

      {/* Floating symbols */}
      {floaters.map((f,i) => (
        <span key={i} aria-hidden style={{
          position:"absolute", top:f.t, left:f.l,
          fontSize:f.s, color:"rgba(var(--pink-deep-rgb,190,24,93),.3)",
          animation:`sh-float ${f.a} ease-in-out infinite`,
          animationDelay:`${i * 0.4}s`,
          userSelect:"none", pointerEvents:"none",
          fontFamily:SANS,
        }}>{f.c}</span>
      ))}

      {/* Content */}
      <div style={{ animation:"sh-fade-up 0.9s ease both" }}>
        <p style={{
          fontFamily:SCRIPT, fontSize:"clamp(1rem,2.5vw,1.2rem)",
          color:"var(--muted)", margin:"0 0 0.6rem", letterSpacing:"0.04em",
        }}>
          just the two of us ✦
        </p>
        <h1 style={{
          fontFamily:SERIF, fontStyle:"italic", fontWeight:400,
          fontSize:"clamp(2.4rem,6vw,3.8rem)",
          color:"var(--pink-deep)", margin:"0 0 0.6rem", letterSpacing:"-0.02em", lineHeight:1.1,
        }}>
          our little world
        </h1>
        <p style={{
          fontFamily:SCRIPT, fontSize:"clamp(1.05rem,2.5vw,1.3rem)",
          color:"var(--muted)", margin:0,
        }}>
          dreams to live · music to share · movies to watch 🌸
        </p>

        {/* Divider */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"center",
          gap:"1rem", marginTop:"2rem",
        }}>
          <div style={{ height:1, width:50, background:`linear-gradient(90deg,transparent,rgba(var(--pink-deep-rgb),.2))` }}/>
          <span style={{ color:"var(--muted)", fontSize:"1rem" }}>💕</span>
          <span style={{ color:"var(--muted)", fontSize:"0.7rem" }}>✦</span>
          <span style={{ color:"var(--muted)", fontSize:"1rem" }}>♪</span>
          <span style={{ color:"var(--muted)", fontSize:"0.7rem" }}>✦</span>
          <span style={{ color:"var(--muted)", fontSize:"1rem" }}>🎬</span>
          <div style={{ height:1, width:50, background:`linear-gradient(90deg,rgba(var(--pink-deep-rgb),.2),transparent)` }}/>
        </div>
      </div>
    </div>
  );
}

function SharedContent() {
  const user = useUserData();
  const sv = (key: string) => sectionVisible(user?.settings, "shared", key);

  const sections: Section[] = [
    { id: "ideas", label: "date ideas", emoji: "🌙" },
    ...(sv("showBucketList") ? [{ id: "bucket", label: "bucket list", emoji: "✅" }] : []),
    ...(sv("showSpotify") ? [{ id: "playlist", label: "playlist", emoji: "🎵" }] : []),
    ...(sv("showWatchlist") ? [{ id: "watchlist", label: "watchlist", emoji: "🎬" }] : []),
    { id: "jar", label: "love jar", emoji: "🫙" },
  ];

  return (
    <main>
      <SharedHero />
      <SectionNav sections={sections} />
      <div id="ideas" style={{ scrollMarginTop: 120 }}>
        <Ideas mode="date" emoji="🌙" heading="date night ideas" sub="something to do together this week" />
      </div>
      {sv("showBucketList") && <div id="bucket" style={{ scrollMarginTop: 120 }}><BucketList /></div>}
      {sv("showSpotify") && <div id="playlist" style={{ scrollMarginTop: 120 }}><SpotifySection /></div>}
      {sv("showWatchlist") && <div id="watchlist" style={{ scrollMarginTop: 120 }}><WatchlistSection /></div>}
      <div id="jar" style={{ scrollMarginTop: 120 }}><LoveJar /></div>
    </main>
  );
}

export default function SharedPage() {
  return (
    <PasswordGate>
      <SharedContent />
    </PasswordGate>
  );
}
