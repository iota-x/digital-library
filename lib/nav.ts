/**
 * Single source of truth for app navigation.
 *
 * Destinations are grouped into a few purpose-based CATEGORIES so the top bar
 * stays short (Home · Connect · Memories · Fun · Capsule). Single-page
 * categories link directly; multi-page ones open a small dropdown. Change a
 * destination once here and the navbar, mobile dock, home Explore map, and ⌘K
 * palette all update.
 */

export interface NavItem {
  href: string;
  /** Short label. */
  label: string;
  emoji: string;
  /** One-line "what's here", shown in dropdowns, Explore and the palette. */
  desc: string;
}

const ITEM = {
  home:     { href: "/",         label: "home",      emoji: "🌸", desc: "your timer, flashbacks & little notes" },
  daily:    { href: "/daily",    label: "questions", emoji: "💭", desc: "today's question — answer & reveal together" },
  journal:  { href: "/journal",  label: "journal",   emoji: "📖", desc: "calendar of moods, photos, streaks & recaps" },
  shared:   { href: "/shared",   label: "shared",    emoji: "🎬", desc: "date ideas, bucket list, playlist & watchlist" },
  map:      { href: "/map",      label: "memories",  emoji: "📸", desc: "polaroids & a map of your places" },
  timeline: { href: "/timeline", label: "our story", emoji: "🕰️", desc: "the milestones — where it all began" },
  wrapped:  { href: "/wrapped",  label: "wrapped",   emoji: "✨", desc: "your story in numbers — and a card to share" },
  play:     { href: "/play",     label: "play",      emoji: "🎮", desc: "quizzes, games & your weekly check-in" },
  together: { href: "/together", label: "miles",     emoji: "🌍", desc: "timezones, a buzz & a visit countdown" },
  capsule:  { href: "/capsule",  label: "capsule",   emoji: "💌", desc: "letters that unlock on a future date" },
} as const satisfies Record<string, NavItem>;

export interface NavCategory {
  label: string;
  emoji: string;
  /** Single-page category → a direct link (no dropdown). */
  href?: string;
  /** Multi-page category → dropdown contents. */
  items?: NavItem[];
}

export const NAV_MENU: NavCategory[] = [
  { label: "home",     emoji: "🌸", href: "/" },
  { label: "connect",  emoji: "❤️", items: [ITEM.daily, ITEM.journal, ITEM.shared] },
  { label: "memories", emoji: "📸", items: [ITEM.map, ITEM.timeline, ITEM.wrapped] },
  { label: "fun",      emoji: "🎮", items: [ITEM.play, ITEM.together] },
  { label: "capsule",  emoji: "💌", href: "/capsule" },
];

/** Flat list of every destination (for ⌘K). */
export const NAV_ITEMS: NavItem[] = [
  ITEM.home, ITEM.daily, ITEM.journal, ITEM.shared, ITEM.map,
  ITEM.timeline, ITEM.wrapped, ITEM.play, ITEM.together, ITEM.capsule,
];

/** Grouped map for the home Explore section — one group per category. */
export const NAV_GROUPS: { title: string; emoji: string; items: NavItem[] }[] =
  NAV_MENU.map((c) => ({
    title: c.label,
    emoji: c.emoji,
    items: c.items ?? [NAV_ITEMS.find((i) => i.href === c.href)!],
  }));

/** Active-state test that treats "/" exactly and others as prefix matches. */
export function isActive(href: string, path: string): boolean {
  return href === "/" ? path === "/" : path.startsWith(href);
}

/** True if any destination within a category is the current page. */
export function categoryActive(c: NavCategory, path: string): boolean {
  if (c.href) return isActive(c.href, path);
  return !!c.items?.some((i) => isActive(i.href, path));
}
