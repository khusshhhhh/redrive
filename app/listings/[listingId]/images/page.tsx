'use client';

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import { IoArrowBack } from "react-icons/io5";

interface ImagesPageProps {
    params: { id: string };
}

const ImagesPage: React.FC<ImagesPageProps> = ({ params }) => {
    const router = useRouter();
    const [images, setImages] = useState<string[]>([]);

    useEffect(() => {
        // Simulate fetching images for the listing (replace with API call)
        const fetchImages = async () => {
            try {
                const response = await fetch(`/api/listings/${params.id}`); // Adjust API endpoint
                const data = await response.json();
                setImages(data.imageSrcs || []);
            } catch (error) {
                console.error("Error fetching images:", error);
            }
        };

        fetchImages();
    }, [params.id]);

    return (
        <div className="max-w-6xl mx-auto px-4 py-6">
            {/* Back Button */}
            <button
                className="flex items-center text-lg text-gray-700 hover:text-black mb-4"
                onClick={() => router.back()}
            >
                <IoArrowBack size={24} className="mr-2" />
                Back
            </button>

            {/* Images Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {images.map((src, index) => (
                    <div key={index} className="relative w-full">
                        <Image
                            alt={`Listing Image ${index + 1}`}
                            src={src}
                            width={600}
                            height={400}
                            className="object-cover w-full h-auto rounded-lg"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ImagesPage;
