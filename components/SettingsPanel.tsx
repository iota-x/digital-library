"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserData, updateSettings, updateUserData } from "@/lib/userStore";
import { THEMES, DEFAULT_SETTINGS, type CoupleSettings } from "@/lib/themes";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";
import { publicEnv } from "@/lib/env";

const VAPID_PUBLIC = publicEnv.VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

const ALL_THEME_CLASSES = THEMES.map(t => `theme-${t.id}`);

function applyThemeClass(themeId: string) {
  const root = document.documentElement;
  root.classList.remove(...ALL_THEME_CLASSES);
  if (themeId !== "pink") root.classList.add(`theme-${themeId}`);
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{
      width: 42, height: 23, borderRadius: 12, flexShrink: 0,
      background: on ? "var(--pink-deep)" : "var(--pink-light)",
      border: on ? "none" : "1px solid var(--pink-mid)",
      cursor: "pointer", transition: "background .2s", position: "relative",
    }}>
      <div style={{
        position: "absolute", width: 19, height: 19, borderRadius: "50%",
        background: "#fff", top: on ? 2 : 1,
        left: on ? 21 : 2,
        transition: "left .2s",
        boxShadow: "0 1px 4px rgba(0,0,0,.22)",
      }} />
    </div>
  );
}

function SectionRow({ label, on, onChange }: { label: string; on: boolean; onChange: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.55rem 0" }}>
      <span style={{ fontFamily: SANS, fontSize: "0.88rem", color: "var(--text)", opacity: on ? 1 : 0.45 }}>{label}</span>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: SANS, fontSize: "0.62rem", letterSpacing: "0.16em", textTransform: "uppercase",
      color: "var(--pink-deep)", margin: "1.2rem 0 0.3rem", fontWeight: 700 }}>
      {children}
    </p>
  );
}

interface Props { open: boolean; onClose: () => void; }

export default function SettingsPanel({ open, onClose }: Props) {
  const user = useUserData();
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [draft,   setDraft]   = useState<CoupleSettings>(DEFAULT_SETTINGS);
  const [startDate,   setStartDate]   = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [noteInput,   setNoteInput]   = useState("");

  const originalThemeRef = useRef("pink");
  const didSaveRef       = useRef(false);
  const initialDraftRef  = useRef<string>("");
  const initialDateRef   = useRef<string>("");
  // True when the draft differs from what was last loaded — drives the save-button glow
  const dirty = JSON.stringify(draft) !== initialDraftRef.current || startDate !== initialDateRef.current;

  // Reset save-tracking + check push status when panel opens
  useEffect(() => {
    if (open) {
      setSaveErr("");
      didSaveRef.current = false;
      // Check current push subscription state
      if ("serviceWorker" in navigator && "PushManager" in window) {
        navigator.serviceWorker.ready.then(reg =>
          reg.pushManager.getSubscription().then(sub => setPushEnabled(!!sub))
        ).catch(() => {});
      }
    }
  }, [open]);

  // Sync draft whenever the panel is open and settings/startDate change
  useEffect(() => {
    if (open && user?.settings) {
      const merged: CoupleSettings = {
        ...DEFAULT_SETTINGS, ...user.settings,
        loveNotes:   user.settings.loveNotes?.length   ? user.settings.loveNotes   : DEFAULT_SETTINGS.loveNotes,
        memoryCards: user.settings.memoryCards?.length ? user.settings.memoryCards : DEFAULT_SETTINGS.memoryCards,
        sections: {
          ...DEFAULT_SETTINGS.sections, ...user.settings.sections,
          home:    { ...DEFAULT_SETTINGS.sections.home,    ...user.settings.sections?.home },
          journal: { ...DEFAULT_SETTINGS.sections.journal, ...user.settings.sections?.journal },
          shared:  { ...DEFAULT_SETTINGS.sections.shared,  ...user.settings.sections?.shared },
        },
      };
      setDraft(merged);
      setStartDate(user.startDate ?? "");
      initialDraftRef.current = JSON.stringify(merged);
      initialDateRef.current  = user.startDate ?? "";
      // Only update originalTheme from server data when we haven't saved yet
      if (!didSaveRef.current) {
        originalThemeRef.current = user.settings.theme ?? "pink";
      }
    }
  }, [open, user?.settings, user?.startDate]);

  // When panel closes without saving, revert the live preview to the real saved theme
  useEffect(() => {
    if (!open) {
      if (!didSaveRef.current) {
        applyThemeClass(originalThemeRef.current);
      }
    }
  }, [open]);

  const set = <K extends keyof CoupleSettings>(key: K, val: CoupleSettings[K]) =>
    setDraft(d => ({ ...d, [key]: val }));

  const setSec = (page: keyof CoupleSettings["sections"], key: string, val: boolean) =>
    setDraft(d => ({ ...d, sections: { ...d.sections, [page]: { ...d.sections[page], [key]: val } } }));

  // Live theme preview — applies instantly without saving
  const handleThemeClick = useCallback((themeId: string) => {
    set("theme", themeId);
    applyThemeClass(themeId);
  }, []);

  // Close without saving — effect above handles the revert
  const handleClose = useCallback(() => { onClose(); }, [onClose]);

  const addLoveNote = () => {
    const t = noteInput.trim();
    if (!t) return;
    set("loveNotes", [...(draft.loveNotes ?? []), t]);
    setNoteInput("");
  };

  const removeLoveNote = (i: number) => {
    set("loveNotes", draft.loveNotes.filter((_, idx) => idx !== i));
  };

  const togglePush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (pushEnabled) {
        const sub = await reg.pushManager.getSubscription();
        await sub?.unsubscribe();
        await fetch("/api/push/subscribe", { method: "DELETE" });
        setPushEnabled(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") { setPushLoading(false); return; }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        });
        setPushEnabled(true);
      }
    } catch {}
    setPushLoading(false);
  };

  const resetToDefaults = () => {
    const reset: CoupleSettings = {
      ...DEFAULT_SETTINGS,
      coupleName: draft.coupleName,
      spotifyPlaylistId: draft.spotifyPlaylistId,
      loveNotes: draft.loveNotes,
      memoryCards: draft.memoryCards,
    };
    setDraft(reset);
    applyThemeClass(DEFAULT_SETTINGS.theme);
  };

  const save = async () => {
    setSaving(true);
    setSaveErr("");
    try {
      const res = await fetch("/api/couples/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: draft, startDate: startDate || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSaveErr(body?.error ?? `server error (${res.status})`);
        return;
      }
      try { localStorage.setItem("ann_color_theme", draft.theme); } catch {}
      updateSettings(draft);
      if (startDate) updateUserData({ startDate });
      // Mark save as done so the close effect does NOT revert the preview
      didSaveRef.current = true;
      originalThemeRef.current = draft.theme;
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1000);
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "network error — try again");
    } finally {
      setSaving(false);
    }
  };

  const s = draft.sections;
  const spotifyId = draft.spotifyPlaylistId.trim();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: "fixed", inset: 0, zIndex: 8500, background: "rgba(4,0,8,.45)", backdropFilter: "blur(4px)" }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 8501,
              width: "min(420px, 100vw)",
              background: "var(--cream)",
              boxShadow: "-8px 0 60px rgba(0,0,0,.2)",
              display: "flex", flexDirection: "column",
              overflowY: "auto",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "1.4rem 1.6rem 1rem",
              borderBottom: "1px solid rgba(var(--pink-mid-rgb,251,207,232),.35)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              position: "sticky", top: 0, background: "var(--cream)", zIndex: 1,
            }}>
              <div>
                <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1.4rem", color: "var(--pink-deep)", margin: 0 }}>
                  customize your space
                </h2>
                <p style={{ fontFamily: SCRIPT, fontSize: "0.95rem", color: "var(--muted)", margin: "0.1rem 0 0" }}>
                  make it yours 🌸
                </p>
              </div>
              <motion.button onClick={handleClose} whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
                style={{
                  background: "var(--pink-light)", border: "1px solid var(--pink-mid)",
                  borderRadius: "50%", width: 34, height: 34, cursor: "pointer",
                  color: "var(--pink-deep)", fontSize: "0.9rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                ✕
              </motion.button>
            </div>

            {/* Body */}
            <div style={{ padding: "0 1.6rem 7rem", flex: 1 }}>

              {/* ─── Colour theme ─── */}
              <GroupLabel>🎨 colour theme</GroupLabel>
              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", margin: "0.2rem 0 0.6rem", lineHeight: 1.5 }}>
                Tap a swatch to preview instantly — save to keep it.
              </p>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                {THEMES.map(t => {
                  const active = draft.theme === t.id;
                  return (
                    <motion.button key={t.id} onClick={() => handleThemeClick(t.id)}
                      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                      title={t.name}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem",
                        background: "none", border: "none", cursor: "pointer", padding: "0.2rem",
                      }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: "50%",
                        background: t.swatch,
                        boxShadow: active
                          ? `0 0 0 3px ${t.swatch}55, 0 0 0 5px ${t.swatch}`
                          : "0 2px 8px rgba(0,0,0,.15)",
                        transition: "box-shadow .2s",
                      }} />
                      <span style={{ fontFamily: SANS, fontSize: "0.62rem", color: "var(--muted)", fontWeight: active ? 700 : 400 }}>
                        {t.emoji} {t.name}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* ─── Couple name ─── */}
              <GroupLabel>💑 couple name</GroupLabel>
              <input
                value={draft.coupleName}
                onChange={e => set("coupleName", e.target.value)}
                placeholder={user ? `${user.name} & ${user.partnerName ?? "partner"}` : "your couple name"}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "0.7rem 1rem", borderRadius: 10, marginTop: "0.4rem",
                  border: "1.5px solid var(--pink-mid)", outline: "none",
                  background: "rgba(255,255,255,.7)", fontFamily: SCRIPT, fontSize: "1rem",
                  color: "var(--text)", caretColor: "var(--pink-deep)",
                }}
              />

              {/* ─── Relationship start date ─── */}
              <GroupLabel>📅 relationship start date</GroupLabel>
              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", margin: "0.2rem 0 0.5rem", lineHeight: 1.5 }}>
                The day the timer starts counting from.
              </p>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "0.7rem 1rem", borderRadius: 10,
                  border: "1.5px solid var(--pink-mid)", outline: "none",
                  background: "rgba(255,255,255,.7)", fontFamily: SANS, fontSize: "0.92rem",
                  color: "var(--text)", caretColor: "var(--pink-deep)",
                }}
              />

              {/* ─── Home page sections ─── */}
              <GroupLabel>🏠 home page</GroupLabel>
              <div style={{ background: "rgba(255,255,255,.6)", borderRadius: 12, padding: "0.2rem 1rem", border: "1px solid rgba(var(--pink-mid-rgb,251,207,232),.25)" }}>
                <SectionRow label="⏱ Live timer"       on={s.home.showTimer}         onChange={() => setSec("home","showTimer",!s.home.showTimer)}/>
                <SectionRow label="💌 Memory cards"    on={s.home.showMemoryCards}   onChange={() => setSec("home","showMemoryCards",!s.home.showMemoryCards)}/>
                <SectionRow label="🎙 Voice notes"     on={s.home.showVoiceNotes}    onChange={() => setSec("home","showVoiceNotes",!s.home.showVoiceNotes)}/>
                <SectionRow label="🔒 Capsule teaser"  on={s.home.showCapsuleTeaser} onChange={() => setSec("home","showCapsuleTeaser",!s.home.showCapsuleTeaser)}/>
                <SectionRow label="📖 Love letters"    on={s.home.showFinal}         onChange={() => setSec("home","showFinal",!s.home.showFinal)}/>
              </div>

              {/* ─── Journal sections ─── */}
              <GroupLabel>📓 journal page</GroupLabel>
              <div style={{ background: "rgba(255,255,255,.6)", borderRadius: 12, padding: "0.2rem 1rem", border: "1px solid rgba(var(--pink-mid-rgb,251,207,232),.25)" }}>
                <SectionRow label="📅 Anniversary banner" on={s.journal.showAnniversaryBanner} onChange={() => setSec("journal","showAnniversaryBanner",!s.journal.showAnniversaryBanner)}/>
                <SectionRow label="🔥 Streak tracker"     on={s.journal.showStreak}             onChange={() => setSec("journal","showStreak",!s.journal.showStreak)}/>
                <SectionRow label="✨ Surprise me"        on={s.journal.showSurpriseMe}         onChange={() => setSec("journal","showSurpriseMe",!s.journal.showSurpriseMe)}/>
                <SectionRow label="📊 Monthly recap"      on={s.journal.showMonthlyRecap}       onChange={() => setSec("journal","showMonthlyRecap",!s.journal.showMonthlyRecap)}/>
              </div>

              {/* ─── Shared sections ─── */}
              <GroupLabel>🌍 shared page</GroupLabel>
              <div style={{ background: "rgba(255,255,255,.6)", borderRadius: 12, padding: "0.2rem 1rem", border: "1px solid rgba(var(--pink-mid-rgb,251,207,232),.25)" }}>
                <SectionRow label="📝 Bucket list" on={s.shared.showBucketList} onChange={() => setSec("shared","showBucketList",!s.shared.showBucketList)}/>
                <SectionRow label="🎵 Spotify"     on={s.shared.showSpotify}    onChange={() => setSec("shared","showSpotify",!s.shared.showSpotify)}/>
                <SectionRow label="🎬 Watchlist"   on={s.shared.showWatchlist}  onChange={() => setSec("shared","showWatchlist",!s.shared.showWatchlist)}/>
              </div>

              {/* ─── Spotify playlist ─── */}
              <GroupLabel>🎵 spotify playlist</GroupLabel>
              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", margin: "0.3rem 0 0.5rem", lineHeight: 1.5 }}>
                Paste the playlist ID from the Spotify URL (after /playlist/).
              </p>
              <input
                value={draft.spotifyPlaylistId}
                onChange={e => set("spotifyPlaylistId", e.target.value.trim())}
                placeholder="41LuF5qeH9u3erSTc5LkPw"
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "0.7rem 1rem", borderRadius: 10,
                  border: "1.5px solid var(--pink-mid)", outline: "none",
                  background: "rgba(255,255,255,.7)", fontFamily: "monospace", fontSize: "0.82rem",
                  color: "var(--text)",
                }}
              />
              {spotifyId.length > 10 && (
                <iframe
                  key={spotifyId}
                  src={`https://open.spotify.com/embed/playlist/${spotifyId}?utm_source=generator&theme=0`}
                  width="100%" height="80"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  style={{ borderRadius: 12, marginTop: "0.6rem", display: "block" }}
                />
              )}

              {/* ─── Love notes ─── */}
              <GroupLabel>💌 love notes</GroupLabel>
              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", margin: "0.2rem 0 0.5rem", lineHeight: 1.5 }}>
                These float as sticky notes on the timer page (visible on wider screens).
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.6rem" }}>
                {(draft.loveNotes ?? []).map((note, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,.7)", border: "1px solid var(--pink-mid)", borderRadius: 10, padding: "0.45rem 0.8rem" }}>
                    <span style={{ flex: 1, fontFamily: SCRIPT, fontSize: "0.95rem", color: "var(--text)" }}>{note}</span>
                    <button onClick={() => removeLoveNote(i)} aria-label="remove love note" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "0.8rem", padding: "0 0.2rem" }}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addLoveNote()}
                  placeholder="add a note…"
                  style={{
                    flex: 1, padding: "0.6rem 0.9rem", borderRadius: 10,
                    border: "1.5px solid var(--pink-mid)", outline: "none",
                    background: "rgba(255,255,255,.7)", fontFamily: SCRIPT, fontSize: "0.95rem",
                    color: "var(--text)",
                  }}
                />
                <motion.button onClick={addLoveNote} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
                  style={{ padding: "0.6rem 1rem", borderRadius: 10, border: "none", background: "var(--pink-deep)", color: "#fff", cursor: "pointer", fontFamily: SANS, fontSize: "0.85rem" }}>
                  + add
                </motion.button>
              </div>

              {/* Memory cards now live as in-place editors on the home page.
                  (Tap any card to write your answer, ✕ to remove, + to add.) */}

              {/* ─── Push notifications ─── */}
              {"Notification" in window && (
                <>
                  <GroupLabel>🔔 push notifications</GroupLabel>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0" }}>
                    <div>
                      <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: "var(--text)", margin: 0 }}>
                        {pushEnabled ? "notifications on" : "notifications off"}
                      </p>
                      <p style={{ fontFamily: SANS, fontSize: "0.7rem", color: "var(--muted)", margin: "0.1rem 0 0" }}>
                        get notified when your partner adds a voice note
                      </p>
                    </div>
                    <Toggle on={pushEnabled} onChange={pushLoading ? () => {} : togglePush} />
                  </div>
                </>
              )}

              {/* ─── Reset ─── */}
              <GroupLabel>🔄 reset</GroupLabel>
              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", margin: "0.2rem 0 0.4rem", lineHeight: 1.5 }}>
                Resets theme and section toggles only. Couple name, Spotify ID, and love notes are kept.
              </p>
              <motion.button
                onClick={resetToDefaults}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                style={{
                  width: "100%", padding: "0.7rem", borderRadius: 10,
                  border: "1.5px solid var(--pink-mid)",
                  background: "rgba(255,255,255,.6)",
                  color: "var(--muted)", fontFamily: SANS, fontSize: "0.85rem",
                  cursor: "pointer",
                }}>
                reset sections &amp; theme to defaults
              </motion.button>
            </div>

            {/* Sticky save button */}
            <div style={{ position: "sticky", bottom: 0, background: "var(--cream)", padding: "1rem 1.6rem 1.4rem", borderTop: "1px solid rgba(var(--pink-mid-rgb,251,207,232),.25)" }}>
              {dirty && !saved && !saving && (
                <p style={{ fontFamily: SANS, fontSize: "0.74rem", color: "var(--pink-deep)", margin: "0 0 0.5rem", textAlign: "center" }}>
                  • unsaved changes
                </p>
              )}
              {saveErr && (
                <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: "#ef4444", marginBottom: "0.6rem", textAlign: "center" }}>
                  ⚠️ {saveErr}
                </p>
              )}
              <motion.button
                onClick={save} disabled={saving || (!dirty && !saved)}
                animate={dirty && !saved ? { scale: [1, 1.015, 1] } : { scale: 1 }}
                transition={dirty && !saved ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }}
                style={{
                  width: "100%", padding: "0.95rem", borderRadius: 50, border: "none",
                  background: saved
                    ? "linear-gradient(135deg,#86efac,#4ade80)"
                    : "linear-gradient(135deg,var(--pink),var(--pink-deep))",
                  color: "#fff", fontFamily: SCRIPT, fontSize: "1.15rem",
                  cursor: saving ? "wait" : !dirty && !saved ? "default" : "pointer",
                  boxShadow: dirty && !saved
                    ? "0 6px 28px rgba(var(--pink-deep-rgb,236,72,153),.45)"
                    : "0 4px 20px rgba(var(--pink-deep-rgb,236,72,153),.3)",
                  opacity: saving ? 0.75 : (!dirty && !saved ? 0.55 : 1),
                  transition: "background .3s, opacity .25s, box-shadow .25s",
                }}>
                {saved ? "saved! 💗" : saving ? "saving…" : dirty ? "save changes 🌸" : "all saved ✨"}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
