import type { MetadataRoute } from "next";

/**
 * PWA manifest — makes the app installable ("Add to Home Screen") so it opens
 * standalone like a native app. A service worker already exists (public/sw.js)
 * for push; this adds installability. Next serves it at /manifest.webmanifest
 * and links it automatically.
 */
export default function manifest(): MetadataRoute.Manifest {
  const name = process.env.NEXT_PUBLIC_APP_NAME ?? "Us";
  return {
    name: `${name} 💗`,
    short_name: name,
    description: "Your private little world, together.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff1f2",
    theme_color: "#ec4899",
    orientation: "portrait",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
