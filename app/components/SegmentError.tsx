"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { IconRefresh } from "@tabler/icons-react";

import Container from "./Container";
import Illustration from "./Illustration";

interface SegmentErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** What failed, in plain words — "your trips", "this vehicle". */
  subject: string;
  /** Where "Go back" should send the user. */
  homeHref?: string;
  homeLabel?: string;
}

/**
 * Shared body for a route segment's `error.tsx`. Keeps one failed fetch inside
 * its own part of the app instead of blanking the whole shell to the global
 * boundary, and offers a retry (`reset()` re-runs the segment's render).
 */
export default function SegmentError({
  error,
  reset,
  subject,
  homeHref = "/explore",
  homeLabel = "Back to explore",
}: SegmentErrorProps) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { boundary: "segment" } });
  }, [error]);

  return (
    <Container>
      <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center py-16 text-center">
        <Illustration name="lost" width={200} className="mb-6 h-auto w-[180px]" priority />
        <h1 className="text-display-sm font-semibold text-ink">We couldn&rsquo;t load {subject}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Something went wrong on our side. Your account and data are fine — try again in a moment.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-muted-soft">Reference: {error.digest}</p>
        )}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <IconRefresh size={17} aria-hidden="true" /> Try again
          </button>
          <a
            href={homeHref}
            className="inline-flex min-h-11 items-center rounded-full border border-ink px-5 text-sm font-semibold text-ink transition hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {homeLabel}
          </a>
        </div>
      </div>
    </Container>
  );
}
