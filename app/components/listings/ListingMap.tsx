'use client';

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/app/libs/GoogleMapLoader";

interface ListingMapProps {
    address: string;
    suburb: string;
    state: string;
}

const ListingMap: React.FC<ListingMapProps> = ({ address, suburb, state }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [mapLoaded, setMapLoaded] = useState(false);

    useEffect(() => {
        loadGoogleMaps().then((google) => {
            if (!mapRef.current) return;

            const map = new google.maps.Map(mapRef.current, {
                zoom: 12,
                center: { lat: -34.82, lng: 138.56 }, // Default center (change dynamically)
                styles: [
                    {
                        elementType: "geometry",
                        stylers: [{ color: "#f5f5f5" }]
                    },
                    {
                        elementType: "labels.icon",
                        stylers: [{ visibility: "off" }]
                    },
                    {
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#616161" }]
                    },
                    {
                        elementType: "labels.text.stroke",
                        stylers: [{ color: "#f5f5f5" }]
                    },
                    {
                        featureType: "administrative.land_parcel",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#bdbdbd" }]
                    },
                    {
                        featureType: "poi",
                        elementType: "geometry",
                        stylers: [{ color: "#eeeeee" }]
                    },
                    {
                        featureType: "poi",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#757575" }]
                    },
                    {
                        featureType: "road",
                        elementType: "geometry",
                        stylers: [{ color: "#ffffff" }]
                    },
                    {
                        featureType: "road.arterial",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#757575" }]
                    },
                    {
                        featureType: "road.highway",
                        elementType: "geometry",
                        stylers: [{ color: "#dadada" }]
                    },
                    {
                        featureType: "road.highway",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#616161" }]
                    },
                    {
                        featureType: "transit",
                        elementType: "geometry",
                        stylers: [{ color: "#e5e5e5" }]
                    },
                    {
                        featureType: "water",
                        elementType: "geometry",
                        stylers: [{ color: "#c9c9c9" }]
                    },
                    {
                        featureType: "water",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#9e9e9e" }]
                    }
                ]
            });

            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: `${address}, ${suburb}, ${state}` }, (results, status) => {
                if (status === "OK" && results[0].geometry.location) {
                    new google.maps.Marker({
                        position: results[0].geometry.location,
                        map: map,
                        title: address,
                        icon: {
                            url: "/marker.svg", // ✅ Use SVG from public folder
                            scaledSize: new google.maps.Size(80, 80), // ✅ Resize if needed
                            anchor: new google.maps.Point(20, 40), // ✅ Adjust anchor if necessary
                        }
                    });
                    map.setCenter(results[0].geometry.location);
                }
            });

            setMapLoaded(true);
        });
    }, [address, suburb, state]);

    return (
        <div className="relative h-[400px] w-full rounded-lg  overflow-hidden">
            {!mapLoaded && <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">Loading map...</div>}
            <div ref={mapRef} className="h-full w-full" />
        </div>
    );
};

export default ListingMap;
