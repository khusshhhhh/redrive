'use client';

import React, { useEffect, useState, useRef, memo } from "react";
import { loadGoogleMaps } from "@/app/libs/GoogleMapLoader";
import SuburbDataLoader from "@/app/libs/SuburbDataLoader";
import { clientLog } from "@/app/libs/clientLog";

interface MapProps {
    suburb?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
}

const Map: React.FC<MapProps> = memo(({ suburb, state, latitude, longitude }) => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);
    // True when the pin is the exact geocoded address, not just the suburb centre.
    const [precise, setPrecise] = useState(false);

    useEffect(() => {
        if (typeof latitude === "number" && typeof longitude === "number") {
            setMapLocation({ lat: latitude, lng: longitude });
            setPrecise(true);
            return;
        }

        setPrecise(false);

        if (!suburb || !state) {
            setMapLocation(null);
            return;
        }

        const loadLocation = async () => {
            try {
                const dataLoader = SuburbDataLoader.getInstance();
                await dataLoader.loadData();
                const coordinates = dataLoader.findSuburbCoordinates(suburb, state);
                setMapLocation(coordinates);
            } catch (error) {
                clientLog.error("Error loading suburb data for map", error);
                setMapLocation(null);
            }
        };

        loadLocation();
    }, [suburb, state, latitude, longitude]);

    useEffect(() => {
        if (!mapRef.current || !mapLocation) return;

        loadGoogleMaps().then((google) => {
            const map = new google.maps.Map(mapRef.current, {
                center: mapLocation,
                zoom: precise ? 16 : 12,
                mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || undefined,
            });

            new google.maps.Marker({
                position: mapLocation,
                map,
                title: precise ? "Vehicle address" : suburb || "Selected location",
            });
        });
    }, [mapLocation, precise, suburb]);

    if (!mapLocation) {
        return <p className="py-10 text-center text-sm text-muted">Map location is not available.</p>;
    }

    return (
        <div ref={mapRef} className="h-[45vh] w-full grayscale contrast-[0.95]" />
    );
});

Map.displayName = 'Map';

export default Map;
