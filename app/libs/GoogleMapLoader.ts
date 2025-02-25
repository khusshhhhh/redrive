import { Loader } from "@googlemaps/js-api-loader";

let googleMapsLoader: Loader | null = null;

export const loadGoogleMaps = async (): Promise<typeof google> => {
  if (googleMapsLoader) {
    await googleMapsLoader.load();
    return window.google;
  }

  googleMapsLoader = new Loader({
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    version: "weekly",
  });

  await googleMapsLoader.load();
  return window.google;
};
