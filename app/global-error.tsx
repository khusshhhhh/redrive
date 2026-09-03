"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Catches errors thrown in the root layout itself (where `app/error.tsx` can't
// reach). Must render its own <html>/<body>.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en-AU">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1.5rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ color: "#6e6b64", marginTop: "0.5rem" }}>
          The page failed to load.{" "}
          {/* A hard navigation is intentional here: the root layout is broken,
              so we want a full document reload rather than a client transition. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" style={{ color: "#7a5b02" }}>Return home</a>.
        </p>
      </body>
    </html>
  );
}
