"use client";
import { useState, type ImgHTMLAttributes } from "react";
import { cldBlur } from "@/lib/cldImg";

/**
 * Drop-in replacement for `<img>` that fades from a tiny blurred
 * placeholder to the full image. Non-Cloudinary URLs fall back to a
 * normal `<img>` (no placeholder available).
 *
 * Defaults to `decoding="async"` + `loading="lazy"` — pass them explicitly
 * to override for above-the-fold heroes.
 */
type Props = ImgHTMLAttributes<HTMLImageElement> & {
  /** Optional override style for the wrapper div. */
  wrapperStyle?: React.CSSProperties;
};

export default function BlurImage({ src, wrapperStyle, style, onLoad, ...rest }: Props) {
  const [loaded, setLoaded] = useState(false);
  const placeholder = typeof src === "string" ? cldBlur(src) : "";

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        lineHeight: 0,
        backgroundImage: placeholder ? `url(${placeholder})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: placeholder ? undefined : "rgba(var(--pink-rgb), 0.08)",
        ...wrapperStyle,
      }}
    >
      <img
        src={src}
        loading="lazy"
        decoding="async"
        onLoad={(e) => { setLoaded(true); onLoad?.(e); }}
        style={{
          opacity: loaded ? 1 : 0,
          transition: "opacity .35s ease",
          display: "block",
          width: "100%",
          height: "100%",
          ...style,
        }}
        {...rest}
      />
    </span>
  );
}
