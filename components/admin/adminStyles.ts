import type { CSSProperties } from "react";

/** Shared dashboard styling — neutral/utilitarian, driven by the app's CSS
 *  variables so it adapts to light/dark + custom accents (never hardcode hex). */

export const card: CSSProperties = {
  background: "var(--cal-card-bg, var(--cream, #fff))",
  border: "1px solid color-mix(in srgb, var(--text, #333) 12%, transparent)",
  borderRadius: 14,
  padding: "1rem 1.25rem",
};

export const muted: CSSProperties = { color: "var(--muted, #888)" };

export const th: CSSProperties = {
  textAlign: "left",
  padding: "0.5rem 0.75rem",
  fontSize: "0.72rem",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--muted, #888)",
  borderBottom: "1px solid color-mix(in srgb, var(--text, #333) 12%, transparent)",
  whiteSpace: "nowrap",
};

export const td: CSSProperties = {
  padding: "0.6rem 0.75rem",
  fontSize: "0.88rem",
  borderBottom: "1px solid color-mix(in srgb, var(--text, #333) 7%, transparent)",
  verticalAlign: "top",
};

export const pill = (accent = "var(--pink, #d6608a)"): CSSProperties => ({
  display: "inline-block",
  padding: "0.1rem 0.5rem",
  borderRadius: 999,
  fontSize: "0.72rem",
  fontWeight: 600,
  color: accent,
  background: `color-mix(in srgb, ${accent} 14%, transparent)`,
  whiteSpace: "nowrap",
});

/** "3m ago", "5h ago", "2d ago", or a date for older — from an ISO/date string. */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(t)) return String(iso);
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(t).toLocaleDateString();
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(t)) return String(iso);
  return new Date(t).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
