import type { IllustrationName } from "@/app/components/Illustration";
import type { LandingMarket } from "@/app/actions/getLandingMarket";
import { priceRange, formatAud } from "@/app/actions/getLandingMarket";

/**
 * SEO landing pages — six drafts targeting the searches guests and hosts
 * actually run (see docs / Redrive-SEO-Landing-Pages brief). Published under
 * /hire/... and /list/... URLs. Australian English, claims kept to what the
 * product does. Live price ranges are pulled from the database at render time
 * via `priceNote`; never hard-code a dollar figure here.
 */

export interface LandingFaq {
  q: string;
  a: string;
}

export interface LandingSection {
  heading: string;
  /** Lead paragraph for the section. */
  body?: string;
  /** Rendered as a checklist. */
  items?: string[];
  /** Rendered as a single flowing sentence/paragraph after the body. */
  note?: string;
}

export interface LandingLink {
  label: string;
  href: string;
  hint: string;
}

export interface LandingPage {
  slug: string;
  group: "hire" | "list";
  path: string;
  /** Full <title> — used verbatim (absolute), already ends with "| Redrive". */
  title: string;
  description: string;
  keywords: string[];
  eyebrow: string;
  h1: string;
  intro: string;
  /** areaServed for LocalBusiness structured data. */
  areaServed: string;
  illustration: IllustrationName;
  /** Optional live-data price sentence shown under the intro. */
  priceNote?: (market: LandingMarket) => string;
  sections: LandingSection[];
  faqs: LandingFaq[];
  cta: { label: string; href: string };
  related: LandingLink[];
}

const EARN_LINK: LandingLink = {
  label: "How much can you earn listing your vehicle?",
  href: "/list/how-much-can-you-earn",
  hint: "What a parked ute, van or camper could bring in.",
};

export const landingPages: LandingPage[] = [
  {
    slug: "ute-hire-adelaide",
    group: "hire",
    path: "/hire/ute-hire-adelaide",
    title: "Ute Hire in Adelaide — From Local Owners, By the Hour or Day | Redrive",
    description:
      "Hire a ute from someone in your suburb. Trays, tow packs and dual cabs from local Adelaide owners. See the full price before you book. No depot, no full-day minimum.",
    keywords: ["ute hire adelaide", "ute rental adelaide", "hire a ute near me", "ute hire south australia"],
    eyebrow: "Vehicle hire · Adelaide",
    h1: "Ute hire in Adelaide, from a local — not a depot",
    intro:
      "Need a ute for a tip run, a furniture pickup, a small move or a weekend job? Redrive lists real utes owned by people across Greater Adelaide — Prospect, Marion, Elizabeth, Glenelg, Mount Barker and more — so you can hire the right one nearby instead of driving to an airport depot.",
    areaServed: "Adelaide",
    illustration: "route-map",
    priceNote: (market) => {
      const range = priceRange(market, ["Utes"]);
      return range
        ? `Owners set their own daily rate; most Adelaide utes sit in the ${formatAud(range.low)}–${formatAud(range.high)} range per day. The full breakdown, including fees, is shown before you request.`
        : "Owners set their own daily rate. The full price breakdown, including the Redrive and service fees, is shown before you send a request.";
    },
    sections: [
      {
        heading: "Why hire through Redrive",
        items: [
          "Local pickup. Filter by suburb and dates — most utes are a short drive away.",
          "The full price up front. Daily rate, Redrive fee and service fee, all shown before you send a request. Your card is only charged once the owner accepts.",
          "Know before you book. Tray size, tow capacity, transmission, distance limits and any deposit are on every listing.",
          "Real vehicles. Real photos, verified reviews from completed trips, and ID-checked owners.",
        ],
      },
      {
        heading: "What people hire utes for",
        body: "A ute covers the jobs a car cannot. On Redrive, Adelaide guests most often book one for:",
        note: "Moving between rentals, green-waste and tip runs, collecting a Marketplace purchase, trailer and boat towing, trade jobs and site work, and picking up materials from Bunnings.",
      },
    ],
    faqs: [
      {
        q: "How much does it cost to hire a ute in Adelaide?",
        a: "Owners set their own daily rate, and most Adelaide utes fall within a similar band per day. The full breakdown, including the Redrive and service fees, is shown before you request, and your card is only charged once the owner accepts.",
      },
      {
        q: "Can I hire a ute for a few hours?",
        a: "Trips are booked by the day, but many owners are flexible on same-day pickup and return. Message them through Redrive to work out timing before you request.",
      },
      {
        q: "Do I need my own insurance?",
        a: "You choose a protection option at checkout. The excess for each option is shown on the listing before you book.",
      },
      {
        q: "Where in Adelaide can I pick a ute up?",
        a: "Listings are spread across Greater Adelaide and the Hills. Filter by your suburb and travel dates to see the utes closest to you.",
      },
    ],
    cta: { label: "See utes near you in Adelaide", href: "/explore?category=Utes&state=SA" },
    related: [
      { label: "Van hire for moving house in Adelaide", href: "/hire/van-hire-moving-adelaide", hint: "When a ute tray is not quite enough." },
      { label: "4WD hire in Adelaide", href: "/hire/4wd-hire-adelaide", hint: "For the tracks a 2WD ute can't take." },
      { label: "How booking requests work", href: "/help-centre/how-booking-requests-work", hint: "From choosing dates to owner approval." },
      EARN_LINK,
    ],
  },
  {
    slug: "campervan-hire-south-australia",
    group: "hire",
    path: "/hire/campervan-hire-south-australia",
    title: "Campervan & Motorhome Hire in South Australia — From Local Owners | Redrive",
    description:
      "Hire a campervan or motorhome from a South Australian owner for your next trip. Sleeping setup, water, gas and solar specs on every listing. Fair pricing, shown in full.",
    keywords: [
      "campervan hire adelaide",
      "motorhome hire south australia",
      "campervan rental SA",
      "caravan hire south australia",
    ],
    eyebrow: "Vehicle hire · South Australia",
    h1: "Campervan and motorhome hire across South Australia",
    intro:
      "Planning the Flinders Ranges, the Limestone Coast, Kangaroo Island or a run up to the Yorke Peninsula? Redrive lists campervans, motorhomes and caravans owned by South Australians — so you can hire one locally, see exactly how it is set up, and deal with the person who actually owns it.",
    areaServed: "South Australia",
    illustration: "road-trip",
    sections: [
      {
        heading: "Every camper listing shows",
        items: [
          "Sleeping configuration and bed dimensions",
          "Fresh and grey water capacity, gas bottle size, solar and house battery",
          "Shower and toilet type, awning, and whether it is self-contained — with the certification number",
          "Whether a special licence is needed, and any tow-vehicle requirements for caravans",
        ],
      },
      {
        heading: "Why not a national hire chain",
        body: "Chains run limited stock out of city depots, charge a per-day rate for the whole trip, and the vehicle is a fleet unit. On Redrive you are hiring a specific, cared-for camper from a local — usually closer to home, with real photos and a full price breakdown before you commit.",
      },
    ],
    faqs: [
      {
        q: "Do I need a special licence to drive a motorhome in SA?",
        a: "Most campervans and smaller motorhomes are fine on a standard car licence. Any that need a light-rigid or medium-rigid licence will say so on the listing.",
      },
      {
        q: "Can I take it interstate?",
        a: "Each owner sets this. Listings state whether interstate travel and unsealed roads are allowed.",
      },
      {
        q: "How far ahead should I book?",
        a: "Peak periods like school holidays and long weekends book out early. Send a request as soon as your dates are firm.",
      },
      {
        q: "For a caravan, do I need my own tow vehicle?",
        a: "Caravan listings state the recommended tow capacity and any towing experience the owner expects. You bring the tow vehicle unless the listing says otherwise.",
      },
    ],
    cta: { label: "Browse campers in SA", href: "/explore?category=Motorhomes&state=SA" },
    related: [
      { label: "4WD hire in Adelaide", href: "/hire/4wd-hire-adelaide", hint: "Tow the van or tackle the tracks." },
      { label: "Car hire in Adelaide", href: "/hire/car-hire-adelaide", hint: "For the around-town half of the trip." },
      { label: "How to plan an Australian road trip around the vehicle", href: "/blog/plan-an-australian-road-trip", hint: "Driving days, fuel, weather and remote roads." },
      EARN_LINK,
    ],
  },
  {
    slug: "van-hire-moving-adelaide",
    group: "hire",
    path: "/hire/van-hire-moving-adelaide",
    title: "Van Hire for Moving House — Adelaide, From Local Owners | Redrive",
    description:
      "Moving between rentals? Hire a cargo van or a ute from someone in your suburb. Load volume and internal dimensions on every listing. Pay only when the owner accepts.",
    keywords: [
      "van hire for moving",
      "moving van hire adelaide",
      "van rental to move house",
      "cargo van hire adelaide",
    ],
    eyebrow: "Vehicle hire · Adelaide",
    h1: "Hire a van for moving day — from a local, for the day you need it",
    intro:
      "Moving out of a rental usually means one or two van loads, not a week-long hire. Redrive lists cargo vans, long-wheelbase vans and utes owned by people across Adelaide, so you can book the right size for your move, pick it up nearby, and drop it back the same day.",
    areaServed: "Adelaide",
    illustration: "handover-keys",
    sections: [
      {
        heading: "Match the van to the move",
        items: [
          "Studio or one bedroom: a mid-size van, or a ute with a canopy",
          "Two bedroom: a long-wheelbase cargo van — check the load volume and internal height on the listing",
          "Bulky items only: a dual-cab ute with a tray",
        ],
        note: "Van listings show load volume in cubic metres, load length and internal height, and whether the van is ply-lined to protect your furniture.",
      },
    ],
    faqs: [
      {
        q: "How long can I book the van for?",
        a: "Trips are booked by the day. For a same-day move, pick up in the morning and return that evening — confirm the window with the owner first.",
      },
      {
        q: "Is the price I see the full price?",
        a: "Yes. The daily rate, Redrive fee and service fee are shown before you send a request, and your card is only charged once the owner accepts.",
      },
      {
        q: "Do vans come with a trolley or straps?",
        a: "Some owners include a trolley, moving blankets or tie-down straps. Included equipment is listed on each van.",
      },
      {
        q: "Can I get help loading?",
        a: "Redrive is vehicle hire only. Book a separate removalist or helper if you need a hand with heavy items.",
      },
    ],
    cta: { label: "See vans and utes for moving", href: "/explore?category=Vans&state=SA" },
    related: [
      { label: "Ute hire in Adelaide", href: "/hire/ute-hire-adelaide", hint: "For smaller loads and tip runs." },
      { label: "Car hire in Adelaide", href: "/hire/car-hire-adelaide", hint: "Everyday driving from a local owner." },
      { label: "The vehicle handover checklist for hosts and guests", href: "/blog/ultimate-vehicle-handover-checklist", hint: "Start and end the hire with a clear record." },
      EARN_LINK,
    ],
  },
  {
    slug: "how-much-can-you-earn",
    group: "list",
    path: "/list/how-much-can-you-earn",
    title: "How Much Can You Earn Listing Your Vehicle? — Redrive Hosting | Redrive",
    description:
      "If your ute, van or caravan mostly sits idle, it could be covering its own rego. See how Redrive hosting works, what hosts set their prices at, and what you keep.",
    keywords: [
      "earn money renting my car",
      "list my ute for hire",
      "make money from my caravan",
      "car sharing income australia",
    ],
    eyebrow: "Redrive hosting",
    h1: "What could your vehicle earn while it is parked?",
    intro:
      "A vehicle you barely use still costs you rego, insurance and maintenance. Listing it on Redrive lets it earn on the days you do not need it — and you stay in control the whole time.",
    areaServed: "Australia",
    illustration: "announcement",
    priceNote: (market) => {
      const car = priceRange(market, ["Car"]);
      const touring = priceRange(market, ["Motorhomes", "Caravans", "Vans"]);
      return car && touring
        ? `Hosts in Adelaide currently set rates from about ${formatAud(car.low)} a day for a small car to ${formatAud(touring.high)}+ for a campervan or a well-set-up 4WD.`
        : "You set the daily rate to cover cleaning, wear and running costs. Redrive's fee only applies to completed trips.";
    },
    sections: [
      {
        heading: "What you keep",
        body: "You set the daily rate. Redrive's fee only applies to completed trips — there is no cost to list, no membership, and no lock-in.",
      },
      {
        heading: "You stay in control",
        items: [
          "You approve every request — see who is asking before you say yes.",
          "Guests are ID-checked and their licence is checked at the request.",
          "You set the rules: distance limits, interstate, unsealed roads, who can drive, and any deposit.",
          "Structured handover records, with messaging and payments kept on Redrive.",
        ],
      },
      {
        heading: "What makes a listing get booked",
        body: "Bright, wide photos; an honest description; a fair price that covers cleaning and wear; and clear trip rules so there are no surprises at pickup.",
      },
    ],
    faqs: [
      {
        q: "Is it safe to let someone else drive my vehicle?",
        a: "Guests complete ID verification and a licence check at the request. You approve each booking, exchange messages first, and every trip has a handover record.",
      },
      {
        q: "What about damage?",
        a: "Guests select a protection option at checkout with a stated excess. Handover photos and records support any claim.",
      },
      {
        q: "How much does it cost to list?",
        a: "Nothing. There is no listing fee or membership. Redrive's fee only applies to completed trips.",
      },
      {
        q: "How do I get paid?",
        a: "Payouts are handled through Stripe. Connect a payout account from your host dashboard, and funds are released after the trip is under way and the return is acknowledged.",
      },
      {
        q: "Can I block dates when I need the vehicle myself?",
        a: "Yes. Keep your availability calendar up to date and block any dates the vehicle is not available.",
      },
    ],
    cta: { label: "List your vehicle — one question at a time", href: "/host" },
    related: [
      { label: "How to prepare your vehicle for sharing", href: "/blog/prepare-your-car-for-sharing", hint: "Maintenance, listing accuracy and a clean handover." },
      { label: "Create a trustworthy vehicle listing", href: "/help-centre/create-a-trustworthy-vehicle-listing", hint: "Photos, specs and expectations that get bookings." },
      { label: "Hosting resources", href: "/hosting-resources", hint: "Practical guidance for a smooth first trip." },
      { label: "Vehicle protection", href: "/vehicle-protection", hint: "How responsibility and excess work." },
    ],
  },
  {
    slug: "car-hire-adelaide",
    group: "hire",
    path: "/hire/car-hire-adelaide",
    title: "Car Hire in Adelaide, From Local Owners — No Depot, No Queue | Redrive",
    description:
      "Hire a car from someone in your suburb instead of a depot. See real photos and the full price before you book. Your card is only charged when the owner accepts.",
    keywords: [
      "car hire adelaide",
      "cheap car hire adelaide",
      "car rental alternative",
      "peer to peer car hire australia",
    ],
    eyebrow: "Vehicle hire · Adelaide",
    h1: "A simpler way to hire a car in Adelaide",
    intro:
      "Redrive is a local marketplace, not a rental chain. Every car is someone's actual vehicle — a city runabout, a family SUV, an EV, a 4WD — listed by an Adelaide owner, usually a short drive from you.",
    areaServed: "Adelaide",
    illustration: "route-map",
    sections: [
      {
        heading: "How it is different",
        items: [
          "No depot. Pick up near home — many owners offer delivery or airport pickup, and it is on the listing.",
          "No full-day-only counter queue. Book the days you need and message the owner directly.",
          "Transparent price. Rate and fees shown in full, charged only on acceptance.",
          "Real reviews, left by guests after completed trips — not solicited stars.",
        ],
      },
      {
        heading: "What you can hire",
        body: "Adelaide owners list the cars they actually drive, so the range shifts with what is available near you: small automatics for city parking and P-platers, mid-size sedans and hatchbacks for the airport run, seven-seat SUVs and people movers for visiting family, EVs and hybrids for lower running costs, and dual-cab utes or 4WDs when the plan involves a trailer or a dirt road.",
        note: "Use the filters for transmission, seats and price to narrow the list, then read the description and message the owner about anything that matters for your trip.",
      },
      {
        heading: "Before you book",
        items: [
          "Check the daily distance limit and any excess-kilometre charge",
          "Confirm the fuel or charging arrangement for return",
          "Read the cancellation policy — Flexible, Moderate or Firm — shown on the listing",
          "Have your driver licence ready; it is checked when you send the request",
        ],
      },
    ],
    faqs: [
      {
        q: "Is peer-to-peer car hire cheaper than a rental company?",
        a: "It depends on the car and the dates. Owners set their own rates, and you always see the full price, including fees, before you request.",
      },
      {
        q: "Can I pick the car up at Adelaide Airport?",
        a: "Some owners offer airport pickup or delivery for a fee. Check the delivery section on the listing, or ask the owner through Redrive.",
      },
      {
        q: "What do I need to book?",
        a: "A verified Redrive account and a current driver licence, which is checked when you send the request.",
      },
      {
        q: "What if I need to cancel?",
        a: "Each listing shows its cancellation policy — Flexible, Moderate or Firm — and the refund you would receive before you confirm.",
      },
    ],
    cta: { label: "See cars near you", href: "/explore?category=Car&state=SA" },
    related: [
      { label: "Ute hire in Adelaide", href: "/hire/ute-hire-adelaide", hint: "When you need a tray, not a boot." },
      { label: "Campervan & motorhome hire in South Australia", href: "/hire/campervan-hire-south-australia", hint: "For the trips a car can't sleep in." },
      { label: "A practical guide to peer-to-peer vehicle hire in Australia", href: "/blog/peer-to-peer-vehicle-hire-australia-guide", hint: "How local vehicle sharing works, and what to compare." },
      EARN_LINK,
    ],
  },
  {
    slug: "4wd-hire-adelaide",
    group: "hire",
    path: "/hire/4wd-hire-adelaide",
    title: "4WD & 4x4 Hire in Adelaide — From Local Owners | Redrive",
    description:
      "Hire a 4WD from a South Australian owner for the Flinders, the Simpson or a beach run. Ground clearance, drivetrain and where it's allowed to go, on every listing.",
    keywords: ["4wd hire adelaide", "4x4 rental south australia", "off road vehicle hire", "4wd hire south australia"],
    eyebrow: "Vehicle hire · Adelaide",
    h1: "4WD hire in Adelaide, from people who actually take theirs off-road",
    intro:
      "Heading to the Flinders Ranges, a beach camp on the Yorke Peninsula, or further into the outback? Redrive lists 4WDs owned by South Australians — with the specs that matter and clear rules on where each one can go.",
    areaServed: "Adelaide",
    illustration: "road-trip",
    sections: [
      {
        heading: "What a 4WD listing tells you",
        items: [
          "Drivetrain (AWD or 4x4), ground clearance, tyre type, and whether a spare and tools are on board",
          "Whether unsealed roads and off-road tracks are allowed by the owner",
          "Towing capacity, roof racks, dual battery and any touring set-up",
          "Recovery gear, first-aid kit and fire extinguisher where fitted",
        ],
      },
      {
        heading: "Where people take them",
        body: "South Australian guests book 4WDs on Redrive for the Flinders Ranges and outback tracks, beach and sand driving on the Yorke and Eyre peninsulas, high-clearance access to remote campsites, and towing a camper trailer or boat where the family car falls short.",
        note: "Every owner sets their own limits. The listing states which surfaces are allowed, and driving outside those rules — or letting an unapproved driver take the wheel — can void your protection.",
      },
      {
        heading: "Come prepared for remote travel",
        items: [
          "Carry water, fuel and a communication plan for areas without reception",
          "Check road and track conditions and any seasonal closures before you leave",
          "Know how to use the recovery gear that comes with the vehicle",
          "Tell someone your route and expected return time",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I take the 4WD on unsealed roads?",
        a: "Only if the owner allows it. Each listing states whether unsealed roads and off-road tracks are permitted — driving outside those rules can void your protection.",
      },
      {
        q: "Is beach driving allowed?",
        a: "Some owners allow beach and sand driving; many do not. Check the listing and confirm with the owner before you book.",
      },
      {
        q: "Does it come with recovery gear?",
        a: "Where fitted, recovery gear, a first-aid kit and a fire extinguisher are noted on the listing. Bring your own essentials for remote trips.",
      },
      {
        q: "Do I need off-road experience?",
        a: "Some owners ask for prior off-road experience on harder tracks. Any requirement is stated on the listing.",
      },
    ],
    cta: { label: "Browse 4WDs in SA", href: "/explore?category=Car&state=SA&unsealed=true" },
    related: [
      { label: "Campervan & motorhome hire in South Australia", href: "/hire/campervan-hire-south-australia", hint: "Sleep out where the tracks end." },
      { label: "Car hire in Adelaide", href: "/hire/car-hire-adelaide", hint: "For the sealed-road half of the trip." },
      { label: "How to plan an Australian road trip around the vehicle", href: "/blog/plan-an-australian-road-trip", hint: "Match clearance, range and recovery gear to the route." },
      EARN_LINK,
    ],
  },
];

export function getLandingPage(group: "hire" | "list", slug: string): LandingPage | undefined {
  return landingPages.find((page) => page.group === group && page.slug === slug);
}
