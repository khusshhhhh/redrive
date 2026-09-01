import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";

import Container from "./components/Container";
import Illustration from "./components/Illustration";

export default function NotFound() {
  return (
    <Container>
      <div className="flex min-h-[68vh] flex-col items-center justify-center py-16 text-center">
        <Illustration name="lost" width={300} className="mb-8 h-auto w-[240px] sm:w-[300px]" priority />
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Error 404</p>
        <h1 className="mt-3 text-display-lg font-semibold text-ink sm:text-display-xl">This road doesn&rsquo;t go anywhere</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted">
          The page you were after has moved or never existed. Let&rsquo;s get you back to the vehicles.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/explore"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-ink transition hover:bg-accent-active hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Explore vehicles <IconArrowRight size={17} />
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-strong px-5 text-sm font-semibold text-ink transition hover:border-ink hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Go home
          </Link>
        </div>
      </div>
    </Container>
  );
}
