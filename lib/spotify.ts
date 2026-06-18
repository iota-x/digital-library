/**
 * Shared helpers for the couple Spotify playlist.
 *
 * Background: earlier builds shipped the original couple's playlist as the
 * global default, and `SettingsPanel` persists the whole settings blob — so the
 * ID leaked into other couples' saved records. We can't migrate every DB, so we
 * treat that specific ID as "unset" for anyone who isn't the original couple,
 * everywhere it's read (the shared page, the settings input, the API route).
 */

export const LEGACY_DEFAULT_PLAYLIST = "41LuF5qeH9u3erSTc5LkPw";

/** The one couple the legacy playlist actually belongs to (matched by names). */
export function isOriginalCouple(name?: string | null, partnerName?: string | null): boolean {
  const names = [name, partnerName].filter(Boolean).map(n => n!.toLowerCase());
  return names.includes("ankit") && names.includes("juhi");
}

/** Playlist a couple should actually see — blanks the leaked legacy default for
 *  everyone but the original couple, so they get the "add a playlist" prompt. */
export function resolvePlaylistId(rawId: string | null | undefined, name?: string | null, partnerName?: string | null): string {
  const id = rawId ?? "";
  if (id === LEGACY_DEFAULT_PLAYLIST && !isOriginalCouple(name, partnerName)) return "";
  return id;
}
