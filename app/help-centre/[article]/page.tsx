import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ArticlePage from "@/app/components/content/ArticlePage";
import { findArticle, helpArticles } from "@/app/content/editorial";
import { buildSeoMetadata } from "@/app/libs/seo";

export function generateStaticParams() {
  return helpArticles.map((article) => ({ article: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ article: string }> }): Promise<Metadata> {
  const { article: slug } = await params;
  const article = findArticle(helpArticles, slug);
  return article ? buildSeoMetadata({
    title: article.title,
    description: article.description,
    path: `/help-centre/${article.slug}`,
    type: "article",
    publishedTime: article.published,
    modifiedTime: article.published,
    category: article.category,
    keywords: [article.category, "Redrive help", "vehicle sharing support"],
  }) : {};
}

export default async function HelpArticlePage({ params }: { params: Promise<{ article: string }> }) {
  const { article: slug } = await params;
  const article = findArticle(helpArticles, slug);
  if (!article) notFound();
  return <ArticlePage article={article} backHref="/help-centre" backLabel="Help Centre" sectionLabel="Help guide" />;
}
