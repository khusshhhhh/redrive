import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import type { CSSProperties } from "react";

import type { EditorialArticle } from "@/app/content/editorial";
import InformationScrollReveal from "@/app/components/motion/InformationScrollReveal";

interface EditorialIndexProps {
  eyebrow: string;
  title: string;
  intro: string;
  baseHref: string;
  articles: EditorialArticle[];
  featuredLabel: string;
}

export default function EditorialIndex({ eyebrow, title, intro, baseHref, articles, featuredLabel }: EditorialIndexProps) {
  const [featured, ...rest] = articles;
  return (
    <main className="information-page bg-white">
      <InformationScrollReveal />
      <section className="border-b border-hairline-soft bg-surface-soft/50">
        <div data-info-reveal className="mx-auto max-w-[1120px] px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
          <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-ink sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">{intro}</p>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
        {featured && (
          <Link data-info-reveal href={`${baseHref}/${featured.slug}`} className="group grid overflow-hidden rounded-lg bg-ink text-white md:grid-cols-[1.1fr_.9fr]">
            <div className="p-7 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.17em] text-accent">{featuredLabel} · {featured.category}</p>
              <h2 className="mt-4 text-2xl font-semibold leading-tight sm:text-4xl">{featured.title}</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/70 sm:text-base">{featured.description}</p>
              <div className="mt-7 flex items-center gap-4 text-xs text-white/55">
                <time dateTime={featured.published}>{formatDate(featured.published)}</time>
                <span className="flex items-center gap-1.5"><Clock3 size={14} />{featured.readTime}</span>
              </div>
              <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold">Read article <ArrowRight size={16} className="transition group-hover:translate-x-1" /></span>
            </div>
            <div className="relative min-h-52 overflow-hidden bg-gradient-to-br from-primary via-secondary to-ink">
              <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full border-[34px] border-white/10" />
              <div className="absolute bottom-8 left-8 h-20 w-20 rounded-full bg-accent/80 blur-sm" />
              <div className="absolute bottom-10 right-10 text-7xl font-semibold text-white/10">R</div>
            </div>
          </Link>
        )}

        <div data-info-reveal className="mt-14 flex items-end justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Browse</p><h2 className="mt-2 text-2xl font-semibold text-ink">More from Redrive</h2></div>
          <span className="text-sm text-muted">{articles.length} articles</span>
        </div>
        <div className="mt-7 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((article, index) => (
            <Link data-info-reveal style={{ "--info-reveal-delay": `${(index % 3) * 90}ms` } as CSSProperties} key={article.slug} href={`${baseHref}/${article.slug}`} className="group border-t border-hairline-soft pt-5">
              <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{article.category}</span><time dateTime={article.published} className="text-xs text-muted">{formatDate(article.published)}</time></div>
              <h3 className="mt-4 text-xl font-semibold leading-snug text-ink group-hover:underline">{article.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{article.description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink">Read more <ArrowRight size={15} className="transition group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}
