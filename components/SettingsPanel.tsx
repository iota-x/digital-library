"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserData, updateSettings, updateUserData } from "@/lib/userStore";
import { THEMES, GRADIENT_THEMES, DEFAULT_SETTINGS, type CoupleSettings } from "@/lib/themes";
import { resolvePlaylistId } from "@/lib/spotify";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";
import { publicEnv } from "@/lib/env";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { applyAccent, isValidHex } from "@/lib/themeColor";
import { cldImg } from "@/lib/cldImg";
import { exportMediaZip, type ExportProgress } from "@/lib/exportMedia";
import AvatarEditor from "@/components/AvatarEditor";
import Tip from "@/components/Tip";

const VAPID_PUBLIC = publicEnv.VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

const ALL_THEME_CLASSES = THEMES.map(t => `theme-${t.id}`);

/** Accept a full Spotify link, a spotify: URI, or a bare ID and return just the
 *  playlist ID. e.g. https://open.spotify.com/playlist/41Lu…?si=abc → 41Lu… */
function parseSpotifyPlaylistId(input: string): string {
  let v = input.trim();
  if (v.includes("playlist:")) v = v.split("playlist:").pop() ?? v;   // spotify:playlist:ID
  else if (v.includes("/playlist/")) v = v.split("/playlist/").pop() ?? v; // open.spotify.com/playlist/ID
  // Drop any ?si=… query, #fragment, or trailing path.
  return v.split("?")[0].split("#")[0].split("/")[0].trim();
}

function applyThemeClass(themeId: string) {
  const root = document.documentElement;
  root.classList.remove(...ALL_THEME_CLASSES);
  if (themeId !== "pink") root.classList.add(`theme-${themeId}`);
}

/** Shared style for the small hex text inputs; turns the border red on an
 *  incomplete/invalid value. */
function hexFieldStyle(raw: string): React.CSSProperties {
  const t = raw.trim();
  const norm = t && !t.startsWith("#") ? `#${t}` : t;
  const bad = !!t && !isValidHex(norm);
  return {
    width: 84, boxSizing: "border-box",
    padding: "0.4rem 0.55rem", borderRadius: 8,
    border: `1.5px solid ${bad ? "#ef4444" : "rgba(var(--pink-mid-rgb,249,168,212),.5)"}`,
    background: "rgba(var(--pink-light-rgb,252,231,243),.4)",
    color: "var(--pink-deep)", fontFamily: "var(--font-lato),monospace", fontSize: "0.78rem", fontWeight: 600,
    letterSpacing: "0.03em", textTransform: "lowercase", outline: "none",
  };
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

interface Props { open: boolean; onClose: () => void; focusField?: string | null }

export default function SettingsPanel({ open, onClose, focusField }: Props) {
  const user = useUserData();
  const spotifyInputRef = useRef<HTMLInputElement>(null);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [draft,   setDraft]   = useState<CoupleSettings>(DEFAULT_SETTINGS);
  const [startDate,   setStartDate]   = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushErr,     setPushErr]     = useState("");
  const [noteInput,   setNoteInput]   = useState("");
  const [avatarOpen,  setAvatarOpen]  = useState(false);
  const [zipBusy,     setZipBusy]     = useState(false);
  const [zipProgress, setZipProgress] = useState<ExportProgress | null>(null);
  const [zipErr,      setZipErr]      = useState("");
  const [migrateBusy, setMigrateBusy] = useState(false);
  const [migrateMsg,  setMigrateMsg]  = useState("");
  // Raw text in the hex fields — kept separate so partially-typed values (e.g.
  // "#99") don't get reverted while applying only completed, valid hexes.
  // hexInput = primary accent; hexInput2 = optional gradient partner colour.
  const [hexInput,    setHexInput]    = useState("");
  const [hexInput2,   setHexInput2]   = useState("");

  const originalThemeRef  = useRef("pink");
  const originalAccentRef = useRef("");
  const didSaveRef       = useRef(false);
  const initialDraftRef  = useRef<string>("");
  const initialDateRef   = useRef<string>("");
  // True when the draft differs from what was last loaded — drives the save-button glow
  const dirty = JSON.stringify(draft) !== initialDraftRef.current || startDate !== initialDateRef.current;

  // When opened with a focus target (e.g. the "add a playlist" prompt), scroll
  // that field into view and focus it once the open animation has settled.
  useEffect(() => {
    if (!open || focusField !== "spotify") return;
    const t = setTimeout(() => {
      const el = spotifyInputRef.current;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
    }, 360);
    return () => clearTimeout(t);
  }, [open, focusField]);

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
        // Don't pre-fill (and risk re-saving) the original couple's leaked
        // playlist for anyone else — leave it blank so they paste their own.
        spotifyPlaylistId: resolvePlaylistId(user.settings.spotifyPlaylistId, user.name, user.partnerName),
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
      setHexInput(merged.customAccent ?? "");
      setHexInput2(merged.customAccent2 ?? "");
      setStartDate(user.startDate ?? "");
      initialDraftRef.current = JSON.stringify(merged);
      initialDateRef.current  = user.startDate ?? "";
      // Only update originalTheme from server data when we haven't saved yet
      if (!didSaveRef.current) {
        originalThemeRef.current = user.settings.theme ?? "pink";
        originalAccentRef.current = user.settings.customAccent ?? "";
      }
    }
  }, [open, user?.settings, user?.startDate]);

  // When panel closes without saving, revert the live preview to the real saved theme
  useEffect(() => {
    if (!open) {
      if (!didSaveRef.current) {
        applyThemeClass(originalThemeRef.current);
        applyAccent(originalAccentRef.current || null);
      }
    }
  }, [open]);

  const set = <K extends keyof CoupleSettings>(key: K, val: CoupleSettings[K]) =>
    setDraft(d => ({ ...d, [key]: val }));

  const setSec = (page: keyof CoupleSettings["sections"], key: string, val: boolean) =>
    setDraft(d => ({ ...d, sections: { ...d.sections, [page]: { ...d.sections[page], [key]: val } } }));

  // Live theme preview — applies instantly without saving. Picking a built-in
  // swatch also clears any custom accent so the swatch actually shows.
  const handleThemeClick = useCallback((themeId: string) => {
    setDraft(d => ({ ...d, theme: themeId, customAccent: "", customAccent2: "" }));
    setHexInput("");
    setHexInput2("");
    applyThemeClass(themeId);
    applyAccent(null);
  }, []);

  // Normalise a typed hex (allow with/without leading '#').
  const normHex = (v: string) => { const t = v.trim(); return t && !t.startsWith("#") ? `#${t}` : t; };

  /**
   * Live preview of a custom colour (optionally a two-tone gradient). A custom
   * accent replaces the theme entirely, so we drop any built-in theme class —
   * otherwise that theme's HARDCODED section/nav backgrounds keep painting over
   * the accent's variables. `raw2` empty = single colour; set = gradient theme.
   * Defined as a plain function (not useCallback) so it always sees the latest
   * hexInput/hexInput2.
   */
  const setColors = (raw1: string, raw2: string) => {
    setHexInput(raw1);
    setHexInput2(raw2);
    const c1 = normHex(raw1), c2 = normHex(raw2);
    const v1ok = isValidHex(c1), v2ok = isValidHex(c2);
    setDraft(d => ({
      ...d,
      customAccent:  v1ok ? c1 : d.customAccent,
      customAccent2: v2ok ? c2 : (raw2.trim() === "" ? "" : d.customAccent2),
      theme: "pink",
    }));
    applyThemeClass("pink");
    if (v1ok) applyAccent(c1, v2ok ? c2 : null);
  };

  const clearAccent = useCallback(() => {
    setDraft(d => ({ ...d, customAccent: "", customAccent2: "" }));
    setHexInput("");
    setHexInput2("");
    applyAccent(null);
  }, []);

  // Close without saving — effect above handles the revert
  const handleClose = useCallback(() => { onClose(); }, [onClose]);

  // Trap keyboard focus inside the panel while open, and close on Esc.
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, { active: open, onEscape: handleClose });

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
    setPushErr("");
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushErr("This browser doesn't support push notifications.");
      return;
    }
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (pushEnabled) {
        const sub = await reg.pushManager.getSubscription();
        await sub?.unsubscribe();
        await fetch("/api/push/subscribe", { method: "DELETE" });
        setPushEnabled(false);
      } else {
        // Surface the common silent-failure causes instead of swallowing them.
        if (!VAPID_PUBLIC) {
          setPushErr("Push isn't configured on the server (missing VAPID public key).");
          return;
        }
        if (!window.isSecureContext) {
          setPushErr("Notifications need a secure (https) connection.");
          return;
        }
        // iOS only allows web push from an installed PWA (16.4+). In a normal
        // Safari tab the permission prompt silently no-ops — guide the user.
        const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
        const standalone =
          (navigator as Navigator & { standalone?: boolean }).standalone === true ||
          window.matchMedia("(display-mode: standalone)").matches;
        if (isIOS && !standalone) {
          setPushErr("On iPhone/iPad, add this app to your Home Screen first (Share → Add to Home Screen), then open it from there to enable notifications.");
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setPushErr(permission === "denied"
            ? "Notifications are blocked — enable them in your browser/site settings, then try again."
            : "Notification permission wasn't granted.");
          return;
        }

        // A valid VAPID public key decodes to exactly 65 bytes (uncompressed
        // P-256 point). A wrong length almost always means the private key was
        // pasted into NEXT_PUBLIC_VAPID_PUBLIC_KEY by mistake.
        const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC);
        if (appServerKey.length !== 65) {
          setPushErr("The VAPID public key looks invalid — check NEXT_PUBLIC_VAPID_PUBLIC_KEY is the long public key (not the private one).");
          return;
        }

        // A leftover subscription from a previous/empty VAPID key makes a new
        // subscribe() with a different key fail ("push service error"). Drop
        // any existing one first so a key change can't wedge this.
        const existing = await reg.pushManager.getSubscription();
        if (existing) { try { await existing.unsubscribe(); } catch {} }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey,
        });
        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        });
        if (!res.ok) {
          setPushErr("Couldn't save the subscription on the server — try again.");
          return;
        }
        setPushEnabled(true);
      }
    } catch (e) {
      setPushErr(e instanceof Error ? e.message : "Couldn't change notification settings.");
    } finally {
      setPushLoading(false);
    }
  };

  const downloadMediaZip = async () => {
    if (zipBusy) return;
    setZipBusy(true); setZipErr(""); setZipProgress(null);
    try {
      await exportMediaZip(setZipProgress);
    } catch (e) {
      setZipErr(e instanceof Error ? e.message : "couldn't build the zip — try again");
    } finally {
      setZipBusy(false); setZipProgress(null);
    }
  };

  // One-shot bulk fix for old journal entries whose photos were stored as giant
  // embedded data: URLs (pre-Cloudinary). Re-uploads them to the CDN so those
  // entries stop failing to save. Idempotent — safe to run more than once.
  const migrateOldPhotos = async () => {
    if (migrateBusy) return;
    setMigrateBusy(true); setMigrateMsg("");
    try {
      const res = await fetch("/api/admin/migrate-photos", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `failed (${res.status})`);
      const { photosMigrated = 0, entriesUpdated = 0, failures = [] } = data;
      setMigrateMsg(
        photosMigrated === 0
          ? "✓ all photos are already up to date"
          : `✓ fixed ${photosMigrated} photo${photosMigrated === 1 ? "" : "s"} across ${entriesUpdated} ${entriesUpdated === 1 ? "entry" : "entries"}` +
            (failures.length ? ` · ${failures.length} couldn't be converted` : ""),
      );
    } catch (e) {
      setMigrateMsg(`⚠️ ${e instanceof Error ? e.message : "migration failed — try again"}`);
    } finally {
      setMigrateBusy(false);
    }
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
    applyAccent(null);
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
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
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

              {/* ─── Your photo ─── */}
              <GroupLabel>📸 your photo</GroupLabel>
              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", margin: "0.2rem 0 0.6rem", lineHeight: 1.5 }}>
                The picture on your polaroid on the home screen. Your partner sees it too.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
                  background: "linear-gradient(135deg,var(--pink-light),var(--pink-mid))",
                  border: "2px solid var(--pink-mid)", display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: SERIF, fontSize: "1.4rem", color: "#fff",
                }}>
                  {user?.avatarUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={cldImg(user.avatarUrl, { w: 112, h: 112, crop: "fill" })} alt="your photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : (user?.name?.trim()?.charAt(0)?.toUpperCase() || "📷")}
                </div>
                <motion.button onClick={() => setAvatarOpen(true)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{
                    padding: "0.6rem 1.1rem", borderRadius: 12, border: "1.5px solid var(--pink-mid)",
                    background: "var(--pink-light)", color: "var(--pink-deep)", fontFamily: SANS,
                    fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
                  }}>
                  {user?.avatarUrl ? "change photo" : "add a photo"}
                </motion.button>
              </div>

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

              {/* ── Custom colour / gradient ── */}
              <p style={{ fontFamily: SANS, fontSize: "0.66rem", color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "1.1rem 0 0.5rem", fontWeight: 700 }}>
                or make your own — one colour, or two for a gradient
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                {/* Primary colour */}
                {(() => {
                  const c1bad = !!hexInput && !isValidHex(normHex(hexInput));
                  return (
                    <label style={{ position: "relative", cursor: "pointer", lineHeight: 0 }} title="primary colour">
                      <span style={{ display: "block", width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                        background: isValidHex(draft.customAccent || "") ? draft.customAccent : "var(--pink)",
                        boxShadow: "inset 0 0 0 2px #fff, 0 2px 8px rgba(0,0,0,.18)" }} />
                      <input type="color"
                        value={draft.customAccent && /^#[0-9a-fA-F]{6}$/.test(draft.customAccent) ? draft.customAccent : "#ec4899"}
                        onChange={e => setColors(e.target.value, hexInput2)}
                        aria-label="primary accent colour"
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} />
                      {c1bad && <span style={{ position: "absolute", inset: -2, borderRadius: "50%", boxShadow: "0 0 0 2px #ef4444" }} />}
                    </label>
                  );
                })()}
                <input type="text" value={hexInput} onChange={e => setColors(e.target.value, hexInput2)}
                  placeholder="#993357" maxLength={7} spellCheck={false} autoCapitalize="off" autoCorrect="off"
                  aria-label="primary hex code" style={hexFieldStyle(hexInput)} />

                <span style={{ color: "var(--muted)", fontSize: "1rem", opacity: 0.7 }}>→</span>

                {/* Gradient partner colour (optional) */}
                <label style={{ position: "relative", cursor: "pointer", lineHeight: 0 }} title="second colour for a gradient (optional)">
                  <span style={{ display: "block", width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                    background: isValidHex(draft.customAccent2 || "") ? draft.customAccent2
                      : "repeating-conic-gradient(rgba(var(--pink-deep-rgb),.2) 0% 25%, transparent 0% 50%) 50% / 10px 10px",
                    boxShadow: "inset 0 0 0 2px #fff, 0 2px 8px rgba(0,0,0,.18)" }} />
                  <input type="color"
                    value={draft.customAccent2 && /^#[0-9a-fA-F]{6}$/.test(draft.customAccent2) ? draft.customAccent2 : "#ffc371"}
                    onChange={e => setColors(hexInput || draft.customAccent || "#ec4899", e.target.value)}
                    aria-label="gradient second colour"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} />
                </label>
                <input type="text" value={hexInput2} onChange={e => setColors(hexInput || draft.customAccent || "", e.target.value)}
                  placeholder="optional" maxLength={7} spellCheck={false} autoCapitalize="off" autoCorrect="off"
                  aria-label="gradient second hex code" style={hexFieldStyle(hexInput2)} />

                {draft.customAccent && (
                  <button onClick={clearAccent}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontFamily: SANS, fontSize: "0.74rem", textDecoration: "underline" }}>
                    clear
                  </button>
                )}
              </div>

              {/* Live preview bar */}
              {isValidHex(draft.customAccent || "") && (
                <div style={{ height: 10, borderRadius: 8, marginTop: "0.6rem",
                  background: isValidHex(draft.customAccent2 || "")
                    ? `linear-gradient(90deg, ${draft.customAccent}, ${draft.customAccent2})`
                    : draft.customAccent,
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06), 0 2px 10px rgba(0,0,0,.12)" }} />
              )}

              {/* ── Premium gradient presets ── */}
              <p style={{ fontFamily: SANS, fontSize: "0.66rem", color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "1.1rem 0 0.5rem", fontWeight: 700 }}>
                ✨ gradient themes
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.55rem" }}>
                {GRADIENT_THEMES.map(g => {
                  const active = (draft.customAccent || "").toLowerCase() === g.from.toLowerCase()
                    && (draft.customAccent2 || "").toLowerCase() === g.to.toLowerCase();
                  return (
                    <motion.button key={g.id} onClick={() => setColors(g.from, g.to)}
                      whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.95 }} title={g.name}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem",
                        background: "none", border: "none", cursor: "pointer", padding: "0.15rem" }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12,
                        background: `linear-gradient(135deg, ${g.from}, ${g.to})`,
                        boxShadow: active ? `0 0 0 2.5px var(--cream), 0 0 0 4.5px ${g.from}, 0 4px 14px ${g.to}66`
                          : "0 2px 10px rgba(0,0,0,.2)", transition: "box-shadow .2s" }} />
                      <span style={{ fontFamily: SANS, fontSize: "0.58rem", color: "var(--muted)", fontWeight: active ? 700 : 500, textAlign: "center", lineHeight: 1.2 }}>
                        {g.emoji} {g.name}
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
                  background: "var(--pink-light)", fontFamily: SCRIPT, fontSize: "1rem",
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
                  background: "var(--pink-light)", fontFamily: SANS, fontSize: "0.92rem",
                  color: "var(--text)", caretColor: "var(--pink-deep)",
                }}
              />

              {/* ─── Home page sections ─── */}
              <GroupLabel>🏠 home page</GroupLabel>
              <div style={{ background: "var(--pink-light)", borderRadius: 12, padding: "0.2rem 1rem", border: "1px solid rgba(var(--pink-mid-rgb,251,207,232),.25)" }}>
                <SectionRow label="⏱ Live timer"       on={s.home.showTimer}         onChange={() => setSec("home","showTimer",!s.home.showTimer)}/>
                <SectionRow label="💌 Memory cards"    on={s.home.showMemoryCards}   onChange={() => setSec("home","showMemoryCards",!s.home.showMemoryCards)}/>
                <SectionRow label="🎙 Voice notes"     on={s.home.showVoiceNotes}    onChange={() => setSec("home","showVoiceNotes",!s.home.showVoiceNotes)}/>
                <SectionRow label="🔒 Capsule teaser"  on={s.home.showCapsuleTeaser} onChange={() => setSec("home","showCapsuleTeaser",!s.home.showCapsuleTeaser)}/>
                <SectionRow label="📖 Love letters"    on={s.home.showFinal}         onChange={() => setSec("home","showFinal",!s.home.showFinal)}/>
              </div>

              {/* ─── Journal sections ─── */}
              <GroupLabel>📓 journal page</GroupLabel>
              <div style={{ background: "var(--pink-light)", borderRadius: 12, padding: "0.2rem 1rem", border: "1px solid rgba(var(--pink-mid-rgb,251,207,232),.25)" }}>
                <SectionRow label="📅 Anniversary banner" on={s.journal.showAnniversaryBanner} onChange={() => setSec("journal","showAnniversaryBanner",!s.journal.showAnniversaryBanner)}/>
                <SectionRow label="🔥 Streak tracker"     on={s.journal.showStreak}             onChange={() => setSec("journal","showStreak",!s.journal.showStreak)}/>
                <SectionRow label="✨ Surprise me"        on={s.journal.showSurpriseMe}         onChange={() => setSec("journal","showSurpriseMe",!s.journal.showSurpriseMe)}/>
                <SectionRow label="📊 Monthly recap"      on={s.journal.showMonthlyRecap}       onChange={() => setSec("journal","showMonthlyRecap",!s.journal.showMonthlyRecap)}/>
              </div>

              {/* ─── Shared sections ─── */}
              <GroupLabel>🌍 shared page</GroupLabel>
              <div style={{ background: "var(--pink-light)", borderRadius: 12, padding: "0.2rem 1rem", border: "1px solid rgba(var(--pink-mid-rgb,251,207,232),.25)" }}>
                <SectionRow label="📝 Bucket list" on={s.shared.showBucketList} onChange={() => setSec("shared","showBucketList",!s.shared.showBucketList)}/>
                <SectionRow label="🎵 Spotify"     on={s.shared.showSpotify}    onChange={() => setSec("shared","showSpotify",!s.shared.showSpotify)}/>
                <SectionRow label="🎬 Watchlist"   on={s.shared.showWatchlist}  onChange={() => setSec("shared","showWatchlist",!s.shared.showWatchlist)}/>
              </div>

              {/* ─── Spotify playlist ─── */}
              <GroupLabel>🎵 spotify playlist</GroupLabel>
              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", margin: "0.3rem 0 0.5rem", lineHeight: 1.5 }}>
                Paste the whole Spotify playlist link — we&apos;ll pull out the ID for you.
              </p>
              <input
                ref={spotifyInputRef}
                value={draft.spotifyPlaylistId}
                onChange={e => set("spotifyPlaylistId", parseSpotifyPlaylistId(e.target.value))}
                placeholder="https://open.spotify.com/playlist/…"
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "0.7rem 1rem", borderRadius: 10,
                  border: "1.5px solid var(--pink-mid)", outline: "none",
                  background: "var(--pink-light)", fontFamily: "monospace", fontSize: "0.82rem",
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
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--pink-light)", border: "1px solid var(--pink-mid)", borderRadius: 10, padding: "0.45rem 0.8rem" }}>
                    <span style={{ flex: 1, fontFamily: SCRIPT, fontSize: "0.95rem", color: "var(--text)" }}>{note}</span>
                    <Tip label="remove" placement="left">
                      <button onClick={() => removeLoveNote(i)} aria-label="remove love note" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pink-deep)", fontSize: "0.85rem", fontWeight: 700, padding: "0 0.2rem" }}>✕</button>
                    </Tip>
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
                    background: "var(--pink-light)", fontFamily: SCRIPT, fontSize: "0.95rem",
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
                  {pushErr && (
                    <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "#ef4444", margin: "0.1rem 0 0", lineHeight: 1.45 }}>
                      ⚠️ {pushErr}
                    </p>
                  )}
                </>
              )}

              {/* ─── Your data ─── */}
              <GroupLabel>📦 your data</GroupLabel>
              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", margin: "0.2rem 0 0.5rem", lineHeight: 1.5 }}>
                Download everything — memories, letters, lists — as a single JSON file. The media zip below packs the actual photos &amp; voice notes too.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <motion.a
                  href="/api/export"
                  download
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.5rem",
                    padding: "0.6rem 1.1rem", borderRadius: 12,
                    border: "1.5px solid var(--pink-mid)", background: "var(--pink-light)",
                    color: "var(--pink-deep)", fontFamily: SANS, fontSize: "0.85rem", fontWeight: 600,
                    textDecoration: "none", cursor: "pointer",
                  }}>
                  ⬇️ download data (JSON)
                </motion.a>
                <motion.button
                  onClick={downloadMediaZip} disabled={zipBusy}
                  whileHover={{ scale: zipBusy ? 1 : 1.02 }} whileTap={{ scale: zipBusy ? 1 : 0.98 }}
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                    padding: "0.6rem 1.1rem", borderRadius: 12,
                    border: "1.5px solid var(--pink-mid)", background: "var(--pink-light)",
                    color: "var(--pink-deep)", fontFamily: SANS, fontSize: "0.85rem", fontWeight: 600,
                    cursor: zipBusy ? "wait" : "pointer", opacity: zipBusy ? 0.7 : 1,
                  }}>
                  {zipBusy
                    ? (zipProgress ? `zipping… ${zipProgress.done}/${zipProgress.total}` : "preparing…")
                    : "🗂️ download photos & voice (zip)"}
                </motion.button>
                {zipErr && (
                  <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "#ef4444", margin: 0 }}>⚠️ {zipErr}</p>
                )}
                <motion.button
                  onClick={migrateOldPhotos} disabled={migrateBusy}
                  whileHover={{ scale: migrateBusy ? 1 : 1.02 }} whileTap={{ scale: migrateBusy ? 1 : 0.98 }}
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                    padding: "0.6rem 1.1rem", borderRadius: 12,
                    border: "1.5px solid var(--pink-mid)", background: "var(--pink-light)",
                    color: "var(--pink-deep)", fontFamily: SANS, fontSize: "0.85rem", fontWeight: 600,
                    cursor: migrateBusy ? "wait" : "pointer", opacity: migrateBusy ? 0.7 : 1,
                  }}>
                  {migrateBusy ? "fixing old photos…" : "🛠️ fix old photos (one-time)"}
                </motion.button>
                <p style={{ fontFamily: SANS, fontSize: "0.68rem", color: "var(--muted)", margin: 0, lineHeight: 1.45 }}>
                  Repairs older entries whose photos won&apos;t save. Safe to run anytime.
                </p>
                {migrateMsg && (
                  <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: migrateMsg.startsWith("⚠️") ? "#ef4444" : "var(--pink-deep)", margin: 0, lineHeight: 1.45 }}>
                    {migrateMsg}
                  </p>
                )}
              </div>

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
                  background: "var(--pink-light)",
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

          <AvatarEditor open={avatarOpen} onClose={() => setAvatarOpen(false)} currentUrl={user?.avatarUrl ?? null} />
        </>
      )}
    </AnimatePresence>
  );
}
