import { redirect } from "next/navigation";

import { getAdminUser } from "@/app/libs/adminAuth";
import prisma from "@/app/libs/prismadb";

export const dynamic = "force-dynamic";

const QUICK_FILTERS: { label: string; action: string }[] = [
  { label: "All", action: "" },
  { label: "Handover times", action: "RESERVATION_TIME_CHANGED" },
  { label: "Handovers", action: "HANDOVER_SUBMITTED" },
  { label: "Reservations", action: "RESERVATION_CREATED" },
  { label: "Status changes", action: "RESERVATION_STATUS_CHANGED" },
  { label: "Cancellations", action: "RESERVATION_CANCELLED" },
];

function fmt(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  if (!(await getAdminUser())) redirect("/admin/login");
  const { action } = await searchParams;
  const filter = action && /^[A-Z_]{3,64}$/.test(action) ? action : undefined;

  const [events, timeChanges24h] = await Promise.all([
    prisma.auditEvent.findMany({
      where: filter ? { action: filter } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.auditEvent.count({
      where: {
        action: "RESERVATION_TIME_CHANGED",
        createdAt: { gte: new Date(Date.now() - 86_400_000) },
      },
    }),
  ]);

  return (
    <main className="px-4 py-7 sm:px-6 lg:px-9 lg:py-9">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.17em] text-primary">Operations</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Audit log</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Every recorded action, newest first (latest 200). Handover-time changes carry the old and
          new time, who made it, whether it&rsquo;s confirmed, and how far ahead of the handover it
          happened — <strong>{timeChanges24h}</strong> in the last 24 hours.
        </p>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2">
        {QUICK_FILTERS.map((quick) => {
          const active = (quick.action || undefined) === filter;
          return (
            <a
              key={quick.label}
              href={quick.action ? `/admin/audit?action=${quick.action}` : "/admin/audit"}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                active ? "bg-ink text-white" : "border border-hairline-soft bg-white text-muted hover:text-ink"
              }`}
            >
              {quick.label}
            </a>
          );
        })}
      </nav>

      <div className="mt-6 overflow-x-auto rounded-lg border border-hairline-soft bg-white">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead className="border-b border-hairline-soft bg-surface-soft text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">When</th>
              <th className="px-4 py-3 font-semibold">Action</th>
              <th className="px-4 py-3 font-semibold">Target</th>
              <th className="px-4 py-3 font-semibold">Actor</th>
              <th className="px-4 py-3 font-semibold">Detail</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const meta = (event.metadata as Record<string, unknown> | null) ?? {};
              return (
                <tr key={event.id} className="border-b border-hairline-soft last:border-0 align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(
                      event.createdAt,
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">{event.action}</td>
                  <td className="px-4 py-3 text-muted">
                    {event.targetType}
                    {event.targetId ? ` · ${event.targetId.slice(-6)}` : ""}
                  </td>
                  <td className="px-4 py-3 text-muted">{event.actorUserId?.slice(-6) ?? "system"}</td>
                  <td className="px-4 py-3 text-muted">
                    {event.action === "RESERVATION_TIME_CHANGED" ? (
                      <span>
                        <strong className="text-ink">{fmt(meta.kind)}</strong> {fmt(meta.from)} →{" "}
                        <strong className="text-ink">{fmt(meta.to)}</strong> by {fmt(meta.role)} ·{" "}
                        {meta.confirmed ? "confirmed" : meta.proposed ? "proposed" : "set"} · {fmt(meta.leadTime)}
                      </span>
                    ) : (
                      <code className="text-xs">{JSON.stringify(meta)}</code>
                    )}
                    {event.reason ? <span className="block text-xs">Reason: {event.reason}</span> : null}
                  </td>
                </tr>
              );
            })}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  No matching audit events.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
