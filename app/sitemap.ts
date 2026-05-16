import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://seoagent.techgeekstudio.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: APP_URL, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${APP_URL}/pricing`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${APP_URL}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${APP_URL}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${APP_URL}/forgot-password`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
