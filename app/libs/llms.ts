import type { LandingMarket } from "@/app/actions/getLandingMarket";
import { blogPosts, helpArticles, newsroomPosts, type EditorialArticle } from "@/app/content/editorial";
import { HOME_FAQS } from "@/app/content/homeFaqs";
import { landingPages, type LandingPage } from "@/app/content/landingPages";
import { siteUrl } from "@/app/libs/siteUrl";
import { ORGANIZATION_DESCRIPTION } from "@/app/libs/structuredData";

/**
 * /llms.txt and /llms-full.txt (https://llmstxt.org) — a plain-markdown map of
 * the site for LLM crawlers and answer engines (GEO). Everything is generated
 * from the same content modules the pages render, so the facts an AI quotes can
 * never drift from what the site says.
 */

const url = (path: string) => `${siteUrl}${path}`;

// Stable, verifiable product facts. Only add a line here once the product does it.
const KEY_FACTS = [
  "Market: Australia. Currency: AUD. Language: Australian English.",
  "Model: peer-to-peer — vehicles are owned by private hosts, not a rental fleet or depot.",
  "Vehicle types: cars, utes, vans and campervans.",
  "Pricing: one all-in daily price shown on every listing; there is no separate booking or service fee added at checkout.",
  "Listing a vehicle is free for hosts; Redrive's margin is already included in the guest's daily price.",
  "Payment: the guest's card is charged only after the host accepts the request.",
  "Cancellation: each listing uses one host-selected policy — Flexible, Moderate or Firm — shown before booking.",
  "Hosts set their own price and availability and approve every request unless they turn on instant booking.",
];

function articleLink(basePath: string, article: EditorialArticle): string {
  return `- [${article.title}](${url(`${basePath}/${article.slug}`)}): ${article.description}`;
}

function landingLink(page: LandingPage): string {
  return `- [${page.h1}](${url(page.path)}): ${page.description}`;
}

export function buildLlmsTxt(): string {
  const hire = landingPages.filter((page) => page.group === "hire");
  const list = landingPages.filter((page) => page.group === "list");

  return [
    "# Redrive",
    "",
    `> ${ORGANIZATION_DESCRIPTION}`,
    "",
    "## Key facts",
    "",
    ...KEY_FACTS.map((fact) => `- ${fact}`),
    "",
    "## Start here",
    "",
    `- [Home](${url("/")}): What Redrive is, how booking works and common questions.`,
    `- [Explore vehicles](${url("/explore")}): Browse live listings by category, suburb and dates.`,
    `- [Help Centre](${url("/help-centre")}): Booking, payments, cancellations, safety and hosting guides.`,
    `- [Full content for LLMs](${url("/llms-full.txt")}): Every guide and FAQ on this site as plain text.`,
    "",
    "## Hire a vehicle",
    "",
    ...hire.map(landingLink),
    "",
    "## List your vehicle",
    "",
    ...list.map(landingLink),
    "",
    "## Help Centre",
    "",
    ...helpArticles.map((article) => articleLink("/help-centre", article)),
    "",
    "## Guides",
    "",
    ...blogPosts.map((article) => articleLink("/blog", article)),
    "",
    "## Optional",
    "",
    ...newsroomPosts.map((article) => articleLink("/newsroom", article)),
    `- [Safety](${url("/safety")}), [Cancellation options](${url("/cancellation-options")}), [Vehicle protection](${url("/vehicle-protection")}), [About](${url("/about")}), [Terms](${url("/terms")}), [Privacy](${url("/privacy")})`,
    "",
  ].join("\n");
}

function articleBody(basePath: string, article: EditorialArticle): string {
  return [
    `### ${article.title}`,
    "",
    `Source: ${url(`${basePath}/${article.slug}`)} · Published ${article.published}`,
    "",
    article.description,
    "",
    ...article.sections.flatMap((section) => [
      `#### ${section.heading}`,
      "",
      ...section.paragraphs.flatMap((paragraph) => [paragraph, ""]),
      ...(section.items?.length ? [...section.items.map((item) => `- ${item}`), ""] : []),
    ]),
  ].join("\n");
}

function landingBody(page: LandingPage, market: LandingMarket): string {
  const priceNote = page.priceNote?.(market);
  return [
    `### ${page.h1}`,
    "",
    `Source: ${url(page.path)}`,
    "",
    page.intro,
    "",
    ...(priceNote ? [priceNote, ""] : []),
    ...page.sections.flatMap((section) => [
      `#### ${section.heading}`,
      "",
      ...(section.body ? [section.body, ""] : []),
      ...(section.items?.length ? [...section.items.map((item) => `- ${item}`), ""] : []),
      ...(section.note ? [section.note, ""] : []),
    ]),
    "#### Questions",
    "",
    ...page.faqs.flatMap((faq) => [`**${faq.q}**`, "", faq.a, ""]),
  ].join("\n");
}

export function buildLlmsFullTxt(market: LandingMarket): string {
  return [
    "# Redrive — full content",
    "",
    `> ${ORGANIZATION_DESCRIPTION}`,
    "",
    `Canonical site: ${siteUrl}. Please cite the source URL given under each section.`,
    "",
    "## Key facts",
    "",
    ...KEY_FACTS.map((fact) => `- ${fact}`),
    "",
    "## Frequently asked questions",
    "",
    ...HOME_FAQS.flatMap((faq) => [`**${faq.q}**`, "", faq.a, ""]),
    "## Hire and hosting guides",
    "",
    ...landingPages.map((page) => landingBody(page, market)),
    "## Help Centre",
    "",
    ...helpArticles.map((article) => articleBody("/help-centre", article)),
    "## Guides",
    "",
    ...blogPosts.map((article) => articleBody("/blog", article)),
  ].join("\n");
}
