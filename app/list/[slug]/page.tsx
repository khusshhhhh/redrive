import type { Metadata } from "next";
import { notFound } from "next/navigation";

import getLandingMarket from "@/app/actions/getLandingMarket";
import LandingPageView from "@/app/components/seo/LandingPageView";
import { getLandingPage, landingPages } from "@/app/content/landingPages";
import { buildSeoMetadata } from "@/app/libs/seo";

// SEO landing pages: static shell, hourly revalidation for the live price band.
export const revalidate = 3600;

export function generateStaticParams() {
  return landingPages.filter((page) => page.group === "list").map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = getLandingPage("list", slug);
  if (!page) return {};
  return {
    ...buildSeoMetadata({
      title: page.title,
      description: page.description,
      path: page.path,
      keywords: page.keywords,
      category: "Redrive hosting",
    }),
    title: { absolute: page.title },
  };
}

export default async function ListLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getLandingPage("list", slug);
  if (!page) notFound();
  const market = await getLandingMarket();
  return <LandingPageView page={page} market={market} />;
}
