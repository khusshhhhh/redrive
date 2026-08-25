"use client";

import { useLayoutEffect, useRef } from "react";

const REVEAL_SELECTOR = "[data-info-reveal]";

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
      { rootMargin: "0px 0px -9% 0px", threshold: 0.12 },
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
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, []);

  return <span ref={markerRef} hidden aria-hidden="true" />;
}
