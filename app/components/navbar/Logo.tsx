"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const Logo = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();

  return (
    <Image
      alt="Logo"
      className="hidden md:block cursor-pointer"
      height="100"
      width="140"
      src="/images/logo.png"
    />
  );
};

export default Logo;
