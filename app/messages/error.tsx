"use client";

import SegmentError from "@/app/components/SegmentError";

export default function MessagesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SegmentError {...props} subject="your messages" homeHref="/messages" homeLabel="Reload messages" />;
}
