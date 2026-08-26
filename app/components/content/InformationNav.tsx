import Link from "next/link";

const informationLinks = [
  { label: "Help centre", href: "/help-centre" },
  { label: "Safety", href: "/safety" },
  { label: "Travel journal", href: "/blog" },
  { label: "Newsroom", href: "/newsroom" },
  { label: "About Redrive", href: "/about" },
] as const;

export default function InformationNav({ activeHref }: { activeHref?: string }) {
  return (
    <nav className="border-b border-hairline-soft bg-white" aria-label="Redrive information">
      <div className="scrollbar-hide mx-auto flex max-w-[1240px] items-center gap-1 overflow-x-auto px-5 py-3 sm:px-8 lg:px-10">
        <span className="mr-3 hidden shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] text-muted lg:inline">Explore Redrive</span>
        {informationLinks.map((item) => {
          const active = activeHref === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                active
                  ? "bg-ink text-white"
                  : "text-muted hover:bg-surface-soft hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
