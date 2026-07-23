"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const Logo = () => {
  const router = useRouter();

  return (
    <Image
      onClick={() => router.push('/')}
      alt="Logo"
      priority
      className="block cursor-pointer w-[100px] h-[80px] md:w-[150px] md:h-[120px] object-contain dark:invert dark:brightness-90"
      height={120}
      width={150}
      src="/images/logo.png"
    />
  );
};

export default Logo;
