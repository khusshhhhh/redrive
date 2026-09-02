import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import Illustration from "@/app/components/Illustration";
import { siteUrl } from "@/app/libs/siteUrl";
import type { LandingMarket } from "@/app/actions/getLandingMarket";
import type { LandingPage } from "@/app/content/landingPages";

interface LandingPageViewProps {
  page: LandingPage;
  market: LandingMarket;
}

export default function LandingPageView({ page, market }: LandingPageViewProps) {
  const url = `${siteUrl}${page.path}`;
  const priceNote = page.priceNote?.(market);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": `${url}#business`,
        name: `Redrive — ${page.h1}`,
        url,
        description: page.description,
        parentOrganization: { "@id": `${siteUrl}/#organization` },
        areaServed: { "@type": "Place", name: `${page.areaServed}, Australia` },
        knowsLanguage: "en-AU",
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: page.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Redrive", item: siteUrl },
          {
            "@type": "ListItem",
            position: 2,
            name: page.group === "list" ? "List your vehicle" : "Vehicle hire",
            item: `${siteUrl}/${page.group === "list" ? "host" : "explore"}`,
          },
          { "@type": "ListItem", position: 3, name: page.h1, item: url },
        ],
      },
    ],
  };

  return (
    <main className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />

      {/* Hero */}
      <section className="border-b border-hairline-soft bg-white">
        <div className="mx-auto grid max-w-[1180px] items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-10 lg:py-32">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500" />
              {page.eyebrow}
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.06] tracking-tight text-ink sm:text-6xl">
              {page.h1}
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-muted sm:text-lg">{page.intro}</p>
            {priceNote && (
              <p className="mt-6 max-w-2xl rounded-xl border border-hairline-soft bg-surface-soft/40 p-5 text-sm leading-7 text-body">
                {priceNote}
              </p>
            )}
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href={page.cta.href}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-primary-active"
              >
                {page.cta.label}
                <ArrowRight size={16} />
              </Link>
              <Link href="/help-centre" className="text-sm font-semibold text-ink underline-offset-4 hover:underline">
                How Redrive works
              </Link>
            </div>
          </div>
          <Illustration
            name={page.illustration}
            width={360}
            priority
            className="mx-auto hidden h-auto w-full max-w-[340px] lg:block"
          />
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-[900px] px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
        {page.sections.map((section) => (
          <article key={section.heading} className="border-b border-hairline-soft py-12 first:pt-0">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">{section.heading}</h2>
            {section.body && <p className="mt-5 text-[15px] leading-8 text-body sm:text-base">{section.body}</p>}
            {section.items && (
              <ul className="mt-7 grid gap-3 rounded-xl border border-hairline-soft p-6 sm:grid-cols-2">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-body">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-hairline-soft text-primary">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            )}
            {section.note && <p className="mt-6 text-[15px] leading-8 text-body sm:text-base">{section.note}</p>}
          </article>
        ))}

        {/* FAQ */}
        <div className="py-12">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Common questions</h2>
          <div className="mt-6 divide-y divide-hairline-soft border-y border-hairline-soft">
            {page.faqs.map((faq) => (
              <details key={faq.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <ArrowRight
                    size={16}
                    className="shrink-0 text-muted transition group-open:rotate-90"
                  />
                </summary>
                <p className="mt-3 text-[15px] leading-8 text-body">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Internal links / cluster */}
        <div className="py-12">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Keep reading</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {page.related.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group rounded-xl border border-hairline-soft bg-white p-5 transition hover:-translate-y-1 hover:border-primary/40"
              >
                <h3 className="font-semibold text-ink group-hover:underline">{link.label}</h3>
                <p className="mt-2 text-xs leading-5 text-muted">{link.hint}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                  Read <ArrowRight size={13} className="transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-hairline-soft bg-white">
        <div className="mx-auto flex max-w-[1180px] flex-col items-start gap-6 px-5 py-16 sm:px-8 sm:py-20 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {page.group === "list" ? "Ready to list your vehicle?" : "Find the right vehicle near you"}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
              {page.group === "list"
                ? "It takes one question at a time, and there is no cost to list."
                : "Filter by suburb and dates, see the full price up front, and message the owner before you book."}
            </p>
          </div>
          <Link
            href={page.cta.href}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-primary-active"
          >
            {page.cta.label}
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
