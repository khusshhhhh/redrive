import type { Metadata } from "next";
import EditorialIndex from "@/app/components/content/EditorialIndex";
import { newsroomPosts } from "@/app/content/editorial";

export const metadata: Metadata = {
  title: "Newsroom",
  description: "Read Redrive product announcements, trust and safety updates, and company news.",
};

export default function NewsroomPage() {
  return <EditorialIndex eyebrow="Redrive Newsroom" title="Product updates and company news" intro="Dated, factual updates about the Redrive marketplace, its safety tools and improvements for Australian guests and hosts." baseHref="/newsroom" articles={newsroomPosts} featuredLabel="Latest update" />;
}
