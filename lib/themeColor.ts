/**
 * Custom accent colour.
 *
 * The five built-in themes are CSS classes on <html> that set a family of
 * `--pink*` variables — and crucially, they set *different* values in light vs
 * dark mode. A couple can instead pick ANY colour; we derive the whole family
 * from that single hex and set them as inline overrides on <html> (which win
 * over the theme class).
 *
 * The derivation is **mode-aware**: in light mode the soft tints go toward
 * white; in dark mode they go toward black and we also tint the base
 * (`--cream`/`--rose`) dark with light text — matching how the preset dark
 * themes behave, so a custom colour works exactly like a built-in one in both
 * modes. Passing null removes every override so the chosen theme class takes
 * back over.
 */

// Every var we might set, so we can fully clear before (re)applying — otherwise
// switching light↔dark could leave a stale light `--cream` override in dark.
const VARS = [
  "--pink", "--pink-deep", "--pink-mid", "--pink-light", "--rose",
  "--cream", "--text", "--muted",
  "--pink-rgb", "--pink-deep-rgb", "--pink-mid-rgb", "--pink-light-rgb", "--cream-rgb",
] as const;

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB | null {
  const m = hex.trim().replace(/^#/, "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

/** Linear blend of two colours. amt=0 → a, amt=1 → b. */
function mix(a: RGB, b: RGB, amt: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * amt),
    Math.round(a[1] + (b[1] - a[1]) * amt),
    Math.round(a[2] + (b[2] - a[2]) * amt),
  ];
}

const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];
const rgbStr = (c: RGB) => `${c[0]}, ${c[1]}, ${c[2]}`;
const rgbCss = (c: RGB) => `rgb(${rgbStr(c)})`;

const ACCENT_CACHE_KEY = "ann_accent_vars";

// Remember the chosen hex so we can re-derive when the light/dark mode flips.
let currentHex: string | null = null;

function deriveVars(base: RGB, dark: boolean): Record<string, string> {
  if (!dark) {
    const deep  = mix(base, BLACK, 0.22);
    const mid   = mix(base, WHITE, 0.55);
    const light = mix(base, WHITE, 0.86);
    const rose  = mix(base, WHITE, 0.92);
    return {
      "--pink": rgbCss(base),
      "--pink-deep": rgbCss(deep),
      "--pink-mid": rgbCss(mid),
      "--pink-light": rgbCss(light),
      "--rose": rgbCss(rose),
      "--pink-rgb": rgbStr(base),
      "--pink-deep-rgb": rgbStr(deep),
      "--pink-mid-rgb": rgbStr(mid),
      "--pink-light-rgb": rgbStr(light),
    };
  }
  // Dark mode: keep the accent vivid, tint the surfaces toward black, and use a
  // light accent-tinted text — mirroring the built-in dark themes.
  const deep  = mix(base, WHITE, 0.10);   // slightly brighter so it pops on dark
  const mid   = mix(base, BLACK, 0.64);
  const light = mix(base, BLACK, 0.80);
  const rose  = mix(base, BLACK, 0.90);
  const cream = mix(base, BLACK, 0.93);
  const text  = mix(base, WHITE, 0.86);
  const muted = mix(base, WHITE, 0.55);
  return {
    "--pink": rgbCss(base),
    "--pink-deep": rgbCss(deep),
    "--pink-mid": rgbCss(mid),
    "--pink-light": rgbCss(light),
    "--rose": rgbCss(rose),
    "--cream": rgbCss(cream),
    "--text": rgbCss(text),
    "--muted": rgbCss(muted),
    "--pink-rgb": rgbStr(base),
    "--pink-deep-rgb": rgbStr(deep),
    "--pink-mid-rgb": rgbStr(mid),
    "--pink-light-rgb": rgbStr(light),
    "--cream-rgb": rgbStr(cream),
  };
}

/** Apply (or clear) a custom accent colour on the document root. */
export function applyAccent(hex: string | null | undefined): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  currentHex = hex || null;

  // Always clear first so no stale (wrong-mode) override lingers.
  VARS.forEach((v) => root.style.removeProperty(v));

  if (!hex) {
    try { localStorage.removeItem(ACCENT_CACHE_KEY); } catch {}
    return;
  }
  const base = hexToRgb(hex);
  if (!base) return;

  const dark = root.classList.contains("dark");
  const vars = deriveVars(base, dark);
  for (const [k, val] of Object.entries(vars)) root.style.setProperty(k, val);
  try { localStorage.setItem(ACCENT_CACHE_KEY, JSON.stringify(vars)); } catch {}
}

/** Re-derive the current accent for the active light/dark mode — call after the
 *  mode is toggled so a custom accent stays correct. No-op if none is set. */
export function reapplyAccent(): void {
  if (currentHex) applyAccent(currentHex);
}

/** A valid 3- or 6-digit hex (with or without leading #). */
export function isValidHex(hex: string): boolean {
  return hexToRgb(hex) !== null;
}
