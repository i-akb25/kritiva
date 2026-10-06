import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://your-domain.example").replace(/\/$/, "");
  const routes = ["", "/tools/pipeline", "/tools/svg", "/tools/composer", "/tools/auditor", "/tools/3d", "/tools/ai", "/privacy", "/terms"];
  return routes.map((path, index) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path.startsWith("/tools/") || index === 0 ? "monthly" : "yearly",
    priority: index === 0 ? 1 : path.startsWith("/tools/") ? .7 : .4,
  }));
}
