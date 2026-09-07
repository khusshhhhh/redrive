"use client";

import SegmentError from "@/app/components/SegmentError";

export default function TripsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SegmentError {...props} subject="your trips" homeHref="/trips" homeLabel="Reload trips" />;
}
