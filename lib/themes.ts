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
