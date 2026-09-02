import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import type { CSSProperties } from "react";

import type { EditorialArticle } from "@/app/content/editorial";
import Illustration from "@/app/components/Illustration";
import { illustrationForCategory } from "./editorialArt";
import InformationNav from "./InformationNav";

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
      <InformationNav activeHref={baseHref} />

      <section className="border-b border-hairline-soft bg-white">
        <div data-info-reveal className="mx-auto grid max-w-[1240px] items-center gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-10 lg:py-32">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.06] tracking-tight text-ink sm:text-6xl">{title}</h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-muted sm:text-lg">{intro}</p>
          </div>
          <Illustration name="announcement" width={360} priority className="mx-auto hidden h-auto w-full max-w-[340px] lg:block" />
        </div>
      </section>

      <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
        {featured && (
          <Link data-info-reveal href={`${baseHref}/${featured.slug}`} className="group grid overflow-hidden rounded-xl border border-hairline-soft bg-white transition hover:border-primary/40 md:grid-cols-[1.05fr_.95fr]">
            <div className="p-8 sm:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{featuredLabel} · {featured.category}</p>
              <h2 className="mt-5 text-2xl font-semibold leading-tight text-ink sm:text-4xl">{featured.title}</h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-muted sm:text-base">{featured.description}</p>
              <div className="mt-8 flex items-center gap-4 text-xs text-muted">
                <time dateTime={featured.published}>{formatDate(featured.published)}</time>
                <span className="flex items-center gap-1.5"><Clock3 size={14} />{featured.readTime}</span>
              </div>
              <span className="mt-9 inline-flex items-center gap-2 text-sm font-semibold text-ink">Read article <ArrowRight size={16} className="transition group-hover:translate-x-1" /></span>
            </div>
            <div className="flex items-center justify-center border-t border-hairline-soft bg-surface-soft/40 p-10 md:border-l md:border-t-0">
              <Illustration name={illustrationForCategory(featured.category)} width={320} className="h-auto w-full max-w-[300px]" />
            </div>
          </Link>
        )}

        <div data-info-reveal className="mt-20 flex items-end justify-between border-b border-hairline-soft pb-5">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Browse</p><h2 className="mt-2 text-2xl font-semibold text-ink">More from Redrive</h2></div>
          <span className="text-sm text-muted">{articles.length} articles</span>
        </div>
        <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((article, index) => (
            <Link data-info-reveal style={{ "--info-reveal-delay": `${(index % 3) * 90}ms` } as CSSProperties} key={article.slug} href={`${baseHref}/${article.slug}`} className="group flex flex-col">
              <div className="flex items-center justify-center rounded-xl border border-hairline-soft bg-white p-8 transition group-hover:border-primary/40">
                <Illustration name={illustrationForCategory(article.category)} width={220} className="h-auto w-full max-w-[200px]" />
              </div>
              <div className="mt-5 flex items-center justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{article.category}</span><time dateTime={article.published} className="text-xs text-muted">{formatDate(article.published)}</time></div>
              <h3 className="mt-3 text-lg font-semibold leading-snug text-ink group-hover:underline">{article.title}</h3>
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
