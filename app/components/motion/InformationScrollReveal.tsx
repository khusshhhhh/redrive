"use client";

import { useLayoutEffect, useRef } from "react";

const REVEAL_SELECTOR = "[data-info-reveal]";
const SCROLL_KEYS = new Set(["ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp", " "]);

function hasScrollableParent(target: EventTarget | null, root: HTMLElement, deltaY: number) {
  let element = target instanceof HTMLElement ? target : null;

  while (element && element !== root) {
    const { overflowY } = window.getComputedStyle(element);
    if ((overflowY === "auto" || overflowY === "scroll") && element.scrollHeight > element.clientHeight) {
      const canMoveDown = deltaY > 0 && element.scrollTop + element.clientHeight < element.scrollHeight - 1;
      const canMoveUp = deltaY < 0 && element.scrollTop > 1;
      if (canMoveDown || canMoveUp) return true;
    }
    element = element.parentElement;
  }

  return false;
}

export default function InformationScrollReveal() {
  const markerRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const root = markerRef.current?.closest<HTMLElement>(".information-page");
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((element) => {
        element.dataset.infoRevealState = "visible";
      });
      return;
    }

    const finePointer = window.matchMedia("(pointer: fine)");
    let scrollFrame = 0;
    let scrollTarget = window.scrollY;

    const cancelSmoothScroll = () => {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = 0;
      scrollTarget = window.scrollY;
    };

    const animateScroll = () => {
      const current = window.scrollY;
      const distance = scrollTarget - current;

      if (Math.abs(distance) < 0.5) {
        window.scrollTo({ top: scrollTarget, behavior: "instant" as ScrollBehavior });
        scrollFrame = 0;
        return;
      }

      window.scrollTo({ top: current + distance * 0.085, behavior: "instant" as ScrollBehavior });
      scrollFrame = requestAnimationFrame(animateScroll);
    };

    const handleWheel = (event: WheelEvent) => {
      if (
        !finePointer.matches ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        hasScrollableParent(event.target, root, event.deltaY)
      ) return;

      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 18
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? window.innerHeight
          : 1;
      const delta = Math.max(-180, Math.min(180, event.deltaY * unit)) * 0.78;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const nextTarget = Math.max(0, Math.min(maxScroll, scrollTarget + delta));

      if (nextTarget === scrollTarget && Math.abs(window.scrollY - nextTarget) < 1) return;

      event.preventDefault();
      scrollTarget = nextTarget;
      if (!scrollFrame) scrollFrame = requestAnimationFrame(animateScroll);
    };

    const handleScroll = () => {
      if (!scrollFrame) scrollTarget = window.scrollY;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key)) cancelSmoothScroll();
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pointerdown", cancelSmoothScroll, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    const prepared = new WeakSet<Element>();
    const pending = new Set<HTMLElement>();
    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target as HTMLElement;
          element.dataset.infoRevealState = "visible";
          observer.unobserve(element);
        });
      },
      { rootMargin: "0px 0px -5% 0px", threshold: 0.08 },
    );

    const prepare = (scope: ParentNode) => {
      const elements: HTMLElement[] = [];
      if (scope instanceof HTMLElement && scope.matches(REVEAL_SELECTOR)) elements.push(scope);
      elements.push(...scope.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));

      elements.forEach((element) => {
        if (prepared.has(element)) return;
        prepared.add(element);
        element.dataset.infoRevealState = "waiting";
        pending.add(element);
      });

      if (!frame && pending.size) {
        frame = requestAnimationFrame(() => {
          pending.forEach((element) => observer.observe(element));
          pending.clear();
          frame = 0;
        });
      }
    };

    prepare(root);
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) prepare(node);
        });
      });
    });
    mutationObserver.observe(root, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      cancelSmoothScroll();
      mutationObserver.disconnect();
      observer.disconnect();
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pointerdown", cancelSmoothScroll);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return <span ref={markerRef} hidden aria-hidden="true" />;
}
