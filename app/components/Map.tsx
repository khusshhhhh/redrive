'use client';

import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useEffect, useRef, useState } from "react";

L.Icon.Default.mergeOptions({
    iconUrl: markerIcon.src,
    iconRetinaUrl: markerIcon2x.src,
    shadowUrl: markerShadow.src,
});

interface MapProps {
    center?: number[];
}

const Map: React.FC<MapProps> = ({ center }) => {
    const mapRef = useRef<L.Map | null>(null);
    const [key, setKey] = useState(0); // Used to force re-render if needed

    useEffect(() => {
        if (mapRef.current) {
            mapRef.current.remove(); // Ensure the previous map is destroyed
        }
        setKey((prevKey) => prevKey + 1); // Force a re-render
    }, [center]);

    return (
        <MapContainer
            key={key}
            center={center as L.LatLngExpression || [51, -0.09]}
            zoom={center ? 4 : 2}
            scrollWheelZoom={false}
            className="h-[35vh] rounded-lg"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">Redrive</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {center && (
                <Marker
                    position={center as L.LatLngExpression}
                />
            )}
        </MapContainer>
    );
};

export default Map;