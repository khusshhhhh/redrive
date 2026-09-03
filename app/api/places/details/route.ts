import { monitorApiRoute } from "@/app/libs/apiMonitoring";
import { NextResponse } from "next/server";
import { consumeRateLimits, getClientIp, tooManyRequests } from "@/app/libs/security";
import { BoundedMemoryCache } from "@/app/libs/memoryCache";

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

// Place details for one id are effectively immutable — cache them longer.
const detailsCache = new BoundedMemoryCache<unknown>({ maxEntries: 1000, ttlMs: 60 * 60_000 });

async function GETHandler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const placeId = searchParams.get("placeId");
    const sessiontoken = searchParams.get("sessiontoken");

    if (!placeId) {
      return NextResponse.json({ error: "Missing placeId" }, { status: 400 });
    }

    const rateLimit = await consumeRateLimits([
      { scope: "places-details-ip", identifier: getClientIp(req), limit: 40, windowMs: 60_000 },
    ]);
    if (!rateLimit.allowed) return tooManyRequests(rateLimit.retryAfterSeconds);

    const cached = detailsCache.get(placeId);
    if (cached !== undefined) {
      return NextResponse.json(cached, { headers: { "Cache-Control": "private, max-age=600" } });
    }

    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json(
        { error: "Google API Key is missing" },
        { status: 500 }
      );
    }

    const params = new URLSearchParams({
      place_id: placeId,
      fields: "address_component,formatted_address,geometry",
      key: googleApiKey,
    });
    if (sessiontoken) {
      params.set("sessiontoken", sessiontoken);
    }

    const apiUrl = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status !== "OK") {
      console.error("Google Places details error:", data.status, data.error_message);
      return NextResponse.json(
        { error: data.error_message || data.status },
        { status: 502 }
      );
    }

    const components: AddressComponent[] = data.result?.address_components || [];
    const find = (type: string, useShortName = false) => {
      const match = components.find((c) => c.types.includes(type));
      if (!match) return undefined;
      return useShortName ? match.short_name : match.long_name;
    };

    const streetNumber = find("street_number");
    const route = find("route");
    const streetAddress = [streetNumber, route].filter(Boolean).join(" ");
    const suburb =
      find("locality") ||
      find("sublocality") ||
      find("postal_town") ||
      find("administrative_area_level_2");
    const state = find("administrative_area_level_1", true);
    const postcode = find("postal_code");
    const location = data.result?.geometry?.location;

    const result = {
      formattedAddress: data.result?.formatted_address as string | undefined,
      streetAddress: streetAddress || data.result?.formatted_address,
      suburb,
      state,
      postcode,
      lat: location?.lat as number | undefined,
      lng: location?.lng as number | undefined,
    };
    detailsCache.set(placeId, result);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, max-age=600" } });
  } catch (error) {
    console.error("Error fetching place details:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const GET = monitorApiRoute("/api/places/details", GETHandler, "GET");
