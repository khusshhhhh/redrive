"use client";

import SegmentError from "@/app/components/SegmentError";

export default function PropertiesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SegmentError {...props} subject="your vehicles" homeHref="/properties" homeLabel="Reload vehicles" />
  );
}
