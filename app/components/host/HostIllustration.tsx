"use client";

/**
 * Side-panel illustration for the host flow. One calm monochrome line-art scene
 * — a clean crossover on a quiet road — whose foreground accessory swaps per
 * phase so the listing visibly "builds up" as the host progresses:
 *
 *   about    → a dropped map pin + two spec tags clipping onto the vehicle
 *   standout → a camera and a framed photo
 *   finish   → a price tag, a key and a verified badge
 *
 * Shared language: a single 3.2px ink stroke, round joins, and exactly one
 * warm-yellow accent per scene.
 */

const INK = "#1F1F1F";
const MUTED = "#8C8C8C";
const FAINT = "#D2D2D2";
const ACCENT = "#FF9900";
const SW = 3.2;

export type HostPhaseKey = "about" | "standout" | "finish";

const PHASE_LABEL: Record<HostPhaseKey, string> = {
  about: "Describing the vehicle",
  standout: "Making the listing stand out",
  finish: "Setting terms and publishing",
};

export default function HostIllustration({ phase }: { phase: HostPhaseKey }) {
  return (
    <svg
      viewBox="0 0 480 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={PHASE_LABEL[phase]}
      className="host-illustration w-full max-w-[420px]"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* --- ground --- */}
      <ellipse cx="242" cy="286" rx="176" ry="15" fill="#EFEFEF" />
      <path d="M52 286h376" stroke={FAINT} strokeWidth={SW} />
      <path
        d="M66 306c66 0 78-13 132-13s72 13 132 13 54-9 66-9"
        stroke="#E6E6E6"
        strokeWidth={SW}
        strokeDasharray="1 15"
      />

      {/* --- sun --- */}
      <circle cx="398" cy="64" r="17" stroke={ACCENT} strokeWidth={SW} />
      <path
        d="M398 33v-9M398 104v9M367 64h-9M438 64h9M375 41l-6-6M427 87l6 6M421 41l6-6M375 87l-6 6"
        stroke={ACCENT}
        strokeWidth={SW}
      />

      {/* --- the crossover — constant across every phase --- */}
      <g>
        {/* body */}
        <path
          d="M74 258v-34c0-8 5-15 13-17l30-8 26-30c5-6 12-9 20-9h74c9 0 17 5 21 13l14 27 28 6c9 2 15 10 15 19v33"
          stroke={INK}
          strokeWidth={SW}
        />
        <path d="M74 258h316" stroke={INK} strokeWidth={SW} />
        {/* front + rear overhang */}
        <path d="M74 244h-9M390 244h9" stroke={INK} strokeWidth={SW} />
        {/* glasshouse */}
        <path d="M139 176l18-24c3-4 8-7 13-7h60c6 0 11 3 14 9l12 22Z" stroke={MUTED} strokeWidth={SW} />
        <path d="M196 145v33" stroke={MUTED} strokeWidth={SW} />
        {/* door line + handle */}
        <path d="M196 182v50" stroke={MUTED} strokeWidth={SW} />
        <path d="M210 200h16" stroke={MUTED} strokeWidth={SW} />
        {/* headlight hint */}
        <path d="M356 214h16" stroke={MUTED} strokeWidth={SW} />
        {/* wheels */}
        <g>
          <circle cx="150" cy="262" r="26" fill="#fff" stroke={INK} strokeWidth={SW} />
          <circle cx="150" cy="262" r="8" fill={ACCENT} />
          <circle cx="316" cy="262" r="26" fill="#fff" stroke={INK} strokeWidth={SW} />
          <circle cx="316" cy="262" r="8" fill={ACCENT} />
        </g>
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
      {/* dropped map pin */}
      <path
        d="M240 34c-16 0-29 13-29 29 0 20 29 42 29 42s29-22 29-42c0-16-13-29-29-29Z"
        fill="#fff"
        stroke={INK}
        strokeWidth={SW}
      />
      <circle cx="240" cy="63" r="9" fill={ACCENT} />

      {/* spec tags clipping onto the vehicle */}
      <g transform="translate(0,0)">
        <rect x="54" y="120" width="76" height="26" rx="7" fill="#fff" stroke={MUTED} strokeWidth={SW} />
        <path d="M68 129h34M68 137h22" stroke={FAINT} strokeWidth={SW} />
        <path d="M130 133l30 22" stroke={FAINT} strokeWidth={SW} strokeDasharray="1 9" />
        <circle cx="160" cy="155" r="3" fill={MUTED} />
      </g>
      <g>
        <rect x="350" y="150" width="76" height="26" rx="7" fill="#fff" stroke={MUTED} strokeWidth={SW} />
        <path d="M364 159h34M364 167h22" stroke={FAINT} strokeWidth={SW} />
        <path d="M350 163l-40 22" stroke={FAINT} strokeWidth={SW} strokeDasharray="1 9" />
        <circle cx="310" cy="185" r="3" fill={MUTED} />
      </g>
    </g>
  );
}

function StandoutAccent() {
  return (
    <g className="host-illustration-swap">
      {/* framed photo */}
      <rect x="300" y="52" width="108" height="82" rx="9" fill="#fff" stroke={INK} strokeWidth={SW} />
      <circle cx="326" cy="78" r="8" stroke={MUTED} strokeWidth={SW} />
      <path d="M308 120l24-26 15 13 17-21 28 34" stroke={MUTED} strokeWidth={SW} />

      {/* camera */}
      <rect x="62" y="82" width="92" height="62" rx="12" fill="#fff" stroke={INK} strokeWidth={SW} />
      <path d="M86 82l8-13h28l8 13" stroke={INK} strokeWidth={SW} />
      <circle cx="108" cy="113" r="17" fill="#fff" stroke={INK} strokeWidth={SW} />
      <circle cx="108" cy="113" r="6" fill={ACCENT} />
      <path d="M138 96h8" stroke={MUTED} strokeWidth={SW} />

      {/* one sparkle */}
      <path d="M242 40v22M242 84v14M220 71h18M262 71h14" stroke={ACCENT} strokeWidth={SW} />
    </g>
  );
}

function FinishAccent() {
  return (
    <g className="host-illustration-swap">
      {/* price tag */}
      <path
        d="M58 92h42l42 42-42 42-42-42V98a6 6 0 0 1 6-6Z"
        fill="#fff"
        stroke={INK}
        strokeWidth={SW}
      />
      <circle cx="80" cy="114" r="8" fill={ACCENT} />

      {/* key */}
      <circle cx="356" cy="92" r="19" fill="#fff" stroke={INK} strokeWidth={SW} />
      <path d="M356 111v42M356 136h15M356 148h11" stroke={INK} strokeWidth={SW} />

      {/* verified badge */}
      <path
        d="M240 32l14 9 16-3 7 15 14 10-5 16 5 16-14 10-7 15-16-3-14 9-14-9-16 3-7-15-14-10 5-16-5-16 14-10 7-15 16 3 14-9Z"
        fill="#fff"
        stroke={MUTED}
        strokeWidth={SW}
      />
      <path d="M224 90l11 11 21-24" stroke={ACCENT} strokeWidth="4.2" />
    </g>
  );
}
