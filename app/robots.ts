import type { MetadataRoute } from "next";

import { siteUrl } from "@/app/libs/siteUrl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/profile", "/trips", "/messages"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
