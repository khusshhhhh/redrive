import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, CircleHelp, ShieldCheck } from "lucide-react";

type Section = { heading: string; body: string; items?: string[] };
type PageContent = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: Section[];
  note?: string;
};

const pages: Record<string, PageContent> = {
  safety: {
    eyebrow: "Support",
    title: "Safety, from pickup to return",
    intro: "A safe trip starts with a roadworthy vehicle, clear communication and a careful handover.",
    sections: [
      { heading: "Before you drive", body: "Confirm the driver’s licence, booking details and agreed pickup location. Walk around the vehicle together and record its condition.", items: ["Check tyres, lights, mirrors and warning indicators", "Locate the spare tyre, charging cable or emergency kit", "Understand fuel, charging and toll arrangements"] },
      { heading: "During the trip", body: "Follow road rules and only allow approved drivers to operate the vehicle. Stop driving if a warning light, unusual sound or unsafe condition appears." },
      { heading: "If something goes wrong", body: "Move to a safe place when possible. For immediate danger or injury in Australia, call 000. Then contact the host and keep photos, receipts and incident details for your records." },
      { heading: "Protect your personal information", body: "Keep identity checks, licence uploads, trip details and payment activity inside Redrive. Never send passwords or one-time verification codes to another person, and report suspicious requests." },
      { heading: "A respectful marketplace", body: "Guests and hosts should communicate clearly, avoid discriminatory conduct and respect agreed boundaries. A vehicle should never be used for an unlawful purpose or outside the approved booking terms." },
    ],
    note: "Redrive does not replace emergency, roadside or insurance services. Always follow the instructions in your booking and protection documents.",
  },
  "cancellation-options": {
    eyebrow: "Support",
    title: "Plans change. Know your options.",
    intro: "Cancellation outcomes depend on timing, the listing terms and whether the host has accepted the reservation.",
    sections: [
      { heading: "Before cancelling", body: "Open the reservation in Trips and review its status, dates and price breakdown. Message the host first when a small timing change could solve the issue." },
      { heading: "Guest cancellations", body: "Any refundable amount should be shown before you confirm a cancellation. Service, protection or payment costs already incurred may be treated separately from the daily vehicle price." },
      { heading: "Host cancellations", body: "Hosts should cancel only when they cannot safely or lawfully provide the booked vehicle. Guests should receive prompt notice so they can make other arrangements." },
      { heading: "Disruptions outside your control", body: "For severe weather, verified emergencies or travel restrictions, retain supporting documents and request a review through support." },
      { heading: "Refund timing", body: "Approved refunds are returned to the original payment method. Your bank or card provider controls how quickly the credit appears after it has been processed." },
      { heading: "Keep a clear record", body: "Use Redrive Messages for date-change discussions and save evidence of serious disruptions. This gives both parties a consistent timeline if support needs to review the booking." },
    ],
    note: "This page is a general guide. The cancellation summary shown on your reservation is the source of truth for that booking.",
  },
  "vehicle-protection": {
    eyebrow: "Hosting",
    title: "Protection built around every journey",
    intro: "Redrive helps guests and hosts understand responsibilities before the keys change hands.",
    sections: [
      { heading: "What protection can include", body: "Available protection selections are displayed during checkout and may vary by vehicle and booking.", items: ["A clearly itemised protection fee", "An excess or damage responsibility amount", "Instructions for incidents and supporting evidence"] },
      { heading: "Host responsibilities", body: "Hosts remain responsible for registration, roadworthiness, maintenance and accurately describing the vehicle. Personal items and pre-existing damage should be documented before pickup." },
      { heading: "Guest responsibilities", body: "Only approved drivers may operate the vehicle. Guests must follow the booking terms, drive legally and report damage or incidents promptly." },
      { heading: "Handover checklist", body: "Photograph all sides, the interior, odometer and fuel or charge level at pickup and return. Agree on existing marks in writing through Redrive Messages." },
      { heading: "What may not be covered", body: "Unauthorised drivers, prohibited use, undeclared damage, incorrect fuel, lost keys and breaches of the booking terms may fall outside the selected protection. Always read the terms shown for the individual reservation." },
      { heading: "Making an incident report", body: "Prioritise safety, notify the relevant emergency or roadside service, then contact the host. Record the time, location, people involved, photographs and any police or incident reference number." },
    ],
    note: "Protection is subject to the specific terms presented with your booking. It is not a substitute for reading those terms or maintaining any insurance required by law.",
  },
  "hosting-resources": {
    eyebrow: "Hosting",
    title: "Set your vehicle up for great trips",
    intro: "Practical guidance for creating a trustworthy listing and delivering a smooth handover.",
    sections: [
      { heading: "Build a clear listing", body: "Use recent photos and describe the vehicle honestly, including its transmission, fuel type, sleeping capacity, amenities and any quirks a guest should know." },
      { heading: "Prepare for pickup", body: "Confirm the vehicle is clean, roadworthy and ready at the agreed time.", items: ["Check registration and maintenance", "Remove valuables and personal information", "Record condition, kilometres and fuel or charge", "Explain controls and emergency equipment"] },
      { heading: "Communicate well", body: "Keep trip conversations in Redrive Messages. Respond promptly, give precise pickup instructions and make return expectations clear." },
      { heading: "After return", body: "Inspect the vehicle promptly and compare it with the handover record. Raise concerns with clear photos and a factual description." },
      { heading: "Pricing and availability", body: "Set rates that account for maintenance, cleaning and the condition of your vehicle. Keep the availability calendar accurate and block dates whenever the vehicle cannot be safely supplied." },
      { heading: "Privacy and location", body: "Public listings should describe the suburb rather than expose a home address. Share the precise handover point only with the confirmed guest through the booking conversation." },
    ],
  },
  about: {
    eyebrow: "Redrive",
    title: "More journeys from the vehicles we already have",
    intro: "Redrive is a peer-to-peer vehicle sharing marketplace designed to connect local vehicle hosts with people planning their next drive.",
    sections: [
      { heading: "Why Redrive", body: "Useful vehicles often sit idle while travellers need more choice. Redrive brings both sides together with searchable listings, trip management and direct messaging." },
      { heading: "Designed for trust", body: "Profiles, email verification, clear vehicle details and an on-platform booking record help guests and hosts make informed decisions." },
      { heading: "Built in Australia", body: "Redrive is shaped around Australian roads, addresses and travel habits, from short local bookings to long-distance escapes." },
      { heading: "How the marketplace works", body: "Hosts publish vehicle details, pricing and availability. Guests search by location and dates, complete the required account checks and request a booking. Redrive keeps the listing, messages and trip record together." },
      { heading: "Our product principles", body: "We design for useful information, responsible sharing and privacy by default. That means clear prices, suburb-level public locations, accessible controls and guidance at the moments people need it." },
    ],
  },
  careers: {
    eyebrow: "Redrive",
    title: "Help shape better ways to move",
    intro: "We’re building a thoughtful marketplace for people who love useful technology, real-world travel and strong communities.",
    sections: [
      { heading: "Working at Redrive", body: "We value practical problem-solving, honest communication and products that feel simple because the details were handled carefully." },
      { heading: "What we look for", body: "People who take ownership, learn quickly and care about the experience on both sides of a marketplace.", items: ["Product and engineering craft", "Customer trust and safety", "Community and marketplace operations", "Clear, inclusive communication"] },
      { heading: "Open roles", body: "There are no public vacancies listed right now. Check back here for future opportunities—new roles will always include responsibilities, location and application details." },
      { heading: "A fair hiring process", body: "Future job advertisements will explain the role, working arrangement and selection steps. Candidates will never be asked to pay a fee, purchase equipment from a nominated seller or share banking credentials before a formal offer." },
      { heading: "Expression of interest", body: "We are not accepting general applications at present. When teams begin hiring, the application link and privacy information will appear on this page." },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = pages[slug];
  return page ? { title: page.title, description: page.intro } : {};
}

export default async function InformationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();

  return (
    <main className="min-h-[60vh] bg-white">
      <section className="border-b border-hairline-soft bg-surface-soft/50">
        <div className="mx-auto max-w-[1120px] px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{page.eyebrow}</p>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-ink sm:text-5xl">{page.title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">{page.intro}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1120px] gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[240px_1fr] lg:px-10">
        <aside className="h-fit rounded-xl border border-hairline-soft bg-white p-5 lg:sticky lg:top-32">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink"><CircleHelp size={18} /> On this page</div>
          <nav className="mt-4 flex flex-col gap-1">
            {page.sections.map((section, index) => (
              <a key={section.heading} href={`#section-${index}`} className="rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-surface-soft hover:text-ink">{section.heading}</a>
            ))}
          </nav>
        </aside>

        <div className="max-w-3xl">
          {page.sections.map((section, index) => (
            <article key={section.heading} id={`section-${index}`} className="scroll-mt-32 border-b border-hairline-soft py-8 first:pt-0 last:border-0">
              <h2 className="text-xl font-semibold text-ink sm:text-2xl">{section.heading}</h2>
              <p className="mt-3 text-[15px] leading-7 text-body sm:text-base">{section.body}</p>
              {section.items && (
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {section.items.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-body"><span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-soft text-primary"><Check size={13} strokeWidth={3} /></span>{item}</li>)}
                </ul>
              )}
            </article>
          ))}
          {page.note && <div className="mt-6 flex gap-3 rounded-xl bg-surface-soft p-5 text-sm leading-6 text-body"><ShieldCheck className="mt-0.5 shrink-0 text-primary" size={20} />{page.note}</div>}
          <div className="mt-10 grid gap-3 border-t border-hairline-soft pt-8 sm:grid-cols-3">
            <Link href="/help-centre" className="rounded-xl border border-hairline-soft p-4 text-sm font-semibold text-ink transition hover:border-primary">Browse help articles</Link>
            <Link href="/blog" className="rounded-xl border border-hairline-soft p-4 text-sm font-semibold text-ink transition hover:border-primary">Read the journal</Link>
            <Link href="/newsroom" className="rounded-xl border border-hairline-soft p-4 text-sm font-semibold text-ink transition hover:border-primary">See product news</Link>
          </div>
          <Link href="/" className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-ink hover:underline">Back to Redrive <ArrowRight size={16} /></Link>
        </div>
      </section>
    </main>
  );
}
