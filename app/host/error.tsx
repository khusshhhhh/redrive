"use client";

import SegmentError from "@/app/components/SegmentError";

export default function HostError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <SegmentError {...props} subject="the hosting flow" homeHref="/host" homeLabel="Restart" />;
}
