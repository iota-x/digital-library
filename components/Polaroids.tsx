"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";
import Image from "next/image";
import { useUserData, updateAvatar } from "@/lib/userStore";
import { useIsMobile } from "@/lib/useIsMobile";
import { startDateFrom } from "@/lib/relationship";
import { onPartnerSSE } from "@/lib/sseClient";
import { cldImg } from "@/lib/cldImg";
import AvatarEditor from "@/components/AvatarEditor";
import CuteTooltip from "@/components/CuteTooltip";

interface PetalData { id:number; delay:number; left:string; size:number; dur:number; symbol:string; }

const PETAL_SYMBOLS = ["🌸","🌷","💗","🌹","💕","🩷","✨","⭐"];

function Petal({ delay, left, size, dur, symbol }: Omit<PetalData,"id">) {
  return (
    <div className="occ-petal" style={{ left, fontSize:size, zIndex:1, "--occ-dur":`${dur}s`, "--occ-del":`${delay}s` } as React.CSSProperties}>
      {symbol}
    </div>
  );
}

function MagneticPolaroid({ children, rotate, label, emoji, onClick, editable }: {
  children: React.ReactNode; rotate:number; label:string; emoji:string;
  onClick?: () => void; editable?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0); const y = useMotionValue(0);
  const sx = useSpring(x,{stiffness:130,damping:18});
  const sy = useSpring(y,{stiffness:130,damping:18});
  const [hovered, setHovered] = useState(false);

  const onMove = useCallback((e: React.MouseEvent) => {
    const el=ref.current; if(!el) return;
    const r=el.getBoundingClientRect();
    x.set((e.clientX-(r.left+r.width/2))*0.18);
    y.set((e.clientY-(r.top+r.height/2))*0.18);
  },[x,y]);
  const onLeave = useCallback(()=>{ x.set(0); y.set(0); setHovered(false); },[x,y]);

  return (
    <div style={{ position:"relative", flexShrink:0, zIndex:10 }}>
      <motion.div
        style={{
          position:"absolute", inset:-6, borderRadius:4,
          background:"linear-gradient(135deg,var(--pink),var(--pink-deep),var(--pink-mid),var(--pink),var(--pink))",
          backgroundSize:"300% 300%", filter:"blur(12px)",
          opacity: hovered ? 0.85 : 0.45, zIndex:-1, transition:"opacity 0.3s ease",
        }}
        animate={{ backgroundPosition:["0% 50%","100% 50%","0% 50%"] }}
        transition={{ duration:3, repeat:Infinity, ease:"linear" }}
      />
      <motion.div
        ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} onHoverStart={()=>setHovered(true)}
        onClick={onClick}
        role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
        aria-label={editable ? `Edit ${label}'s photo` : undefined}
        style={{
          x:sx, y:sy, rotate, background:"#fff",
          padding:"1rem 1rem 0.8rem",
          boxShadow:"0 8px 32px rgba(var(--pink-rgb),0.18)",
          width:"clamp(190px,28vw,285px)", cursor:"pointer", position:"relative",
        }}
        whileHover={{ rotate:0, scale:1.07 }}
        transition={{ type:"spring", stiffness:180, damping:16 }}
      >
        {children}
        {editable && (
          <span aria-hidden style={{
            position:"absolute", top:14, right:14, width:30, height:30, borderRadius:"50%",
            background:"rgba(255,255,255,.92)", boxShadow:"0 2px 8px rgba(var(--pink-rgb),.35)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.85rem",
            opacity: hovered ? 1 : 0.75, transition:"opacity .25s",
          }}>✏️</span>
        )}
        <p style={{
          fontFamily:"var(--font-caveat)", textAlign:"center",
          paddingTop:"0.7rem", color:"var(--muted)", fontSize:"1.1rem", margin:0,
        }}>
          {label} {emoji}
        </p>
      </motion.div>
    </div>
  );
}

/** The square photo area inside a polaroid: the person's cropped avatar, or a
 *  gradient + initial placeholder (with a gentle "add" hint on your own). */
function PolaroidPhoto({ avatar, name, mine, fallbackSrc, fallbackStyle }: {
  avatar: string | null; name: string; mine: boolean;
  fallbackSrc?: string; fallbackStyle?: React.CSSProperties;
}) {
  const box: React.CSSProperties = {
    width:"100%", aspectRatio:"1", position:"relative", overflow:"hidden",
    background:"linear-gradient(135deg,var(--pink-light),var(--pink-mid))",
  };
  if (avatar) {
    return (
      <div style={box}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cldImg(avatar, { w: 570, h: 570, crop: "fill" })} alt={`${name}'s photo`}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
      </div>
    );
  }
  if (fallbackSrc) {
    return (
      <div style={box}>
        <Image src={fallbackSrc} alt={`polaroid photo of ${name}`} fill style={{ objectFit:"cover", ...fallbackStyle }} />
      </div>
    );
  }
  const initial = (name || "").trim().charAt(0).toUpperCase() || "🩷";
  return (
    <div style={{ ...box, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"0.3rem" }}>
      <span style={{ fontFamily:"var(--font-playfair)", fontSize:"3.2rem", color:"#fff", lineHeight:1, textShadow:"0 2px 12px rgba(var(--pink-deep-rgb),.4)" }}>{initial}</span>
      {mine && <span style={{ fontFamily:"var(--font-caveat)", fontSize:"0.95rem", color:"#fff", opacity:.95 }}>tap to add your photo</span>}
    </div>
  );
}

function ScrollIndicator() {
  const handleClick = () => {
    document.getElementById("live-timer")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.div
      onClick={handleClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.3, duration: 0.8 }}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: "0.15rem", marginTop: "2.5rem", cursor: "pointer", userSelect: "none",
      }}
      whileHover={{ scale: 1.12 }}
    >
      {/* label */}
      <motion.span
        style={{ fontFamily: "var(--font-caveat)", color: "var(--muted)", fontSize: "1rem", marginBottom: "0.5rem" }}
        animate={{ y: [-2, 2, -2] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
      >
        our time together
      </motion.span>

      {/* bouncing flower */}
      <motion.span
        style={{ fontSize: "1.8rem", lineHeight: 1, display: "block" }}
        animate={{ y: [0, -7, 0], rotate: [-10, 10, -10] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
      >
        🌸
      </motion.span>

      {/* cascading hearts getting smaller — implies downward direction */}
      {([
        { size: "1.1rem", delay: 0 },
        { size: "0.8rem", delay: 0.18 },
        { size: "0.55rem", delay: 0.36 },
      ] as { size: string; delay: number }[]).map((h, i) => (
        <motion.span
          key={i}
          style={{ fontSize: h.size, lineHeight: 1, display: "block", marginTop: "-2px" }}
          animate={{ opacity: [0.15, 1, 0.15], y: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 1.1, delay: h.delay, ease: "easeInOut" }}
        >
          🩷
        </motion.span>
      ))}
    </motion.div>
  );
}

/** The original couple — their polaroids stay the hand-placed her.jpg/him.jpg
 *  photos. The avatar personalisation is only for everyone else. */
function isAnkitJuhi(name?: string | null, partner?: string | null): boolean {
  const ns = [name?.trim().toLowerCase(), partner?.trim().toLowerCase()];
  return ns.includes("ankit") && ns.includes("juhi");
}

function computeHeroText(startDate: Date) {
  const now   = new Date();
  const ms    = now.getTime() - startDate.getTime();
  if (ms < 0) return "day 1 🌸";
  const totalDays = Math.floor(ms / 86400000);
  if (totalDays < 30) return `${totalDays} day${totalDays !== 1 ? "s" : ""} of us 🌸`;
  let y = now.getFullYear() - startDate.getFullYear();
  let m = now.getMonth()    - startDate.getMonth();
  if (m < 0) { m += 12; y--; }
  const totalMonths = y * 12 + m;
  if (totalMonths < 12) return `${totalMonths} month${totalMonths !== 1 ? "s" : ""} of us 🌸`;
  const rem = totalMonths % 12;
  return rem > 0
    ? `${y} year${y !== 1 ? "s" : ""} & ${rem} month${rem !== 1 ? "s" : ""} of us 🌸`
    : `${y} year${y !== 1 ? "s" : ""} of us 🌸`;
}

export default function Polaroids() {
  const userData = useUserData();
  const startDate = startDateFrom(userData?.startDate);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target:ref, offset:["start start","end start"] });
  const titleY = useTransform(scrollYProgress,[0,1],[0,60]);
  const [petals, setPetals] = useState<PetalData[]>([]);
  const isMobile = useIsMobile();
  const heroText = computeHeroText(startDate);
  const [editing, setEditing] = useState(false);
  const [heartTip, setHeartTip] = useState(false);
  const meFirst = (userData?.name ?? "").trim().split(" ")[0];
  const partnerFirst = (userData?.partnerName ?? "").trim().split(" ")[0];
  const heartLabel = meFirst && partnerFirst ? `${meFirst} & ${partnerFirst} 💗` : "always us 💗";

  // Live-update the partner's polaroid when they change their photo.
  useEffect(() => {
    return onPartnerSSE((detail) => {
      if (detail.type === "avatar:update") {
        updateAvatar("partner", (detail.avatarUrl as string) || null);
      }
    });
  }, []);

  useEffect(() => {
    setPetals(Array.from({ length:28 },(_,i) => ({
      id:i, delay:Math.random()*8, left:Math.random()*100+"%",
      size:13+Math.random()*14, dur:8+Math.random()*10,
      symbol:PETAL_SYMBOLS[Math.floor(Math.random()*PETAL_SYMBOLS.length)],
    })));
  },[]);

  return (
    <>
      <section ref={ref} id="hero" style={{
        position:"relative", width:"100%", minHeight:"100vh",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        padding:"5rem 2rem", overflow:"hidden",
        background:"linear-gradient(160deg,var(--rose) 0%,var(--pink-light) 45%,var(--rose) 100%)",
      }}>
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none", zIndex:0,
          background:[
            "radial-gradient(ellipse 55% 45% at 28% 38%, rgba(var(--pink-rgb),0.14) 0%, transparent 70%)",
            "radial-gradient(ellipse 45% 40% at 72% 58%, rgba(var(--pink-rgb),0.11) 0%, transparent 70%)",
          ].join(","),
        }} />

        <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:2 }}>
          {petals.map(p => <Petal key={p.id} {...p} />)}
        </div>

        <motion.div
          initial={{ opacity:0, y:90 }}
          animate={{ opacity:1, y:0 }}
          transition={{ duration:1.2, delay:0.15, ease:[0.16,1,0.3,1] }}

          style={{
  display:"flex",
  flexDirection: isMobile ? "column" : "row",
  alignItems:"center",
  justifyContent:"center",
  gap: isMobile ? "1.5rem" : "clamp(2rem,5vw,5rem)",
  zIndex:10,
  width:"100%",
  maxWidth:920,
}}
      
        >
          {(() => {
            // Render the couple consistently for both viewers: creator on the
            // left, partner on the right. Each shows their own cropped avatar
            // (or a placeholder), and tapping your own opens the editor.
            const me = userData
              ? { name: userData.name, avatar: userData.avatarUrl, mine: true }
              : null;
            const partner = userData
              ? { name: userData.partnerName ?? "", avatar: userData.partnerAvatarUrl, mine: false }
              : null;
            const isCreator = userData?.role === "creator";
            // For Ankit + Juhi, keep the original hand-placed photos (force the
            // static-fallback path below); avatars are only for other couples.
            const owners = isAnkitJuhi(userData?.name, userData?.partnerName);
            const left  = (!userData || owners) ? null : (isCreator ? me : partner);
            const right = (!userData || owners) ? null : (isCreator ? partner : me);

            const slot = (
              person: { name: string; avatar: string | null; mine: boolean } | null,
              rotate: number, emoji: string,
              fallbackSrc: string, fallbackStyle: React.CSSProperties,
            ) => {
              // Pre-auth / loading: keep the original seed photos so the hero
              // never looks empty.
              if (!person) {
                return (
                  <MagneticPolaroid rotate={rotate} label={fallbackSrc.includes("her") ? "her" : "him"} emoji={emoji}>
                    <PolaroidPhoto avatar={null} name="" mine={false} fallbackSrc={fallbackSrc} fallbackStyle={fallbackStyle} />
                  </MagneticPolaroid>
                );
              }
              const label = (person.name || "").trim().split(" ")[0].toLowerCase() || (person.mine ? "you" : "them");
              return (
                <MagneticPolaroid
                  rotate={rotate} label={label} emoji={emoji}
                  editable={person.mine}
                  onClick={person.mine ? () => setEditing(true) : undefined}
                >
                  <PolaroidPhoto avatar={person.avatar} name={person.name} mine={person.mine} />
                </MagneticPolaroid>
              );
            };

            return (
              <>
                {slot(left, -6, "🩷", "/photos/her.jpg", { objectPosition:"center 30%" })}

                <motion.div
                  onHoverStart={() => setHeartTip(true)} onHoverEnd={() => setHeartTip(false)}
                  style={{
                    position:"relative",
                    fontSize:"clamp(3rem,6vw,5rem)", flexShrink:0, zIndex:10, cursor:"default",
                    filter:"drop-shadow(0 0 18px rgba(var(--pink-rgb),0.55))",
                  }}
                  animate={{
                    scale:[1,1.22,1,1.15,1],
                    filter:["drop-shadow(0 0 10px rgba(var(--pink-rgb),0.4))","drop-shadow(0 0 32px rgba(var(--pink-rgb),0.95))","drop-shadow(0 0 10px rgba(var(--pink-rgb),0.4))"],
                  }}
                  transition={{ repeat:Infinity, duration:1.5, ease:"easeInOut" }}
                >
                  💗
                  <CuteTooltip show={heartTip} placement="top" label={heartLabel} />
                </motion.div>

                {slot(right, 6, "🤍", "/photos/him.jpg", { objectPosition:"center 25%", transform:"scale(1.4)", transformOrigin:"center 25%" })}
              </>
            );
          })()}
        </motion.div>

        <motion.div
          initial={{ opacity:0, y:55 }}
          animate={{ opacity:1, y:0 }}
          transition={{ duration:1.1, delay:0.5, ease:[0.16,1,0.3,1] }}
          style={{ y:titleY, textAlign:"center", marginTop:"3.2rem", zIndex:10 }}
        >
          <motion.div
            style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"0.8rem", marginBottom:"1rem" }}
            initial={{ scaleX:0, opacity:0 }}
            animate={{ scaleX:1, opacity:1 }}
            transition={{ duration:0.9, delay:0.85 }}
          >
            <div style={{ width:55, height:1, background:"linear-gradient(90deg,transparent,var(--pink))" }} />
            <span style={{ fontSize:"0.9rem", color:"var(--pink)" }}>✦</span>
            <div style={{ width:55, height:1, background:"linear-gradient(90deg,var(--pink),transparent)" }} />
          </motion.div>

          <h1 style={{
            fontFamily:"var(--font-playfair)", fontSize:"clamp(2.1rem,5.5vw,3.6rem)",
            color:"var(--pink-deep)", margin:0, textShadow:"0 2px 28px rgba(var(--pink-rgb),0.2)",
          }}>
            {heroText}
          </h1>
          <motion.p
            style={{ fontFamily:"var(--font-caveat)", fontSize:"clamp(1.15rem,3vw,1.65rem)", color:"var(--muted)", marginTop:"0.6rem" }}
            initial={{ opacity:0 }} animate={{ opacity:1 }}
            transition={{ delay:1.05, duration:0.9 }}
          >
            and somehow every single day gets better than the last right? 💗
          </motion.p>

          <ScrollIndicator />
        </motion.div>
      </section>

      <AvatarEditor open={editing} onClose={() => setEditing(false)} currentUrl={userData?.avatarUrl ?? null} />
    </>
  );
}