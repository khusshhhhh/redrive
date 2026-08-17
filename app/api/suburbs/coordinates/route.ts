import { NextResponse } from "next/server";
import suburbData from "@/public/test.Suburb.json";

interface SuburbCoordinates {
  suburb: string;
  state: string;
  lat: number;
  lng: number;
}

const suburbs = suburbData as SuburbCoordinates[];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const suburb = searchParams.get("suburb")?.trim();
  const state = searchParams.get("state")?.trim();

  if (!suburb || !state) {
    return NextResponse.json(
      { error: "Suburb and state are required" },
      { status: 400 }
    );
  }

  const location = suburbs.find(
    (entry) =>
      entry.suburb.localeCompare(suburb, undefined, { sensitivity: "base" }) === 0 &&
      entry.state.localeCompare(state, undefined, { sensitivity: "base" }) === 0
  );

  if (!location) {
    return NextResponse.json(
      { error: "Suburb coordinates not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    { lat: location.lat, lng: location.lng },
    {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    }
  );
}
