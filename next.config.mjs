/** @type {import('next').NextConfig} */

// Content-Security-Policy covering the app's real origins (Cloudinary media,
// Carto map tiles, iTunes poster art, Spotify embeds, Vercel analytics, the
// Google web font the PDF export imports). All third-party APIs (Spotify, Jikan,
// iTunes, Open-Meteo, ipwho.is) are fetched from server-side API routes, so they
// need no connect-src entry. ENFORCED — the browser blocks anything not listed;
// the directives below were reconciled against every external resource the
// client actually loads. If a future feature adds a new origin, watch the
// console for a CSP error and add it here (or roll back to
// `Content-Security-Policy-Report-Only` while diagnosing). Tightening script-src
// to a nonce (dropping 'unsafe-inline') is the eventual goal — it's what most
// protects the in-session E2EE key from an injected script — but the inline
// theme/perf bootstrap in app/layout.tsx relies on 'unsafe-inline' today.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  // fonts.googleapis.com: PDF export (ExportPDF) opens a blank window that
  // inherits this CSP and @imports a stylesheet from there.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://res.cloudinary.com https://*.basemaps.cartocdn.com https://*.mzstatic.com",
  "media-src 'self' blob: https://res.cloudinary.com",
  "connect-src 'self' https://api.cloudinary.com https://va.vercel-scripts.com",
  "frame-src https://open.spotify.com",
  // fonts.gstatic.com: the actual font files behind the googleapis.com @import.
  "font-src 'self' data: https://fonts.gstatic.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  // Force HTTPS for two years (Vercel serves HTTPS). Safe once on a domain.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Voice notes need the mic; the map may use geolocation. Camera is never used.
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(self)" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
