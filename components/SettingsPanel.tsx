"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useUserData, updateSettings, updateUserData } from "@/lib/userStore";
import { THEMES, GRADIENT_THEMES, REWARD_THEMES, FONT_PAIRINGS, CURSOR_CHOICES, cursorCss, BG_GRADIENTS, PAGE_ACCENT_LABELS, pageAccentKey, MAX_SAVED_THEMES, encodeThemeCode, decodeThemeCode, DEFAULT_SETTINGS, type CoupleSettings, type SavedTheme, type PageAccentKey } from "@/lib/themes";
import { uploadToCloudinary } from "@/lib/cloudUpload";
import { usePathname } from "next/navigation";
import { HOME_SECTIONS, orderedKeys } from "@/lib/sections";
import { getReduceMotion, getHideAmbient, setReduceMotion, setHideAmbient } from "@/lib/uiPrefs";
import { getPerfMode, setPerfMode, type PerfMode } from "@/lib/perfTier";
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
const ALL_FONT_CLASSES = FONT_PAIRINGS.map(p => `font-${p.id}`);

/** Live-apply the font pairing + immersive classes to <html> (used for preview
 *  while editing and to revert when closing without saving). */
function applyAppearance(pairing: string, immersive: boolean) {
  const root = document.documentElement;
  root.classList.remove(...ALL_FONT_CLASSES);
  if (pairing && pairing !== "romantic") root.classList.add(`font-${pairing}`);
  root.classList.toggle("immersive", immersive);
}

type SettingsTab = "appearance" | "sections" | "account" | "data";
const SETTINGS_TABS: { id: SettingsTab; label: string; emoji: string }[] = [
  { id: "appearance", label: "Look",     emoji: "🎨" },
  { id: "sections",   label: "Sections", emoji: "🧩" },
  { id: "account",    label: "Account",  emoji: "💑" },
  { id: "data",       label: "Data",     emoji: "📦" },
];
/** Shows its children when its tab is active, OR when a non-empty search query
 *  matches its keywords (search spans all tabs). */
function TabSection({ tab, active, q, kw, children }: { tab: SettingsTab; active: SettingsTab; q: string; kw: string; children: React.ReactNode }) {
  const query = q.trim().toLowerCase();
  const show = query ? kw.toLowerCase().includes(query) : active === tab;
  return show ? <>{children}</> : null;
}

/** Computed `--page-bg-image` value for a pageBackground setting ("" = none). */
function pageBgImageOf(pb: CoupleSettings["pageBackground"]): string {
  if (!pb?.value) return "";
  return pb.type === "photo" ? `url("${pb.value}")` : pb.value;
}
/** Live-apply a page background image string to <html>. */
function applyPageBg(image: string) {
  const root = document.documentElement;
  root.classList.toggle("custom-bg", !!image);
  if (image) root.style.setProperty("--page-bg-image", image);
  else root.style.removeProperty("--page-bg-image");
}

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
  const pathname = usePathname();
  const spotifyInputRef = useRef<HTMLInputElement>(null);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [draft,   setDraft]   = useState<CoupleSettings>(DEFAULT_SETTINGS);
  const [startDate,   setStartDate]   = useState("");
  // Nickname the user gives their partner (saved via its own endpoint, not the
  // settings blob). `nickOnDraft` toggles whether it's shown instead of the
  // given name — for both partners.
  const [nickDraft,   setNickDraft]   = useState("");
  const [nickOnDraft, setNickOnDraft] = useState(false);
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
  // "Close our space" offboarding — gated behind a type-to-confirm.
  const [leaveOpen,   setLeaveOpen]   = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState("");
  const [leaveBusy,   setLeaveBusy]   = useState(false);
  const [leaveErr,    setLeaveErr]    = useState("");
  // Raw text in the hex fields — kept separate so partially-typed values (e.g.
  // "#99") don't get reverted while applying only completed, valid hexes.
  // hexInput = primary accent; hexInput2 = optional gradient partner colour.
  const [hexInput,    setHexInput]    = useState("");
  const [hexInput2,   setHexInput2]   = useState("");
  // Saved-theme library helpers.
  const [themeName,   setThemeName]   = useState("");
  const [importCode,  setImportCode]  = useState("");
  const [codeCopied,  setCodeCopied]  = useState(false);
  // Per-device motion/effects prefs (apply instantly, not part of the save).
  const [calmMode,    setCalmMode]    = useState(false);
  const [noAmbient,   setNoAmbient]   = useState(false);
  const [perfMode,    setPerfModeState] = useState<PerfMode>("auto");
  const [bgUploading, setBgUploading] = useState(false);
  const [bgErr,       setBgErr]       = useState("");
  // Tabbed navigation + search across all settings.
  const [tab,         setTab]         = useState<SettingsTab>("appearance");
  const [search,      setSearch]      = useState("");
  // Referral / "spread the love" state — code + how many couples brought in.
  const [referral,    setReferral]    = useState<{ code: string; count: number } | null>(null);
  const [refCopied,   setRefCopied]   = useState(false);
  useEffect(() => { setCalmMode(getReduceMotion()); setNoAmbient(getHideAmbient()); setPerfModeState(getPerfMode()); }, []);
  useEffect(() => {
    if (!open || referral) return;
    let cancelled = false;
    fetch("/api/couples/referral")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d?.referralCode) setReferral({ code: d.referralCode, count: d.referralCount ?? 0 }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open, referral]);

  const originalThemeRef  = useRef("pink");
  const originalAccentRef = useRef("");
  const originalAccent2Ref = useRef("");
  const originalFontRef   = useRef("");
  const originalImmersiveRef = useRef(false);
  const originalCursorRef = useRef("");
  const originalPageBgRef = useRef("");
  const didSaveRef       = useRef(false);
  const initialDraftRef  = useRef<string>("");
  const initialDateRef   = useRef<string>("");
  const initialNickRef   = useRef<string>("");
  const initialNickOnRef = useRef<boolean>(false);
  // True when the draft differs from what was last loaded — drives the save-button glow
  const dirty = JSON.stringify(draft) !== initialDraftRef.current || startDate !== initialDateRef.current
    || nickDraft !== initialNickRef.current || nickOnDraft !== initialNickOnRef.current;

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
      setNickDraft(user.partnerNickname ?? "");
      setNickOnDraft(user.partnerNicknameOn ?? false);
      initialDraftRef.current = JSON.stringify(merged);
      initialDateRef.current  = user.startDate ?? "";
      initialNickRef.current   = user.partnerNickname ?? "";
      initialNickOnRef.current = user.partnerNicknameOn ?? false;
      // Only update originalTheme from server data when we haven't saved yet
      if (!didSaveRef.current) {
        originalThemeRef.current = user.settings.theme ?? "pink";
        // Capture the EFFECTIVE accent for the current route (a per-page accent
        // overrides the global one), so reverting on close restores what was
        // actually showing rather than forcing the global colour.
        {
          const pk = pageAccentKey(pathname);
          const pageAcc = pk ? (user.settings.pageAccents?.[pk] ?? "") : "";
          originalAccentRef.current = pageAcc || (user.settings.customAccent ?? "");
          originalAccent2Ref.current = pageAcc ? "" : (user.settings.customAccent2 ?? "");
        }
        originalFontRef.current = user.settings.fontPairing ?? "";
        originalImmersiveRef.current = !!user.settings.immersive;
        originalCursorRef.current = user.settings.signature?.cursor ?? "";
        originalPageBgRef.current = pageBgImageOf(user.settings.pageBackground);
      }
    }
  }, [open, user?.settings, user?.startDate, pathname]);

  // When panel closes without saving, revert the live preview to the real saved theme
  useEffect(() => {
    if (!open) {
      if (!didSaveRef.current) {
        applyThemeClass(originalThemeRef.current);
        applyAccent(originalAccentRef.current || null, originalAccent2Ref.current || null);
        applyAppearance(originalFontRef.current, originalImmersiveRef.current);
        const cur = cursorCss(originalCursorRef.current);
        if (cur) document.documentElement.style.setProperty("--app-cursor", cur);
        else document.documentElement.style.removeProperty("--app-cursor");
        applyPageBg(originalPageBgRef.current);
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

  // ── Referral / spread-the-love ──
  const referralUrl = () => referral && typeof window !== "undefined"
    ? `${window.location.origin}/?ref=${referral.code}` : "";
  const copyReferral = () => {
    const url = referralUrl();
    if (!url) return;
    navigator.clipboard.writeText(url).catch(() => {});
    setRefCopied(true);
    setTimeout(() => setRefCopied(false), 2000);
  };
  const shareReferral = async () => {
    const url = referralUrl();
    if (!url) return;
    const text = "i made our own private little world on Us 💗 — you and your person should have one too. start yours free:";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Us 💗", text, url });
        return;
      }
    } catch { return; }
    copyReferral();
  };

  // ── Saved-theme library ──
  const saveCurrentTheme = () => {
    const accent = draft.customAccent;
    if (!accent || !isValidHex(accent)) return;
    setDraft(d => {
      const lib = d.savedThemes ?? [];
      const name = themeName.trim() || `theme ${lib.length + 1}`;
      const entry: SavedTheme = { id: `t-${Date.now().toString(36)}`, name, accent, accent2: d.customAccent2 || undefined };
      return { ...d, savedThemes: [...lib, entry].slice(-MAX_SAVED_THEMES) };
    });
    setThemeName("");
  };
  const applySaved = (t: SavedTheme) => setColors(t.accent, t.accent2 ?? "");
  const deleteSaved = (id: string) =>
    setDraft(d => ({ ...d, savedThemes: (d.savedThemes ?? []).filter(t => t.id !== id) }));
  const copyThemeCode = async () => {
    if (!draft.customAccent || !isValidHex(draft.customAccent)) return;
    const code = encodeThemeCode(draft.customAccent, draft.customAccent2 || undefined);
    try { await navigator.clipboard.writeText(code); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 1600); } catch {}
  };
  const applyImportCode = () => {
    const parsed = decodeThemeCode(importCode);
    if (parsed) { setColors(parsed.accent, parsed.accent2 ?? ""); setImportCode(""); }
  };

  // Font pairing + immersive — live preview (revert handled on close).
  const pickFont = (id: string) => {
    setDraft(d => ({ ...d, fontPairing: id }));
    applyAppearance(id, draft.immersive ?? false);
  };
  const toggleImmersive = () => {
    const v = !draft.immersive;
    setDraft(d => ({ ...d, immersive: v }));
    applyAppearance(draft.fontPairing ?? "", v);
  };

  // Couple "signature": custom hero tagline + emoji cursor (live preview).
  const setGreeting = (text: string) =>
    setDraft(d => ({ ...d, signature: { ...d.signature, greeting: text } }));
  const pickCursor = (emoji: string) => {
    setDraft(d => ({ ...d, signature: { ...d.signature, cursor: emoji } }));
    const cur = cursorCss(emoji);
    if (cur) document.documentElement.style.setProperty("--app-cursor", cur);
    else document.documentElement.style.removeProperty("--app-cursor");
  };

  // Per-page accent override. Live-previews instantly when you're editing the
  // page you're currently viewing; for other pages it applies on save / when you
  // visit them (they can't preview here since they're not on screen).
  const setPageAccent = (page: PageAccentKey, hex: string) => {
    setDraft(d => ({ ...d, pageAccents: { ...d.pageAccents, [page]: hex || undefined } }));
    if (pageAccentKey(pathname) === page) {
      if (hex) applyAccent(hex, null);
      else applyAccent(draft.customAccent || null, draft.customAccent2 || null); // back to the global theme
    }
  };

  // Custom page background — gradient preset, uploaded photo, or none (live).
  const setPageBg = (pb: CoupleSettings["pageBackground"]) => {
    setDraft(d => ({ ...d, pageBackground: pb }));
    applyPageBg(pageBgImageOf(pb));
  };
  const uploadPageBg = async (file: File) => {
    setBgUploading(true); setBgErr("");
    try {
      const url = await uploadToCloudinary(file, { folder: "backgrounds" });
      setPageBg({ type: "photo", value: url });
    } catch (e: any) {
      setBgErr(e?.message || "Couldn't upload — try a smaller image.");
    } finally { setBgUploading(false); }
  };

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

  // Permanently close the couple's space. Requires the exact "DELETE" token so
  // it can never happen by accident; on success the session is gone, so just
  // send them home (which becomes the landing page).
  const closeSpace = async () => {
    if (leaveBusy || leaveConfirm.trim().toUpperCase() !== "DELETE") return;
    setLeaveBusy(true); setLeaveErr("");
    try {
      const res = await fetch("/api/couples/leave", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      if (!res.ok) throw new Error();
      try { localStorage.clear(); } catch {}
      window.location.href = "/";
    } catch {
      setLeaveBusy(false);
      setLeaveErr("couldn't close your space — try again");
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
      // Partner nickname lives on its own endpoint (couple doc, not settings).
      const nick = nickDraft.trim();
      const nickOn = nick ? nickOnDraft : false;
      if (nick !== (initialNickRef.current ?? "") || nickOn !== initialNickOnRef.current) {
        const nres = await fetch("/api/couples/nickname", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname: nick, on: nickOn }),
        });
        if (!nres.ok) {
          const body = await nres.json().catch(() => ({}));
          setSaveErr(body?.error ?? `couldn't save nickname (${nres.status})`);
          return;
        }
        updateUserData({ partnerNickname: nick || null, partnerNicknameOn: nickOn });
        initialNickRef.current   = nick;
        initialNickOnRef.current = nickOn;
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
            style={{ position: "fixed", inset: 0, zIndex: 8500, background: "rgba(4,0,8,.45)", WebkitBackdropFilter: "blur(4px)", backdropFilter: "blur(4px)" }}
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
            {/* Header — title row + search + tabs (all sticky) */}
            <div style={{
              padding: "1.2rem 1.6rem 0.7rem",
              borderBottom: "1px solid rgba(var(--pink-mid-rgb,251,207,232),.35)",
              position: "sticky", top: 0, background: "var(--cream)", zIndex: 2,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 search settings…"
                aria-label="search settings"
                style={{ width: "100%", boxSizing: "border-box", marginTop: "0.7rem", padding: "0.5rem 0.8rem", borderRadius: 10, outline: "none",
                  border: "1.5px solid rgba(var(--pink-mid-rgb,249,168,212),.5)", background: "var(--pink-light)",
                  fontFamily: SANS, fontSize: "0.82rem", color: "var(--text)" }} />
              {!search.trim() && (
                <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.55rem" }}>
                  {SETTINGS_TABS.map(t => {
                    const active = tab === t.id;
                    return (
                      <button key={t.id} onClick={() => setTab(t.id)}
                        style={{ flex: 1, padding: "0.4rem 0.2rem", borderRadius: 8, cursor: "pointer", border: "none",
                          fontFamily: SANS, fontSize: "0.7rem", fontWeight: active ? 700 : 500,
                          background: active ? "linear-gradient(135deg,var(--pink),var(--pink-deep))" : "var(--pink-light)",
                          color: active ? "#fff" : "var(--pink-deep)", transition: "background .15s" }}>
                        {t.emoji} {t.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Body */}
            <div style={{ padding: "0 1.6rem 7rem", flex: 1 }}>

              {search.trim() && (
                <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", margin: "1rem 0 0.2rem", fontStyle: "italic" }}>
                  results for &ldquo;{search.trim()}&rdquo;
                </p>
              )}

              <TabSection tab="appearance" active={tab} q={search} kw="photo avatar picture profile colour color theme gradient accent hex saved per-page per page typography font fonts immersive background page wallpaper signature cursor greeting tagline motion effects calm reduce decorations animation performance battery speed lite plain lag fps device">
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

              {/* ── Spread the love (referral) ── */}
              <div style={{ marginTop: "1.3rem", padding: "0.95rem 1rem", borderRadius: 14,
                background: "linear-gradient(135deg, rgba(var(--pink-rgb),.14), rgba(var(--pink-deep-rgb),.1))",
                border: "1px solid rgba(var(--pink-mid-rgb,249,168,212),.4)" }}>
                <p style={{ fontFamily: SANS, fontSize: "0.66rem", color: "var(--pink-deep)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.3rem", fontWeight: 700 }}>
                  💞 spread the love
                </p>
                <p style={{ fontFamily: SANS, fontSize: "0.74rem", color: "var(--muted)", margin: "0 0 0.75rem", lineHeight: 1.45 }}>
                  Share your link with other couples. Each one that starts their own space unlocks an exclusive theme below — forever.
                </p>
                {referral ? (() => {
                  const count = referral.count;
                  const next = REWARD_THEMES.find(t => t.unlockAt > count);
                  const top = REWARD_THEMES[REWARD_THEMES.length - 1].unlockAt;
                  const pct = Math.min(100, Math.round((count / top) * 100));
                  return (
                    <>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                        <span style={{ fontFamily: SERIF, fontSize: "1.05rem", color: "var(--pink-deep)", fontWeight: 700 }}>
                          {count} {count === 1 ? "couple" : "couples"} invited 💗
                        </span>
                        <span style={{ fontFamily: SANS, fontSize: "0.66rem", color: "var(--muted)" }}>
                          {next ? `${next.unlockAt - count} more → ${next.emoji} ${next.name}` : "all themes unlocked! 🎉"}
                        </span>
                      </div>
                      <div style={{ height: 7, borderRadius: 99, background: "rgba(var(--pink-mid-rgb,249,168,212),.3)", overflow: "hidden", marginBottom: "0.8rem" }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: "easeOut" }}
                          style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg, var(--pink), var(--pink-deep))" }} />
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
                        <code style={{ flex: "1 1 150px", minWidth: 0, padding: "0.45rem 0.6rem", borderRadius: 8,
                          background: "rgba(var(--pink-light-rgb,252,231,243),.5)", border: "1px solid rgba(var(--pink-mid-rgb,249,168,212),.5)",
                          fontFamily: "ui-monospace,monospace", fontSize: "0.72rem", color: "var(--pink-deep)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{referralUrl()}</code>
                        <motion.button onClick={copyReferral} whileTap={{ scale: 0.96 }}
                          style={{ padding: "0.45rem 0.7rem", borderRadius: 8, border: "1px solid rgba(var(--pink-mid-rgb,249,168,212),.6)",
                            background: "transparent", color: "var(--pink-deep)", cursor: "pointer", fontFamily: SANS, fontSize: "0.74rem", fontWeight: 600 }}>
                          {refCopied ? "✓ copied" : "copy"}
                        </motion.button>
                        <motion.button onClick={shareReferral} whileTap={{ scale: 0.96 }}
                          style={{ padding: "0.45rem 0.8rem", borderRadius: 8, border: "none", cursor: "pointer",
                            background: "linear-gradient(135deg,var(--pink),var(--pink-deep))", color: "#fff",
                            fontFamily: SANS, fontSize: "0.74rem", fontWeight: 700 }}>
                          💌 share
                        </motion.button>
                      </div>
                    </>
                  );
                })() : (
                  <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", margin: 0 }}>preparing your link…</p>
                )}
              </div>

              {/* ── Reward (referral-unlocked) themes ── */}
              <p style={{ fontFamily: SANS, fontSize: "0.66rem", color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "1.1rem 0 0.5rem", fontWeight: 700 }}>
                🎁 reward themes
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.55rem" }}>
                {REWARD_THEMES.map(g => {
                  const unlocked = (referral?.count ?? 0) >= g.unlockAt;
                  const active = unlocked && (draft.customAccent || "").toLowerCase() === g.from.toLowerCase()
                    && (draft.customAccent2 || "").toLowerCase() === g.to.toLowerCase();
                  return (
                    <motion.button key={g.id} onClick={() => unlocked && setColors(g.from, g.to)} disabled={!unlocked}
                      whileHover={unlocked ? { scale: 1.06, y: -2 } : undefined} whileTap={unlocked ? { scale: 0.95 } : undefined}
                      title={unlocked ? g.name : `unlock by inviting ${g.unlockAt} ${g.unlockAt === 1 ? "couple" : "couples"}`}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem",
                        background: "none", border: "none", cursor: unlocked ? "pointer" : "not-allowed", padding: "0.15rem" }}>
                      <div style={{ position: "relative", width: 42, height: 42, borderRadius: 12,
                        background: `linear-gradient(135deg, ${g.from}, ${g.to})`,
                        filter: unlocked ? "none" : "grayscale(0.9)", opacity: unlocked ? 1 : 0.5,
                        boxShadow: active ? `0 0 0 2.5px var(--cream), 0 0 0 4.5px ${g.from}, 0 4px 14px ${g.to}66`
                          : "0 2px 10px rgba(0,0,0,.2)", transition: "box-shadow .2s" }}>
                        {!unlocked && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>🔒</span>}
                      </div>
                      <span style={{ fontFamily: SANS, fontSize: "0.58rem", color: "var(--muted)", fontWeight: active ? 700 : 500, textAlign: "center", lineHeight: 1.2 }}>
                        {g.emoji} {g.name}{!unlocked && ` · ${g.unlockAt}`}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* ── My saved themes ── */}
              <p style={{ fontFamily: SANS, fontSize: "0.66rem", color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "1.1rem 0 0.5rem", fontWeight: 700 }}>
                💾 my themes
              </p>
              {(draft.savedThemes?.length ?? 0) > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.55rem", marginBottom: "0.7rem" }}>
                  {draft.savedThemes!.map(t => {
                    const active = (draft.customAccent || "").toLowerCase() === t.accent.toLowerCase()
                      && (draft.customAccent2 || "").toLowerCase() === (t.accent2 || "").toLowerCase();
                    return (
                      <div key={t.id} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
                        <motion.button onClick={() => applySaved(t)} whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.95 }} title={`apply ${t.name}`}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 0 }}>
                          <div style={{ width: 42, height: 42, borderRadius: 12,
                            background: t.accent2 ? `linear-gradient(135deg, ${t.accent}, ${t.accent2})` : t.accent,
                            boxShadow: active ? `0 0 0 2.5px var(--cream), 0 0 0 4.5px ${t.accent}, 0 4px 14px ${(t.accent2 || t.accent)}66`
                              : "0 2px 10px rgba(0,0,0,.2)", transition: "box-shadow .2s" }} />
                        </motion.button>
                        <button onClick={() => deleteSaved(t.id)} aria-label={`delete ${t.name}`} title="delete"
                          style={{ position: "absolute", top: -6, right: "calc(50% - 28px)", width: 18, height: 18, borderRadius: "50%",
                            border: "1px solid rgba(var(--pink-mid-rgb,249,168,212),.6)", background: "var(--cream)", color: "var(--muted)",
                            cursor: "pointer", fontSize: "0.62rem", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                        <span style={{ fontFamily: SANS, fontSize: "0.58rem", color: "var(--muted)", fontWeight: active ? 700 : 500, textAlign: "center", lineHeight: 1.2, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* save current + share code */}
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
                <input value={themeName} onChange={e => setThemeName(e.target.value)} placeholder="name it" maxLength={20}
                  aria-label="theme name"
                  style={{ flex: "1 1 90px", minWidth: 0, padding: "0.4rem 0.6rem", borderRadius: 8, outline: "none",
                    border: "1.5px solid rgba(var(--pink-mid-rgb,249,168,212),.5)", background: "rgba(var(--pink-light-rgb,252,231,243),.4)",
                    color: "var(--pink-deep)", fontFamily: SANS, fontSize: "0.78rem" }} />
                <motion.button onClick={saveCurrentTheme} disabled={!draft.customAccent || !isValidHex(draft.customAccent) || (draft.savedThemes?.length ?? 0) >= MAX_SAVED_THEMES}
                  whileTap={{ scale: 0.96 }}
                  style={{ padding: "0.42rem 0.8rem", borderRadius: 8, border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg,var(--pink),var(--pink-deep))", color: "#fff", fontFamily: SANS, fontSize: "0.76rem", fontWeight: 700,
                    opacity: (!draft.customAccent || !isValidHex(draft.customAccent || "") || (draft.savedThemes?.length ?? 0) >= MAX_SAVED_THEMES) ? 0.5 : 1 }}>
                  💾 save current
                </motion.button>
              </div>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.5rem" }}>
                <button onClick={copyThemeCode} disabled={!draft.customAccent || !isValidHex(draft.customAccent || "")}
                  style={{ padding: "0.42rem 0.7rem", borderRadius: 8, cursor: "pointer",
                    border: "1.5px solid rgba(var(--pink-mid-rgb,249,168,212),.5)", background: "transparent",
                    color: "var(--pink-deep)", fontFamily: SANS, fontSize: "0.76rem", fontWeight: 600,
                    opacity: (!draft.customAccent || !isValidHex(draft.customAccent || "")) ? 0.5 : 1 }}>
                  {codeCopied ? "✓ copied" : "🔗 copy code"}
                </button>
                <input value={importCode} onChange={e => setImportCode(e.target.value)} placeholder="paste a theme code"
                  aria-label="import theme code"
                  style={{ flex: "1 1 110px", minWidth: 0, padding: "0.4rem 0.6rem", borderRadius: 8, outline: "none",
                    border: "1.5px solid rgba(var(--pink-mid-rgb,249,168,212),.5)", background: "rgba(var(--pink-light-rgb,252,231,243),.4)",
                    color: "var(--pink-deep)", fontFamily: "var(--font-lato),monospace", fontSize: "0.74rem" }} />
                {importCode.trim() && (
                  <button onClick={applyImportCode}
                    style={{ padding: "0.42rem 0.7rem", borderRadius: 8, border: "none", cursor: "pointer",
                      background: "var(--pink-deep)", color: "#fff", fontFamily: SANS, fontSize: "0.76rem", fontWeight: 700 }}>
                    apply
                  </button>
                )}
              </div>
              <p style={{ fontFamily: SANS, fontSize: "0.68rem", color: "var(--muted)", margin: "0.5rem 0 0", lineHeight: 1.45 }}>
                save looks you love, switch anytime, or share a code with your partner 💞
              </p>

              {/* ─── Per-page colours ─── */}
              <GroupLabel>🎨 per-page colours</GroupLabel>
              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", margin: "0.1rem 0 0.4rem", lineHeight: 1.5 }}>
                Give each page its own accent — or leave it on your main theme.
              </p>
              <div style={{ background: "var(--pink-light)", borderRadius: 12, padding: "0.25rem 1rem", border: "1px solid rgba(var(--pink-mid-rgb,251,207,232),.25)" }}>
                {(Object.keys(PAGE_ACCENT_LABELS) as PageAccentKey[]).map(pg => {
                  const val = draft.pageAccents?.[pg] || "";
                  const valid = /^#[0-9a-fA-F]{6}$/.test(val);
                  return (
                    <div key={pg} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.45rem 0" }}>
                      <span style={{ flex: 1, fontFamily: SANS, fontSize: "0.84rem", color: "var(--text)", fontWeight: 600 }}>{PAGE_ACCENT_LABELS[pg]}</span>
                      <label style={{ position: "relative", cursor: "pointer", lineHeight: 0 }} title="pick a colour">
                        <span style={{ display: "block", width: 30, height: 30, borderRadius: "50%",
                          background: valid ? val : "var(--pink)", opacity: val ? 1 : 0.4,
                          boxShadow: "inset 0 0 0 2px #fff, 0 2px 6px rgba(0,0,0,.18)" }} />
                        <input type="color" value={valid ? val : "#ec4899"} onChange={e => setPageAccent(pg, e.target.value)}
                          aria-label={`${pg} page colour`}
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} />
                      </label>
                      {val
                        ? <button onClick={() => setPageAccent(pg, "")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontFamily: SANS, fontSize: "0.72rem", textDecoration: "underline", width: 40, textAlign: "right" }}>reset</button>
                        : <span style={{ fontFamily: SANS, fontSize: "0.62rem", color: "var(--muted)", opacity: 0.6, width: 40, textAlign: "right" }}>main</span>}
                    </div>
                  );
                })}
              </div>
              <p style={{ fontFamily: SANS, fontSize: "0.68rem", color: "var(--muted)", margin: "0.4rem 0 0", lineHeight: 1.45 }}>
                The page you&apos;re on previews instantly; others show when you visit them. Save to keep.
              </p>

              {/* ─── Typography ─── */}
              <GroupLabel>🔤 typography</GroupLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
                {FONT_PAIRINGS.map(fp => {
                  const active = (draft.fontPairing || "romantic") === fp.id;
                  return (
                    <motion.button key={fp.id} onClick={() => pickFont(fp.id)} whileTap={{ scale: 0.97 }}
                      style={{ padding: "0.6rem 0.7rem", borderRadius: 10, cursor: "pointer", textAlign: "left",
                        border: active ? "1.5px solid var(--pink-deep)" : "1.5px solid rgba(var(--pink-mid-rgb,249,168,212),.4)",
                        background: active ? "rgba(var(--pink-rgb),.12)" : "var(--pink-light)", transition: "border .15s, background .15s" }}>
                      <div style={{ fontFamily: fp.sample, fontSize: "1.05rem", color: "var(--pink-deep)", fontWeight: 600, lineHeight: 1.15 }}>{fp.name}</div>
                      <div style={{ fontFamily: fp.sample, fontSize: "0.72rem", color: "var(--muted)" }}>{fp.emoji} Aa — our story</div>
                    </motion.button>
                  );
                })}
              </div>

              {/* ─── Immersive background ─── */}
              <GroupLabel>🌈 immersive background</GroupLabel>
              <div style={{ background: "var(--pink-light)", borderRadius: 12, padding: "0.2rem 1rem", border: "1px solid rgba(var(--pink-mid-rgb,251,207,232),.25)" }}>
                <SectionRow label="🌈 Wash the page with my theme" on={!!draft.immersive} onChange={toggleImmersive} />
              </div>
              <p style={{ fontFamily: SANS, fontSize: "0.68rem", color: "var(--muted)", margin: "0.5rem 0 0", lineHeight: 1.45 }}>
                Lets your colour or gradient flow across the backgrounds, not just the accents.
              </p>

              {/* ─── Page background ─── */}
              <GroupLabel>🖼 page background</GroupLabel>
              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", margin: "0.1rem 0 0.5rem", lineHeight: 1.5 }}>
                A photo or gradient behind the whole app — a soft scrim keeps text readable.
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.6rem" }}>
                <button onClick={() => setPageBg(undefined)}
                  style={{ padding: "0.42rem 0.8rem", borderRadius: 8, cursor: "pointer", fontFamily: SANS, fontSize: "0.78rem", fontWeight: 600,
                    border: !draft.pageBackground ? "1.5px solid var(--pink-deep)" : "1.5px solid rgba(var(--pink-mid-rgb,249,168,212),.4)",
                    background: !draft.pageBackground ? "rgba(var(--pink-rgb),.12)" : "var(--pink-light)", color: "var(--pink-deep)" }}>
                  ✕ none
                </button>
                <label style={{ padding: "0.42rem 0.8rem", borderRadius: 8, cursor: bgUploading ? "wait" : "pointer", fontFamily: SANS, fontSize: "0.78rem", fontWeight: 600,
                  border: draft.pageBackground?.type === "photo" ? "1.5px solid var(--pink-deep)" : "1.5px solid rgba(var(--pink-mid-rgb,249,168,212),.4)",
                  background: draft.pageBackground?.type === "photo" ? "rgba(var(--pink-rgb),.12)" : "var(--pink-light)", color: "var(--pink-deep)", opacity: bgUploading ? 0.6 : 1 }}>
                  {bgUploading ? "uploading…" : "📷 upload photo"}
                  <input type="file" accept="image/*" disabled={bgUploading} style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadPageBg(f); e.currentTarget.value = ""; }} />
                </label>
                {draft.pageBackground?.type === "photo" && (
                  <span aria-hidden style={{ width: 34, height: 34, borderRadius: 8, backgroundImage: `url("${draft.pageBackground.value}")`, backgroundSize: "cover", backgroundPosition: "center", border: "1.5px solid var(--pink-mid)" }} />
                )}
              </div>
              {bgErr && <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "#ef4444", margin: "0 0 0.5rem" }}>⚠️ {bgErr}</p>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
                {BG_GRADIENTS.map(g => {
                  const active = draft.pageBackground?.type === "gradient" && draft.pageBackground.value === g.value;
                  return (
                    <motion.button key={g.id} onClick={() => setPageBg({ type: "gradient", value: g.value })}
                      whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }} title={g.name}
                      style={{ height: 42, borderRadius: 10, background: g.value, cursor: "pointer", padding: 0,
                        border: active ? "2.5px solid var(--cream)" : "none",
                        boxShadow: active ? "0 0 0 2.5px var(--pink-deep), 0 4px 12px rgba(0,0,0,.25)" : "0 2px 8px rgba(0,0,0,.2)" }} />
                  );
                })}
              </div>

              {/* ─── Couple signature ─── */}
              <GroupLabel>💞 your signature</GroupLabel>
              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", margin: "0.1rem 0 0.4rem", lineHeight: 1.5 }}>
                A custom line on your home hero, and a little cursor that&apos;s yours.
              </p>
              <input
                value={draft.signature?.greeting ?? ""}
                onChange={e => setGreeting(e.target.value)}
                placeholder="and somehow every single day gets better 💗"
                maxLength={120}
                aria-label="home hero tagline"
                style={{ width: "100%", boxSizing: "border-box", padding: "0.7rem 1rem", borderRadius: 10,
                  border: "1.5px solid var(--pink-mid)", outline: "none", background: "var(--pink-light)",
                  fontFamily: SCRIPT, fontSize: "1rem", color: "var(--text)", caretColor: "var(--pink-deep)" }} />
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.6rem", alignItems: "center" }}>
                <span style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", fontWeight: 600 }}>cursor</span>
                {CURSOR_CHOICES.map(c => {
                  const active = (draft.signature?.cursor ?? "") === c;
                  return (
                    <button key={c || "none"} onClick={() => pickCursor(c)} title={c ? `cursor ${c}` : "default cursor"}
                      style={{ width: 34, height: 34, borderRadius: 8, cursor: "pointer", fontSize: "1.05rem", lineHeight: 1,
                        border: active ? "1.5px solid var(--pink-deep)" : "1.5px solid rgba(var(--pink-mid-rgb,249,168,212),.4)",
                        background: active ? "rgba(var(--pink-rgb),.14)" : "var(--pink-light)",
                        display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {c || "✕"}
                    </button>
                  );
                })}
              </div>

              {/* ─── Motion & effects (per-device, instant) ─── */}
              <GroupLabel>✨ motion &amp; effects</GroupLabel>
              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", margin: "0.1rem 0 0.5rem", lineHeight: 1.5 }}>
                Just for this device — applies instantly, no need to save.
              </p>
              <div style={{ background: "var(--pink-light)", borderRadius: 12, padding: "0.2rem 1rem", border: "1px solid rgba(var(--pink-mid-rgb,251,207,232),.25)" }}>
                <SectionRow label="🧘 Calm mode (less motion)" on={calmMode}
                  onChange={() => { const v = !calmMode; setCalmMode(v); setReduceMotion(v); }} />
                <SectionRow label="🌸 Floating decorations" on={!noAmbient}
                  onChange={() => { const v = !noAmbient; setNoAmbient(v); setHideAmbient(v); }} />
              </div>

              {/* ─── Performance (adaptive visual tier) ─── */}
              <GroupLabel>⚡ performance</GroupLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
                {([
                  { id: "auto", emoji: "🤖", name: "Auto", desc: "match this device" },
                  { id: "high", emoji: "✨", name: "Full",  desc: "all the effects" },
                  { id: "mid",  emoji: "🌿", name: "Plain", desc: "lighter, calmer" },
                  { id: "low",  emoji: "🪶", name: "Lite",  desc: "max battery" },
                ] as { id: PerfMode; emoji: string; name: string; desc: string }[]).map(o => {
                  const active = perfMode === o.id;
                  return (
                    <motion.button key={o.id} whileTap={{ scale: 0.97 }}
                      onClick={() => { setPerfModeState(o.id); setPerfMode(o.id); }}
                      style={{ padding: "0.6rem 0.7rem", borderRadius: 10, cursor: "pointer", textAlign: "left",
                        border: active ? "1.5px solid var(--pink-deep)" : "1.5px solid rgba(var(--pink-mid-rgb,249,168,212),.4)",
                        background: active ? "rgba(var(--pink-rgb),.12)" : "var(--pink-light)", transition: "border .15s, background .15s" }}>
                      <div style={{ fontFamily: SANS, fontSize: "0.92rem", color: "var(--pink-deep)", fontWeight: 600, lineHeight: 1.2 }}>{o.emoji} {o.name}</div>
                      <div style={{ fontFamily: SANS, fontSize: "0.68rem", color: "var(--muted)" }}>{o.desc}</div>
                    </motion.button>
                  );
                })}
              </div>
              <p style={{ fontFamily: SANS, fontSize: "0.68rem", color: "var(--muted)", margin: "0.5rem 0 0", lineHeight: 1.45 }}>
                Auto watches how smoothly this device runs and dials the visuals down if it starts to struggle. Pick a level yourself to override.
              </p>

              </TabSection>

              <TabSection tab="account" active={tab} q={search} kw="couple name title relationship start date anniversary nickname pet name partner babe love">
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

              {/* ─── Partner nickname ─── */}
              <GroupLabel>💕 {(user?.partnerName?.trim().split(" ")[0]) || "partner"}&rsquo;s nickname</GroupLabel>
              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", margin: "0.2rem 0 0.5rem", lineHeight: 1.5 }}>
                {user?.partnerName
                  ? <>A sweet name for {user.partnerName.trim().split(" ")[0]}. When switched on, it shows everywhere instead of their name — for both of you. 💗</>
                  : <>Once your partner joins, you can give them a sweet little nickname here.</>}
              </p>
              <input
                value={nickDraft}
                onChange={e => setNickDraft(e.target.value)}
                disabled={!user?.partnerName}
                placeholder={user?.partnerName ? "babe, my love, cutie…" : "waiting for your partner…"}
                maxLength={40}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "0.7rem 1rem", borderRadius: 10, marginTop: "0.1rem",
                  border: "1.5px solid var(--pink-mid)", outline: "none",
                  background: "var(--pink-light)", fontFamily: SCRIPT, fontSize: "1rem",
                  color: "var(--text)", caretColor: "var(--pink-deep)",
                  opacity: user?.partnerName ? 1 : 0.55,
                }}
              />
              {!!nickDraft.trim() && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.7rem 0 0.1rem", gap: "0.8rem" }}>
                  <span style={{ fontFamily: SANS, fontSize: "0.84rem", color: "var(--text)" }}>
                    Use &ldquo;{nickDraft.trim()}&rdquo; instead of {user?.partnerName?.trim().split(" ")[0] || "their name"}
                  </span>
                  <Toggle on={nickOnDraft} onChange={() => setNickOnDraft(v => !v)} />
                </div>
              )}

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

              </TabSection>

              <TabSection tab="sections" active={tab} q={search} kw="sections home journal shared reorder drag show hide page">
              {/* ─── Home page sections (drag to reorder) ─── */}
              <GroupLabel>🏠 home page</GroupLabel>
              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", margin: "0.1rem 0 0.5rem", lineHeight: 1.5 }}>
                Drag <span aria-hidden>⠿</span> to reorder · toggle to show/hide. Changes apply to your home page.
              </p>
              <Reorder.Group axis="y"
                values={orderedKeys(HOME_SECTIONS.map(x => x.key), draft.sectionOrder?.home)}
                onReorder={(next: string[]) => setDraft(d => ({ ...d, sectionOrder: { ...d.sectionOrder, home: next } }))}
                style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {orderedKeys(HOME_SECTIONS.map(x => x.key), draft.sectionOrder?.home).map(key => {
                  const meta = HOME_SECTIONS.find(x => x.key === key)!;
                  const on = meta.toggle ? !!(s.home as Record<string, boolean>)[meta.toggle] : true;
                  return (
                    <Reorder.Item key={key} value={key}
                      style={{ display: "flex", alignItems: "center", gap: "0.55rem", padding: "0.55rem 0.7rem", borderRadius: 10,
                        background: "var(--pink-light)", border: "1px solid rgba(var(--pink-mid-rgb,251,207,232),.3)" }}>
                      <span aria-hidden title="drag to reorder" style={{ cursor: "grab", color: "var(--muted)", fontSize: "1.05rem", lineHeight: 1, userSelect: "none", touchAction: "none" }}>⠿</span>
                      <span style={{ flex: 1, fontFamily: SANS, fontSize: "0.85rem", fontWeight: 600,
                        color: on ? "var(--text)" : "var(--muted)", opacity: on ? 1 : 0.6 }}>
                        {meta.emoji} {meta.label}
                      </span>
                      {meta.toggle
                        ? <Toggle on={on} onChange={() => setSec("home", meta.toggle!, !on)} />
                        : <span style={{ fontFamily: SANS, fontSize: "0.6rem", color: "var(--muted)", opacity: 0.6, letterSpacing: "0.05em" }}>always</span>}
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>

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

              </TabSection>

              <TabSection tab="account" active={tab} q={search} kw="spotify playlist music love notes push notifications alerts">
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

              </TabSection>

              <TabSection tab="data" active={tab} q={search} kw="data export download backup migrate photos reset defaults">
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

              {/* ─── Close our space (offboarding) ─── */}
              <GroupLabel>🕊️ close our space</GroupLabel>
              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", margin: "0.2rem 0 0.6rem", lineHeight: 1.5 }}>
                Your memories are yours. <strong>Download everything above first</strong> — then, if you ever need to, you can permanently close your space. This erases the journal, letters, photos &amp; both accounts for good. It can&apos;t be undone.
              </p>
              {!leaveOpen ? (
                <motion.button
                  onClick={() => { setLeaveOpen(true); setLeaveErr(""); setLeaveConfirm(""); }}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  style={{
                    width: "100%", padding: "0.7rem", borderRadius: 10,
                    border: "1.5px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.06)",
                    color: "#ef4444", fontFamily: SANS, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                  }}>
                  close our space…
                </motion.button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", padding: "0.9rem", borderRadius: 12, border: "1.5px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.05)" }}>
                  <p style={{ fontFamily: SANS, fontSize: "0.74rem", color: "var(--text)", margin: 0, lineHeight: 1.5 }}>
                    To confirm, type <strong style={{ color: "#ef4444" }}>DELETE</strong> below. This is permanent.
                  </p>
                  <input
                    value={leaveConfirm}
                    onChange={e => setLeaveConfirm(e.target.value)}
                    placeholder="DELETE"
                    style={{
                      padding: "0.6rem 0.8rem", borderRadius: 10, fontFamily: SANS, fontSize: "0.9rem",
                      border: "1.5px solid rgba(239,68,68,0.4)", background: "var(--card-bg,#fff)", color: "var(--text)",
                      letterSpacing: "0.15em", textTransform: "uppercase",
                    }}
                  />
                  {leaveErr && <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "#ef4444", margin: 0 }}>⚠️ {leaveErr}</p>}
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => { setLeaveOpen(false); setLeaveConfirm(""); setLeaveErr(""); }}
                      style={{ flex: 1, padding: "0.6rem", borderRadius: 10, border: "1.5px solid var(--pink-mid)", background: "var(--pink-light)", color: "var(--pink-deep)", fontFamily: SANS, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}>
                      keep our space 💗
                    </button>
                    <button
                      onClick={closeSpace}
                      disabled={leaveBusy || leaveConfirm.trim().toUpperCase() !== "DELETE"}
                      style={{
                        flex: 1, padding: "0.6rem", borderRadius: 10, border: "none",
                        background: leaveConfirm.trim().toUpperCase() === "DELETE" ? "#ef4444" : "rgba(239,68,68,0.4)",
                        color: "#fff", fontFamily: SANS, fontSize: "0.82rem", fontWeight: 700,
                        cursor: leaveBusy || leaveConfirm.trim().toUpperCase() !== "DELETE" ? "not-allowed" : "pointer",
                      }}>
                      {leaveBusy ? "closing…" : "close forever"}
                    </button>
                  </div>
                </div>
              )}
              </TabSection>
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
