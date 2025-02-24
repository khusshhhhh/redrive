'use client';

import { useEffect, useState, useRef } from "react";
import Script from "next/script";

interface MapProps {
    suburb?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
}

const Map: React.FC<MapProps> = ({ suburb, state, latitude, longitude }) => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [apiLoaded, setApiLoaded] = useState(false);

    // ✅ Load suburb location from JSON if latitude & longitude are not provided
    useEffect(() => {
        if (latitude && longitude) {
            setMapLocation({ lat: latitude, lng: longitude });
            return;
        }

        if (!suburb || !state) return;

        fetch("/test.Suburb.json")
            .then((res) => res.json())
            .then((data) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const foundSuburb = data.find((s: any) => s.suburb === suburb && s.state === state);
                if (foundSuburb) {
                    setMapLocation({ lat: foundSuburb.lat, lng: foundSuburb.lng });
                } else {
                    setMapLocation(null);
                }
            })
            .catch((error) => console.error("❌ Error loading suburb data:", error));
    }, [suburb, state, latitude, longitude]);

    // ✅ Initialize Google Maps once the API is loaded
    useEffect(() => {
        if (!mapRef.current || !mapLocation || !window.google || !apiLoaded) return;

        console.log("✅ Initializing Google Map with Map ID:", process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID);

        const map = new window.google.maps.Map(mapRef.current, {
            center: mapLocation,
            zoom: 20,
            mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || undefined,
        });

        new window.google.maps.marker.AdvancedMarkerElement({
            position: mapLocation,
            map: map,
            title: suburb || "Selected Location",
        });

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapLocation, apiLoaded]);

    return (
        <>
            {/* ✅ Load Google Maps API dynamically */}
            {!apiLoaded && (
                <Script
                    src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=marker&map_ids=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}`}
                    strategy="afterInteractive"
                    onLoad={() => setApiLoaded(true)}
                />
            )}

            {/* ✅ Display map only if location is available */}
            {mapLocation ? (
                <div ref={mapRef} className="h-[35vh] rounded-lg w-full" />
            ) : (
                <p className="text-gray-500 text-center">Map location is not available.</p>
            )}
        </>
    );
};

export default Map;
