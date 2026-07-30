import { NextResponse } from "next/server";

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const placeId = searchParams.get("placeId");
    const sessiontoken = searchParams.get("sessiontoken");

    if (!placeId) {
      return NextResponse.json({ error: "Missing placeId" }, { status: 400 });
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
    const suburb = find("locality") || find("sublocality") || find("postal_town");
    const state = find("administrative_area_level_1", true);
    const postcode = find("postal_code");
    const location = data.result?.geometry?.location;

    return NextResponse.json({
      formattedAddress: data.result?.formatted_address as string | undefined,
      streetAddress: streetAddress || data.result?.formatted_address,
      suburb,
      state,
      postcode,
      lat: location?.lat as number | undefined,
      lng: location?.lng as number | undefined,
    });
  } catch (error) {
    console.error("Error fetching place details:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
