"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { BarChart3, CalendarCheck2, CarFront, ExternalLink, LayoutDashboard, LogOut, RadioTower, ShieldCheck, Users } from "lucide-react";

export default function AdminShell({ children, adminName, adminEmail }: { children: React.ReactNode; adminName?: string | null; adminEmail?: string | null }) {
  const links = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin#analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin#bookings", label: "Bookings", icon: CalendarCheck2 },
    { href: "/admin#listings", label: "Listings", icon: CarFront },
    { href: "/admin#users", label: "Users", icon: Users },
    { href: "/admin/monitoring", label: "API monitoring", icon: RadioTower },
  ];
  return <div className="min-h-screen bg-[#f7f6f3] lg:grid lg:grid-cols-[248px_1fr]">
    <aside className="border-b border-white/10 bg-ink px-5 py-5 text-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between lg:block">
        <Link href="/admin" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary"><ShieldCheck size={20} /></span><span><strong className="block text-sm">Redrive Admin</strong><small className="text-white/50">Operations centre</small></span></Link>
        <Link href="/" className="flex items-center gap-2 text-xs text-white/60 hover:text-white lg:hidden">View site <ExternalLink size={14} /></Link>
      </div>
      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:mt-9 lg:flex-col lg:overflow-visible" aria-label="Admin navigation">{links.map(({ href, label, icon: Icon }) => <Link key={label} href={href} className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"><Icon size={17} />{label}</Link>)}</nav>
      <div className="mt-5 border-t border-white/10 pt-5 lg:absolute lg:bottom-6 lg:left-5 lg:right-5">
        <p className="truncate text-sm font-semibold">{adminName || "Administrator"}</p><p className="truncate text-xs text-white/45">{adminEmail}</p>
        <div className="mt-4 flex items-center justify-between"><Link href="/" className="hidden items-center gap-2 text-xs text-white/60 hover:text-white lg:flex">Public site <ExternalLink size={13} /></Link><button onClick={() => signOut({ callbackUrl: "/admin/login" })} className="flex items-center gap-2 text-xs text-white/60 hover:text-white"><LogOut size={14} />Sign out</button></div>
      </div>
    </aside>
    <div className="min-w-0">{children}</div>
  </div>;
}
