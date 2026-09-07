"use client";

import SegmentError from "@/app/components/SegmentError";

export default function ReservationsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SegmentError {...props} subject="your reservations" homeHref="/reservations" homeLabel="Reload reservations" />
  );
}
