"use client";
import { useEffect } from "react";
import { useUserData } from "@/lib/userStore";
import { THEMES } from "@/lib/themes";

const ALL_THEME_CLASSES = THEMES.map(t => `theme-${t.id}`);

const THEME_COLORS: Record<string, string> = {
  pink:   "#ec4899",
  purple: "#7c3aed",
  blue:   "#0284c7",
  green:  "#059669",
  gold:   "#d97706",
};

export default function ThemeProvider() {
  const user    = useUserData();
  const themeId = user?.settings?.theme ?? "pink";

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(...ALL_THEME_CLASSES);
    if (themeId !== "pink") root.classList.add(`theme-${themeId}`);
    try { localStorage.setItem("ann_color_theme", themeId); } catch {}

    // Sync browser theme-color meta tag
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[themeId] ?? "#ec4899");
  }, [themeId]);

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
