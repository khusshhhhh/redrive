import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, Check, CircleHelp, ExternalLink, FileText, Quote, ShieldCheck, Sparkles } from "lucide-react";
import { buildSeoMetadata } from "@/app/libs/seo";
import InformationNav from "@/app/components/content/InformationNav";

type Section = { heading: string; body: string; items?: string[]; links?: { label: string; href: string }[] };
type PageContent = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: Section[];
  note?: string;
  lastUpdated?: string;
};

const privacyEmail = process.env.PRIVACY_CONTACT_EMAIL || "privacy@redrive.com.au";
const supportEmail = process.env.SUPPORT_CONTACT_EMAIL || "support@redrive.com.au";

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
    title: "Clear cancellation terms before anyone commits",
    intro: "Every listing carries a host-selected policy. Redrive snapshots that policy when a guest books, calculates the outcome from the exact pickup time, and shows the expected refund before cancellation.",
    sections: [
      { heading: "Flexible policy", body: "Guests receive a full refund when cancelling at least 24 hours before pickup. A cancellation after that deadline but before pickup receives 50% of the amount paid through Redrive. This policy can suit frequently booked vehicles and hosts comfortable with short-notice availability.", items: ["100% at least 24 hours before pickup", "50% inside 24 hours but before pickup", "Host cancellation remains 100% refundable"] },
      { heading: "Moderate policy", body: "Guests receive a full refund until five days before pickup, then 50% until 48 hours before pickup. This is Redrive’s balanced default. For example, cancelling a 1 September pickup on 29 August falls in the 50% window.", items: ["100% at least 5 days before pickup", "50% from 5 days until 48 hours before pickup", "No automatic refund inside 48 hours"] },
      { heading: "Firm policy", body: "Guests receive a full refund until 14 days before pickup and 50% until seven days before pickup. After that, no automatic refund is due under the listing policy. Firm can suit specialist vehicles or dates that are difficult for a host to refill.", items: ["100% at least 14 days before pickup", "50% from 14 days until 7 days before pickup", "No automatic refund inside 7 days"] },
      { heading: "The policy is locked to the booking", body: "A host may change the policy for future requests from the listing editor, but an existing reservation keeps the policy snapshot accepted when it was created. This prevents either party from changing the agreed outcome after dates have been committed." },
      { heading: "Before a guest cancels", body: "Open the booking in Trips and review the pickup time, policy name, estimated percentage and estimated refund. If a small timing change could solve the issue, message the host first. Cancellation is permanent and immediately releases the dates." },
      { heading: "Host cancellations", body: "A host cancellation before pickup returns 100% of the amount paid through Redrive, regardless of the listing’s guest policy. Hosts must give a reason and should cancel only when they cannot safely or lawfully provide the vehicle. Repeated or avoidable cancellations may lead to marketplace review." },
      { heading: "Disruptions outside your control", body: "For severe weather, verified emergencies or travel restrictions, retain supporting documents and request a review through support." },
      { heading: "How refunds are processed", body: "When a paid booking is eligible, Redrive requests the calculated refund against the original Stripe payment before marking the reservation cancelled. If the refund cannot be confirmed, the booking remains unchanged so support can safely investigate. Banks and card providers control when the returned funds become visible." },
      { heading: "After pickup", body: "Ordinary cancellation is no longer available after the pickup time. Use the reservation’s handover, incident and support tools instead so vehicle condition, safety concerns, early returns and any financial adjustment can be reviewed with the relevant evidence." },
      { heading: "Consumer rights remain", body: "A host-selected policy does not remove a right or remedy that cannot lawfully be excluded. Redrive may review exceptional events, misleading listing information, unavailable vehicles or service failures separately from a change-of-mind cancellation.", links: [{ label: "ACCC consumer rights and guarantees", href: "https://www.accc.gov.au/consumers/buying-products-and-services/consumer-rights-and-guarantees" }] },
      { heading: "Keep a reliable record", body: "Cancellation time, cancelling party, reason, policy, refund percentage and refund amount are kept with the reservation and security audit. Use Redrive Messages for date-change discussions and retain evidence of serious disruptions." },
    ],
    note: "The cancellation summary stored on the reservation is the source of truth for that booking. All time thresholds are calculated from the exact scheduled pickup time, not simply the calendar date.",
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
    title: "A founder-led idea for more useful Australian journeys",
    intro: "Redrive is a peer-to-peer vehicle sharing marketplace being built personally and deliberately around a simple belief: useful vehicles should create more value for their owners and more possibilities for travellers.",
    sections: [
      { heading: "Why Redrive exists", body: "Khush saw two things happening at once: cars, utes, campervans and work vehicles spending much of their time parked, while Australians often struggled to find the right vehicle for a particular weekend, job or road trip. Redrive brings those needs together in one local marketplace." },
      { heading: "Meet Khush Patel", body: "Khush Patel is Redrive’s founder and CEO—and, at this stage of the journey, its whole heart and driving force. He has shaped the product from the first idea through the details people touch every day: search, trust checks, bookings, messages, handovers, payments, support content and the visual experience." },
      { heading: "Founder-built means close to the details", body: "Redrive is not being designed from a distant boardroom. Khush works directly across product decisions, engineering, marketplace operations and the questions guests and hosts are likely to ask. That closeness keeps the company practical, accountable and able to improve quickly." },
      { heading: "A marketplace for real Australian needs", body: "The goal is broader than ordinary car hire. A city car, family van, tradesperson’s ute, touring caravan or campervan can each solve a very different problem. Redrive is built to make that variety searchable without losing the local context that makes peer-to-peer sharing useful." },
      { heading: "Trust is a product feature", body: "Email checks, licence-readiness controls, transparent host profiles, suburb-level public maps, booking records, on-platform messages, structured handovers and review tools help both sides make better decisions. No single badge replaces good judgement, so Redrive explains what its checks do—and what they do not do." },
      { heading: "Privacy before precision", body: "Public listings provide useful suburb context without publishing a vehicle’s exact address. Sensitive licence files use restricted delivery paths, and account holders can control login verification and request permanent account deletion from their profile." },
      { heading: "Built for the entire trip", body: "Discovery is only the beginning. Redrive is being shaped around the complete journey: comparing vehicles, understanding prices, checking readiness, requesting dates, speaking with the host, paying, recording pickup and return, resolving incidents and sharing an honest review." },
      { heading: "The company Khush wants to build", body: "The ambition is to grow without becoming impersonal: explain decisions clearly, treat trust and safety as everyday work, listen closely to the community, and favour useful improvements over empty claims. Redrive will evolve, but that founder-led standard should remain visible in the product." },
    ],
    note: "A note from Khush: “Redrive is personal to me. I am building the kind of marketplace I would want my own family and friends to use—clear, thoughtful and grounded in real responsibility.”",
  },
  privacy: {
    eyebrow: "Legal & privacy",
    title: "Privacy policy",
    intro: "This policy explains what personal information Redrive handles, why it is needed, who may receive it, how it is protected, and the choices available to you.",
    lastUpdated: "23 August 2026",
    sections: [
      { heading: "Who this policy covers", body: "This policy applies when you browse Redrive, create an account, list or book a vehicle, complete identity or licence checks, make or receive payments, send messages, submit handover evidence, contact support, or otherwise use Redrive’s website and services. Redrive manages personal information with regard to the Privacy Act 1988 (Cth) and the Australian Privacy Principles where they apply.", links: [{ label: "OAIC APP 1 guidance on open privacy management", href: "https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-1-app-1-open-and-transparent-management-of-personal-information" }] },
      { heading: "Information we collect", body: "Depending on how you use Redrive, we may collect your name, email, mobile number, date of birth, profile photo, address, suburb, state, postcode, account credentials, login-security settings, driving-licence images and extracted details, vehicle and registration information, listings, availability, booking messages, reviews, favourites, saved searches, payment and payout references, handover photos, incident information, support communications, and security or device information such as timestamps, browser details and privacy-preserving IP hashes.", items: ["Identity and contact information", "Licence and booking-readiness information", "Vehicle, trip and payment records", "Messages, reviews and handover evidence", "Security, fraud-prevention and service telemetry"] },
      { heading: "How information is collected", body: "We collect information directly from you when you register, edit your profile, upload a document or image, create a listing, make a booking, send a message or contact us. We also create records as the service operates, receive authentication details from Google when you choose Google sign-in, receive payment status from Stripe, and use Google services when you request address or licence-processing features." },
      { heading: "Why we use personal information", body: "We use information to provide and secure accounts; operate search, listings, bookings, payments, messages and handovers; check booking readiness; prevent misuse; respond to support and safety matters; meet legal obligations; maintain business records; understand service reliability; and improve Redrive. We do not sell personal information." },
      { heading: "Licence and identity information", body: "Licence information is sensitive in practice and receives additional controls. Uploaded licence files are stored as restricted media, delivered through authenticated routes, and may be sent to Google Cloud Vision when you start the document-reading process. Recoverable licence numbers are encrypted and duplicate-check values are hashed. Automated document reading can be wrong and does not confirm government issuance, suspension, licence class or legal entitlement to drive." },
      { heading: "When information is shared", body: "We share only what is reasonably needed with another guest or host for a listing, booking, message or handover; with payment, cloud hosting, email, maps, document-processing, authentication, monitoring and storage providers that support the service; with professional advisers; or with regulators, courts, emergency services and law-enforcement bodies where authorised or required. Exact pickup information is restricted according to booking status." },
      { heading: "Overseas handling", body: "Some service providers—including cloud, authentication, payments, image, email and analytics providers—may process or store information outside Australia. Locations depend on the provider, account configuration and infrastructure used at the time. Redrive assesses providers and uses contractual and technical controls where reasonably available. You can contact us for the current provider list and likely processing locations." },
      { heading: "Direct marketing and service messages", body: "Operational emails such as verification codes, password resets, booking notices and security alerts are sent to provide or protect the service. Marketing communications will require an appropriate basis and will identify Redrive and provide a functional unsubscribe method. Withdrawing marketing consent does not stop essential account or trip messages.", links: [{ label: "ACMA guidance on spam and unsubscribe rules", href: "https://www.acma.gov.au/avoid-sending-spam" }] },
      { heading: "Security", body: "Controls include hashed passwords and one-time codes, encryption for recoverable licence numbers, restricted document delivery, authenticated API routes, rate limits, input and upload validation, security headers, audit events and privacy-minimised monitoring. No internet service can promise absolute security. If Redrive suspects a serious breach, it will assess and respond in line with applicable notification obligations.", links: [{ label: "OAIC guide to securing personal information", href: "https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/handling-personal-information/guide-to-securing-personal-information" }, { label: "OAIC Notifiable Data Breaches guidance", href: "https://www.oaic.gov.au/privacy/notifiable-data-breaches/when-to-report-a-data-breach" }] },
      { heading: "Retention and account deletion", body: "Redrive keeps personal information only for as long as it is needed for the service, safety, dispute handling, fraud prevention, backups, or legal and accounting obligations. Profile account deletion removes app-controlled profile data and related content after a fresh email code is confirmed, but cannot proceed while trips, payments or incidents are unresolved. Payment processors, backups or legally required transaction records may remain for their applicable retention period before deletion, de-identification or being put beyond use.", links: [{ label: "OAIC APP 11 security and destruction guidance", href: "https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information" }, { label: "ATO record-keeping overview", href: "https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/record-keeping-for-business" }] },
      { heading: "Access, correction and complaints", body: `You may update many details in Profile or contact ${privacyEmail} to request access, correction, a portable copy where available, or a review of a privacy concern. Please describe the information and your preferred resolution. Redrive may need to verify your identity. If you are not satisfied with the response, you may complain to the Office of the Australian Information Commissioner.`, links: [{ label: "OAIC privacy complaints", href: "https://www.oaic.gov.au/privacy/privacy-complaints" }] },
      { heading: "Changes and contact", body: `We may update this policy as Redrive’s features, providers and legal obligations change. Material changes will be dated and, where appropriate, notified in the service. Privacy questions can be sent to ${privacyEmail}. General service questions can be sent to ${supportEmail}.` },
    ],
    note: "This policy does not reduce any privacy or consumer rights that cannot lawfully be excluded. Product configuration and provider contracts should be reviewed against this policy before public launch and after material changes.",
  },
  terms: {
    eyebrow: "Legal & marketplace rules",
    title: "Terms of use",
    intro: "These terms set the ground rules for using Redrive as a guest, host or visitor. They should be read with the Privacy Policy, booking terms and any protection information shown for a particular trip.",
    lastUpdated: "23 August 2026",
    sections: [
      { heading: "Agreement and eligibility", body: "By creating an account or using Redrive, you agree to these terms. Account holders must be at least 18, able to enter a binding agreement, provide accurate information, and use the service only for lawful purposes. Drivers must hold the licence and legal authority required for the vehicle and trip." },
      { heading: "Redrive’s marketplace role", body: "Redrive provides technology for discovering vehicles, managing accounts, requesting bookings, communicating, recording handovers and supporting payments. Unless a booking says otherwise, the host supplies the vehicle and the guest uses it. Redrive does not own every listed vehicle and does not guarantee that every user statement is complete or error-free." },
      { heading: "Accounts and security", body: "You are responsible for your account, password, email access and activity carried out through your session. Do not share passwords or one-time codes. Notify Redrive promptly if you suspect unauthorised access. Redrive may require verification, restrict activity or suspend access to protect users and the marketplace." },
      { heading: "Host responsibilities", body: "Hosts must have authority to list the vehicle, provide accurate and current information, keep availability and pricing current, disclose material limitations, maintain registration and roadworthiness, meet insurance and tax obligations, and provide the vehicle in the agreed condition. Hosts must not discriminate unlawfully or ask guests to pay outside approved Redrive flows." },
      { heading: "Guest responsibilities", body: "Guests must provide accurate booking information, use only approved drivers, follow road rules and vehicle restrictions, care for the vehicle, avoid prohibited or unlawful use, report incidents promptly, and return the vehicle as agreed. A licence-readiness result does not replace the guest’s responsibility to be legally entitled and competent to drive." },
      { heading: "Bookings, prices and payments", body: "A booking request is not accepted until its status confirms acceptance and any required payment is completed. Review dates, itemised fees, cancellation settings, protection summary and host instructions before confirming. Stripe may process payments and host payouts under its own terms. Do not attempt to avoid platform fees or payment safeguards through an off-platform arrangement." },
      { heading: "Cancellations, refunds and disputes", body: "Cancellation and refund outcomes depend on the booking status, timing, displayed policy, costs already incurred and rights that apply under law. Keep relevant messages, photos, receipts and incident references. Redrive may review available records, but parties retain rights they have under applicable law." },
      { heading: "Consumer rights", body: "Nothing in these terms excludes, restricts or modifies a consumer guarantee, remedy or other right that cannot lawfully be excluded under the Australian Consumer Law. Rights may depend on whether a host is acting in trade or commerce and on the service supplied. Redrive does not describe lawful consumer remedies as discretionary goodwill.", links: [{ label: "ACCC consumer rights and guarantees", href: "https://www.accc.gov.au/consumers/buying-products-and-services/consumer-rights-and-guarantees" }, { label: "ACCC guidance on buying through online marketplaces", href: "https://www.accc.gov.au/consumers/buying-products-and-services/buying-online" }] },
      { heading: "Content and reviews", body: "You retain ownership of content you submit but give Redrive a non-exclusive licence to host, display, resize and use it to operate and explain the service. Submit only content you have the right to use. Reviews must reflect genuine experiences and must not contain threats, unlawful discrimination, fabricated claims, unnecessary personal information or manipulated ratings." },
      { heading: "Prohibited conduct", body: "Do not misuse another person’s identity, scrape or attack the service, bypass access controls, upload malicious or unlawful material, manipulate bookings or reviews, send spam, harass another person, use a vehicle unlawfully, or interfere with safety investigations. Redrive may remove content, limit features or suspend accounts where reasonably necessary." },
      { heading: "Availability, liability and governing law", body: "Redrive works to provide a reliable service but does not promise uninterrupted availability. To the extent permitted by law, liability may be limited to losses reasonably foreseeable from the relevant breach; nothing limits liability where the law prohibits it. These terms are governed by the laws of South Australia and applicable Commonwealth law, and disputes may be heard by courts with jurisdiction there." },
      { heading: "Changes and contact", body: `Material changes will be dated and communicated where appropriate. Continued use after a change takes effect may constitute acceptance where lawful. Questions about these terms can be sent to ${supportEmail}.` },
    ],
    note: "These terms are a product-ready draft, not tailored legal advice. Before commercial launch, Redrive should have Australian counsel confirm the legal entity details, insurance structure, fee model, cancellation rules and limitation clauses.",
  },
  "community-standards": {
    eyebrow: "Trust & safety",
    title: "Community standards",
    intro: "Clear expectations help guests and hosts share vehicles safely, respectfully and honestly.",
    lastUpdated: "23 August 2026",
    sections: [
      { heading: "Be accurate", body: "Profiles, listings, licence details, prices, availability, trip plans, handover records and incident reports must be truthful and current. Correct mistakes promptly and never create a false identity, booking or review." },
      { heading: "Be safe", body: "Do not provide or operate an unsafe, unregistered or unsuitable vehicle. Follow road rules, approved-driver requirements, load and passenger limits, route restrictions, fatigue guidance, fire and weather warnings, and emergency instructions." },
      { heading: "Be respectful and inclusive", body: "Treat people fairly regardless of race, colour, sex, sexual orientation, gender identity, disability, age, religion, family responsibilities or another protected attribute. Harassment, threats, stalking, hate speech, sexual misconduct and retaliation are not accepted." },
      { heading: "Protect privacy", body: "Use personal information only for the booking or safety purpose for which it was shared. Do not publish exact addresses, licence images, payment details, private messages or handover evidence without authority. Never ask another user for a password or one-time code." },
      { heading: "Keep payments and messages on-platform", body: "Use Redrive’s approved payment and messaging tools. Off-platform payment requests, fee avoidance, phishing links and pressure to move sensitive conversations elsewhere undermine safeguards and may lead to restriction." },
      { heading: "Reviews must be genuine", body: "Reviews should describe a real completed experience and remain factual. Do not offer payment for a rating, coordinate reciprocal reviews, threaten a review to gain a benefit, or reveal unnecessary personal information." },
      { heading: "Reporting and enforcement", body: `For immediate danger call 000. For platform concerns, preserve relevant messages and evidence and contact ${supportEmail}. Redrive may investigate, preserve records, remove content, restrict features, suspend accounts or refer serious matters to relevant authorities, taking context and proportionality into account.` },
    ],
    note: "These standards apply alongside booking terms and Australian law. Emergency and criminal matters should be directed to the appropriate authorities.",
  },
  "data-security": {
    eyebrow: "Trust & safety",
    title: "How Redrive protects account and trip data",
    intro: "Security is a continuing process spanning product design, technical controls, operational review and user choices.",
    lastUpdated: "23 August 2026",
    sections: [
      { heading: "Account protection", body: "Password accounts use hashed passwords, verified email flows, time-limited single-use codes and rate-limited sign-in attempts. Users can enable an email code after password entry, and sensitive account deletion always requires a fresh email code." },
      { heading: "Sensitive document controls", body: "Licence images are sanitised on upload, stored as restricted Cloudinary assets and delivered only through authenticated routes. Recoverable licence and card numbers use application-layer encryption, while duplicate checks use separate non-reversible hashes." },
      { heading: "Safer uploads and inputs", body: "Image metadata, file signatures, decoded size and file size are checked before sanitised images are stored. APIs validate identifiers, dates, prices, status changes and text limits, and security-sensitive routes apply request and account rate limits." },
      { heading: "Least-public location", body: "Public vehicle pages use suburb context rather than a precise pickup address. Exact location details are restricted to appropriate booking states and participants." },
      { heading: "Monitoring without raw traffic histories", body: "Operational metrics are aggregated into time buckets. Unexpected server failures may retain limited route, status, timing and request identifiers, but monitoring is designed not to store request bodies, query strings, raw IP addresses or user IDs." },
      { heading: "What users can do", body: "Use a unique password, secure your email account, enable login verification, keep messages and payments on-platform, review unexpected alerts, avoid sharing codes, and report suspicious activity quickly.", items: ["Never send a password or OTP in chat", "Check the domain before signing in", "Use current contact information", "Sign out on shared devices", "Treat unexpected payment links as suspicious"] },
      { heading: "Incident response", body: "Redrive records security-relevant events, reviews unexpected failures and should maintain a documented incident plan. Suspected eligible data breaches must be assessed promptly and notified where applicable.", links: [{ label: "OAIC data breach preparation and response", href: "https://www.oaic.gov.au/privacy/notifiable-data-breaches/preventing-preparing-for-and-responding-to-data-breaches" }] },
    ],
  },
  "account-deletion": {
    eyebrow: "Privacy controls",
    title: "Deleting your Redrive account",
    intro: "Account deletion is permanent and protected by a fresh email verification code.",
    lastUpdated: "23 August 2026",
    sections: [
      { heading: "Before you begin", body: "Open Profile and review your active trips, host reservations, incidents and payout status. Deletion is blocked while a booking is active, a payment or payout is unsettled, or an incident remains under review." },
      { heading: "Confirming it is really you", body: "Choose Review deletion in Profile. Redrive sends a six-digit code to your sign-in email. Enter the code and type DELETE exactly. Codes expire after 10 minutes and repeated incorrect attempts invalidate the request." },
      { heading: "What Redrive removes", body: "The process removes the account profile, credentials, connected sign-in records, licence files and extracted details, listings, reviews, reservations, messages and chats, notifications, saved searches, feature access, managed listing and handover media, and related app security records. References in other users’ favourites are cleaned up." },
      { heading: "External providers and required records", body: "Redrive requests removal of managed Cloudinary media and closes a connected Stripe payout account where Stripe permits it. Stripe and other processors may retain limited transaction or compliance records under their own legal obligations. Backups may take time to cycle out and are kept beyond ordinary use while retained." },
      { heading: "No recovery", body: "Deletion cannot be reversed. A later signup with the same email creates a new account and does not restore previous listings, messages, bookings, reviews or verification." },
      { heading: "Need help first?", body: `If a booking, payout or incident blocks deletion, resolve it through the relevant trip record. For a privacy question or deletion problem, contact ${privacyEmail}.` },
    ],
    note: "Account deletion supports data minimisation, but it does not require a third-party processor or Redrive to destroy a record that Australian law or a court order requires it to retain.",
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
  return page ? buildSeoMetadata({
    title: page.title,
    description: page.intro,
    path: `/${slug}`,
    keywords: [page.eyebrow, page.title, "Redrive Australia"],
    category: page.eyebrow,
  }) : {};
}

export default async function InformationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();

  return (
    <main className="information-page min-h-[70vh] bg-surface-soft/35">
      <InformationNav activeHref={`/${slug}`} />
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute -right-24 -top-40 h-[470px] w-[470px] rounded-full border-[72px] border-white/[0.045]" />
        <div className="absolute -bottom-32 right-[22%] h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-[9%] top-24 h-4 w-4 rounded-full bg-accent shadow-[0_0_0_12px_rgba(212,167,44,0.1)]" />
        <div data-info-reveal className="relative mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent"><Sparkles size={14} />Redrive knowledge centre <span className="text-white/25">/</span> {page.eyebrow}</div>
          <h1 className="mt-7 max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">{page.title}</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-white/68 sm:text-xl sm:leading-9">{page.intro}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <span className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white/80">Plain-language guidance</span>
            {page.lastUpdated && <span className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent">Updated {page.lastUpdated}</span>}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-10 sm:px-8 sm:py-16 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12">
        <aside data-info-reveal className="h-fit overflow-hidden rounded-2xl border border-hairline-soft bg-white shadow-[0_12px_38px_rgba(24,54,58,0.05)] lg:sticky lg:top-28">
          <div className="bg-gradient-to-br from-primary to-secondary p-5 text-white"><div className="flex items-center gap-2 text-sm font-semibold"><CircleHelp size={18} /> In this guide</div><p className="mt-2 text-xs leading-5 text-white/70">Jump directly to the answer you need.</p></div>
          <nav className="flex max-h-[58vh] flex-col overflow-y-auto p-3">
            {page.sections.map((section, index) => (
              <a key={section.heading} href={`#section-${index}`} className="group flex items-start gap-3 rounded-xl px-3 py-3 text-sm text-muted transition hover:bg-surface-soft hover:text-ink"><span className="mt-0.5 text-[10px] font-bold tabular-nums text-primary/60">{String(index + 1).padStart(2, "0")}</span><span className="leading-5">{section.heading}</span></a>
            ))}
          </nav>
          <div className="border-t border-hairline-soft p-4"><Link href="/help-centre" className="flex items-center justify-between rounded-xl bg-ink px-4 py-3 text-xs font-semibold text-white">Need more help? <ArrowRight size={14} /></Link></div>
        </aside>

        <div className="min-w-0">
          {page.sections.map((section, index) => (
            <article data-info-reveal key={section.heading} id={`section-${index}`} className="mb-5 scroll-mt-28 rounded-2xl border border-hairline-soft bg-white p-6 shadow-[0_10px_34px_rgba(24,54,58,0.045)] sm:p-8">
              <div className="flex items-start gap-4 sm:gap-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-strong text-xs font-bold tabular-nums text-primary">{String(index + 1).padStart(2, "0")}</span><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">{page.eyebrow}</p><h2 className="mt-1.5 text-xl font-semibold tracking-tight text-ink sm:text-2xl">{section.heading}</h2></div></div>
              <p className="mt-5 text-[15px] leading-8 text-body sm:text-base">{section.body}</p>
              {section.items && (
                <ul className="mt-6 grid gap-3 rounded-xl border border-hairline-soft bg-surface-soft/55 p-4 sm:grid-cols-2 sm:p-5">
                  {section.items.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-body"><span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm"><Check size={12} strokeWidth={3} /></span>{item}</li>)}
                </ul>
              )}
              {section.links && (
                <div className="mt-6 flex flex-wrap gap-3 border-t border-hairline-soft pt-5">
                  {section.links.map((link) => (
                    <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-hairline-soft bg-white px-4 py-2.5 text-xs font-semibold text-primary transition hover:border-primary hover:bg-surface-soft">
                      {link.label}<ExternalLink size={13} />
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
          {page.note && <div data-info-reveal className={`mt-7 flex gap-4 rounded-2xl p-6 text-sm leading-7 sm:p-7 ${slug === "about" ? "border border-accent/35 bg-gradient-to-br from-accent-soft to-white text-ink" : "border border-primary/15 bg-gradient-to-br from-primary/[0.07] to-white text-body"}`}>{slug === "about" ? <Quote className="mt-0.5 shrink-0 text-accent-active" size={24} /> : <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={24} />}<div><p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">Important context</p>{page.note}</div></div>}
          <div data-info-reveal className="mt-12">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Continue exploring</p><h2 className="mt-2 text-2xl font-semibold text-ink">More useful Redrive resources</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <ResourceLink href="/help-centre" title="Help Centre" copy="Step-by-step answers for accounts, bookings and hosting." icon={<CircleHelp size={19} />} />
            <ResourceLink href="/blog" title="Travel journal" copy="Practical ideas for safer, better shared-vehicle journeys." icon={<BookOpen size={19} />} />
            <ResourceLink href="/newsroom" title="Newsroom" copy="See the latest product, privacy and trust improvements." icon={<FileText size={19} />} />
          </div>
          </div>
        </div>
        </div>
      </section>
    </main>
  );
}

function ResourceLink({ href, title, copy, icon }: { href: string; title: string; copy: string; icon: React.ReactNode }) {
  return <Link href={href} className="group rounded-2xl border border-hairline-soft bg-white p-5 shadow-[0_8px_28px_rgba(24,54,58,0.04)] transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-card"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-strong text-primary">{icon}</span><h3 className="mt-5 font-semibold text-ink">{title}</h3><p className="mt-2 text-xs leading-5 text-muted">{copy}</p><span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">Explore <ArrowRight size={13} className="transition group-hover:translate-x-1" /></span></Link>;
}
