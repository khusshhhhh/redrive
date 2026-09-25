import type { MetadataRoute } from "next";

import { siteUrl } from "@/app/libs/siteUrl";

// Signed-in / transactional surfaces. Nothing here is useful in a search result
// or an AI answer, and crawling it only burns crawl budget on login redirects.
const PRIVATE_PATHS = [
  "/api/",
  "/admin",
  "/profile",
  "/trips",
  "/reservations",
  "/properties",
  "/favorites",
  "/messages",
  "/confirm-reservation",
  "/review",
  "/edit-utility",
  // Anchored: a bare "/host" prefix would also block the public /hosting-resources.
  "/host$",
  "/host/",
  "/compare",
  "/forgot-password",
  "/reset-password",
  "/listings/*/images",
];

// Search and answer-engine crawlers are named explicitly (GEO): being quotable
// by ChatGPT search, Perplexity, Claude, Gemini, Copilot and Apple Intelligence
// requires their crawlers to be allowed, and an explicit group makes the intent
// unambiguous if the catch-all rule is ever tightened.
const AI_CRAWLERS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "meta-externalagent",
  "DuckAssistBot",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: AI_CRAWLERS, allow: ["/", "/llms.txt", "/llms-full.txt"], disallow: PRIVATE_PATHS },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
