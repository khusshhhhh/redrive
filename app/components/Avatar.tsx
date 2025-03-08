"use client";

import Image from "next/image";

interface AvatarProps {
  src: string | null | undefined;
  size?: number;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ src, size = 30 }) => {
  return (
    <div
      className="rounded-full overflow-hidden"
      style={{ width: size, height: size }}
    >
      <Image
        src={src || "/images/placeholder.png"}
        alt="Avatar"
        width={size}
        height={size}
        className="object-cover"
      />
    </div>
  );
};

export default Avatar;
