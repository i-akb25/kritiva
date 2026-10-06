import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://your-domain.example").replace(/\/$/, "");
  return ["", "/privacy", "/terms"].map((path, index) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: index ? "yearly" : "monthly", priority: index ? 0.4 : 1 }));
}
