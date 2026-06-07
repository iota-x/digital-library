"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CORRECT_PASSWORD = "meandjuhiyay"; // change this to whatever you want

const FLOATERS = ["🌸","💗","🩷","✨","🌷","💕","💫","🌙","⭐","🌸","💗","🩷"];

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [checked, setChecked] = useState(false);
  const [value, setValue] = useState("");
  const [shake, setShake] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("unlocked");
    if (stored === "yes") { setUnlocked(true); }
    setChecked(true);
  }, []);

  const attempt = () => {
    if (value.trim().toLowerCase() === CORRECT_PASSWORD) {
      setSuccess(true);
      sessionStorage.setItem("unlocked", "yes");
      setTimeout(() => setUnlocked(true), 1200);
    } else {
      setShake(true);
      setWrong(true);
      setValue("");
      setTimeout(() => { setShake(false); setWrong(false); inputRef.current?.focus(); }, 700);
    }
  };

  if (!checked) return null;
  if (unlocked) return <>{children}</>;

  return (
    <AnimatePresence>
      <motion.div
        key="gate"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.8 }}
        style={{
          position: "fixed", inset: 0, zIndex: 99999,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg,#fff1f2 0%,#fce7f3 50%,#fdf2f8 100%)",
          overflow: "hidden",
          padding: "1.5rem",
        }}
      >
        {/* Falling floaters */}
        {FLOATERS.map((sym, i) => (
          <motion.span key={i} style={{
            position: "absolute",
            left: `${(i * 8.5) % 100}%`,
            top: -40, fontSize: `${14 + (i % 3) * 5}px`,
            pointerEvents: "none", userSelect: "none",
          }}
            animate={{ y: "110vh", rotate: 360, opacity: [0, 0.7, 0] }}
            transition={{ duration: 8 + i * 0.6, delay: i * 0.8, repeat: Infinity, ease: "linear" }}
          >
            {sym}
          </motion.span>
        ))}

        {/* Ambient glow orbs */}
        {[
          { l:"10%", t:"15%", w:300, c:"rgba(249,168,212,0.25)" },
          { l:"65%", t:"10%", w:250, c:"rgba(253,186,213,0.2)" },
          { l:"70%", t:"65%", w:280, c:"rgba(244,114,182,0.15)" },
          { l:"5%",  t:"65%", w:220, c:"rgba(251,207,232,0.22)" },
        ].map((o,i) => (
          <motion.div key={i} style={{
            position:"absolute", left:o.l, top:o.t,
            width:o.w, height:o.w, borderRadius:"50%",
            background:o.c, filter:"blur(50px)", pointerEvents:"none",
          }}
            animate={{ scale:[1,1.3,1], opacity:[0.5,0.9,0.5] }}
            transition={{ repeat:Infinity, duration:5+i, delay:i*1.2, ease:"easeInOut" }}
          />
        ))}

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16,1,0.3,1] }}
          style={{
            position: "relative", zIndex: 2,
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(249,168,212,0.4)",
            borderRadius: 24,
            padding: "clamp(2.5rem,6vw,3.5rem) clamp(2rem,5vw,3rem)",
            width: "100%", maxWidth: 420,
            boxShadow: "0 20px 60px rgba(244,114,182,0.18), 0 2px 8px rgba(0,0,0,0.06)",
            textAlign: "center",
          }}
        >
          {/* Heart */}
          <motion.div
            style={{ fontSize: "3.5rem", marginBottom: "1rem", display:"block",
              filter:"drop-shadow(0 0 16px rgba(244,114,182,0.7))" }}
            animate={{ scale:[1,1.2,1], rotate:[-6,6,-6] }}
            transition={{ repeat:Infinity, duration:2.2, ease:"easeInOut" }}
          >
            💗
          </motion.div>

          <h1 style={{
            fontFamily:"var(--font-playfair)", fontStyle:"italic",
            fontSize:"clamp(1.5rem,4vw,2rem)",
            color:"#be185d", margin:"0 0 0.5rem",
            textShadow:"0 2px 16px rgba(244,114,182,0.3)",
          }}>
            just for us 🌸
          </h1>
          <p style={{
            fontFamily:"var(--font-caveat)",
            fontSize:"clamp(1rem,3vw,1.2rem)",
            color:"#db2777", margin:"0 0 2rem",
            opacity: 0.75,
          }}>
            enter our little secret to get in 🩷
          </p>

          {/* Input */}
          <motion.div
            animate={shake ? { x:[-10,10,-8,8,-4,4,0] } : {}}
            transition={{ duration:0.5 }}
            style={{ position:"relative", marginBottom:"1.2rem" }}
          >
            <input
              ref={inputRef}
              type="password"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && attempt()}
              placeholder="our secret…"
              autoComplete="off"
              style={{
                width: "100%",
                padding: "0.85rem 1.2rem",
                borderRadius: 50,
                border: `2px solid ${wrong ? "#f43f5e" : "rgba(249,168,212,0.6)"}`,
                outline: "none",
                background: "rgba(255,255,255,0.8)",
                fontFamily: "var(--font-caveat)",
                fontSize: "1.2rem",
                color: "#7c3f58",
                textAlign: "center",
                letterSpacing: "0.15em",
                transition: "border-color 0.3s",
                boxSizing: "border-box",
              }}
            />
            {wrong && (
              <motion.p
                initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
                style={{ fontFamily:"var(--font-caveat)", color:"#f43f5e",
                  fontSize:"0.95rem", margin:"0.5rem 0 0" }}
              >
                hmm that's not right 🥺 try again?
              </motion.p>
            )}
          </motion.div>

          {/* Button */}
          <motion.button
            onClick={attempt}
            whileHover={{ scale:1.05 }}
            whileTap={{ scale:0.97 }}
            style={{
              width: "100%",
              padding: "0.9rem",
              borderRadius: 50,
              border: "none",
              background: success
                ? "linear-gradient(135deg,#86efac,#4ade80)"
                : "linear-gradient(135deg,#f9a8d4,#ec4899)",
              color: "#fff",
              fontFamily: "var(--font-caveat)",
              fontSize: "1.2rem",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(236,72,153,0.35)",
              transition: "background 0.4s",
              letterSpacing:"0.05em",
            }}
          >
            {success ? "opening… 💗" : "enter 🌸"}
          </motion.button>

          <p style={{
            fontFamily:"var(--font-caveat)", fontSize:"0.9rem",
            color:"rgba(190,24,93,0.4)", marginTop:"1.5rem",
          }}>
            made with 💗 for you
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}