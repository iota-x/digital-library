/** @type {import('next').NextConfig} */

// Content-Security-Policy covering the app's real origins (Cloudinary media,
// Carto map tiles, iTunes poster art, Spotify embeds, Vercel analytics).
// Shipped in REPORT-ONLY mode: the browser reports violations to the console but
// nothing is blocked, so it can't break a feature. Once verified clean in a
// browser, rename the header to `Content-Security-Policy` to enforce. Tightening
// script-src to a nonce (dropping 'unsafe-inline') is the eventual goal — it's
// what most protects the in-session E2EE key from an injected script.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://*.basemaps.cartocdn.com https://*.mzstatic.com",
  "media-src 'self' blob: https://res.cloudinary.com",
  "connect-src 'self' https://api.cloudinary.com https://va.vercel-scripts.com",
  "frame-src https://open.spotify.com",
  "font-src 'self' data:",
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
  { key: "Content-Security-Policy-Report-Only", value: csp },
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
