"use client";

/**
 * Side-panel illustration for the host flow. A single monochrome line-art scene
 * (matching /public/illustrations) whose foreground accessories swap per phase,
 * so the picture visibly "builds up" the listing as the host progresses:
 *
 *   about    → a map pin + spec chips being attached
 *   standout → a camera, sparkle and a framed photo
 *   finish   → a price tag, a key and a verified badge
 */

const INK = "#3B3B3B";
const MUTED = "#B5B5B5";
const FAINT = "#D9D9D9";
const ACCENT = "#EAB308";

export type HostPhaseKey = "about" | "standout" | "finish";

const PHASE_LABEL: Record<HostPhaseKey, string> = {
  about: "Describing the vehicle",
  standout: "Making the listing stand out",
  finish: "Setting terms and publishing",
};

export default function HostIllustration({ phase }: { phase: HostPhaseKey }) {
  return (
    <svg
      viewBox="0 0 480 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={PHASE_LABEL[phase]}
      className="host-illustration w-full max-w-[420px]"
    >
      {/* ground + moving road dashes */}
      <ellipse cx="240" cy="300" rx="170" ry="16" fill="#F0F0F0" />
      <path d="M60 300h360" stroke={FAINT} strokeWidth="3" strokeLinecap="round" />
      <path
        d="M70 320c60 0 70-14 130-14s70 14 130 14 60-10 90-10"
        stroke="#E7E7E7"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 14"
      />

      {/* sun accent */}
      <circle cx="392" cy="70" r="20" stroke={ACCENT} strokeWidth="3" />
      <path
        d="M392 36v-8M392 112v8M358 70h-8M434 70h-8M368 46l-6-6M416 100l-6-6M416 46l6-6M368 100l6-6"
        stroke={ACCENT}
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* the car — stays across every phase */}
      <g>
        <path
          d="M92 268v-40a12 12 0 0 1 12-12h48l30-34a12 12 0 0 1 9-4h74a12 12 0 0 1 11 8l16 34h20a14 14 0 0 1 14 14v36"
          stroke={INK}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M92 268h296" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M150 216l14-46h58l4 46" stroke={MUTED} strokeWidth="3" strokeLinejoin="round" />
        <path d="M186 170v46" stroke={MUTED} strokeWidth="3" />
        <circle cx="150" cy="272" r="24" fill="#fff" stroke={INK} strokeWidth="3" />
        <circle cx="150" cy="272" r="7" fill={ACCENT} />
        <circle cx="322" cy="272" r="24" fill="#fff" stroke={INK} strokeWidth="3" />
        <circle cx="322" cy="272" r="7" fill={ACCENT} />
        <path d="M356 232h20" stroke={MUTED} strokeWidth="3" strokeLinecap="round" />
      </g>

      {phase === "about" && <AboutAccent />}
      {phase === "standout" && <StandoutAccent />}
      {phase === "finish" && <FinishAccent />}
    </svg>
  );
}

function AboutAccent() {
  return (
    <g className="host-illustration-swap">
      {/* location pin dropping onto the car */}
      <path
        d="M232 44c-18 0-32 14-32 32 0 22 32 46 32 46s32-24 32-46c0-18-14-32-32-32Z"
        fill="#fff"
        stroke="#3B3B3B"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="232" cy="76" r="10" fill="#EAB308" />
      {/* spec chips being attached */}
      <rect x="60" y="96" width="70" height="22" rx="6" fill="#fff" stroke="#B5B5B5" strokeWidth="3" />
      <path d="M74 107h42" stroke="#D9D9D9" strokeWidth="3" strokeLinecap="round" />
      <rect x="352" y="132" width="70" height="22" rx="6" fill="#fff" stroke="#B5B5B5" strokeWidth="3" />
      <path d="M366 143h42" stroke="#D9D9D9" strokeWidth="3" strokeLinecap="round" />
      <path d="M130 118l24 30M352 154l-40 24" stroke="#D9D9D9" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 8" />
    </g>
  );
}

function StandoutAccent() {
  return (
    <g className="host-illustration-swap">
      {/* framed photo */}
      <rect x="300" y="60" width="104" height="80" rx="8" fill="#fff" stroke="#3B3B3B" strokeWidth="3" />
      <path d="M312 122l20-22 14 12 16-20 22 30" stroke="#B5B5B5" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="324" cy="82" r="7" stroke="#B5B5B5" strokeWidth="3" />
      {/* camera */}
      <rect x="70" y="86" width="86" height="60" rx="10" fill="#fff" stroke="#3B3B3B" strokeWidth="3" />
      <path d="M92 86l8-12h26l8 12" stroke="#3B3B3B" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="113" cy="116" r="16" fill="#fff" stroke="#3B3B3B" strokeWidth="3" />
      <circle cx="113" cy="116" r="6" fill="#EAB308" />
      {/* sparkle */}
      <path
        d="M240 40v26M240 92v18M214 76h20M266 76h18"
        stroke="#EAB308"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
  );
}

function FinishAccent() {
  return (
    <g className="host-illustration-swap">
      {/* price tag */}
      <path
        d="M64 92h44l40 40-44 44-40-40V96a4 4 0 0 1 4-4Z"
        fill="#fff"
        stroke="#3B3B3B"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="86" cy="114" r="7" fill="#EAB308" />
      {/* key */}
      <circle cx="352" cy="96" r="18" fill="#fff" stroke="#3B3B3B" strokeWidth="3" />
      <path d="M352 114v40M352 138h14M352 150h10" stroke="#3B3B3B" strokeWidth="3" strokeLinecap="round" />
      {/* verified badge */}
      <path
        d="M240 36l14 8 16-2 6 15 13 10-5 15 5 15-13 10-6 15-16-2-14 8-14-8-16 2-6-15-13-10 5-15-5-15 13-10 6-15 16 2 14-8Z"
        fill="#fff"
        stroke="#B5B5B5"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M226 92l10 10 20-22" stroke="#EAB308" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}
