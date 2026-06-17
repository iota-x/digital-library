/**
 * Custom accent colour.
 *
 * The five built-in themes are CSS classes on <html> that set a family of
 * `--pink*` variables. A couple can instead pick ANY colour; we derive the
 * whole family from that single hex (a darker "deep", lighter "mid", and very
 * light "light"/"rose" tints) and set them as inline overrides on <html>,
 * which win over the theme class. Passing null removes the overrides so the
 * chosen theme class takes back over.
 */

const VARS = [
  "--pink", "--pink-deep", "--pink-mid", "--pink-light", "--rose",
  "--pink-rgb", "--pink-deep-rgb", "--pink-mid-rgb", "--pink-light-rgb",
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

/** Apply (or clear) a custom accent colour on the document root. */
export function applyAccent(hex: string | null | undefined): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!hex) { VARS.forEach((v) => root.style.removeProperty(v)); return; }
  const base = hexToRgb(hex);
  if (!base) return;

  const deep  = mix(base, BLACK, 0.22);
  const mid   = mix(base, WHITE, 0.55);
  const light = mix(base, WHITE, 0.86);
  const rose  = mix(base, WHITE, 0.92);

  root.style.setProperty("--pink", rgbCss(base));
  root.style.setProperty("--pink-deep", rgbCss(deep));
  root.style.setProperty("--pink-mid", rgbCss(mid));
  root.style.setProperty("--pink-light", rgbCss(light));
  root.style.setProperty("--rose", rgbCss(rose));
  root.style.setProperty("--pink-rgb", rgbStr(base));
  root.style.setProperty("--pink-deep-rgb", rgbStr(deep));
  root.style.setProperty("--pink-mid-rgb", rgbStr(mid));
  root.style.setProperty("--pink-light-rgb", rgbStr(light));
}

/** A valid 3- or 6-digit hex (with or without leading #). */
export function isValidHex(hex: string): boolean {
  return hexToRgb(hex) !== null;
}
