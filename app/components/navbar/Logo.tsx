import Link from "next/link";

const Logo = () => {
  return (
    <Link
      href="/"
      aria-label="Redrive home"
      className="group flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
    >
      {/* A single road-like R and wattle point: compact, Australian and legible. */}
      <svg viewBox="0 0 48 48" className="h-9 w-9 shrink-0 transition-transform duration-300 group-hover:-rotate-2 group-hover:scale-[1.03] md:h-10 md:w-10" aria-hidden="true">
        <path d="M10 39V16c0-5 4-9 9-9h7c7.2 0 12 4.2 12 10.5S33.2 28 26 28H11" fill="none" className="stroke-primary" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m26 28 12 11" fill="none" className="stroke-primary" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="39" cy="8" r="3.4" className="fill-accent" />
      </svg>
      <span className="hidden text-xl font-semibold tracking-[-0.045em] text-ink sm:block md:text-[23px]">
        redrive
      </span>
    </Link>
  );
};

export default Logo;
