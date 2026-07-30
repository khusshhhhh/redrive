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
      {/* Compass needle mark: points the driver forward, loops back to where the
          journey started — the "re" in redrive. */}
      <svg viewBox="0 0 40 40" className="w-9 h-9 md:w-11 md:h-11 shrink-0" aria-hidden="true">
        <rect width="40" height="40" rx="11" fill="#ff385c" />
        <circle cx="20" cy="20" r="7" fill="none" stroke="#ffffff" strokeWidth="2.4" />
        <line x1="12.5" y1="27.5" x2="27.5" y2="12.5" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
        <polygon points="27.5,12.5 25.73,17.81 22.19,14.27" fill="#ffffff" />
        <circle cx="12.5" cy="27.5" r="1.4" fill="#ffffff" />
        <circle cx="20" cy="20" r="1.7" fill="#ff385c" />
      </svg>
      <span className="hidden sm:block text-xl md:text-2xl font-bold tracking-tight text-ink">
        redrive
      </span>
    </div>
  );
};

export default Logo;
