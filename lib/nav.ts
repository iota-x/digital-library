/**
 * Single source of truth for app navigation.
 *
 * The app has a lot of surfaces, so navigation is two-tier: a small PRIMARY set
 * lives in the persistent bars (top nav on desktop, bottom tab bar on mobile),
 * and everything is grouped into NAV_GROUPS for the "more" menu, the home
 * Explore map, and the ⌘K palette. Change a destination here and every surface
 * updates — no more drifting lists across components.
 */

export interface NavItem {
  href: string;
  /** Short label for tabs/pills. */
  label: string;
  emoji: string;
  /** One-line "what's here", shown in menus, Explore and the palette. */
  desc: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "every day",
    items: [
      { href: "/",        label: "home",     emoji: "🌸", desc: "your timer, flashbacks & little notes" },
      { href: "/daily",   label: "question", emoji: "💭", desc: "today's question — answer & reveal together" },
      { href: "/journal", label: "journal",  emoji: "📖", desc: "calendar of moods, photos, streaks & recaps" },
    ],
  },
  {
    title: "together",
    items: [
      { href: "/play",     label: "play",     emoji: "🎮", desc: "quizzes, games & your weekly check-in" },
      { href: "/together", label: "miles",    emoji: "🌍", desc: "timezones, a 'thinking of you' buzz & a countdown" },
      { href: "/shared",   label: "shared",   emoji: "🎬", desc: "date ideas, bucket list, playlist & watchlist" },
    ],
  },
  {
    title: "looking back",
    items: [
      { href: "/map",      label: "memories",   emoji: "📸", desc: "polaroids & a map of your places" },
      { href: "/timeline", label: "our story",  emoji: "🕰️", desc: "the milestones — where it all began" },
      { href: "/capsule",  label: "capsule",    emoji: "💌", desc: "letters that unlock on a future date" },
      { href: "/wrapped",  label: "wrapped",    emoji: "✨", desc: "your story in numbers — and a card to share" },
    ],
  },
];

/** Flat list of every destination (menu/palette/Explore order). */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** The handful shown in the always-visible bars. Everything else is under "more". */
export const PRIMARY_HREFS = ["/", "/daily", "/journal", "/play"];
export const PRIMARY_ITEMS: NavItem[] = PRIMARY_HREFS
  .map((h) => NAV_ITEMS.find((i) => i.href === h))
  .filter((i): i is NavItem => !!i);

/** Active-state test that treats "/" exactly and others as prefix matches. */
export function isActive(href: string, path: string): boolean {
  return href === "/" ? path === "/" : path.startsWith(href);
}
