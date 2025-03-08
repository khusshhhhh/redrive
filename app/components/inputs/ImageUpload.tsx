/* eslint-disable @typescript-eslint/no-explicit-any */
import { CldUploadWidget } from "next-cloudinary";
import Image from "next/image";
import { useCallback } from "react";
import { TbPhotoPlus } from "react-icons/tb";

declare global {
    let cloudinary: any;
}

interface ImageUploadProps {
    onChange: (value: string) => void;
    value: string;
    triggerUpload?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onChange, value }) => {
    const handleUpload = useCallback((result: any) => {
        // Check if multiple files were uploaded
        if (Array.isArray(result.info)) {
            result.info.forEach((file: any) => {
                onChange(file.secure_url);
            });
        } else {
            onChange(result.info.secure_url);
        }
    }, [onChange]);

    return (
        <CldUploadWidget
            onSuccess={handleUpload}
            uploadPreset="redrive"
            options={{
                maxFiles: 10  // Allow selecting up to 10 images at once
            }}
        >
            {({ open }) => {
                return (
                    <div onClick={() => open?.()}
                        className="relative cursor-pointer hover:opacity-70 transition border-dashed border-2 p-20 border-neutral-300 flex flex-col justify-center items-center gap-4 text-neutral-600"
                    >
                        <TbPhotoPlus />
                        <div className="font-semibold text-lg">
                            Click To Upload
                        </div>
                        {value && (
                            <div className="absolute inset-0 w-full h-full">
                                <Image
                                    alt="Upload"
                                    fill
                                    style={{ objectFit: 'cover' }}
                                    src={value}
                                />
                            </div>
                        )}
                    </div>
                );
            }}
        </CldUploadWidget>
    );
};

export default ImageUpload;
