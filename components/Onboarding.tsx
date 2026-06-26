"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useUserData, updateSettings, updateUserData } from "@/lib/userStore";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";
import { THEMES, DEFAULT_SETTINGS } from "@/lib/themes";
import AvatarEditor from "@/components/AvatarEditor";


const STORAGE_KEY = "ann_onboarded_v1";

interface Step {
  emoji: string;
  title: string;
  body: string;
  cta: string;
  /** Optional in-app navigation triggered by the CTA. */
  go?: string;
  /** Optional broadcast event the CTA should dispatch (e.g. opens settings panel). */
  dispatch?: string;
  /** When set, the CTA opens the avatar editor instead of navigating. */
  avatar?: boolean;
  /** When set, the step renders the name/anniversary/theme setup form. */
  setup?: boolean;
}

const STEPS: Step[] = [
  {
    emoji: "💞",
    title: "make this yours",
    body: "Two quick things so it feels like home from the start — you can change everything later.",
    cta: "continue",
    setup: true,
  },
  {
    emoji: "📸",
    title: "add your photo",
    body: "Pick a picture for your polaroid on the home screen — your partner sees it too. You can re-crop or change it anytime by tapping your polaroid.",
    cta: "choose photo",
    avatar: true,
  },
  {
    emoji: "💌",
    title: "write your first letter",
    body: "Sealed letters unlock on a date you choose. Birthdays, anniversaries, just-because days.",
    cta: "open capsule",
    go: "/capsule",
  },
  {
    emoji: "📅",
    title: "add your first memory",
    body: "Drop a note, a photo, or a voice clip on any day. The calendar fills itself with your story.",
    cta: "open journal",
    go: "/journal",
  },
  {
    emoji: "🎨",
    title: "make it yours",
    body: "Pick a theme, name your space, add love notes that float around. It's your little world.",
    cta: "customize",
    dispatch: "annapp:settings",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const user = useUserData();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  // Setup-step fields (couple name / anniversary / theme).
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [themeId, setThemeId] = useState("pink");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.settings?.coupleName ?? "");
    setThemeId(user.settings?.theme ?? "pink");
    setStartDate(user.startDate ?? "");
  }, [user]);

  // Live-preview a built-in theme while picking it in setup.
  const previewTheme = (id: string) => {
    setThemeId(id);
    const root = document.documentElement;
    THEMES.forEach(t => root.classList.remove(`theme-${t.id}`));
    if (id !== "pink") root.classList.add(`theme-${id}`);
  };

  // Persist the setup fields (best-effort; local store updates immediately).
  const saveSetup = () => {
    const settings = { ...(user?.settings ?? DEFAULT_SETTINGS), coupleName: name.trim(), theme: themeId };
    updateSettings(settings);
    if (startDate) updateUserData({ startDate });
    try {
      fetch("/api/couples/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings, startDate: startDate || undefined }),
      }).catch(() => {});
    } catch {}
  };
  // Don't trap focus in the onboarding card while the avatar editor (a nested
  // dialog) is open — it runs its own trap.
  useFocusTrap(dialogRef, { active: visible && !avatarOpen, onEscape: () => setVisible(false) });

  useEffect(() => {
    if (!user) return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {}
    // Only show for accounts that just registered (zero data) — heuristic via
    // localStorage flag set by LandingPage after onSuccess. If absent, we still
    // show once on first session after this code ships.
    setVisible(true);
  }, [user]);

  const done = (skip = false) => {
    try { localStorage.setItem(STORAGE_KEY, skip ? "skipped" : "done"); } catch {}
    setVisible(false);
  };

  const cur = STEPS[step];
  const next = () => {
    if (step + 1 < STEPS.length) setStep(s => s + 1);
    else done();
  };

  const act = () => {
    // Setup step: save name/anniversary/theme, then advance.
    if (cur.setup) { saveSetup(); next(); return; }
    // Avatar step opens the editor in place and keeps onboarding open so the
    // user can continue to the next step afterward.
    if (cur.avatar) { setAvatarOpen(true); return; }
    if (cur.dispatch) window.dispatchEvent(new Event(cur.dispatch));
    if (cur.go) router.push(cur.go);
    done();
  };

  return (
    <AnimatePresence>
      {visible && cur && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 9970, background: "rgba(0,0,0,.55)", WebkitBackdropFilter: "blur(8px)", backdropFilter: "blur(8px)" }}
          />
          <motion.div
            key={step}
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            role="dialog" aria-modal="true" aria-labelledby="onboard-title" aria-describedby="onboard-body"
            className="mobile-sheet"
            style={{
              position: "fixed", zIndex: 9971,
              top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              width: "min(440px, 92vw)",
              // Never exceed the viewport — on short/desktop screens the taller
              // steps (setup form) otherwise ran off-screen, forcing a zoom-out
              // to reach the buttons. Cap the height and scroll inside instead.
              maxHeight: "calc(100dvh - 2rem)",
              overflowY: "auto",
              background: "var(--cream)",
              border: "1.5px solid var(--pink-mid)",
              borderRadius: 24, padding: "2rem 1.7rem 1.7rem",
              textAlign: "center",
              boxShadow: "0 32px 80px rgba(var(--pink-deep-rgb),.3)",
            }}
          >
            <p style={{ fontFamily: SANS, fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--muted)", margin: "0 0 0.6rem", fontWeight: 700 }}>
              step {step + 1} of {STEPS.length}
            </p>
            <motion.div
              key={step + "-emoji"}
              initial={{ scale: 0.7, rotate: -8 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              style={{ fontSize: "3.4rem", marginBottom: "0.5rem" }}
            >
              {cur.emoji}
            </motion.div>
            <h2 id="onboard-title" style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1.5rem", color: "var(--pink-deep)", margin: "0 0 0.5rem", fontWeight: 400 }}>
              {cur.title}
            </h2>
            <p id="onboard-body" style={{ fontFamily: SANS, fontSize: "0.92rem", color: "var(--text)", margin: "0 0 1.5rem", lineHeight: 1.55 }}>
              {cur.body}
            </p>

            {cur.setup && (
              <div style={{ textAlign: "left", margin: "0 0 1.4rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                <label style={{ display: "block" }}>
                  <span style={{ fontFamily: SANS, fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>what should we call your space?</span>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. us 🌸" maxLength={40}
                    style={{ width: "100%", boxSizing: "border-box", marginTop: "0.35rem", padding: "0.65rem 0.9rem", borderRadius: 10, outline: "none",
                      border: "1.5px solid var(--pink-mid)", background: "var(--pink-light)", fontFamily: SCRIPT, fontSize: "1.05rem", color: "var(--text)" }} />
                </label>
                <label style={{ display: "block" }}>
                  <span style={{ fontFamily: SANS, fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>when did your story start?</span>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} max={new Date().toISOString().slice(0, 10)}
                    style={{ width: "100%", boxSizing: "border-box", marginTop: "0.35rem", padding: "0.6rem 0.9rem", borderRadius: 10, outline: "none",
                      border: "1.5px solid var(--pink-mid)", background: "var(--pink-light)", fontFamily: SANS, fontSize: "0.9rem", color: "var(--text)" }} />
                </label>
                <div>
                  <span style={{ fontFamily: SANS, fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>pick a colour</span>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.45rem", flexWrap: "wrap" }}>
                    {THEMES.map(t => (
                      <button key={t.id} onClick={() => previewTheme(t.id)} title={t.name} aria-label={t.name}
                        style={{ width: 34, height: 34, borderRadius: "50%", cursor: "pointer", background: t.swatch, border: "none",
                          boxShadow: themeId === t.id ? `0 0 0 3px var(--cream), 0 0 0 5px ${t.swatch}` : "0 2px 6px rgba(0,0,0,.18)", transition: "box-shadow .15s" }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Progress dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem", marginBottom: "1.2rem" }}>
              {STEPS.map((_, i) => (
                <span key={i} style={{
                  width: i === step ? 22 : 8, height: 8, borderRadius: 50,
                  background: i === step ? "var(--pink-deep)" : "rgba(var(--pink-rgb),.3)",
                  transition: "all .25s",
                }} />
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <motion.button
                onClick={act}
                whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                style={{
                  fontFamily: SANS, fontSize: "0.95rem", fontWeight: 700, color: "#fff",
                  background: "linear-gradient(135deg,var(--pink),var(--pink-deep))",
                  border: "none", borderRadius: 50, padding: "0.8rem 1.6rem", cursor: "pointer",
                  boxShadow: "0 6px 22px rgba(var(--pink-deep-rgb),.32)",
                }}
              >
                {cur.cta}
              </motion.button>
              <button onClick={next}
                style={{
                  fontFamily: SCRIPT, fontSize: "1rem", color: "var(--muted)",
                  background: "none", border: "none", cursor: "pointer", padding: "0.3rem",
                }}>
                {step + 1 < STEPS.length ? "next →" : "all done ✨"}
              </button>
              {step === 0 && (
                <button onClick={() => done(true)}
                  style={{ fontFamily: SANS, fontSize: "0.75rem", color: "var(--muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", marginTop: "-0.2rem" }}>
                  skip — i'll explore on my own
                </button>
              )}
            </div>
          </motion.div>

          <AvatarEditor
            open={avatarOpen}
            onClose={() => { setAvatarOpen(false); next(); }}
            currentUrl={user?.avatarUrl ?? null}
          />
        </>
      )}
    </AnimatePresence>
  );
}
