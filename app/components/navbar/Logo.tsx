"use client";

import { useRouter } from "next/navigation";

const Logo = () => {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push('/')}
      role="button"
      aria-label="Redrive home"
      className="flex items-center gap-2 cursor-pointer select-none"
    >
      {/* A road-shaped R with a wattle-gold sun: movement, return journeys and
          the Australian Coast and Country palette in one minimal mark. */}
      <svg viewBox="0 0 64 64" className="h-9 w-9 shrink-0 md:h-11 md:w-11" aria-hidden="true">
        <rect width="64" height="64" rx="17" className="fill-primary" />
        <path d="M19 49V22c0-5.5 4.5-10 10-10h6c8.3 0 15 5.8 15 13s-6.7 13-15 13H20" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m34 38 14 13" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
        <circle cx="49" cy="13" r="4.5" className="fill-accent" />
      </svg>
      <span className="hidden text-xl font-bold tracking-[-0.04em] text-ink sm:block md:text-2xl">
        redrive
      </span>
    </div>
  );
};

export default Logo;
