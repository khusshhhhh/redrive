import Link from "next/link";
import { CalendarClock, CircleDollarSign, ShieldCheck } from "lucide-react";

import { cancellationExample, getCancellationPolicy } from "@/app/libs/cancellationPolicy";

export default function CancellationPolicyDisplay({ value, compact = false }: { value?: string | null; compact?: boolean }) {
  const policy = getCancellationPolicy(value);

  return (
    <section className={`overflow-hidden rounded-xl border border-hairline-soft bg-gradient-to-br from-white to-surface-soft/60 ${compact ? "p-4" : "p-5 sm:p-6"}`}>
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-accent"><ShieldCheck size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-ink">{policy.name} cancellation</h3>
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.11em] text-accent-active">Set by host</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-body">{policy.guestSummary}</p>
        </div>
      </div>
      {!compact && (
        <div className="mt-5 grid gap-3 border-t border-hairline-soft pt-5 sm:grid-cols-2">
          <p className="flex gap-2 text-xs leading-5 text-muted"><CalendarClock size={16} className="mt-0.5 shrink-0 text-primary" />{cancellationExample(policy.key)}</p>
          <p className="flex gap-2 text-xs leading-5 text-muted"><CircleDollarSign size={16} className="mt-0.5 shrink-0 text-primary" />A host cancellation before pickup returns 100% of the amount paid through Redrive.</p>
        </div>
      )}
      <Link href="/cancellation-options" className="mt-4 inline-flex text-xs font-semibold text-primary hover:underline">Read the complete cancellation rules</Link>
    </section>
  );
}
