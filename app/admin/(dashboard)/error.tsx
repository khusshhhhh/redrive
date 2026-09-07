"use client";

import SegmentError from "@/app/components/SegmentError";

export default function AdminError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <SegmentError {...props} subject="the admin dashboard" homeHref="/admin" homeLabel="Reload dashboard" />
  );
}
