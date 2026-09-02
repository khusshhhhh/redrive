// Line illustrations that share the monochrome + single-yellow-accent language
// used across the marketing surfaces. Source SVGs live in /public/illustrations;
// each has a matching 960px PNG the transactional emails reuse.
//
// Rendered as a plain <img> on purpose: these are small, static, decorative
// vector files, so the next/image optimiser (and its SVG restrictions) add
// nothing here.
export type IllustrationName =
  | "road-trip"
  | "empty-search"
  | "saved-empty"
  | "signed-out"
  | "lost"
  | "mail-sent"
  | "shield-check"
  | "handover-keys"
  | "announcement"
  | "document-lock"
  | "route-map"
  | "chat-bubbles";

const RATIO = 480 / 360;

interface IllustrationProps {
  name: IllustrationName;
  /** Rendered width in px. Height is derived from the 4:3 artboard. */
  width?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
}

const DEFAULT_ALT: Record<IllustrationName, string> = {
  "road-trip": "A camper van on an open road",
  "empty-search": "A magnifying glass over a map",
  "saved-empty": "An empty saved-vehicles shortlist",
  "signed-out": "A padlock",
  lost: "A signpost at a fork in the road",
  "mail-sent": "An envelope in transit",
  "shield-check": "A shield with a check mark",
  "handover-keys": "One hand passing a key to another",
  announcement: "A megaphone with radiating lines",
  "document-lock": "A document protected by a padlock",
  "route-map": "A folded map with a route between two pins",
  "chat-bubbles": "Two overlapping message bubbles",
};

export default function Illustration({
  name,
  width = 320,
  className,
  priority = false,
  alt,
}: IllustrationProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/illustrations/${name}.svg`}
      width={width}
      height={Math.round(width / RATIO)}
      alt={alt ?? DEFAULT_ALT[name]}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
}
