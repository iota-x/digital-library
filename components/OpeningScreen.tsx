"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function OpeningScreen() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);
  const [dropped, setDropped] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Lock scroll while overlay is open
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => setDropped(true), 200);
    return () => clearTimeout(t);
  }, []);

  function handleOpen() {
    setVisible(false);
    document.body.style.overflow = "";
  }

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="overlay"
          exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(160deg, var(--rose) 0%, var(--pink-light) 50%, var(--rose) 100%)",
          }}
        >
          {/* Swaying thread */}
          <motion.div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              translateX: "-50%",
              width: 2,
              height: "10vh",
              background: "linear-gradient(to bottom, transparent, var(--pink))",
              transformOrigin: "top center",
            }}
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          />

          {/* Falling card */}
          <motion.div
            style={{ width: "90%", maxWidth: 560, padding: "0 1rem" }}
            initial={{ y: "-110vh", rotate: -8, opacity: 0 }}
            animate={dropped ? { y: 0, rotate: 0, opacity: 1 } : { y: "-110vh", rotate: -8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.1 }}
          >
            <div style={{
              background: "linear-gradient(145deg,var(--rose),var(--pink-light))",
              border: "2.5px solid var(--pink)",
              borderRadius: 32,
              padding: "clamp(2.5rem, 6vw, 4.5rem) clamp(2rem, 5vw, 4rem)",
              boxShadow: "0 32px 100px rgba(var(--pink-deep-rgb),.28)",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Corner hearts */}
              {[
                { top:12, left:16 }, { top:12, right:16 },
                { bottom:12, left:16 }, { bottom:12, right:16 },
              ].map((pos, i) => (
                <span key={i} style={{ position:"absolute", ...pos, fontSize:"1.3rem", opacity:.35 }}>🩷</span>
              ))}

              {/* Envelope */}
              <motion.div
                style={{ fontSize: "clamp(4rem,10vw,6rem)", display:"block", marginBottom:"1.2rem" }}
                animate={{ rotate: [-6, 6, -6] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                💌
              </motion.div>

              {/* Floating hearts */}
              <motion.div
                style={{ fontSize: "1.8rem", letterSpacing: "0.6rem", marginBottom: "1.5rem", display:"block" }}
                animate={{ y: [-5, 5, -5] }}
                transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
              >
                🌸 💗 🌸
              </motion.div>

              <h2 style={{
                fontFamily: "var(--font-playfair)",
                fontSize: "clamp(1.7rem, 4vw, 2.5rem)",
                color: "var(--pink-deep)",
                marginBottom: "1.2rem",
                lineHeight: 1.35,
              }}>
                a little something,<br />
                made with <em>way</em> too much love ❤️
              </h2>

              <p style={{
                fontFamily: "var(--font-caveat)",
                fontSize: "clamp(1.1rem, 2.5vw, 1.45rem)",
                color: "var(--muted)",
                lineHeight: 1.7,
                marginBottom: "2.5rem",
                maxWidth: 400,
                margin: "0 auto 2.5rem",
              }}>
                for the most special person in my whole entire world — that&apos;s you.
                <br />
                i made this just for you. every pixel, every word. all you. 
                p.s i just hope you don't find this cringe  😭🩷
              </p>

              <motion.button
                whileHover={{ scale: 1.06, y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleOpen}
                style={{
                  fontFamily: "var(--font-caveat)",
                  fontSize: "clamp(1.15rem, 2.5vw, 1.5rem)",
                  color: "#fff",
                  background: "linear-gradient(135deg, var(--pink), var(--pink-deep))",
                  border: "none",
                  borderRadius: 50,
                  padding: "1rem 3.5rem",
                  cursor: "pointer",
                  boxShadow: "0 8px 30px rgba(var(--pink-deep-rgb),.42)",
                  letterSpacing: "0.03em",
                }}
              >
                open your surprise 💌
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}