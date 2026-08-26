"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { ArrowRight, BookOpen, Search, ShieldCheck } from "lucide-react";

import { helpArticles } from "@/app/content/editorial";

const audiences = ["All", "Guests", "Hosts", "Account & safety"] as const;

export default function HelpCentreClient() {
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<(typeof audiences)[number]>("All");

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    return helpArticles.filter((article) => {
      const matchesAudience = audience === "All" || article.audience === audience;
      const haystack = `${article.title} ${article.description} ${article.category} ${article.sections.map((section) => section.heading).join(" ")}`.toLowerCase();
      return matchesAudience && (!term || haystack.includes(term));
    });
  }, [audience, query]);

  return (
    <>
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute -right-24 -top-36 h-96 w-96 rounded-full border-[58px] border-white/[0.045]" />
        <div className="absolute -bottom-32 right-[25%] h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div data-info-reveal className="relative mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Redrive support</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">How can we help?</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">Find practical answers for searching, booking, hosting, identity checks, handovers and account security.</p>
          <label className="mt-9 flex max-w-2xl items-center gap-3 rounded-2xl bg-white px-5 py-4 text-ink shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
            <Search size={20} className="shrink-0 text-primary" />
            <span className="sr-only">Search help articles</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search booking, licence, messages and more" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" />
          </label>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
        <div data-info-reveal className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" aria-label="Filter help articles by audience">
          {audiences.map((item) => <button key={item} type="button" onClick={() => setAudience(item)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${audience === item ? "border-ink bg-ink text-white" : "border-hairline bg-white text-body hover:border-ink"}`}>{item}</button>)}
        </div>

        <div data-info-reveal className="mt-9 flex items-end justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Help library</p><h2 className="mt-2 text-2xl font-semibold text-ink">{query ? `Results for “${query}”` : audience === "All" ? "Popular guidance" : `Guidance for ${audience.toLowerCase()}`}</h2></div>
          <span className="text-sm text-muted">{results.length} article{results.length === 1 ? "" : "s"}</span>
        </div>

        {results.length ? (
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {results.map((article, index) => (
              <div data-info-reveal style={{ "--info-reveal-delay": `${(index % 2) * 90}ms` } as CSSProperties} key={article.slug}>
                <Link href={`/help-centre/${article.slug}`} className="group block h-full rounded-2xl border border-hairline-soft bg-white p-5 shadow-[0_8px_28px_rgba(24,54,58,0.035)] transition hover:-translate-y-1 hover:border-primary/35 hover:shadow-card sm:p-6">
                  <div className="flex items-start justify-between gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-primary"><BookOpen size={18} /></span><span className="rounded-full bg-surface-soft px-3 py-1 text-[11px] font-semibold text-muted">{article.audience}</span></div>
                  <h3 className="mt-5 text-lg font-semibold text-ink group-hover:underline">{article.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{article.description}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink">Read guide <ArrowRight size={15} className="transition group-hover:translate-x-1" /></span>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div data-info-reveal className="mt-8 rounded-2xl border border-hairline-soft bg-surface-soft/50 p-10 text-center"><Search className="mx-auto text-primary" /><h3 className="mt-4 font-semibold text-ink">No matching articles</h3><p className="mt-2 text-sm text-muted">Try a broader phrase or choose another audience.</p></div>
        )}

        <div data-info-reveal className="mt-14 grid gap-4 sm:grid-cols-3"><SupportCard icon={<ShieldCheck size={19} />} title="Urgent safety issue" copy="Move to safety and contact emergency services first. In Australia, call 000 for immediate danger or injury." href="/safety" /><SupportCard icon={<BookOpen size={19} />} title="Planning a trip" copy="Read practical Australian road-trip and vehicle-sharing guides." href="/blog" /><SupportCard icon={<ArrowRight size={19} />} title="Manage your booking" copy="Sign in to review requests, dates and trip status." href="/trips" /></div>
      </section>
    </>
  );
}

function SupportCard({ icon, title, copy, href }: { icon: React.ReactNode; title: string; copy: string; href: string }) {
  return <Link href={href} className="rounded-2xl border border-transparent bg-surface-soft p-5 transition hover:-translate-y-0.5 hover:border-primary/20 hover:bg-surface-strong"><span className="text-primary">{icon}</span><h3 className="mt-4 font-semibold text-ink">{title}</h3><p className="mt-2 text-sm leading-6 text-muted">{copy}</p></Link>;
}
