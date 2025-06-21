"use client";

import Image from "next/image";

interface AvatarProps {
  src: string | null | undefined;
  size?: number;
  className?: string;
  showBadge?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ src, size = 30, showBadge }) => {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="rounded-full overflow-hidden w-full h-full">
        <Image
          src={src || "/images/placeholder.png"}
          alt="Avatar"
          width={size}
          height={size}
          className="object-cover"
        />
      </div>
      {showBadge && (
        <span className="absolute top-0 right-0 block h-2 w-2 bg-teal-500 rounded-full" />
      )}
    </div>
  );
};

export default Avatar;
