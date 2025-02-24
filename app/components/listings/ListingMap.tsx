'use client';

interface ListingMapProps {
    address: string;
    suburb: string;
    state: string;
}

const ListingMap: React.FC<ListingMapProps> = ({ address }) => {
    if (!address) {
        return <p className="text-gray-500 text-center">Location not available.</p>;
    }

    const formattedAddress = `${address}`;
    const googleMapsUrl = `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(formattedAddress)}`;

    return (
        <div className="h-[400px] w-full rounded-lg overflow-hidden">
            <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={googleMapsUrl}
                allowFullScreen
            ></iframe>
        </div>
    );
};

export default ListingMap;
