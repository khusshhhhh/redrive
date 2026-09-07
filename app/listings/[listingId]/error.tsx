"use client";

import SegmentError from "@/app/components/SegmentError";

export default function ListingError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SegmentError {...props} subject="this vehicle" />;
}
