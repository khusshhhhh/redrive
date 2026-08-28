import type { Metadata } from "next";
import EditorialIndex from "@/app/components/content/EditorialIndex";
import { newsroomPosts } from "@/app/content/editorial";
import { buildSeoMetadata } from "@/app/libs/seo";

// Bundled editorial content — render as a static CDN asset.
export const dynamic = "force-static";

export const metadata: Metadata = buildSeoMetadata({
  title: "Redrive Newsroom",
  description: "Read Redrive product announcements, trust and safety updates, marketplace improvements and company news.",
  path: "/newsroom",
  keywords: ["Redrive news", "vehicle sharing product updates", "marketplace safety updates"],
  category: "Company news",
});

export default function NewsroomPage() {
  return <EditorialIndex eyebrow="Redrive Newsroom" title="Product updates and company news" intro="Dated, factual updates about the Redrive marketplace, its safety tools and improvements for Australian guests and hosts." baseHref="/newsroom" articles={newsroomPosts} featuredLabel="Latest update" />;
}
