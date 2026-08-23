"use client";

import Image from "next/image";

interface AvatarProps {
  src: string | null | undefined;
  size?: number;
  className?: string;
  alt?: string;
}

const Avatar: React.FC<AvatarProps> = ({ src, size = 30, alt = "Redrive member profile photo" }) => {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="rounded-full overflow-hidden w-full h-full">
        <Image
          src={src || "/images/placeholder.png"}
          alt={alt}
          width={size}
          height={size}
          className="object-cover"
        />
      </div>
    </div>
  );
};

export default Avatar;
