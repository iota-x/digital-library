export interface MemoryCardEntry {
  title: string;
  body: string;
}

export interface TimelineEvent {
  /** Stable id so React keys survive reorder/delete. Hydrated on read. */
  id?: string;
  /** The "remember when…" question shown on the card. */
  q: string;
  /** Short tag pill above the question. */
  tag: string;
  /** The long-form letter body (markdown-friendly, preserves whitespace). */
  letter: string;
}

export interface CoupleSettings {
  theme: string;
  /** Optional custom accent hex (e.g. "#ff77aa"). When set it overrides the
   *  `theme` palette via derived CSS variables. Empty/undefined = use `theme`. */
  customAccent?: string;
  /** Optional second accent hex. When set alongside `customAccent`, the UI's
   *  accent gradients (`var(--pink) → var(--pink-deep)`) blend the two colours
   *  into a premium two-tone gradient theme. Empty/undefined = single colour. */
  customAccent2?: string;
  /** Couple's personal library of saved colour/gradient themes. */
  savedThemes?: SavedTheme[];
  /** Custom section render order per page (arrays of section keys from
   *  lib/sections.ts). Missing/unknown keys fall back to the canonical order. */
  sectionOrder?: { home?: string[]; journal?: string[]; shared?: string[] };
  /** Font pairing id (see FONT_PAIRINGS). Empty/"romantic" = the default look. */
  fontPairing?: string;
  /** When true, the accent gradient also washes the page backgrounds (immersive
   *  look) instead of staying neutral. */
  immersive?: boolean;
  /** Couple "signature": a custom home-hero tagline + an optional emoji cursor. */
  signature?: { greeting?: string; cursor?: string };
  /** Custom page backdrop: an uploaded photo or a full-page gradient. A
   *  readability scrim is layered over it automatically. */
  pageBackground?: { type: "photo" | "gradient"; value: string };
  /** Optional per-page accent overrides (hex). When set for the active page,
   *  that colour is used instead of the global theme/accent. */
  pageAccents?: { home?: string; journal?: string; shared?: string };
  coupleName: string;
  spotifyPlaylistId: string;
  loveNotes: string[];
  memoryCards: MemoryCardEntry[];
  /** Optional — when present overrides the seed timeline shown on /timeline. */
  timelineEvents?: TimelineEvent[];
  /** Optional — the "just so you know…" letter pages on the home page. When
   *  present, overrides the filler prompts. (Ankit & Juhi keep a hardcoded set.) */
  finalPages?: { icon?: string; text: string }[];
  /** Long-distance widgets (/together). Each partner stores their own IANA
   *  timezone in their role slot; `nextVisit` is the shared next-meet date. */
  timezones?: { person1?: string; person2?: string };
  nextVisit?: string;
  sections: {
    home:    { showTimer: boolean; showMemoryCards: boolean; showVoiceNotes: boolean; showCapsuleTeaser: boolean; showFinal: boolean };
    journal: { showStreak: boolean; showSurpriseMe: boolean; showMonthlyRecap: boolean; showAnniversaryBanner: boolean };
    shared:  { showBucketList: boolean; showSpotify: boolean; showWatchlist: boolean };
  };
}

/**
 * Starter "remember when?" prompts for the timeline. Like memory cards,
 * these are not real memories — they're invitations. The card body shows
 * the question + a hint, and tapping opens an editor where the user
 * writes the letter that actually goes there.
 */
export const DEFAULT_TIMELINE: TimelineEvent[] = [
  {
    q: "remember when we first met?",
    tag: "where it all began 🌸",
    letter: "Write about the moment you first met — where you were, what you were wearing, the very first thing that made you notice them. The tiny detail that you'd never tell anyone but somehow remember perfectly.",
  },
  {
    q: "remember our first real conversation?",
    tag: "the spark 💫",
    letter: "What did you talk about? What made it feel different from a normal conversation with someone new? When did you realize you didn't want it to end?",
  },
  {
    q: "remember when you knew?",
    tag: "the realization 🩷",
    letter: "There's usually a moment. Sometimes a big one, sometimes quiet — when you looked at them and thought \"oh.\" Write about that moment. What were you doing? What did they do?",
  },
  {
    q: "remember the day everything changed?",
    tag: "the turning point 💌",
    letter: "Was it a confession? A trip? A bad night that pulled you closer? Write about the day or week that turned what you had into what you have now.",
  },
];

/**
 * Default cards are prompts, not pre-written prose. When no one has edited
 * yet, the home-page MemoryCards component renders these as tap-to-answer
 * placeholders. The first time a card is saved with a non-empty body, the
 * couple's edited set replaces these defaults in their settings.
 */
export const DEFAULT_MEMORY_CARDS: MemoryCardEntry[] = [
  { title: "how we met 🌸",     body: "Where were you the first time you saw each other? What stuck with you?" },
  { title: "their laugh 💗",    body: "What does their laugh sound like — and what makes it come out?" },
  { title: "small things 🌷",   body: "A tiny everyday thing they do that you'd miss if it stopped." },
  { title: "our song 🎵",       body: "A song that always reminds you of the two of you." },
  { title: "comfort core 🤍",   body: "When did you first feel completely yourself around them?" },
  { title: "still you 💕",      body: "One moment with them you'd relive on repeat — and why." },
];

export const DEFAULT_SETTINGS: CoupleSettings = {
  theme: "pink",
  coupleName: "",
  spotifyPlaylistId: "",
  loveNotes: [
    "my favourite person 💗",
    "you make everything better 🌸",
    "glad it's you 🩷",
    "my favourite notification is you ✨",
  ],
  memoryCards: DEFAULT_MEMORY_CARDS,
  sections: {
    home:    { showTimer: true, showMemoryCards: true, showVoiceNotes: true, showCapsuleTeaser: true, showFinal: true },
    journal: { showStreak: true, showSurpriseMe: true, showMonthlyRecap: true, showAnniversaryBanner: true },
    shared:  { showBucketList: true, showSpotify: true, showWatchlist: true },
  },
};

export interface ThemeDefinition {
  id: string;
  name: string;
  emoji: string;
  swatch: string;
}

export const THEMES: ThemeDefinition[] = [
  { id: "pink",   name: "Rose",     emoji: "🌸", swatch: "#ec4899" },
  { id: "purple", name: "Lavender", emoji: "💜", swatch: "#7c3aed" },
  { id: "blue",   name: "Ocean",    emoji: "🩵", swatch: "#0284c7" },
  { id: "green",  name: "Forest",   emoji: "🌿", swatch: "#059669" },
  { id: "gold",   name: "Golden",   emoji: "✨", swatch: "#d97706" },
];

export interface GradientTheme {
  id: string;
  name: string;
  emoji: string;
  /** Primary accent — drives surfaces + the start of accent gradients. */
  from: string;
  /** Secondary accent — the end of accent gradients (sets --pink-deep). */
  to: string;
}

/** A user-saved colour/gradient theme in the couple's personal library. */
export interface SavedTheme {
  id: string;
  name: string;
  /** Primary accent hex. */
  accent: string;
  /** Optional second hex — present = gradient theme. */
  accent2?: string;
}

/** Max saved themes per couple. */
export const MAX_SAVED_THEMES = 12;

/** Curated font pairings. The actual font stacks live in the `html.font-*`
 *  rules in globals.css (which remap the --ui-* vars). "romantic" is the
 *  default — no class, original fonts. */
/** Emoji cursor choices for the couple "signature" (""=default arrow). */
export const CURSOR_CHOICES = ["", "💗", "🩷", "✨", "🌸", "⭐", "🦋", "🌙"];

/** Pages that can carry their own accent override, with display labels. */
export type PageAccentKey = "home" | "journal" | "shared";
export const PAGE_ACCENT_LABELS: Record<PageAccentKey, string> = {
  home: "🏠 home", journal: "📓 journal", shared: "🌍 shared",
};
/** Map a pathname to its per-page-accent key (null = no override applies). */
export function pageAccentKey(pathname: string | null | undefined): PageAccentKey | null {
  if (!pathname) return null;
  if (pathname === "/") return "home";
  if (pathname.startsWith("/journal")) return "journal";
  if (pathname.startsWith("/shared")) return "shared";
  return null;
}

/** Full-page gradient backdrops (used with pageBackground.type="gradient"). */
export interface BgGradient { id: string; name: string; value: string }
export const BG_GRADIENTS: BgGradient[] = [
  { id: "dawn",    name: "Dawn",    value: "linear-gradient(160deg,#ff9a9e,#fad0c4,#fbc2eb)" },
  { id: "dusk",    name: "Dusk",    value: "linear-gradient(160deg,#5b247a,#1bcedf)" },
  { id: "ember",   name: "Ember",   value: "linear-gradient(160deg,#f12711,#f5af19)" },
  { id: "meadow",  name: "Meadow",  value: "linear-gradient(160deg,#43e97b,#38f9d7)" },
  { id: "orchid",  name: "Orchid",  value: "linear-gradient(160deg,#a18cd1,#fbc2eb)" },
  { id: "berry",   name: "Berry",   value: "linear-gradient(160deg,#c471ed,#f64f59)" },
  { id: "night",   name: "Night",   value: "linear-gradient(160deg,#0f2027,#203a43,#2c5364)" },
  { id: "cocoa",   name: "Cocoa",   value: "linear-gradient(160deg,#3e1e0f,#6b4226)" },
];

/** Build a CSS `cursor` value from an emoji (or null for the default). */
export function cursorCss(emoji: string | undefined | null): string | null {
  if (!emoji) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="34"><text y="25" font-size="24">${emoji}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 6 6, auto`;
}

export interface FontPairing { id: string; name: string; emoji: string; sample: string }
export const FONT_PAIRINGS: FontPairing[] = [
  { id: "romantic",    name: "Romantic",    emoji: "🌹", sample: 'var(--font-playfair),"Georgia",serif' },
  { id: "modern",      name: "Modern",      emoji: "⚡", sample: 'var(--font-lato),system-ui,sans-serif' },
  { id: "classic",     name: "Classic",     emoji: "📜", sample: '"Georgia","Times New Roman",serif' },
  { id: "handwritten", name: "Handwritten", emoji: "✍️", sample: 'var(--font-caveat),cursive' },
];

/** Encode a theme into a short shareable code, e.g. "us-631235" or
 *  "us-ff5f6d-ffc371" (no '#', lowercased). */
export function encodeThemeCode(accent: string, accent2?: string): string {
  const h = (s: string) => s.replace(/^#/, "").toLowerCase();
  return accent2 ? `us-${h(accent)}-${h(accent2)}` : `us-${h(accent)}`;
}

/** Parse a shared theme code back into hex colours. Tolerates a raw "#aabbcc"
 *  or "aabbcc-ddeeff" too. Returns null if no valid primary hex is found. */
export function decodeThemeCode(code: string): { accent: string; accent2?: string } | null {
  const hex = /^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;
  const parts = code.trim().toLowerCase().replace(/^us-/, "").split("-").map(p => p.replace(/^#/, ""));
  const valid = parts.filter(p => hex.test(p));
  if (valid.length === 0) return null;
  return { accent: `#${valid[0]}`, accent2: valid[1] ? `#${valid[1]}` : undefined };
}

/** Curated premium two-tone gradient themes. Picking one sets
 *  customAccent = from and customAccent2 = to. */
export const GRADIENT_THEMES: GradientTheme[] = [
  { id: "sunset",    name: "Sunset",    emoji: "🌅", from: "#ff5f6d", to: "#ffc371" },
  { id: "rosegold",  name: "Rosé Gold", emoji: "🥂", from: "#e0598b", to: "#f6c19c" },
  { id: "lavender",  name: "Lavender",  emoji: "💜", from: "#a18cd1", to: "#fbc2eb" },
  { id: "lagoon",    name: "Lagoon",    emoji: "🌊", from: "#36d1dc", to: "#5b86e5" },
  { id: "peach",     name: "Peachy",    emoji: "🍑", from: "#ff9a9e", to: "#fad0c4" },
  { id: "goldhour",  name: "Gold Hour", emoji: "🌇", from: "#f6d365", to: "#fda085" },
  { id: "berry",     name: "Berry",     emoji: "🫐", from: "#c471ed", to: "#f64f59" },
  { id: "flamingo",  name: "Flamingo",  emoji: "🦩", from: "#ee9ca7", to: "#ff6a88" },
];

/** Exclusive gradient themes unlocked by referring other couples. `unlockAt` is
 *  the number of successful referrals required. Purely cosmetic — gated on the
 *  client against the couple's referralCount. */
export interface RewardTheme extends GradientTheme {
  unlockAt: number;
}
export const REWARD_THEMES: RewardTheme[] = [
  { id: "aurora",    name: "Aurora",    emoji: "🌌", from: "#7f5fff", to: "#23d5ab", unlockAt: 1 },
  { id: "galaxy",    name: "Galaxy",    emoji: "✨", from: "#654ea3", to: "#eaafc8", unlockAt: 3 },
  { id: "eclipse",   name: "Eclipse",   emoji: "🌑", from: "#ff0844", to: "#1f1c2c", unlockAt: 5 },
  { id: "celestial", name: "Celestial", emoji: "💫", from: "#fceabb", to: "#7f7fd5", unlockAt: 10 },
];

/** Milestones surfaced in the "spread the love" progress bar. */
export const REFERRAL_MILESTONES = REWARD_THEMES.map((t) => t.unlockAt);

export function sectionVisible(
  settings: CoupleSettings | undefined | null,
  page: keyof CoupleSettings["sections"],
  key: string,
): boolean {
  if (!settings) return true;
  const pageSettings = settings.sections[page] as Record<string, boolean>;
  const val = pageSettings?.[key];
  return val !== false;
}

export function getLoveNotes(settings: CoupleSettings | undefined | null): string[] {
  const notes = settings?.loveNotes;
  if (!notes || notes.length === 0) return DEFAULT_SETTINGS.loveNotes;
  return notes;
}

export function getMemoryCards(settings: CoupleSettings | undefined | null): MemoryCardEntry[] {
  const cards = settings?.memoryCards;
  if (!cards || cards.length === 0) return DEFAULT_MEMORY_CARDS;
  return cards;
}
