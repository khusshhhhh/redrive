import type { Metadata } from "next";
import EditorialIndex from "@/app/components/content/EditorialIndex";
import { blogPosts } from "@/app/content/editorial";
import { buildSeoMetadata } from "@/app/libs/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Australian vehicle sharing and road-trip guides",
  description: "Practical Redrive guides for peer-to-peer vehicle hire, Australian road trips, safer handovers, hosting and vehicle protection.",
  path: "/blog",
  keywords: ["Australian road trip guides", "vehicle sharing tips", "car hire advice", "hosting a vehicle"],
  category: "Travel guides",
});

export default function BlogPage() {
  return <EditorialIndex eyebrow="Redrive Journal" title="Useful ideas for better shared-vehicle journeys" intro="Original guides for Australian guests and hosts—from choosing the right vehicle to preparing for handover and planning the road ahead." baseHref="/blog" articles={blogPosts} featuredLabel="Featured guide" />;
}
