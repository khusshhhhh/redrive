import Link from "next/link";
import { ArrowLeft, Check, Clock3 } from "lucide-react";

import type { EditorialArticle } from "@/app/content/editorial";
import { siteUrl } from "@/app/libs/siteUrl";

interface ArticlePageProps {
  article: EditorialArticle;
  backHref: string;
  backLabel: string;
  sectionLabel: string;
}

export default function ArticlePage({ article, backHref, backLabel, sectionLabel }: ArticlePageProps) {
  const published = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${article.published}T00:00:00`));
  const articleUrl = `${siteUrl}${backHref}/${article.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": backHref === "/help-centre" ? "TechArticle" : "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.published,
    dateModified: article.published,
    mainEntityOfPage: articleUrl,
    author: { "@type": "Organization", name: "Redrive" },
    publisher: { "@type": "Organization", name: "Redrive", url: siteUrl },
  };

  return (
    <main className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <article>
        <header className="border-b border-hairline-soft bg-surface-soft/55">
          <div className="mx-auto max-w-[900px] px-5 py-12 sm:px-8 sm:py-20">
            <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-ink"><ArrowLeft size={16} />{backLabel}</Link>
            <p className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{sectionLabel} · {article.category}</p>
            <h1 className="mt-4 text-3xl font-semibold leading-[1.14] tracking-tight text-ink sm:text-5xl">{article.title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-muted sm:text-lg">{article.description}</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
              <time dateTime={article.published}>{published}</time>
              <span className="flex items-center gap-1.5"><Clock3 size={14} />{article.readTime}</span>
              {article.audience && <span className="rounded-full bg-white px-3 py-1.5 font-medium text-ink">For {article.audience.toLowerCase()}</span>}
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-[1080px] gap-12 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[220px_minmax(0,720px)]">
          <aside className="h-fit lg:sticky lg:top-32">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">In this article</p>
            <nav className="mt-4 flex flex-col border-l border-hairline-soft">
              {article.sections.map((section, index) => <a key={section.heading} href={`#article-section-${index}`} className="border-l-2 border-transparent py-2 pl-4 text-sm leading-5 text-muted transition hover:border-primary hover:text-ink">{section.heading}</a>)}
            </nav>
          </aside>

          <div>
            {article.sections.map((section, index) => (
              <section key={section.heading} id={`article-section-${index}`} className="scroll-mt-32 border-b border-hairline-soft py-9 first:pt-0 last:border-0">
                <h2 className="text-2xl font-semibold tracking-tight text-ink">{section.heading}</h2>
                <div className="mt-4 space-y-4">
                  {section.paragraphs.map((paragraph) => <p key={paragraph} className="text-[15px] leading-7 text-body sm:text-base sm:leading-8">{paragraph}</p>)}
                </div>
                {section.items && <ul className="mt-6 grid gap-3 rounded-md bg-surface-soft/65 p-5 sm:grid-cols-2 sm:p-6">{section.items.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-body"><span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-primary"><Check size={12} strokeWidth={3} /></span>{item}</li>)}</ul>}
              </section>
            ))}
          </div>
        </div>
      </article>
    </main>
  );
}
