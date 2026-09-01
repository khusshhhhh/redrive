"use client";

import { IconRefresh } from "@tabler/icons-react";

const InlineRetry = ({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) => (
  <div className="flex min-h-52 flex-col items-center justify-center rounded-md border border-hairline-soft bg-white p-6 text-center" role="alert">
    <h2 className="text-lg font-semibold text-ink">{title}</h2>
    <p className="mt-2 max-w-md text-sm leading-6 text-muted">{message}</p>
    <button type="button" onClick={onRetry} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-ink outline-none transition hover:bg-accent-active hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><IconRefresh size={17} /> Try again</button>
  </div>
);

export default InlineRetry;
