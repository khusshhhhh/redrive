import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticlePage from "@/app/components/content/ArticlePage";
import { blogPosts, findArticle } from "@/app/content/editorial";
import { buildSeoMetadata } from "@/app/libs/seo";

// Bundled editorial content — prerender every article as a static asset.
export const dynamic = "force-static";

export function generateStaticParams() { return blogPosts.map((article) => ({ slug: article.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = findArticle(blogPosts, slug);
  return article ? buildSeoMetadata({
    title: article.title,
    description: article.description,
    path: `/blog/${article.slug}`,
    type: "article",
    publishedTime: article.published,
    modifiedTime: article.published,
    category: article.category,
    keywords: [article.category, "vehicle hire Australia", "Australian road trips"],
  }) : {};
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = findArticle(blogPosts, slug);
  if (!article) notFound();
  return <ArticlePage article={article} backHref="/blog" backLabel="Redrive Journal" sectionLabel="Guide" />;
}
