import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wearesocuteomg.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Everything else is private (couple data) and behind auth — keep crawlers
      // on the public landing page and out of the API.
      disallow: ["/api/", "/journal", "/shared", "/timeline", "/capsule", "/map", "/together", "/daily", "/play", "/wrapped", "/widget"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
