import PasswordGate     from "@/components/PasswordGate";
import SpotifySection   from "@/components/SpotifySection";
import WatchlistSection from "@/components/WatchlistSection";

const SERIF  = `"Georgia","Times New Roman",serif`;
const SCRIPT = `var(--font-caveat),"Segoe Script",cursive`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;

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
    <div style={{
      position:"relative", textAlign:"center", overflow:"hidden",
      padding:"clamp(3.5rem,8vh,6rem) clamp(1rem,4vw,2rem) clamp(2rem,5vh,3.5rem)",
      background:"linear-gradient(180deg,#fff0f7 0%,#fce7f3 60%,rgba(252,231,243,0) 100%)",
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
          fontSize:f.s, color:"rgba(190,24,93,.3)",
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
          color:"rgba(190,24,93,.45)", margin:"0 0 0.6rem", letterSpacing:"0.04em",
        }}>
          just the two of us ✦
        </p>
        <h1 style={{
          fontFamily:SERIF, fontStyle:"italic", fontWeight:400,
          fontSize:"clamp(2.4rem,6vw,3.8rem)",
          color:"#9d174d", margin:"0 0 0.6rem", letterSpacing:"-0.02em", lineHeight:1.1,
        }}>
          our little world
        </h1>
        <p style={{
          fontFamily:SCRIPT, fontSize:"clamp(1.05rem,2.5vw,1.3rem)",
          color:"rgba(157,23,77,.4)", margin:0,
        }}>
          music we share · stories we&apos;ll watch together 🌸
        </p>

        {/* Divider */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"center",
          gap:"1rem", marginTop:"2rem",
        }}>
          <div style={{ height:1, width:60, background:"linear-gradient(90deg,transparent,rgba(190,24,93,.2))" }}/>
          <span style={{ color:"rgba(190,24,93,.3)", fontSize:"1rem" }}>♪</span>
          <span style={{ color:"rgba(190,24,93,.2)", fontSize:"0.7rem" }}>✦</span>
          <span style={{ color:"rgba(190,24,93,.3)", fontSize:"1rem" }}>🎬</span>
          <div style={{ height:1, width:60, background:"linear-gradient(90deg,rgba(190,24,93,.2),transparent)" }}/>
        </div>
      </div>
    </div>
  );
}

export default function SharedPage() {
  return (
    <PasswordGate>
      <main>
        <SharedHero />
        <SpotifySection />
        <WatchlistSection />
      </main>
    </PasswordGate>
  );
}
