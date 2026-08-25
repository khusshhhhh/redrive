import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticlePage from "@/app/components/content/ArticlePage";
import { findArticle, newsroomPosts } from "@/app/content/editorial";
import { buildSeoMetadata } from "@/app/libs/seo";

export function generateStaticParams() { return newsroomPosts.map((article) => ({ slug: article.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = findArticle(newsroomPosts, slug);
  return article ? buildSeoMetadata({
    title: article.title,
    description: article.description,
    path: `/newsroom/${article.slug}`,
    type: "article",
    publishedTime: article.published,
    modifiedTime: article.published,
    category: article.category,
    keywords: [article.category, "Redrive newsroom", "vehicle sharing Australia"],
  }) : {};
}

export default async function NewsroomArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = findArticle(newsroomPosts, slug);
  if (!article) notFound();
  return <ArticlePage article={article} backHref="/newsroom" backLabel="Newsroom" sectionLabel="Redrive update" />;
}
