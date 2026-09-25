import { siteUrl } from "@/app/libs/siteUrl";

/**
 * Shared schema.org (JSON-LD) building blocks. Every page-level graph links back
 * to the one Organization / WebSite node declared in the root layout by `@id`,
 * so Google and answer engines resolve a single Redrive entity instead of a new
 * anonymous "Organization" per page.
 */

export const ORGANIZATION_ID = `${siteUrl}/#organization`;
export const WEBSITE_ID = `${siteUrl}/#website`;

export const ORGANIZATION_DESCRIPTION =
  "Redrive is an Australian peer-to-peer vehicle hire marketplace. Guests rent utes, vans, cars and campervans directly from local owners at one all-in daily price; owners list their vehicles for free and set their own price and availability.";

export type JsonLdNode = Record<string, unknown>;

export type Faq = { q: string; a: string };

export type Crumb = { name: string; path: string };

/** Serialise for a `<script type="application/ld+json">` without letting `</script>` break out. */
export function serializeJsonLd(data: JsonLdNode | JsonLdNode[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return new URL(path.startsWith("/") ? path : `/${path}`, siteUrl).toString();
}

export function faqPageNode(faqs: Faq[], id?: string): JsonLdNode {
  return {
    "@type": "FAQPage",
    ...(id ? { "@id": id } : {}),
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
}

export function breadcrumbNode(crumbs: Crumb[]): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function graph(...nodes: JsonLdNode[]): JsonLdNode {
  return { "@context": "https://schema.org", "@graph": nodes };
}
