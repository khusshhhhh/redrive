/**
 * Home page FAQ. Rendered on `/`, emitted as FAQPage JSON-LD and published in
 * /llms.txt — keep answers self-contained and factual, since search and AI
 * answer engines quote them verbatim.
 */
export const HOME_FAQS: { q: string; a: string }[] = [
  {
    q: "What is Redrive?",
    a: "Redrive is an Australian peer-to-peer vehicle hire marketplace. You rent a ute, van, car or campervan directly from a local owner instead of a depot, and owners earn from vehicles that would otherwise sit parked.",
  },
  {
    q: "What vehicles can I rent on Redrive?",
    a: "Everyday cars, utes with trays and tow packs, vans for moving and deliveries, and campervans for road trips. Each listing shows the specs, pickup suburb, cancellation policy and the full daily price before you request.",
  },
  {
    q: "How much does it cost to rent a vehicle?",
    a: "The host sets what they want to earn per day, and Redrive's service margin is already included in the one all-in price you see on every listing. There are no membership or booking fees, and nothing is added at checkout.",
  },
  {
    q: "When am I charged?",
    a: "Never at request time. Your card is only charged once the host accepts your trip. If they decline or don’t respond, nothing is taken.",
  },
  {
    q: "What do I need to rent?",
    a: "A verified Redrive account, a valid Australian or overseas licence, and to be within the age range set on the listing. Some hosts ask for extra details before accepting.",
  },
  {
    q: "Is it free to list my vehicle?",
    a: "Yes. Listing is free, you set your own price and availability, and you approve every request. Redrive’s fee only applies to completed trips.",
  },
  {
    q: "What happens if something goes wrong during a trip?",
    a: "Message the host first — most things are sorted quickly. Trip records, payments and reviews all stay on Redrive so support has the full picture if you need help.",
  },
];
