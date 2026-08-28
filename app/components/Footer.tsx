"use client";

import Link from "next/link";
import { ArrowUpRight, CarFront, ShieldCheck, Sparkles } from "lucide-react";

import useRentModal from "@/app/hooks/useRentModal";
import useLoginModal from "@/app/hooks/useLoginModal";
import { useCurrentUser } from "@/app/providers/CurrentUserProvider";

export default function Footer() {
  const { currentUser } = useCurrentUser();
  const rentModal = useRentModal();
  const loginModal = useLoginModal();

  const onListCar = () => {
    if (!currentUser) return loginModal.onOpen();
    rentModal.onOpen();
  };

  return (
    <footer className="mb-20 mt-16 overflow-hidden bg-graphite text-white md:mb-0">
      <div className="border-b border-white/10 bg-gradient-to-r from-primary/20 via-transparent to-accent/10">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 py-9 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-accent"><Sparkles size={14} />Ready for the road</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Find the vehicle your next plan needs.</h2>
            <p className="mt-2 text-sm text-white/60">From weekday errands to long Australian escapes.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-ink transition hover:bg-surface-soft">Explore vehicles <ArrowUpRight size={16} /></Link>
            <button onClick={onListCar} className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-6 text-sm font-semibold text-white transition hover:bg-white/10"><CarFront size={17} />List a vehicle</button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.25fr_repeat(4,1fr)] lg:px-10">
        <div className="sm:col-span-2 lg:col-span-1">
          <Link href="/" className="text-3xl font-semibold tracking-[-0.05em]">redrive<span className="text-accent">.</span></Link>
          <p className="mt-5 max-w-xs text-sm leading-7 text-white/58">A founder-led Australian marketplace for useful vehicles, thoughtful hosts and more memorable journeys.</p>
          <div className="mt-6 flex max-w-xs gap-3 rounded-xl border border-white/10 bg-white/[0.045] p-4"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-accent" /><p className="text-xs leading-5 text-white/62">Clear booking terms, protected account tools and on-platform trip records.</p></div>
        </div>

        <FooterColumn title="Support" links={[["Help Centre", "/help-centre"], ["Safety information", "/safety"], ["Cancellation policies", "/cancellation-options"], ["Account deletion", "/account-deletion"]]} />

        <div>
          <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.15em] text-white">Hosting</h3>
          <ul className="flex flex-col gap-3.5 text-sm text-white/58">
            <li><button onClick={onListCar} className="transition hover:text-white">List your vehicle</button></li>
            <li><FooterLink href="/vehicle-protection">Vehicle protection</FooterLink></li>
            <li><FooterLink href="/hosting-resources">Hosting resources</FooterLink></li>
            <li><FooterLink href="/properties">Manage listings</FooterLink></li>
          </ul>
        </div>

        <FooterColumn title="Explore" links={[["Travel journal", "/blog"], ["Newsroom", "/newsroom"], ["Saved vehicles", "/favorites"], ["Compare vehicles", "/compare"]]} />
        <FooterColumn title="Redrive" links={[["About Redrive", "/about"], ["Careers", "/careers"], ["Community standards", "/community-standards"], ["Data security", "/data-security"], ["Privacy policy", "/privacy"]]} />
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-4 px-5 py-6 text-[11px] text-white/40 sm:flex-row sm:px-8 lg:px-10">
          <span>© {new Date().getFullYear()} Redrive. Built thoughtfully in Australia.</span>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            <FooterLink href="/privacy">Privacy</FooterLink>
            <FooterLink href="/terms">Terms</FooterLink>
            <FooterLink href="/community-standards">Standards</FooterLink>
            <FooterLink href="/admin/login">Admin</FooterLink>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return <div><h3 className="mb-5 text-xs font-bold uppercase tracking-[0.15em] text-white">{title}</h3><ul className="flex flex-col gap-3.5 text-sm text-white/58">{links.map(([label, href]) => <li key={href}><FooterLink href={href}>{label}</FooterLink></li>)}</ul></div>;
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="transition hover:text-white">{children}</Link>;
}
