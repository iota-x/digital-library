export interface MemoryCardEntry {
  title: string;
  body: string;
}

export interface CoupleSettings {
  theme: string;
  coupleName: string;
  spotifyPlaylistId: string;
  loveNotes: string[];
  memoryCards: MemoryCardEntry[];
  sections: {
    home:    { showTimer: boolean; showMemoryCards: boolean; showVoiceNotes: boolean; showCapsuleTeaser: boolean; showFinal: boolean };
    journal: { showStreak: boolean; showSurpriseMe: boolean; showMonthlyRecap: boolean; showAnniversaryBanner: boolean };
    shared:  { showBucketList: boolean; showSpotify: boolean; showWatchlist: boolean };
  };
}

export const DEFAULT_MEMORY_CARDS: MemoryCardEntry[] = [
  {
    title: "how it started 🌸",
    body: "Every love story has a moment — a first conversation, a laugh that felt too easy, a silence that wasn't awkward at all. Yours had that too. Something in that early spark told you this was different. Not louder, just… realer. And it was. It really was.",
  },
  {
    title: "their presence 💗",
    body: "There's something about the way they make a room feel different. You don't always notice it until they're gone and the room feels a little emptier. Their laugh, their voice, the way they say your name — it all lands a little differently than anyone else's ever has.",
  },
  {
    title: "late nights 🌙",
    body: "The best conversations happen when you're both supposed to be asleep. The world gets quieter and somehow you get more honest. You say things at 2am you'd never say at 2pm. That version of them — sleepy, unguarded, soft — might be your favourite one.",
  },
  {
    title: "the comfort 🤍",
    body: "It's rare, actually — finding someone you don't have to perform for. Someone you can be quiet around without it being weird, or have a bad day around without explaining it. They just get it. They just get you. That kind of ease doesn't happen twice.",
  },
  {
    title: "home 💕",
    body: "Home isn't always a place. Sometimes it's a person. The one you want to tell things to first. The one whose opinion matters most. The one you think about when something good happens. They became that for you without even trying. You just looked up one day and they were home.",
  },
  {
    title: "still you 🌷",
    body: "If you had to do it all again — every hard conversation, every nervous first, every moment you didn't know how it would turn out — you'd do it. Because it all led here. To this. To them. To a love that feels less like luck and more like the right answer to every question you didn't know you were asking.",
  },
];

export const DEFAULT_SETTINGS: CoupleSettings = {
  theme: "pink",
  coupleName: "",
  spotifyPlaylistId: "41LuF5qeH9u3erSTc5LkPw",
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
