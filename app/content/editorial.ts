export type EditorialSection = {
  heading: string;
  paragraphs: string[];
  items?: string[];
};

export type EditorialArticle = {
  slug: string;
  title: string;
  description: string;
  category: string;
  audience?: "Guests" | "Hosts" | "Account & safety";
  published: string;
  readTime: string;
  sections: EditorialSection[];
};

export const helpArticles: EditorialArticle[] = [
  {
    slug: "how-booking-requests-work",
    title: "How booking requests work",
    description: "From choosing dates to host approval, understand every stage of a Redrive vehicle booking request.",
    category: "Booking",
    audience: "Guests",
    published: "2026-08-17",
    readTime: "4 min read",
    sections: [
      { heading: "Choose the right vehicle", paragraphs: ["Review the vehicle category, capacity, transmission, amenities, daily price and suburb before selecting dates. Read the full description and ask the host about anything that could affect your trip."], items: ["Check licence requirements", "Confirm sleeping or passenger capacity", "Review fuel, charging and cleaning arrangements"] },
      { heading: "Send a request", paragraphs: ["Redrive shows the daily hire amount, service fee, platform fee, protection selection and any upfront cleaning fee before you continue. Sending the request asks the host to review your dates; it does not instantly confirm the trip."], items: ["Keep your profile details current", "Upload your driving licence before booking", "Use accurate pickup and return dates"] },
      { heading: "Wait for the host", paragraphs: ["The host receives a notification and can review the request. Keep questions and handover arrangements in Redrive Messages so both sides have a shared record."], items: ["Watch Trips for status changes", "Reply promptly to host questions", "Do not arrange off-platform payment"] },
    ],
  },
  {
    slug: "upload-and-verify-your-driving-licence",
    title: "Upload and verify your driving licence",
    description: "Why Redrive asks for a licence, how to upload it securely and what each verification status means.",
    category: "Verification",
    audience: "Account & safety",
    published: "2026-08-17",
    readTime: "3 min read",
    sections: [
      { heading: "Why a licence is required", paragraphs: ["A driving licence helps establish booking readiness. Redrive blocks new booking requests until both sides are recognised as an Australian driver licence, the printed expiry is current, and the name and date of birth match the guest profile."] },
      { heading: "Upload from your profile", paragraphs: ["Open Profile, go to Driving licence and upload clear front and back JPG, PNG or WebP images. Each file must be 10 MB or smaller."], items: ["Photograph the full document", "Make sure essential details are readable", "Do not upload unrelated identity documents"] },
      { heading: "Understand the status", paragraphs: ["Needs confirmation means the document text was read and must be reviewed by the user. Details checked means the document appears current and the name and date of birth match the profile. Details mismatch or expired keeps booking locked. This check does not contact a government issuer or confirm authenticity, suspension, licence class, or driving entitlement."] },
    ],
  },
  {
    slug: "search-by-state-suburb-and-dates",
    title: "Search by state, suburb and travel dates",
    description: "Use Redrive’s optional location, date, capacity and price filters to find a suitable vehicle.",
    category: "Searching",
    audience: "Guests",
    published: "2026-08-17",
    readTime: "3 min read",
    sections: [
      { heading: "Start broad or narrow it down", paragraphs: ["You can browse Australia-wide with no location selected, choose only a state, or select a suburb for more local results. Suburb search accepts names and postcodes."], items: ["Leave both fields blank for all locations", "Choose a state to shorten the suburb list", "Clear either filter at any time"] },
      { heading: "Add trip needs", paragraphs: ["Dates remove vehicles with overlapping reservations. Passenger and sleeping-space filters return listings that meet or exceed the selected capacity, while the price control filters the daily rate."] },
      { heading: "Review location privacy", paragraphs: ["Public listing pages show the suburb and an approximate map area, not a vehicle’s exact address. Hosts should share precise pickup details only when appropriate for an accepted trip."] },
    ],
  },
  {
    slug: "message-a-host-safely",
    title: "Message a host safely",
    description: "Keep booking questions, pickup instructions and trip updates organised in Redrive Messages.",
    category: "Messages",
    audience: "Guests",
    published: "2026-08-15",
    readTime: "3 min read",
    sections: [
      { heading: "Keep the conversation together", paragraphs: ["Use the Contact host action on a listing or open an existing conversation from Messages. On-platform messages create a useful record of questions, decisions and handover details."] },
      { heading: "What to ask", paragraphs: ["Ask concise questions that are not already answered by the listing."], items: ["Pickup window and general meeting area", "Fuel or charging expectations", "Included equipment and permitted use", "Anything unusual about operating the vehicle"] },
      { heading: "Protect personal information", paragraphs: ["Do not send passwords, payment card information or unnecessary identity documents in chat. Use the dedicated profile uploader for licence images and official booking screens for reservation details."] },
    ],
  },
  {
    slug: "change-or-cancel-a-booking-request",
    title: "Change or cancel a booking request",
    description: "What to review before changing plans and how to keep your host informed.",
    category: "Trips",
    audience: "Guests",
    published: "2026-08-14",
    readTime: "4 min read",
    sections: [
      { heading: "Check the reservation status", paragraphs: ["Open Trips and review whether the request is still being reviewed or has been accepted. The available actions and any financial outcome can depend on the status and timing."] },
      { heading: "Message before changing", paragraphs: ["If a small pickup-time adjustment would solve the issue, message the host first. Date changes may require a new availability check and price calculation."] },
      { heading: "Keep supporting information", paragraphs: ["For severe weather, emergencies or another disruption outside your control, retain relevant records and provide a factual explanation when requesting support."] },
    ],
  },
  {
    slug: "prepare-for-vehicle-handover",
    title: "Prepare for vehicle handover",
    description: "A practical pickup and return checklist for guests and hosts.",
    category: "Safety",
    audience: "Guests",
    published: "2026-08-13",
    readTime: "5 min read",
    sections: [
      { heading: "Before pickup", paragraphs: ["Confirm the time, general location, approved driver and any special equipment through Messages. Bring the physical licence required for the vehicle and clothing suitable for inspecting it."] },
      { heading: "Record condition together", paragraphs: ["Walk around the vehicle in good light and compare its condition with the listing."], items: ["Photograph every side and the interior", "Record odometer and fuel or charge level", "Note existing marks", "Test lights and review warning indicators"] },
      { heading: "Return clearly", paragraphs: ["Follow the agreed return time, location, cleaning and refuelling instructions. Take a second set of photos and promptly report any incident, warning light or new damage."] },
    ],
  },
  {
    slug: "create-a-trustworthy-vehicle-listing",
    title: "Create a trustworthy vehicle listing",
    description: "Help guests make informed decisions with accurate photos, specifications and expectations.",
    category: "Hosting",
    audience: "Hosts",
    published: "2026-08-12",
    readTime: "5 min read",
    sections: [
      { heading: "Use current information", paragraphs: ["Select the right category and enter accurate capacity, transmission, fuel, amenity and pricing details. Explain quirks that a guest needs to understand before requesting the vehicle."] },
      { heading: "Photograph honestly", paragraphs: ["Use recent, well-lit images showing the exterior, cabin, storage and included equipment. Avoid filters that hide the vehicle’s true condition."], items: ["Lead with a clear exterior image", "Show passenger and sleeping areas", "Include notable equipment", "Keep registration documents out of public photos"] },
      { heading: "Maintain availability", paragraphs: ["Respond promptly, keep unavailable dates blocked and confirm that the vehicle remains registered, maintained and safe before every handover."] },
    ],
  },
  {
    slug: "protect-your-redrive-account",
    title: "Protect your Redrive account",
    description: "Use email verification, strong passwords and safer messaging habits to protect your profile.",
    category: "Account security",
    audience: "Account & safety",
    published: "2026-08-11",
    readTime: "4 min read",
    sections: [
      { heading: "Start with a strong password", paragraphs: ["Use a unique password with uppercase and lowercase letters, a number and a symbol. Do not reuse a password from email, banking or social accounts."] },
      { heading: "Verify your email", paragraphs: ["New password accounts enter a six-digit email code before first sign-in. You can also enable an email code at login from Profile when email delivery is configured."] },
      { heading: "Recognise suspicious requests", paragraphs: ["Redrive will not ask for your password or verification code through Messages. Avoid off-platform payment requests and report unexpected account activity promptly."] },
    ],
  },
];

export const blogPosts: EditorialArticle[] = [
  {
    slug: "peer-to-peer-vehicle-hire-australia-guide",
    title: "A practical guide to peer-to-peer vehicle hire in Australia",
    description: "Learn how local vehicle sharing works, what to compare and how to prepare for a confident Australian road trip.",
    category: "Getting started",
    published: "2026-08-17",
    readTime: "7 min read",
    sections: [
      { heading: "What peer-to-peer vehicle hire means", paragraphs: ["Peer-to-peer vehicle hire connects a guest who needs a vehicle with a local host who has one available. The marketplace provides discovery, account, booking and communication tools, while the host supplies the specific vehicle described in the listing.", "The model can offer more variety than a conventional fleet: city cars, utes, campervans, people movers and specialised vehicles may all appear in one search. That variety also makes careful comparison important."] },
      { heading: "Compare the complete trip", paragraphs: ["Look beyond the headline daily rate. Review passenger capacity, transmission, fuel type, included kilometres or usage expectations, protection options, cleaning fees and the pickup suburb."], items: ["Match the vehicle to the road and distance", "Check luggage and sleeping capacity", "Understand fuel or charging access", "Read host instructions before requesting"] },
      { heading: "Build trust before pickup", paragraphs: ["Complete your profile, verify your email and upload the driving licence required for booking. Ask focused questions through platform messages and avoid moving payment or identity checks to private channels."] },
      { heading: "Document the handover", paragraphs: ["A calm, photographed handover protects both sides. Record the exterior, interior, kilometres, fuel or battery level and existing marks at pickup and return. If something changes during the trip, communicate early and keep relevant evidence."] },
    ],
  },
  {
    slug: "ultimate-vehicle-handover-checklist",
    title: "The vehicle handover checklist for hosts and guests",
    description: "Use this repeatable pickup and return checklist to reduce misunderstandings and begin every shared-vehicle trip clearly.",
    category: "Safety",
    published: "2026-08-16",
    readTime: "6 min read",
    sections: [
      { heading: "Confirm people and plans", paragraphs: ["Match the reservation, approved driver, dates and return expectations. Both sides should know how to contact each other through Redrive and what to do if timing changes."] },
      { heading: "Inspect before moving", paragraphs: ["Walk clockwise around the vehicle and then inspect the cabin. Take clear, time-relevant photos rather than relying on memory."], items: ["Tyres, glass, lights and body panels", "Seats, controls and cleanliness", "Odometer and fuel or charge", "Keys, cables and emergency equipment"] },
      { heading: "Explain the vehicle", paragraphs: ["Hosts should demonstrate unusual controls, fuel or charging access, height restrictions, sleeping conversions and included equipment. Guests should ask before leaving if any warning light or control is unclear."] },
      { heading: "Repeat at return", paragraphs: ["Use the same photo angles and measurements at return. Record new concerns factually, avoid blame during the handover and keep follow-up inside the booking record."] },
    ],
  },
  {
    slug: "plan-an-australian-road-trip",
    title: "How to plan an Australian road trip around the vehicle",
    description: "Choose a suitable vehicle, create realistic driving days and prepare for fuel, weather and remote-road conditions.",
    category: "Road trips",
    published: "2026-08-15",
    readTime: "8 min read",
    sections: [
      { heading: "Choose for the route", paragraphs: ["A vehicle that works for an urban weekend may not suit long unsealed sections, mountain weather or remote distances. Match clearance, drivetrain, range, storage and sleeping arrangements to the actual itinerary."] },
      { heading: "Plan conservative driving days", paragraphs: ["Australian distances can be deceptive. Allow for rest, traffic, roadworks, wildlife risk, charging or fuel stops and slower roads. Avoid building an itinerary that depends on driving tired or arriving after dark."] },
      { heading: "Prepare for changing conditions", paragraphs: ["Check official road closures, fire and weather warnings close to departure and throughout the trip. Carry water, appropriate clothing and a charging plan, and tell someone your route when travelling beyond reliable reception."], items: ["Save offline maps", "Identify fuel or chargers before remote sections", "Know the vehicle’s practical range", "Change plans when conditions are unsafe"] },
      { heading: "Respect the listing limits", paragraphs: ["Do not take a vehicle onto roads, beaches or tracks excluded by the host or protection terms. If the route changes materially, discuss it before proceeding."] },
    ],
  },
  {
    slug: "prepare-your-car-for-sharing",
    title: "How to prepare your vehicle for sharing",
    description: "A host-focused guide to maintenance, listing accuracy, cleaning and a professional guest handover.",
    category: "Hosting",
    published: "2026-08-14",
    readTime: "7 min read",
    sections: [
      { heading: "Start with roadworthiness", paragraphs: ["Registration, maintenance and safe operation remain the host’s responsibility. Check tyres, fluids, lights, brakes, windscreens and warning indicators, and address concerns before making dates available."] },
      { heading: "Remove private material", paragraphs: ["Clear personal possessions, addresses, paperwork and connected-device data that a guest does not need. Leave only the documents and instructions appropriate for operating the vehicle."] },
      { heading: "Create a useful guide", paragraphs: ["A short handover guide can cover starting, locking, fuel or charging, height, tolls, included equipment and emergency contacts."], items: ["Use plain language", "Call out non-obvious controls", "State return expectations", "Keep critical safety instructions easy to find"] },
      { heading: "Reset after every trip", paragraphs: ["Inspect promptly, compare condition records, clean high-touch surfaces and update the listing if equipment or features change."] },
    ],
  },
  {
    slug: "understanding-vehicle-protection-and-excess",
    title: "Understanding vehicle protection, responsibility and excess",
    description: "Questions to ask when reviewing protection options and financial responsibility for a shared vehicle booking.",
    category: "Protection",
    published: "2026-08-13",
    readTime: "6 min read",
    sections: [
      { heading: "Read the specific booking terms", paragraphs: ["Protection names are only summaries. Review the terms shown for the particular vehicle and booking, including exclusions, incident steps, excess or liability amounts and who may drive."] },
      { heading: "Know what evidence matters", paragraphs: ["Condition photos, messages, incident details, police or emergency references where appropriate, and receipts can help establish what occurred. Record information safely and as soon as practical."] },
      { heading: "Understand common exclusions", paragraphs: ["Protection may be affected by unapproved drivers, prohibited roads or uses, delayed reporting, unlawful conduct or failure to follow booking terms. Never assume every situation is covered."], items: ["Confirm approved drivers", "Check geographic and road restrictions", "Follow incident reporting instructions", "Do not continue driving an unsafe vehicle"] },
      { heading: "Ask before booking", paragraphs: ["If the displayed protection and responsibility information is unclear, pause and request clarification. General website guidance cannot replace the terms attached to the booking."] },
    ],
  },
];

export const newsroomPosts: EditorialArticle[] = [
  {
    slug: "safer-booking-readiness-tools",
    title: "Redrive introduces clearer booking-readiness tools",
    description: "New onboarding and licence controls help guests understand what is required before requesting a vehicle.",
    category: "Product",
    published: "2026-08-17",
    readTime: "3 min read",
    sections: [
      { heading: "A more complete start", paragraphs: ["Redrive’s three-step signup now collects the practical profile information used throughout a trip, including mobile number, date of birth, address and optional profile details. Email verification remains part of the account-creation flow."] },
      { heading: "Licence-aware booking", paragraphs: ["Guests without checked, current licence details see a clear explanation before checkout. The same requirement is enforced by the reservation service so it cannot be bypassed through the interface."] },
      { heading: "Designed for clarity", paragraphs: ["Redrive distinguishes a readable uploaded document from a completed details check and explains the limits of the automated result. Guests can still browse and save vehicles while completing their profile."] },
    ],
  },
  {
    slug: "privacy-safe-suburb-maps",
    title: "Public listing maps now focus on suburb context",
    description: "A minimalist approximate-area map gives useful location context without displaying a vehicle’s exact address.",
    category: "Trust & safety",
    published: "2026-08-16",
    readTime: "2 min read",
    sections: [
      { heading: "Useful, not precise", paragraphs: ["Listing pages use an Australian suburb-centre dataset and show an approximate area circle. Exact vehicle addresses are not used to centre the public map."] },
      { heading: "A quieter visual design", paragraphs: ["The monochrome map removes businesses, points of interest, transit clutter and unnecessary icons. Redrive’s teal approximate-area circle remains the only strong colour."] },
      { heading: "Location search improves", paragraphs: ["Guests can search broadly by state or narrow results by suburb and postcode while both filters remain optional."] },
    ],
  },
  {
    slug: "email-verification-and-account-security",
    title: "Email verification strengthens new Redrive accounts",
    description: "Six-digit email codes and optional login verification add protection without requiring a paid identity platform.",
    category: "Company",
    published: "2026-08-13",
    readTime: "3 min read",
    sections: [
      { heading: "Verified first sign-in", paragraphs: ["Password-based accounts verify their email using a time-limited six-digit code before the first successful sign-in. Codes are stored as hashes rather than readable values."] },
      { heading: "Optional login codes", paragraphs: ["Eligible users can enable an additional email code after password authentication. The system uses standard SMTP-compatible delivery so Redrive can work with open and widely available mail infrastructure."] },
      { heading: "Security in context", paragraphs: ["Email verification is one layer. Strong unique passwords, safe messaging and careful handling of licence documents remain important parts of account security."] },
    ],
  },
];

export function findArticle(collection: EditorialArticle[], slug: string) {
  return collection.find((article) => article.slug === slug);
}
