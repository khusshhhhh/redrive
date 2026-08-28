import type { MetadataRoute } from "next";

import { blogPosts, helpArticles, newsroomPosts } from "@/app/content/editorial";
import { siteUrl } from "@/app/libs/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date();
  const coreRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: updated, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/explore`, lastModified: updated, changeFrequency: "daily", priority: 0.95 },
    { url: `${siteUrl}/host`, lastModified: updated, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/help-centre`, lastModified: updated, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/blog`, lastModified: updated, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/newsroom`, lastModified: updated, changeFrequency: "weekly", priority: 0.7 },
    ...["safety", "cancellation-options", "vehicle-protection", "hosting-resources", "about", "careers", "privacy", "terms", "community-standards", "data-security", "account-deletion"].map((path) => ({
      url: `${siteUrl}/${path}`,
      lastModified: updated,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  const articles: MetadataRoute.Sitemap = [
    ...helpArticles.map((article) => ({ url: `${siteUrl}/help-centre/${article.slug}`, lastModified: new Date(`${article.published}T00:00:00`), changeFrequency: "monthly" as const, priority: 0.7 })),
    ...blogPosts.map((article) => ({ url: `${siteUrl}/blog/${article.slug}`, lastModified: new Date(`${article.published}T00:00:00`), changeFrequency: "monthly" as const, priority: 0.7 })),
    ...newsroomPosts.map((article) => ({ url: `${siteUrl}/newsroom/${article.slug}`, lastModified: new Date(`${article.published}T00:00:00`), changeFrequency: "monthly" as const, priority: 0.6 })),
  ];

  return [...coreRoutes, ...articles];
}
