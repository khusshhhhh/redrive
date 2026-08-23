import type { Metadata } from "next";

import { siteUrl } from "@/app/libs/siteUrl";

const DEFAULT_SOCIAL_IMAGE = "/opengraph-image";

type SeoMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string | null;
  imageAlt?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  category?: string;
};

export function buildSeoMetadata({
  title,
  description,
  path,
  keywords = [],
  image,
  imageAlt,
  type = "website",
  publishedTime,
  modifiedTime,
  category,
}: SeoMetadataInput): Metadata {
  const canonicalPath = path.startsWith("/") ? path : `/${path}`;
  const canonicalUrl = new URL(canonicalPath, siteUrl).toString();
  const socialImage = image || DEFAULT_SOCIAL_IMAGE;
  const socialImageAlt = imageAlt || `${title} on Redrive`;
  const openGraphImage = image
    ? { url: socialImage, alt: socialImageAlt }
    : { url: socialImage, width: 1200, height: 630, alt: socialImageAlt };

  return {
    title,
    description,
    keywords: [...new Set([...keywords, "Redrive", "vehicle sharing Australia"])],
    category,
    alternates: {
      canonical: canonicalUrl,
      languages: { "en-AU": canonicalUrl },
    },
    openGraph: {
      type,
      locale: "en_AU",
      siteName: "Redrive",
      title,
      description,
      url: canonicalUrl,
      images: [openGraphImage],
      ...(type === "article" ? { publishedTime, modifiedTime, authors: ["Redrive"] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: socialImage, alt: socialImageAlt }],
    },
  };
}
