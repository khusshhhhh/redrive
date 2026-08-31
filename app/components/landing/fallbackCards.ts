import type { ListingCardData } from "@/app/libs/listingCardData";

/**
 * Illustrative cards that keep the home-page showcase grid and listings rail
 * full before a region has enough live inventory. Filtered out by id whenever
 * real listings are available.
 */
export const FALLBACK_CARDS: ListingCardData[] = [
  { id: "s1", title: "Dual-cab ute — tow pack & tray", category: "Utes", suburb: "Brunswick", state: "VIC", price: 96, imageSrcs: [], badgeValue: null, reviewAverage: 4.9, reviewCount: 24, hostVerified: true, hostResponseHours: 0.5, instantBook: true },
  { id: "s2", title: "Compact campervan — sleeps two", category: "Motorhomes", suburb: "Fremantle", state: "WA", price: 145, imageSrcs: [], badgeValue: null, reviewAverage: 4.8, reviewCount: 41, hostVerified: true, hostResponseHours: 2, instantBook: false },
  { id: "s3", title: "City runabout — cheap on fuel", category: "Car", suburb: "Newtown", state: "NSW", price: 58, imageSrcs: [], badgeValue: null, reviewAverage: 4.7, reviewCount: 12, hostVerified: false, hostResponseHours: 6, instantBook: true },
  { id: "s4", title: "Long-wheelbase cargo van", category: "Vans", suburb: "Bowen Hills", state: "QLD", price: 89, imageSrcs: [], badgeValue: null, reviewAverage: 5, reviewCount: 8, hostVerified: true, hostResponseHours: 1, instantBook: false },
  { id: "s5", title: "Off-road wagon — roof tent ready", category: "Car", suburb: "Wanniassa", state: "ACT", price: 112, imageSrcs: [], badgeValue: null, reviewAverage: 4.9, reviewCount: 33, hostVerified: true, hostResponseHours: 3, instantBook: true },
  { id: "s6", title: "Twin-axle box trailer", category: "Trucks", suburb: "Prospect", state: "SA", price: 34, imageSrcs: [], badgeValue: null, reviewAverage: 4.6, reviewCount: 5, hostVerified: false, hostResponseHours: 12, instantBook: false },
];
