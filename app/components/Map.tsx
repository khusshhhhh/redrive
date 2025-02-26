'use client';

import { useEffect, useState, useRef } from "react";
import { loadGoogleMaps } from "@/app/libs/GoogleMapLoader";

interface MapProps {
    suburb?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
}

const Map: React.FC<MapProps> = ({ suburb, state, latitude, longitude }) => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);

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

    useEffect(() => {
        if (!mapRef.current || !mapLocation) return;

        loadGoogleMaps().then((google) => {
            const map = new google.maps.Map(mapRef.current, {
                center: mapLocation,
                zoom: 10,
                mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || undefined,
            });

            new google.maps.Marker({
                position: mapLocation,
                map: map,
                title: suburb || "Selected Location",
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapLocation]);

    return (
        <>
            {mapLocation ? <div ref={mapRef} className="h-[45vh] rounded-lg w-full" /> : <p className="text-gray-500 text-center">Map location is not available.</p>}
        </>
    );
};

export default Map;
