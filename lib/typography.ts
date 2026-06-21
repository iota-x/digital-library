/**
 * Shared font-family tokens.
 *
 * These used to be re-declared at the top of every component (~30 files).
 * Source of truth lives here so a font swap is one edit.
 */

/**
 * Each token routes through an overridable `--ui-*` CSS variable whose fallback
 * is the original stack — so behaviour is unchanged until a font pairing sets
 * those vars (see FONT_PAIRINGS + `html.font-*` rules in globals.css).
 */
export const SERIF  = `var(--ui-serif, "Georgia","Times New Roman",serif)`;
export const SANS   = `var(--ui-sans, var(--font-lato),"Inter",system-ui,sans-serif)`;
export const SCRIPT = `var(--ui-script, var(--font-caveat),"Caveat",cursive)`;
export const MONO   = `"Courier New",Courier,monospace`;
/** Editorial display face (Playfair Display, loaded in the root layout). Used
 *  for big "wrapped"-style numbers and headlines. */
export const DISPLAY = `var(--ui-display, var(--font-playfair),"Playfair Display","Georgia",serif)`;
