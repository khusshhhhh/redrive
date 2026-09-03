import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import { consumeRateLimits, getClientIp, tooManyRequests } from "@/app/libs/security";
import { BoundedMemoryCache } from "@/app/libs/memoryCache";

// Short result cache: autocomplete for the same prefix repeats constantly
// while a user types, and each miss is a billed Google call.
const placesCache = new BoundedMemoryCache<unknown>({ maxEntries: 500, ttlMs: 5 * 60_000 });

interface GooglePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

async function GETHandler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const input = searchParams.get("input");
    // Optional soft filters - narrows results toward a suburb/state the user
    // already picked, but autocomplete works fine Australia-wide without them.
    const suburb = searchParams.get("suburb");
    const state = searchParams.get("state");
    const sessiontoken = searchParams.get("sessiontoken");

    // Google won't return anything useful below ~3 characters anyway, and this
    // avoids firing a billed request on every single keystroke.
    if (!input || input.trim().length < 3) {
      return NextResponse.json([], { status: 200 });
    }

    // Unauthenticated + billed downstream — cap abuse by IP.
    const rateLimit = await consumeRateLimits([
      { scope: "places-autocomplete-ip", identifier: getClientIp(req), limit: 60, windowMs: 60_000 },
    ]);
    if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

    const cacheKey = `${input.trim().toLowerCase()}|${suburb || ""}|${state || ""}`;
    const cached = placesCache.get(cacheKey);
    if (cached !== undefined) {
      return NextResponse.json(cached, {
        status: 200,
        headers: { "Cache-Control": "private, max-age=120" },
      });
    }

    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json(
        { error: "Google API Key is missing" },
        { status: 500 }
      );
    }

    const params = new URLSearchParams({
      input,
      types: "address",
      components: "country:au",
      key: googleApiKey,
    });
    if (sessiontoken) {
      params.set("sessiontoken", sessiontoken);
    }

    const apiUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Google Places autocomplete error:", data.status, data.error_message);
      return NextResponse.json(
        { error: data.error_message || data.status },
        { status: 502 }
      );
    }

    let predictions: GooglePrediction[] = data.predictions || [];

    // If the caller already knows the suburb/state (e.g. refining an address
    // after picking them elsewhere in the form), bias results toward those -
    // but never hard-require it, so "3 Pen..." works before either is chosen.
    if (suburb || state) {
      predictions = predictions.filter((p) => {
        const desc = p.description;
        return (!suburb || desc.includes(suburb)) && (!state || desc.includes(state));
      });
    }

    const results = predictions.map((p) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text ?? p.description,
      secondaryText: p.structured_formatting?.secondary_text ?? "",
    }));

    placesCache.set(cacheKey, results);
    return NextResponse.json(results, {
      status: 200,
      headers: { "Cache-Control": "private, max-age=120" },
    });
  } catch (error) {
    console.error("Error fetching places:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const GET = monitorApiRoute("/api/places", GETHandler, "GET");
