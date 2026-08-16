"use client";

import { useEffect, useRef, useState } from "react";
import { IconMapPin } from "@tabler/icons-react";
import { loadGoogleMaps } from "@/app/libs/GoogleMapLoader";

interface ListingMapProps {
  suburb: string;
  state: string;
}

const ListingMap: React.FC<ListingMapProps> = ({ suburb, state }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!suburb || !state) {
      setStatus("error");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !mapRef.current) return;
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode(
          {
            address: `${suburb}, ${state}, Australia`,
            componentRestrictions: { country: "AU" },
          },
          (results, geocodeStatus) => {
            if (cancelled || !mapRef.current) return;
            const result = results?.[0];
            if (geocodeStatus !== "OK" || !result?.geometry?.location) {
              setStatus("error");
              return;
            }

            const map = new google.maps.Map(mapRef.current, {
              center: result.geometry.location,
              zoom: 14,
              disableDefaultUI: true,
              gestureHandling: "none",
              keyboardShortcuts: false,
              clickableIcons: false,
              mapTypeId: google.maps.MapTypeId.ROADMAP,
              mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || undefined,
            });

            if (result.geometry.viewport) {
              map.fitBounds(result.geometry.viewport, 28);
              google.maps.event.addListenerOnce(map, "idle", () => {
                if ((map.getZoom() || 0) < 13) map.setZoom(13);
                if ((map.getZoom() || 0) > 15) map.setZoom(15);
              });
            }

            // Show an approximate suburb area without revealing the owner's address.
            new google.maps.Circle({
              map,
              center: result.geometry.location,
              radius: 550,
              clickable: false,
              strokeColor: "#39715A",
              strokeOpacity: 0.9,
              strokeWeight: 2,
              fillColor: "#39715A",
              fillOpacity: 0.12,
            });
            setStatus("ready");
          }
        );
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [suburb, state]);

  return (
    <div className="relative aspect-[4/3] min-h-64 w-full overflow-hidden rounded-md border border-hairline-soft bg-surface-soft sm:aspect-[16/9] sm:min-h-80" aria-label={`Map showing ${suburb}, ${state}`}>
      <div ref={mapRef} className="h-full w-full" />
      {status === "loading" && <div className="skeleton-wave absolute inset-0" role="status" aria-label="Loading suburb map" />}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface-soft px-6 text-center">
          <IconMapPin size={28} className="text-primary" />
          <p className="font-semibold text-ink">{suburb}, {state}</p>
          <p className="text-sm text-muted">The suburb map is temporarily unavailable.</p>
        </div>
      )}
      {status === "ready" && (
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-sm font-semibold text-ink shadow-card backdrop-blur-sm">
          <IconMapPin size={17} className="text-primary" />
          Near {suburb}
        </div>
      )}
    </div>
  );
};

export default ListingMap;
