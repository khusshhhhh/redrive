import type { IllustrationName } from "@/app/components/Illustration";

// Maps an editorial category to one of the shared monochrome line
// illustrations. Keeps the newsroom, blog and help index visually consistent
// without hand-tagging every article.
export function illustrationForCategory(category: string): IllustrationName {
  const key = category.toLowerCase();
  if (key.includes("privacy") || key.includes("deletion")) return "document-lock";
  if (key.includes("security") || key.includes("trust") || key.includes("safety")) return "shield-check";
  if (key.includes("payment") || key.includes("payout") || key.includes("quote")) return "document-lock";
  if (key.includes("booking") || key.includes("search") || key.includes("road") || key.includes("trip")) return "route-map";
  if (key.includes("message") || key.includes("product")) return "chat-bubbles";
  if (key.includes("hosting")) return "handover-keys";
  return "announcement";
}
