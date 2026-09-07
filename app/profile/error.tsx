"use client";

import SegmentError from "@/app/components/SegmentError";

export default function ProfileError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SegmentError {...props} subject="your profile" homeHref="/profile" homeLabel="Reload profile" />;
}
