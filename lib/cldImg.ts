/**
 * Centralised Cloudinary image/video URL helpers.
 *
 * Inserts the `f_auto,q_auto,w_<W>,h_<H>,c_<crop>` transformation segment
 * after `/upload/` so we don't ship full-resolution originals to mobile.
 *
 * Why this matters: a 4K phone photo is ~5 MB. Squeezed to a 280-px thumb
 * with auto-format + auto-quality, it's ~25 KB — 200× smaller, identical
 * visual result on mobile.
 *
 * Falls through unchanged for non-Cloudinary URLs (e.g. external posters).
 */

export type Crop = "fill" | "fit" | "scale" | "thumb" | "crop";

interface ImgOpts {
  /** Target width in CSS pixels. The browser handles DPR via srcset. */
  w?: number;
  /** Target height in CSS pixels (optional). */
  h?: number;
  /** Crop strategy when both w & h set. Default `fill` (matches CSS object-fit:cover). */
  crop?: Crop;
  /** Override `q_auto` (e.g. `auto:eco` for very low-bandwidth thumbs). */
  quality?: string;
  /** Pull a single frame from a video and treat as an image (for previews/posters). */
  videoFrame?: boolean;
}

const isCld = (src: string) => /res\.cloudinary\.com\/.+\/upload\//.test(src);
const isVid = (src: string) => /\.(mp4|mov|webm|m4v|avi)(\?|$)/i.test(src) || /\/video\/upload\//.test(src);

function buildSegment(opts: ImgOpts): string {
  const parts: string[] = [];
  parts.push("f_auto");
  parts.push(`q_${opts.quality ?? "auto"}`);
  if (opts.w) parts.push(`w_${opts.w}`);
  if (opts.h) parts.push(`h_${opts.h}`);
  if (opts.w && opts.h) parts.push(`c_${opts.crop ?? "fill"}`);
  return parts.join(",");
}

/**
 * Cloudinary URL with a derived transformation.
 * - Non-Cloudinary URLs pass through unchanged
 * - Cloudinary video URLs are converted to a still-frame JPG when `videoFrame` is set
 */
export function cldImg(src: string | undefined | null, opts: ImgOpts = {}): string {
  if (!src) return "";
  if (!isCld(src)) return src;
  const seg = buildSegment(opts);

  if (isVid(src) && opts.videoFrame) {
    // /video/upload/<seg>/so_0/...jpg
    return src
      .replace("/video/upload/", `/video/upload/${seg},so_0/`)
      .replace(/\.(mp4|mov|webm|m4v|avi)(\?|$)/i, ".jpg$2");
  }

  return src.replace("/upload/", `/upload/${seg}/`);
}

/** Generate a srcset string for responsive images. Widths default to common breakpoints. */
export function cldSrcSet(
  src: string | undefined | null,
  widths: number[] = [320, 480, 640, 960, 1280],
  opts: Omit<ImgOpts, "w"> = {},
): string {
  if (!src || !isCld(src)) return "";
  return widths.map(w => `${cldImg(src, { ...opts, w })} ${w}w`).join(", ");
}

/** Small thumbnail with low quality — perfect for grids of memory cards. */
export function cldThumb(src: string | undefined | null, size = 280): string {
  return cldImg(src, { w: size, h: size, crop: "fill", quality: "auto:eco", videoFrame: true });
}

/** Hero / detail-view image — full visual quality, capped width. */
export function cldHero(src: string | undefined | null, w = 1200): string {
  return cldImg(src, { w });
}
