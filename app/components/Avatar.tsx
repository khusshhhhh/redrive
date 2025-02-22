"use client";

import Image from "next/image";

interface AvatarProps {
  src: string | null | undefined;
  size?: number;
};

const Avatar: React.FC<AvatarProps> = ({ src, size = 30 }) => {
  return (
    <Image
      className="rounded-full"
      height={size}
      width={size}
      src={src || "/images/placeholder.png"}
      alt="Avatar"
    />
  );
};

export default Avatar;
