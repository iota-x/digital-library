"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserData } from "@/lib/userStore";
import { usePartnerPresence } from "@/lib/presenceStore";
import DoodleCanvas from "@/components/DoodleCanvas";
import { SANS } from "@/lib/typography";
import { buzz, heartBump } from "@/lib/haptics";

/**
 * "Here together" mode.
 *
 * When the shared presence store reports the partner is online right now, a
 * warm banner slides in celebrating the overlap and offering the live shared
 * doodle. A small pencil FAB keeps the doodle reachable any time (so you can
 * leave a drawing for them to find later, too).
 */
export default function TogetherMode() {
  const user = useUserData();
  const partner = usePartnerPresence();
  const [doodleOpen, setDoodleOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const celebrated = useRef(false);

  // Celebrate the *transition* into togetherness (rising edge), then keep the
  // banner up while both are online; let it dismiss when the partner goes quiet.
  useEffect(() => {
    if (partner.online) {
      setShowBanner(true);
      if (!celebrated.current) {
        celebrated.current = true;
        heartBump();
        buzz("double");
      }
    } else {
      celebrated.current = false;
      setShowBanner(false);
    }
  }, [partner.online]);

  // Allow other UI to open the doodle via a window event.
  useEffect(() => {
    const open = () => setDoodleOpen(true);
    window.addEventListener("annapp:doodle-open", open);
    return () => window.removeEventListener("annapp:doodle-open", open);
  }, []);

  if (!user?.partnerName) return null;

  return (
    <>
      {/* "Both here" banner */}
      <AnimatePresence>
        {showBanner && !doodleOpen && (
          <motion.div
            key="together-banner"
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            style={{
              position: "fixed",
              top: "max(0.7rem, env(safe-area-inset-top))",
              left: "50%", transform: "translateX(-50%)",
              zIndex: 940,
              display: "flex", alignItems: "center", gap: "0.6rem",
              background: "linear-gradient(135deg, var(--pink), var(--pink-deep))",
              color: "#fff", borderRadius: 50,
              padding: "0.4rem 0.5rem 0.4rem 0.95rem",
              boxShadow: "0 10px 30px rgba(var(--pink-deep-rgb), .4)",
              maxWidth: "calc(100vw - 1.5rem)",
            }}
          >
            <span aria-hidden style={{
              width: 8, height: 8, borderRadius: "50%", background: "#fff",
              boxShadow: "0 0 0 4px rgba(255,255,255,.35)",
              animation: "ann-presence-pulse 2s ease-in-out infinite",
            }} />
            <span style={{ fontFamily: SANS, fontSize: "0.78rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              you&apos;re both here 💞
            </span>
            <button
              onClick={() => setDoodleOpen(true)}
              style={{
                fontFamily: SANS, fontSize: "0.74rem", fontWeight: 700, color: "var(--pink-deep)",
                background: "#fff", border: "none", borderRadius: 50,
                padding: "0.32rem 0.85rem", cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              draw together ✏️
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent doodle FAB — bottom-left so it clears the heart button
          (bottom-right) and the mobile tab bar. */}
      <motion.button
        onClick={() => setDoodleOpen(true)}
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
        aria-label="open shared doodle"
        style={{
          position: "fixed",
          left: "max(1rem, env(safe-area-inset-left))",
          bottom: "calc(max(1rem, env(safe-area-inset-bottom)) + 78px)",
          zIndex: 935,
          width: 50, height: 50, borderRadius: "50%",
          border: "1.5px solid rgba(var(--pink-rgb), .5)",
          background: "var(--cream)",
          fontSize: "1.3rem", cursor: "pointer",
          boxShadow: "0 8px 24px rgba(var(--pink-deep-rgb), .25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        🎨
        {partner.online && (
          <span aria-hidden style={{
            position: "absolute", top: 2, right: 2, width: 11, height: 11,
            borderRadius: "50%", background: "#34d399", border: "2px solid var(--cream)",
          }} />
        )}
      </motion.button>

      <DoodleCanvas open={doodleOpen} onClose={() => setDoodleOpen(false)} />
    </>
  );
}
