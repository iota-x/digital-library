/**
 * Page section registry — the canonical order + display metadata for the
 * reorderable sections on each page. Pages map these keys to components; the
 * settings panel uses the labels/emoji to render the reorder + visibility list.
 *
 * Keeping the components OUT of this module preserves per-page code-splitting
 * (each page imports only its own components and maps them by key).
 */

export interface SectionMeta {
  key: string;
  label: string;
  emoji: string;
  /** When set, the section is toggleable via `settings.sections[page][toggle]`.
   *  Unset = always shown (still reorderable). */
  toggle?: string;
}

export const HOME_SECTIONS: SectionMeta[] = [
  { key: "reminders",   label: "date reminders", emoji: "🎀" },
  { key: "hero",        label: "you two",        emoji: "💞" },
  { key: "timer",       label: "live timer",     emoji: "⏱", toggle: "showTimer" },
  { key: "onthisday",   label: "on this day",    emoji: "📆" },
  { key: "memorycards", label: "love notes",     emoji: "💌", toggle: "showMemoryCards" },
  { key: "explore",     label: "explore",        emoji: "🧭" },
  { key: "buttons",     label: "quick links",    emoji: "🔗" },
  { key: "voice",       label: "voice notes",    emoji: "🎙", toggle: "showVoiceNotes" },
  { key: "capsule",     label: "capsule teaser", emoji: "🔒", toggle: "showCapsuleTeaser" },
  { key: "final",       label: "love letters",   emoji: "📖", toggle: "showFinal" },
];

/**
 * Resolve the effective render order: the user's saved order first (filtered to
 * keys that still exist), then any canonical keys they don't list appended in
 * canonical order — so newly-added sections always appear, and stale keys are
 * dropped. Empty/undefined saved order → canonical order unchanged.
 */
export function orderedKeys(canonical: string[], saved?: string[]): string[] {
  if (!saved || saved.length === 0) return canonical;
  const valid = new Set(canonical);
  const inOrder = saved.filter(k => valid.has(k));
  const seen = new Set(inOrder);
  return [...inOrder, ...canonical.filter(k => !seen.has(k))];
}
