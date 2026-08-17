import Link from "next/link";

const Logo = () => {
  return (
    <Link
      href="/"
      aria-label="Redrive home"
      className="group flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
    >
      {/* A single road-like R and wattle point: compact, Australian and legible. */}

      <span className="hidden text-xl font-semibold tracking-[-0.045em] text-luxe sm:block md:text-[23px]">
        redrive
      </span>
    </Link>
  );
};

export default Logo;
