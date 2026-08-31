import { redirect } from "next/navigation";

import { getAdminUser } from "@/app/libs/adminAuth";
import prisma from "@/app/libs/prismadb";
import AdminIncidents from "./AdminIncidents";

export const dynamic = "force-dynamic";

export default async function IncidentsPage() {
  if (!(await getAdminUser())) redirect("/admin/login");

  const [open, escalated, resolvedLast30] = await Promise.all([
    prisma.incidentCase.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    prisma.incidentCase.count({ where: { status: "ESCALATED" } }),
    prisma.incidentCase.count({
      where: { status: "RESOLVED", resolvedAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
    }),
  ]);

  return (
    <main className="px-4 py-7 sm:px-6 lg:px-9 lg:py-9">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.17em] text-primary">Trip safety</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Incidents</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Damage, cleanliness, late-return and other issues reported on trips. An open incident holds
          the host payout. Resolve with a money outcome only after confirming with both parties — the
          amount here is a record; move the funds in Stripe.
        </p>
      </header>

      <section className="mt-7 grid gap-3 sm:grid-cols-3">
        <Stat label="Open / under review" value={open} tone={open ? "warn" : "normal"} />
        <Stat label="Escalated to support" value={escalated} tone={escalated ? "danger" : "normal"} />
        <Stat label="Resolved (30 days)" value={resolvedLast30} />
      </section>

      <AdminIncidents />
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" | "danger" | "normal" }) {
  return (
    <div className="rounded-lg border border-hairline-soft bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold ${
          tone === "danger" ? "text-error" : tone === "warn" ? "text-amber-700" : "text-ink"
        }`}
      >
        {value.toLocaleString("en-AU")}
      </p>
    </div>
  );
}
