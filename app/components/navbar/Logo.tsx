import Link from "next/link";
import Image from "next/image";

const Logo = () => {
  return (
    <Link
      href="/"
      aria-label="Redrive home"
      className="group flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
    >
      {/* A single road-like R and wattle point: compact, Australian and legible. */}
      <Image
        src="/icon.svg"
        alt=""
        width={36}
        height={36}
        priority
        aria-hidden="true"
        className="h-9 w-9"
      />

      <span className="text-xl font-bold tracking-[-0.045em] text-luxe sm:text-2xl md:text-[23px]">
        redrive
      </span>
    </Link>
  );
};

export default Logo;
