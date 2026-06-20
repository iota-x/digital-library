"use client";
import NavCategories from "@/components/NavCategories";

/**
 * Mobile bottom dock — the purpose-grouped category nav as a floating pill at
 * the bottom on phones (dropdowns open upward). Visibility lives in globals.css
 * under `.nav-cats-dock` so it disappears on desktop without any JS.
 */
export default function MobileTabBar() {
  return <NavCategories dock />;
}
