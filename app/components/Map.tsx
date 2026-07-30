'use client';

import React, { useEffect, useState, useRef, memo } from "react";
import { loadGoogleMaps } from "@/app/libs/GoogleMapLoader";
import SuburbDataLoader from "@/app/libs/SuburbDataLoader";

interface MapProps {
    suburb?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
}

const Map: React.FC<MapProps> = memo(({ suburb, state, latitude, longitude }) => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        if (latitude && longitude) {
            setMapLocation({ lat: latitude, lng: longitude });
            return;
        }

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
                console.error("❌ Error loading suburb data:", error);
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
                zoom: 10,
                mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || undefined,
            });

            new google.maps.Marker({
                position: mapLocation,
                map: map,
                title: suburb || "Selected Location",
            });
        });
    }, [mapLocation, suburb]);

    return (
        <>
            {mapLocation ? (
                <div ref={mapRef} className="h-[45vh] rounded-lg w-full" />
            ) : (
                <p className="text-muted text-center">Map location is not available.</p>
            )}
        </>
    );
});

Map.displayName = 'Map';

export default Map;
