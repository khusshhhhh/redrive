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
    slug: "delete-your-account-safely",
    title: "Delete your Redrive account safely",
    description: "Understand the permanent deletion process, email confirmation and issues that must be resolved first.",
    category: "Privacy",
    audience: "Account & safety",
    published: "2026-08-23",
    readTime: "4 min read",
    sections: [
      { heading: "Review the consequences", paragraphs: ["Account deletion is permanent. It removes your profile and app-controlled content, including listings, reviews, messages, saved searches and managed documents. A new account created later will not restore that history."] },
      { heading: "Resolve open commitments", paragraphs: ["Deletion cannot continue during an active booking or trip, an unsettled payment or payout, or an open incident."], items: ["Check Trips and Reservations", "Complete or cancel open requests", "Wait for payments and payouts to settle", "Resolve open incident reviews"] },
      { heading: "Confirm by email", paragraphs: ["In Profile, open Delete account and request a six-digit code. Enter the code within 10 minutes and type DELETE exactly. Repeated incorrect attempts invalidate the code."] },
      { heading: "Third-party retention", paragraphs: ["Redrive closes managed payout access and removes managed media where providers permit it. Payment providers and legally required records may remain for a limited retention period under applicable obligations."] },
    ],
  },
  {
    slug: "recognise-scams-and-suspicious-requests",
    title: "Recognise scams and suspicious requests",
    description: "Spot common warning signs around payments, verification codes, identity documents and off-platform contact.",
    category: "Account security",
    audience: "Account & safety",
    published: "2026-08-22",
    readTime: "4 min read",
    sections: [
      { heading: "Protect codes and passwords", paragraphs: ["A legitimate host, guest or support conversation should never require your password or one-time code. Codes are only for the Redrive screen that requested them."], items: ["Never paste an OTP into Messages", "Do not approve an unexpected login", "Reset your password if a code request was not yours"] },
      { heading: "Question off-platform payment", paragraphs: ["Pressure to pay by bank transfer, gift card, cryptocurrency or an unfamiliar link removes marketplace safeguards. Use only the payment action attached to the Redrive reservation."] },
      { heading: "Limit identity sharing", paragraphs: ["Upload a driving licence only through Profile. Do not send licence photos, payment cards or unrelated identity documents in chat."] },
      { heading: "Preserve and report", paragraphs: ["Do not continue engaging with a suspicious request. Keep screenshots and the conversation reference, secure your account, and report the issue through support. For financial loss, also contact your bank and Scamwatch promptly."] },
    ],
  },
  {
    slug: "understand-your-booking-price",
    title: "Understand your booking price",
    description: "Read daily rates, marketplace fees, protection, cleaning amounts and the estimated total before requesting.",
    category: "Booking",
    audience: "Guests",
    published: "2026-08-21",
    readTime: "4 min read",
    sections: [
      { heading: "Start with the dates", paragraphs: ["Redrive calculates chargeable days from the selected pickup and return dates and applies the vehicle’s current daily rate. Minimum and maximum trip rules may affect which dates can be requested."] },
      { heading: "Read every line", paragraphs: ["The quote can include the base vehicle amount, marketplace or service fees, the selected protection amount and an applicable cleaning amount. Read the total rather than multiplying only the headline daily price."] },
      { heading: "A request is not yet a paid booking", paragraphs: ["A host may need to approve the request before payment is available. Watch the reservation status and payment instructions rather than assuming submission guarantees the vehicle."] },
      { heading: "Keep the price record", paragraphs: ["Redrive stores a versioned quote snapshot with the reservation. If something looks wrong, use the itemised reservation details when contacting support."] },
    ],
  },
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
      { heading: "Upload from your profile", paragraphs: ["Open Profile, go to Driving licence and upload clear front and back images. JPG, PNG, WebP, HEIC, HEIF, AVIF, GIF, BMP and TIFF are supported; each file must be 10 MB or smaller."], items: ["Photograph the full document", "Make sure essential details are readable", "Do not upload unrelated identity documents"] },
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
    slug: "how-to-evaluate-a-peer-to-peer-host",
    title: "How to evaluate a host before requesting a vehicle",
    description: "Use profile context, listing quality, messages and reviews to make a more informed peer-to-peer booking decision.",
    category: "Trust & safety",
    published: "2026-08-23",
    readTime: "6 min read",
    sections: [
      { heading: "Start with consistency", paragraphs: ["A useful host profile is consistent with the listing: the location makes sense, vehicle details are specific, photos look current and expectations are written plainly. A badge can add context, but it cannot replace this wider picture."] },
      { heading: "Read reviews for detail", paragraphs: ["Look beyond the average. Comments about communication, vehicle condition, handover clarity and whether the listing matched reality are often more useful than a score alone."] },
      { heading: "Ask focused questions", paragraphs: ["Use Redrive Messages to clarify what materially affects your trip."], items: ["Pickup window and meeting area", "Fuel, charging and toll expectations", "Included equipment", "Road or use restrictions", "Unusual controls or dimensions"] },
      { heading: "Notice pressure", paragraphs: ["Pause if someone pressures you to pay elsewhere, share an OTP, send additional identity documents in chat or ignore a booking restriction. A trustworthy transaction leaves room for clear questions."] },
    ],
  },
  {
    slug: "privacy-minded-vehicle-sharing",
    title: "A privacy-minded guide to sharing a vehicle",
    description: "Practical ways for hosts and guests to exchange enough information for a trip without exposing more than necessary.",
    category: "Privacy",
    published: "2026-08-22",
    readTime: "6 min read",
    sections: [
      { heading: "Share in stages", paragraphs: ["A public listing needs a suburb, useful photos and accurate vehicle details—not a home address or registration paperwork. Precise handover information should be shared only when the booking stage and participant justify it."] },
      { heading: "Use the right channel", paragraphs: ["Profile is the place for licence uploads, the reservation is the place for dates and payment state, and Messages is the place for ordinary coordination. Keeping information in its intended channel supports access controls and clearer records."] },
      { heading: "Prepare the vehicle digitally", paragraphs: ["Before handover, remove saved home addresses, paired phones, call history and personal account sessions from the vehicle where practical. Hosts should also remove private paperwork and spare keys that are not part of the trip."] },
      { heading: "Clean up after return", paragraphs: ["Guests should sign out of infotainment services and remove navigation history they added. Hosts should check connected devices and reset temporary access before the next booking."] },
    ],
  },
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
    slug: "account-deletion-and-privacy-controls",
    title: "Redrive adds verified, permanent account deletion",
    description: "A new profile workflow gives account holders a clear, email-verified path to remove app-controlled personal information.",
    category: "Privacy",
    published: "2026-08-23",
    readTime: "4 min read",
    sections: [
      { heading: "A deliberate permanent action", paragraphs: ["Account deletion now begins in Profile with a plain-language explanation of what will be removed. A fresh six-digit email code and the typed word DELETE are required before the operation can proceed."] },
      { heading: "Safe completion checks", paragraphs: ["Deletion is paused when a booking or trip is active, a payment or payout remains unsettled, or an incident is under review. These checks protect the other participant and prevent an account disappearing in the middle of an unresolved obligation."] },
      { heading: "Deletion reaches beyond the profile row", paragraphs: ["The workflow removes account credentials, licence records, listings, reviews, messages, saved searches, notifications, handover evidence and managed media. It also cleans references in favourites and attempts to close a connected payout account where the payment provider permits it."] },
      { heading: "Retention is explained honestly", paragraphs: ["Third-party payment providers and legally required business records may have separate retention duties. Redrive’s updated privacy and account-deletion pages explain that distinction rather than promising instant erasure from systems the platform does not control."] },
    ],
  },
  {
    slug: "richer-host-profiles-and-guest-reviews",
    title: "Host profiles and reviews now give guests more context",
    description: "Redesigned listing sections make host experience, verification and guest feedback easier to assess before booking.",
    category: "Product",
    published: "2026-08-23",
    readTime: "3 min read",
    sections: [
      { heading: "Useful host context", paragraphs: ["The host panel now presents location, hosting tenure, vehicle count and profile-verification status in one structured view. Guests also see suggested topics to clarify before booking and a direct on-platform message action."] },
      { heading: "Reviews designed for scanning", paragraphs: ["Guest feedback now includes an average summary, clear reviewer identity and date, star treatment, readable review cards and expandable long comments. Loading, unavailable and no-review states have also been designed rather than left blank."] },
      { heading: "No shortcut around judgement", paragraphs: ["Badges and averages are context, not guarantees. Redrive continues to encourage guests to read the listing, review the booking terms and ask focused questions before committing."] },
    ],
  },
  {
    slug: "structured-handover-and-incident-records",
    title: "Structured handovers create a clearer trip record",
    description: "Pickup and return reports help guests and hosts record condition, fuel or charge, kilometres and supporting images.",
    category: "Trust & safety",
    published: "2026-08-22",
    readTime: "4 min read",
    sections: [
      { heading: "The same process at both ends", paragraphs: ["Redrive supports pickup and return phases with odometer, fuel or charge level, checklist, notes and authenticated media. Using the same structure at both ends makes changes easier to identify."] },
      { heading: "Shared acknowledgement", paragraphs: ["Trip participants can review and acknowledge submitted reports. Payment release checks can use the return record and open-incident state so a payout is not treated as ready while important questions remain unresolved."] },
      { heading: "Evidence with boundaries", paragraphs: ["Handover photos are stored as restricted assets and served only after Redrive checks that the viewer participates in the reservation or has authorised administrative access."] },
    ],
  },
  {
    slug: "transparent-booking-quotes-and-payouts",
    title: "Booking quotes now preserve the price decision",
    description: "Itemised quotes, payment states and host payout controls make the financial path easier to follow.",
    category: "Payments",
    published: "2026-08-21",
    readTime: "4 min read",
    sections: [
      { heading: "A versioned quote snapshot", paragraphs: ["When a guest requests dates, Redrive calculates the daily price, marketplace and service fees, selected protection amount, cleaning amount and total. The quote snapshot and pricing-policy version are stored with the booking record."] },
      { heading: "Availability is checked again", paragraphs: ["The reservation service checks trip length, minimum notice, overlapping reservations and owner blocks before it creates a request. This reduces the risk of relying only on an earlier browser calculation."] },
      { heading: "Payout readiness", paragraphs: ["Hosts can complete payout onboarding through Stripe. Release checks consider payment state, trip end, return acknowledgement and unresolved incidents before funds are treated as ready for transfer."] },
    ],
  },
  {
    slug: "live-messages-notifications-and-presence",
    title: "Redrive messaging becomes more responsive",
    description: "Conversation streaming, unread state, typing presence and trip notifications keep important coordination in one place.",
    category: "Product",
    published: "2026-08-20",
    readTime: "3 min read",
    sections: [
      { heading: "Updates without constant refreshing", paragraphs: ["Message and chat streams use server-sent events to deliver new activity. Conversation views support unread counts, read updates, typing indicators and presence information while retaining paginated message history."] },
      { heading: "Notifications tied to real actions", paragraphs: ["Booking requests, approvals, declines, cancellations, reminders, completed trips, reviews, messages, profile checks and payment events can create in-app notifications with relevant destinations."] },
      { heading: "Keep sensitive details out", paragraphs: ["A convenient chat is not an identity-document inbox. Redrive guidance continues to direct licence files to the restricted uploader and warns users never to send passwords, payment card details or one-time codes in conversation."] },
    ],
  },
  {
    slug: "better-discovery-saved-searches-and-comparison",
    title: "New discovery tools help guests make a considered choice",
    description: "Saved searches, comparison, recent activity and real-inventory recommendations reduce the need to start over.",
    category: "Product",
    published: "2026-08-19",
    readTime: "3 min read",
    sections: [
      { heading: "Return to a useful search", paragraphs: ["Guests can save named filter combinations, choose alert frequency and continue from recent search or viewing activity. Search remains usable without creating a saved search."] },
      { heading: "Compare facts side by side", paragraphs: ["The comparison view brings selected vehicle facts, estimated pricing and booking context together. It is designed as a decision aid rather than a recommendation that overrides a guest’s own needs."] },
      { heading: "Recommendations from actual listings", paragraphs: ["Recommendation results are drawn from live marketplace inventory and can consider recently viewed vehicles, dates and broad location. The system avoids inventing vehicles or hiding the filters behind the result."] },
    ],
  },
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
