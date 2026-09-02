import { unstable_cache } from "next/cache";

import prisma from "@/app/libs/prismadb";
import { HOME_DATA_CACHE_TAG } from "@/app/actions/getHomeData";

/**
 * Live price context for the SEO landing pages. Percentile ranges per category
 * for a single state (South Australia), refreshed hourly and invalidated
 * whenever public listings change (shared "home-data" cache tag).
 *
 * The brief is explicit: never invent prices or counts. Pages call `priceRange`
 * and only render a dollar sentence when there is enough real inventory
 * (`MIN_SAMPLE`) to support it.
 */

const LANDING_STATE = "SA";
const MIN_SAMPLE = 4;

export interface LandingMarket {
  /** Total live listings in the target state. */
  liveCount: number;
  /** Sorted (ascending) daily prices per category label. */
  pricesByCategory: Record<string, number[]>;
}

const EMPTY: LandingMarket = { liveCount: 0, pricesByCategory: {} };

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const index = Math.min(
    sortedAsc.length - 1,
    Math.max(0, Math.round((p / 100) * (sortedAsc.length - 1))),
  );
  return sortedAsc[index];
}

const roundTo5 = (value: number) => Math.max(5, Math.round(value / 5) * 5);

export function formatAud(value: number): string {
  return `$${Math.round(value).toLocaleString("en-AU")}`;
}

/**
 * A defensible low–high band (20th–80th percentile, rounded to $5) across one or
 * more categories, or `null` when the combined sample is too small.
 */
export function priceRange(
  market: LandingMarket,
  categories: string[],
): { low: number; high: number } | null {
  const prices = categories
    .flatMap((category) => market.pricesByCategory[category] ?? [])
    .sort((a, b) => a - b);
  if (prices.length < MIN_SAMPLE) return null;
  const low = roundTo5(percentile(prices, 20));
  const high = roundTo5(percentile(prices, 80));
  if (high <= low) return null;
  return { low, high };
}

async function loadLandingMarket(): Promise<LandingMarket> {
  const rows = await prisma.listing.findMany({
    where: { state: LANDING_STATE },
    select: { category: true, price: true },
  });

  const pricesByCategory: Record<string, number[]> = {};
  for (const row of rows) {
    if (!row.category || typeof row.price !== "number" || row.price <= 0) continue;
    (pricesByCategory[row.category] ??= []).push(row.price);
  }
  for (const key of Object.keys(pricesByCategory)) {
    pricesByCategory[key].sort((a, b) => a - b);
  }

  return { liveCount: rows.length, pricesByCategory };
}

const cachedLandingMarket = unstable_cache(loadLandingMarket, ["landing-market-sa-v1"], {
  revalidate: 3600,
  tags: [HOME_DATA_CACHE_TAG],
});

export default async function getLandingMarket(): Promise<LandingMarket> {
  try {
    return await cachedLandingMarket();
  } catch {
    return EMPTY;
  }
}
