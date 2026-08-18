"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface HorizontalScrollerProps {
  children: ReactNode;
  ariaLabel: string;
  className?: string;
}

const HorizontalScroller = ({
  children,
  ariaLabel,
  className = "",
}: HorizontalScrollerProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateControls = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const remaining = scroller.scrollWidth - scroller.clientWidth;
    setCanScrollLeft(scroller.scrollLeft > 4);
    setCanScrollRight(remaining - scroller.scrollLeft > 4);
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const frame = requestAnimationFrame(updateControls);
    const observer = new ResizeObserver(updateControls);
    observer.observe(scroller);
    Array.from(scroller.children).forEach((child) => observer.observe(child));
    scroller.addEventListener("scroll", updateControls, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scroller.removeEventListener("scroll", updateControls);
    };
  }, [children, updateControls]);

  const scroll = (direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({
      left: direction * Math.max(240, scroller.clientWidth * 0.82),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  return (
    <div className="group/scroller relative min-w-0">
      <div
        ref={scrollerRef}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        className={`scrollbar-hide flex snap-x snap-proximity overflow-x-auto overscroll-x-contain scroll-smooth outline-none motion-reduce:scroll-auto focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${className}`}
      >
        {children}
      </div>

      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label={`Scroll ${ariaLabel} left`}
          className="absolute left-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-hairline bg-white/95 text-ink shadow-card backdrop-blur transition hover:scale-105 hover:border-border-strong hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:flex"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
      )}

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll(1)}
          aria-label={`Scroll ${ariaLabel} right`}
          className="absolute right-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-hairline bg-white/95 text-ink shadow-card backdrop-blur transition hover:scale-105 hover:border-border-strong hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:flex"
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default HorizontalScroller;
