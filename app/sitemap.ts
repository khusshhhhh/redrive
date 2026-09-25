import type { MetadataRoute } from "next";

import { blogPosts, helpArticles, newsroomPosts } from "@/app/content/editorial";
import { landingPages } from "@/app/content/landingPages";
import { logger } from "@/app/libs/logger";
import prisma from "@/app/libs/prismadb";
import { siteUrl } from "@/app/libs/siteUrl";

// Regenerated hourly so new listings reach Google (and AI search indexes that
// seed from it) without a deploy.
export const revalidate = 3600;

// Google caps a single sitemap at 50k URLs; stay well inside it.
const MAX_LISTINGS = 20_000;

async function listingEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const listings = await prisma.listing.findMany({
      select: { id: true, createdAt: true, imageSrcs: true },
      orderBy: { createdAt: "desc" },
      take: MAX_LISTINGS,
    });
    return listings.map((listing) => ({
      url: `${siteUrl}/listings/${listing.id}`,
      lastModified: listing.createdAt,
      changeFrequency: "daily" as const,
      priority: 0.75,
      images: listing.imageSrcs.slice(0, 3),
    }));
  } catch (error) {
    // No database at build time (CI) must not fail the build; the static routes
    // still ship and the next revalidation fills listings in.
    logger.warn("sitemap_listings_unavailable", { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const updated = new Date();
  const coreRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: updated, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/explore`, lastModified: updated, changeFrequency: "daily", priority: 0.95 },
    { url: `${siteUrl}/help-centre`, lastModified: updated, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/blog`, lastModified: updated, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/newsroom`, lastModified: updated, changeFrequency: "weekly", priority: 0.7 },
    ...["safety", "cancellation-options", "vehicle-protection", "hosting-resources", "about", "careers", "privacy", "terms", "community-standards", "data-security", "account-deletion"].map((path) => ({
      url: `${siteUrl}/${path}`,
      lastModified: updated,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...landingPages.map((page) => ({
      url: `${siteUrl}${page.path}`,
      lastModified: updated,
      changeFrequency: "weekly" as const,
      priority: page.group === "list" ? 0.8 : 0.85,
    })),
  ];

  const articles: MetadataRoute.Sitemap = [
    ...helpArticles.map((article) => ({ url: `${siteUrl}/help-centre/${article.slug}`, lastModified: new Date(`${article.published}T00:00:00`), changeFrequency: "monthly" as const, priority: 0.7 })),
    ...blogPosts.map((article) => ({ url: `${siteUrl}/blog/${article.slug}`, lastModified: new Date(`${article.published}T00:00:00`), changeFrequency: "monthly" as const, priority: 0.7 })),
    ...newsroomPosts.map((article) => ({ url: `${siteUrl}/newsroom/${article.slug}`, lastModified: new Date(`${article.published}T00:00:00`), changeFrequency: "monthly" as const, priority: 0.6 })),
  ];

  return [...coreRoutes, ...articles, ...(await listingEntries())];
}
