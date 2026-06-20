"use client";
import NavRail from "@/components/NavRail";

/**
 * Mobile bottom dock — the full nav rail (every destination, scrollable) as a
 * floating pill at the bottom on phones. Visibility lives in globals.css under
 * `.nav-rail-dock` so it disappears on desktop without any JS.
 */
export default function MobileTabBar() {
  return <NavRail dock />;
}
