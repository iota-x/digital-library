import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wearesocuteomg.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  // Only the public landing page is indexable — the rest is private couple data
  // behind auth.
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
