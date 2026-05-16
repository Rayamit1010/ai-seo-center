import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://seoagent.techgeekstudio.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/login", "/register", "/forgot-password"],
        disallow: [
          "/dashboard",
          "/audit",
          "/keywords",
          "/rank-tracker",
          "/backlinks",
          "/technical",
          "/content",
          "/briefs",
          "/outreach",
          "/agent",
          "/authority",
          "/chat",
          "/projects",
          "/ai-analytics",
          "/ops",
          "/reports",
          "/billing",
          "/settings",
          "/competitors",
          "/api/",
          "/verify-email",
          "/reset-password",
          "/team/",
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
