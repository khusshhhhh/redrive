import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const input = searchParams.get("input");
    const suburb = searchParams.get("suburb");
    const state = searchParams.get("state");

    if (!input || !suburb || !state) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }

    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json(
        { error: "Google API Key is missing" },
        { status: 500 }
      );
    }

    // ✅ Google Places API for address autocomplete
    const apiUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      input
    )}&types=address&components=country:AU&key=${googleApiKey}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data.predictions || data.predictions.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // ✅ Filter results by suburb and state
    const filteredResults = data.predictions.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (place: any) =>
        place.description.includes(suburb) && place.description.includes(state)
    );

    return NextResponse.json(filteredResults, { status: 200 });
  } catch (error) {
    console.error("Error fetching places:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
