"use client";

/**
 * Side illustration for the host flow. Five flat black + yellow scenes that the
 * host moves through as a journey — from getting the vehicle ready, to loading
 * it up, cataloguing it, guests enjoying it, and finally the handover. The
 * `frame` (1–5) is chosen by the caller from how far through the flow the host
 * is; the container keeps a slow idle drift (`.host-illustration`) and each new
 * frame cross-fades in.
 *
 * The SVGs are served as static assets (frame1 is large) rather than inlined, so
 * only the frames the host actually reaches are downloaded.
 */

export type HostPhaseKey = "about" | "standout" | "finish";

export type HostFrame = 1 | 2 | 3 | 4 | 5;

const FRAME_ALT: Record<HostFrame, string> = {
  1: "Getting your vehicle ready to list",
  2: "The vehicle packed and loaded for a trip",
  3: "Cataloguing the vehicle's details",
  4: "Guests out on a trip in the vehicle",
  5: "Handing the keys to a guest",
};

export default function HostIllustration({ frame }: { frame: HostFrame }) {
  const n = Math.min(5, Math.max(1, Math.round(frame))) as HostFrame;

  return (
    <div className="host-illustration relative w-full max-w-[420px]">
      {/* keyed so React remounts on change and the fade-in animation replays */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={n}
        src={`/illustrations/host/frame${n}.svg`}
        alt={FRAME_ALT[n]}
        className="host-illustration-frame w-full"
        draggable={false}
      />
    </div>
  );
}
