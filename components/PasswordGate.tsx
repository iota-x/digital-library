"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import LandingPage from "@/components/LandingPage";
import UnlockModal from "@/components/UnlockModal";
import { fetchUserData, hydrateUserFromCache, setUser, useUserData, getServerKeys, UserInfo } from "@/lib/userStore";
import { initCalendarStore, ensureRealtime } from "@/lib/calendarStore";
import { hasKeys } from "@/lib/crypto";
import { maybeGrantToPartner } from "@/lib/e2ee";
import { installCryptoFetch } from "@/lib/cryptoFetch";
import { runMigrationIfNeeded } from "@/lib/migrate";

// Install the transparent encrypt/decrypt fetch interceptor as early as possible
// on the client — before any content endpoint is hit.
installCryptoFetch();

/** Soft, on-brand loading screen — shown only on a cold load with no cached
 *  session, so the page never looks like a broken blank white page. */
function GateLoading() {
  return (
    <div style={{
      minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
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
  // E2EE unlock state: null = still determining, true = keys ready (or no E2EE),
  // false = session valid but content locked (needs the password to unlock).
  const [keysReady, setKeysReady] = useState<boolean | null>(null);

  useEffect(() => {
    // 1) Paint instantly from the cached session (if any) — no network wait.
    hydrateUserFromCache();
    // Fast path: keys already in this tab's session → unlocked.
    hasKeys().then((has) => { if (has) setKeysReady(true); });
    // 2) Revalidate in the background; correct the UI if the session changed.
    fetchUserData().then(async (u) => {
      // Open the shared realtime relay on every authenticated page load —
      // not just fresh logins — so presence / doodle / daily / watch-together
      // work even on routes that never fetch the calendar (e.g. /shared).
      if (u?.coupleId) ensureRealtime(u.coupleId);
      setChecked(true);
      if (!u || !getServerKeys()) { setKeysReady(true); return; } // logged out, or legacy non-E2EE account
      if (await hasKeys()) {
        setKeysReady(true);
        void maybeGrantToPartner(); // fulfil a partner's pending recovery, if any
      } else {
        setKeysReady(false); // locked — show the unlock prompt
      }
    });
  }, []);

  const enter = (u: UserInfo) => { setUser(u); initCalendarStore(u.coupleId); setKeysReady(true); };

  // Once keys are loaded, upgrade any pre-encryption plaintext content to E2EE
  // (one-time per couple/device). Safe to call on every authenticated load.
  useEffect(() => {
    if (keysReady === true && user?.coupleId) void runMigrationIfNeeded(user.coupleId);
  }, [keysReady, user?.coupleId]);

  // Signed in but email not confirmed — keep them on the verification screen
  // (it survives refreshes now, instead of silently dropping into the app).
  if (user && user.emailVerified === false) {
    return <LandingPage initialVerify={user} onSuccess={enter} />;
  }

  if (user) {
    // Session valid but content locked → ask for the password to unlock keys.
    if (keysReady === false) {
      const sk = getServerKeys();
      if (sk) return <UnlockModal serverKeys={sk} onUnlocked={() => setKeysReady(true)} />;
    }
    // Still determining lock state on a cold load → gentle loader, so we never
    // flash undecryptable content before the keys are ready.
    if (keysReady === null) return <GateLoading />;
    // Returning visitor: render their themed app. If the background check later
    // finds the session is gone, `user` flips to null → landing page.
    return <>{children}</>;
  }

  // No cached session yet and the check is still in flight — show a gentle
  // themed loader instead of a blank screen.
  if (!checked) return <GateLoading />;

  return <LandingPage onSuccess={enter} />;
}
