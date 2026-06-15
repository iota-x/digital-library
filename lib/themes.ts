export interface CoupleSettings {
  theme: string;
  coupleName: string;
  spotifyPlaylistId: string;
  sections: {
    home:    { showTimer: boolean; showMemoryCards: boolean; showVoiceNotes: boolean; showCapsuleTeaser: boolean; showFinal: boolean };
    journal: { showStreak: boolean; showSurpriseMe: boolean; showMonthlyRecap: boolean; showAnniversaryBanner: boolean };
    shared:  { showBucketList: boolean; showSpotify: boolean; showWatchlist: boolean };
  };
}

export const DEFAULT_SETTINGS: CoupleSettings = {
  theme: "pink",
  coupleName: "",
  spotifyPlaylistId: "41LuF5qeH9u3erSTc5LkPw",
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
  swatch: string; // color shown in picker
}

export const THEMES: ThemeDefinition[] = [
  { id: "pink",   name: "Rose",     emoji: "🌸", swatch: "#ec4899" },
  { id: "purple", name: "Lavender", emoji: "💜", swatch: "#7c3aed" },
  { id: "blue",   name: "Ocean",    emoji: "🩵", swatch: "#0284c7" },
  { id: "green",  name: "Forest",   emoji: "🌿", swatch: "#059669" },
  { id: "gold",   name: "Golden",   emoji: "✨", swatch: "#d97706" },
];

/** Returns true if the section should render (defaults to true when unset). */
export function sectionVisible(
  settings: CoupleSettings | undefined | null,
  page: keyof CoupleSettings["sections"],
  key: string,
): boolean {
  if (!settings) return true;
  const pageSettings = settings.sections[page] as Record<string, boolean>;
  const val = pageSettings?.[key];
  return val !== false; // undefined → visible
}
