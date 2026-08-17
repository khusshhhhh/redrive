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

    const loadMap = async () => {
      const params = new URLSearchParams({ suburb, state });
      const response = await fetch(`/api/suburbs/coordinates?${params}`);

      if (!response.ok) {
        throw new Error("Suburb coordinates are unavailable");
      }

      const center = (await response.json()) as { lat: number; lng: number };
      const google = await loadGoogleMaps();

      if (cancelled || !mapRef.current) return;

      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: 14,
        disableDefaultUI: true,
        gestureHandling: "none",
        keyboardShortcuts: false,
        clickableIcons: false,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: "all",
            elementType: "geometry",
            stylers: [{ saturation: -100 }],
          },
          {
            featureType: "all",
            elementType: "labels.text.fill",
            stylers: [{ color: "#4b5557" }],
          },
          {
            featureType: "all",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#ffffff" }, { weight: 3 }],
          },
          {
            featureType: "poi",
            stylers: [{ visibility: "off" }],
          },
          {
            featureType: "transit",
            stylers: [{ visibility: "off" }],
          },
          {
            featureType: "road",
            elementType: "labels.icon",
            stylers: [{ visibility: "off" }],
          },
          {
            featureType: "road.local",
            elementType: "labels.text",
            stylers: [{ visibility: "simplified" }],
          },
          {
            featureType: "administrative.land_parcel",
            stylers: [{ visibility: "off" }],
          },
          {
            featureType: "landscape",
            elementType: "geometry",
            stylers: [{ color: "#f4f4f2" }],
          },
          {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#ffffff" }],
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#d9ddde" }],
          },
        ],
      });

      // Show an approximate suburb area without revealing the owner's address.
      new google.maps.Circle({
        map,
        center,
        radius: 550,
        clickable: false,
        strokeColor: "#087985",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: "#087985",
        fillOpacity: 0.14,
      });
      setStatus("ready");
    };

    loadMap()
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
