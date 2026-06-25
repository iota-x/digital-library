"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUserData, getUser, updateUserData } from "@/lib/userStore";
import { onSSE } from "@/lib/sseClient";
import { THEMES, FONT_PAIRINGS, cursorCss, pageAccentKey } from "@/lib/themes";
import { applyAccent, reapplyAccent } from "@/lib/themeColor";

const ALL_THEME_CLASSES = THEMES.map(t => `theme-${t.id}`);
const ALL_FONT_CLASSES = FONT_PAIRINGS.map(p => `font-${p.id}`);

const THEME_COLORS: Record<string, string> = {
  pink:   "#ec4899",
  purple: "#7c3aed",
  blue:   "#0284c7",
  green:  "#059669",
  gold:   "#d97706",
};

export default function ThemeProvider() {
  const user    = useUserData();
  const pathname = usePathname();
  const themeId = user?.settings?.theme ?? "pink";
  const globalAccent  = user?.settings?.customAccent ?? "";
  const globalAccent2 = user?.settings?.customAccent2 ?? "";
  // Per-page accent overrides the global colour for the active page (single
  // colour, so it drops the gradient's second stop). Falls back to global.
  const pageKey = pageAccentKey(pathname);
  const pageAccent = pageKey ? (user?.settings?.pageAccents?.[pageKey] ?? "") : "";
  const accent  = pageAccent || globalAccent;
  const accent2 = pageAccent ? "" : globalAccent2;
  const pairing = user?.settings?.fontPairing ?? "";
  const immersive = user?.settings?.immersive ?? false;
  const cursor = user?.settings?.signature?.cursor ?? "";
  const pageBg = user?.settings?.pageBackground;
  const pageBgImage = pageBg?.value ? (pageBg.type === "photo" ? `url("${pageBg.value}")` : pageBg.value) : "";

  useEffect(() => {
    // Until we actually know the user, leave the theme the anti-FOUC inline
    // script (in the layout) applied from cache — don't reset it to pink and
    // cause a flash, and don't wipe the cached accent.
    if (!user) return;
    const root = document.documentElement;
    root.classList.remove(...ALL_THEME_CLASSES);
    // A custom accent must NOT carry a built-in theme class: the theme-X classes
    // style section/nav backgrounds with HARDCODED colours that out-specify the
    // variable-based rules, so a leftover class (e.g. from previously trying the
    // blue theme) would keep painting the backgrounds that theme's colour while
    // only the foreground followed the custom accent. So a custom accent always
    // uses the base palette (no theme class) and drives everything via variables.
    if (themeId !== "pink" && !accent) root.classList.add(`theme-${themeId}`);
    applyAccent(accent || null, accent2 || null);
    try { localStorage.setItem("ann_color_theme", themeId); } catch {}

    // Font pairing ("romantic" = default, no class) + immersive-background flag.
    root.classList.remove(...ALL_FONT_CLASSES);
    if (pairing && pairing !== "romantic") root.classList.add(`font-${pairing}`);
    root.classList.toggle("immersive", immersive);
    const cur = cursorCss(cursor);
    if (cur) root.style.setProperty("--app-cursor", cur);
    else root.style.removeProperty("--app-cursor");
    // Custom page backdrop (photo/gradient) + readability scrim.
    root.classList.toggle("custom-bg", !!pageBgImage);
    if (pageBgImage) root.style.setProperty("--page-bg-image", pageBgImage);
    else root.style.removeProperty("--page-bg-image");
    try {
      localStorage.setItem("ann_font_pairing", pairing || "");
      localStorage.setItem("ann_immersive", immersive ? "1" : "0");
      localStorage.setItem("ann_page_bg", pageBgImage);
    } catch {}

    // Sync browser theme-color meta tag — the custom accent wins when present.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", accent || THEME_COLORS[themeId] || "#ec4899");
  }, [user, themeId, accent, accent2, pairing, immersive, cursor, pageBgImage, pathname]);

  // Live-sync nicknames across the couple. A `nickname:update` carries the
  // affected person slot ("person1"/"person2") — if it's mine it changes how I
  // see myself; otherwise it's the nickname I have for my partner.
  useEffect(() => {
    return onSSE((detail) => {
      if (detail.type !== "nickname:update") return;
      const me = getUser();
      if (!me) return;
      const myslot = me.role === "creator" ? "person1" : "person2";
      const nickname = (detail.nickname as string) || null;
      const on = detail.on === true;
      if (detail.target === myslot) updateUserData({ nickname, nicknameOn: on });
      else updateUserData({ partnerNickname: nickname, partnerNicknameOn: on });
    });
  }, []);

  // A custom accent derives different shades for light vs dark — so when dark
  // mode is toggled (fires `annapp:theme`), re-derive it for the new mode.
  useEffect(() => {
    const onThemeFlip = () => reapplyAccent();
    window.addEventListener("annapp:theme", onThemeFlip);
    return () => window.removeEventListener("annapp:theme", onThemeFlip);
  }, []);

  // Dynamic browser tab title
  useEffect(() => {
    if (!user) return;
    const custom = user.settings?.coupleName?.trim();
    if (custom) {
      document.title = `${custom} 💗`;
    } else if (user.partnerName) {
      document.title = `${user.name} & ${user.partnerName} 💗`;
    }
  }, [user]);

  return null;
}
