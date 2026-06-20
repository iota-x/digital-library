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

/* ── HSL conversion ──────────────────────────────────────────────────────
   Dark surfaces are derived in HSL, not by mixing toward black. Mixing toward
   black desaturates as it darkens, so a mauve/plum surface collapses into an
   ambiguous near-black that reads "purple". Setting a target lightness while
   *keeping* the accent's hue + a healthy saturation yields a rich, clearly
   on-theme dark plum (think deep wine) instead. */
function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb(h: number, s: number, l: number): RGB {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}
/** A dark surface tinted by the accent. The background should read mostly
 *  neutral-dark (so the accent lives in text/buttons, not the whole page) — so
 *  we keep the accent's hue but use only a *fraction* of its saturation. A pure
 *  mix-to-black would instead desaturate unevenly and look muddy. */
function surface(base: RGB, lightness: number, sat = 0.18): RGB {
  const [h, s] = rgbToHsl(base);
  return hslToRgb(h, Math.min(sat, Math.max(0.06, s * 0.4)), lightness);
}

const ACCENT_CACHE_KEY = "ann_accent_vars";

// Remember the chosen hex so we can re-derive when the light/dark mode flips.
let currentHex: string | null = null;

function deriveVars(base: RGB, dark: boolean): Record<string, string> {
  if (!dark) {
    // Light mode: backgrounds stay near-white (the accent shows in text/buttons,
    // not as a wash over the whole page), so the surfaces sit very close to white.
    const deep  = mix(base, BLACK, 0.22);
    const mid   = mix(base, WHITE, 0.55);
    const light = mix(base, WHITE, 0.93);
    const rose  = mix(base, WHITE, 0.965);
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
  // Dark mode: keep the accent vivid for text/buttons, but the surfaces are
  // mostly neutral-dark with only a faint accent tint (so the page doesn't read
  // as a saturated purple/blue wash). Cards carry slightly more tint than the
  // page background so panels still separate from the page.
  const deep  = mix(base, WHITE, 0.10);   // slightly brighter so it pops on dark
  const mid   = surface(base, 0.19, 0.24); // card / mid surface — a touch warmer
  const light = surface(base, 0.13, 0.20); // raised panel
  const rose  = surface(base, 0.09, 0.16); // near-page tint
  const cream = surface(base, 0.07, 0.14); // page background — most neutral
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

// Second accent (gradient theme partner colour), remembered for re-derivation.
let currentHex2: string | null = null;

/**
 * Apply (or clear) a custom accent colour on the document root.
 *
 * `hex2` (optional) turns it into a two-tone **gradient theme**: the vivid
 * `--pink-deep` (and its rgb) is overridden to `hex2`, so every accent gradient
 * in the UI — `linear-gradient(…, var(--pink), var(--pink-deep))` on buttons,
 * pills, hearts — blends `hex → hex2`. Surfaces still derive from the primary
 * `hex`, so backgrounds stay coherent.
 */
export function applyAccent(hex: string | null | undefined, hex2?: string | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  currentHex = hex || null;
  currentHex2 = hex2 || null;

  // Always clear first so no stale (wrong-mode) override lingers.
  VARS.forEach((v) => root.style.removeProperty(v));

  if (!hex) {
    try { localStorage.removeItem(ACCENT_CACHE_KEY); } catch {}
    return;
  }
  const base = hexToRgb(hex);
  if (!base) return;

  const dark = root.classList.contains("dark");
  const vars = { ...deriveVars(base, dark) };

  // Gradient theme: override the deep accent with the second colour so the
  // app's two-stop accent gradients become a real two-colour blend.
  const second = hex2 ? hexToRgb(hex2) : null;
  if (second) {
    vars["--pink-deep"] = rgbCss(second);
    vars["--pink-deep-rgb"] = rgbStr(second);
  }

  for (const [k, val] of Object.entries(vars)) root.style.setProperty(k, val);
  try { localStorage.setItem(ACCENT_CACHE_KEY, JSON.stringify(vars)); } catch {}
}

/** Re-derive the current accent for the active light/dark mode — call after the
 *  mode is toggled so a custom accent stays correct. No-op if none is set. */
export function reapplyAccent(): void {
  if (currentHex) applyAccent(currentHex, currentHex2);
}

/** A valid 3- or 6-digit hex (with or without leading #). */
export function isValidHex(hex: string): boolean {
  return hexToRgb(hex) !== null;
}
