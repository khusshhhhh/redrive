import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticlePage from "@/app/components/content/ArticlePage";
import { findArticle, newsroomPosts } from "@/app/content/editorial";

export function generateStaticParams() { return newsroomPosts.map((article) => ({ slug: article.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = findArticle(newsroomPosts, slug);
  return article ? { title: article.title, description: article.description } : {};
}

export default async function NewsroomArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = findArticle(newsroomPosts, slug);
  if (!article) notFound();
  return <ArticlePage article={article} backHref="/newsroom" backLabel="Newsroom" sectionLabel="Redrive update" />;
}
