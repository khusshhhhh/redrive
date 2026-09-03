"use client";

import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";

export interface LightboxImage {
  original: string;
  thumbnail: string;
  originalAlt: string;
  thumbnailAlt: string;
}

// Split out so `react-image-gallery` and its stylesheet only load once the
// viewer actually opens the lightbox (dynamic import in page.tsx), instead of
// shipping with every listing-images route.
export default function LightboxGallery({
  items,
  startIndex,
  onClose,
}: {
  items: LightboxImage[];
  startIndex: number;
  onClose: () => void;
}) {
  return (
    <ImageGallery
      items={items}
      startIndex={startIndex}
      showThumbnails
      showFullscreenButton={false}
      showPlayButton={false}
      onClick={onClose}
      renderLeftNav={(onClick, disabled) => (
        <button
          className="absolute invisible lg:visible z-50 top-1/2 transform -translate-y-1/2 bg-white text-ink p-3 rounded-full shadow-card hover:bg-surface-soft transition"
          onClick={onClick}
          disabled={disabled}
          aria-label="Previous photo"
        >
          <IconArrowLeft size={18} />
        </button>
      )}
      renderRightNav={(onClick, disabled) => (
        <button
          className="absolute invisible lg:visible right-0 z-50 top-1/2 transform -translate-y-1/2 bg-white text-ink p-3 rounded-full shadow-card hover:bg-surface-soft transition"
          onClick={onClick}
          disabled={disabled}
          aria-label="Next photo"
        >
          <IconArrowRight size={18} />
        </button>
      )}
    />
  );
}
