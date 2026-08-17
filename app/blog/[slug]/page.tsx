import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticlePage from "@/app/components/content/ArticlePage";
import { blogPosts, findArticle } from "@/app/content/editorial";

export function generateStaticParams() { return blogPosts.map((article) => ({ slug: article.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = findArticle(blogPosts, slug);
  return article ? { title: article.title, description: article.description, keywords: [article.category, "vehicle hire Australia", "Redrive", "Australian road trips"] } : {};
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = findArticle(blogPosts, slug);
  if (!article) notFound();
  return <ArticlePage article={article} backHref="/blog" backLabel="Redrive Journal" sectionLabel="Guide" />;
}
