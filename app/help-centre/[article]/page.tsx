import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ArticlePage from "@/app/components/content/ArticlePage";
import { findArticle, helpArticles } from "@/app/content/editorial";

export function generateStaticParams() {
  return helpArticles.map((article) => ({ article: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ article: string }> }): Promise<Metadata> {
  const { article: slug } = await params;
  const article = findArticle(helpArticles, slug);
  return article ? { title: article.title, description: article.description } : {};
}

export default async function HelpArticlePage({ params }: { params: Promise<{ article: string }> }) {
  const { article: slug } = await params;
  const article = findArticle(helpArticles, slug);
  if (!article) notFound();
  return <ArticlePage article={article} backHref="/help-centre" backLabel="Help Centre" sectionLabel="Help guide" />;
}
