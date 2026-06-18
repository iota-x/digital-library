"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import LandingPage from "@/components/LandingPage";
import { fetchUserData, hydrateUserFromCache, setUser, useUserData, UserInfo } from "@/lib/userStore";
import { initCalendarStore, ensureRealtime } from "@/lib/calendarStore";

/** Soft, on-brand loading screen — shown only on a cold load with no cached
 *  session, so the page never looks like a broken blank white page. */
function GateLoading() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg,var(--rose) 0%,var(--pink-light) 50%,var(--rose) 100%)",
    }}>
      <motion.div
        aria-label="loading"
        animate={{ scale: [1, 1.18, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        style={{ fontSize: "2.6rem", filter: "drop-shadow(0 0 16px rgba(var(--pink-rgb),.55))" }}
      >💗</motion.div>
    </div>
  );
}

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const user = useUserData();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // 1) Paint instantly from the cached session (if any) — no network wait.
    hydrateUserFromCache();
    // 2) Revalidate in the background; correct the UI if the session changed.
    fetchUserData().then((u) => {
      // Open the shared realtime relay on every authenticated page load —
      // not just fresh logins — so presence / doodle / daily / watch-together
      // work even on routes that never fetch the calendar (e.g. /shared).
      if (u?.coupleId) ensureRealtime(u.coupleId);
      setChecked(true);
    });
  }, []);

  const enter = (u: UserInfo) => { setUser(u); initCalendarStore(u.coupleId); };

  // Signed in but email not confirmed — keep them on the verification screen
  // (it survives refreshes now, instead of silently dropping into the app).
  if (user && user.emailVerified === false) {
    return <LandingPage initialVerify={user} onSuccess={enter} />;
  }

  // Returning visitor: render their themed app immediately (optimistic). If the
  // background check later finds the session is gone, `user` flips to null and
  // we fall through to the landing page.
  if (user) return <>{children}</>;

  // No cached session yet and the check is still in flight — show a gentle
  // themed loader instead of a blank screen.
  if (!checked) return <GateLoading />;

  return <LandingPage onSuccess={enter} />;
}
