"use client";

import SegmentError from "@/app/components/SegmentError";

export default function FavoritesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SegmentError {...props} subject="your saved vehicles" homeHref="/favorites" homeLabel="Reload" />;
}
