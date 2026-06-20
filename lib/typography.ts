/**
 * Shared font-family tokens.
 *
 * These used to be re-declared at the top of every component (~30 files).
 * Source of truth lives here so a font swap is one edit.
 */

export const SERIF  = `"Georgia","Times New Roman",serif`;
export const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
export const SCRIPT = `var(--font-caveat),"Caveat",cursive`;
export const MONO   = `"Courier New",Courier,monospace`;
/** Editorial display face (Playfair Display, loaded in the root layout). Used
 *  for big "wrapped"-style numbers and headlines. */
export const DISPLAY = `var(--font-playfair),"Playfair Display","Georgia",serif`;
