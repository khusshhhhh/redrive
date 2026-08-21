import Link from "next/link";
import { Activity, AlertTriangle, Clock3, Cpu, Database, Gauge, HardDrive, RadioTower, ShieldAlert, TimerReset } from "lucide-react";
import { redirect } from "next/navigation";

import { getAdminUser } from "@/app/libs/adminAuth";
import { getApiMonitoringData } from "@/app/libs/apiMonitoringData";

export const dynamic = "force-dynamic";

const number = (value: number) => Math.round(value).toLocaleString("en-AU");
const decimal = (value: number, digits = 1) => value.toLocaleString("en-AU", { maximumFractionDigits: digits });
const dateTime = (value: Date | string) => new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value));

export default async function MonitoringPage({ searchParams }: { searchParams?: Promise<{ environment?: string; range?: string }> }) {
  if (!await getAdminUser()) redirect("/admin/login");
  const params = await searchParams;
  const environment = ["production", "preview", "development"].includes(params?.environment || "") ? params!.environment! : "production";
  const hours = params?.range === "720" ? 720 : params?.range === "168" ? 168 : 24;
  const data = await getApiMonitoringData({ environment, hours });
  const m = data.metrics;
  const maxTimeline = Math.max(...data.timeline.map((point) => point.requests), 1);
  const maxLatency = Math.max(...data.latencyBands.map((band) => band.value), 1);

  return <main className="px-4 py-7 sm:px-6 lg:px-9 lg:py-9">
    <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
      <div><p className="text-xs font-semibold uppercase tracking-[.17em] text-primary">Development monitoring</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">API and backend health</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Privacy-safe operational telemetry across API volume, errors, latency, CPU, memory and request size. Production successes are sampled to keep database load low; 5xx failures are captured in full.</p></div>
      <div className="flex flex-wrap gap-2">
        {data.environments.map((value) => <FilterLink key={value} active={environment === value} href={`/admin/monitoring?environment=${value}&range=${hours}`}>{value}</FilterLink>)}
        <span className="mx-1 hidden h-8 w-px bg-hairline sm:block" />
        {([[24, "24h"], [168, "7d"], [720, "30d"]] as const).map(([value, label]) => <FilterLink key={value} active={hours === value} href={`/admin/monitoring?environment=${environment}&range=${value}`}>{label}</FilterLink>)}
      </div>
    </header>

    <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Estimated API calls" value={number(m.requests)} detail={`${number(m.samples)} sampled observations`} icon={<Activity size={19}/>} />
      <Metric label="Server failures" value={number(m.serverErrors)} detail={`${decimal(m.serverErrorRate, 2)}% of estimated calls`} icon={<AlertTriangle size={19}/>} tone={m.serverErrors ? "danger" : "normal"} />
      <Metric label="Average response" value={`${decimal(m.averageDurationMs)} ms`} detail={`p95 band: ${m.p95Band}`} icon={<Clock3 size={19}/>} />
      <Metric label="Monitored handlers" value={number(m.monitoredRoutes)} detail={`${environment} · ${hours <= 24 ? "last 24 hours" : `${hours / 24} days`}`} icon={<RadioTower size={19}/>} />
    </section>

    <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
      <SmallMetric label="Client errors" value={number(m.clientErrors)} icon={<ShieldAlert size={15}/>} />
      <SmallMetric label="Rate limited" value={number(m.rateLimited)} icon={<TimerReset size={15}/>} />
      <SmallMetric label="Unauthorised" value={number(m.unauthorised)} icon={<ShieldAlert size={15}/>} />
      <SmallMetric label="Cold starts observed" value={number(m.coldStarts)} icon={<HardDrive size={15}/>} />
      <SmallMetric label="Average CPU" value={`${decimal(m.averageCpuMs)} ms`} icon={<Cpu size={15}/>} />
      <SmallMetric label="Average memory" value={`${decimal(m.averageMemoryMb)} MB`} icon={<Gauge size={15}/>} />
      <SmallMetric label="Average request" value={`${decimal(m.averageRequestKb)} KB`} icon={<Database size={15}/>} />
      <SmallMetric label="All error responses" value={`${decimal(m.errorRate, 2)}%`} icon={<AlertTriangle size={15}/>} />
    </section>

    {m.requests === 0 ? <EmptyMonitoring environment={environment} /> : <>
      <section className="mt-6 grid gap-5 xl:grid-cols-[1.6fr_.8fr]">
        <Panel eyebrow="Traffic trend" title={hours > 48 ? "Requests by day" : "Requests by hour"} note="Weighted estimate">
          <div className="mt-6 flex h-52 items-end gap-1 overflow-hidden sm:gap-1.5">
            {data.timeline.map((point, index) => <div key={point.key} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2"><div className="relative flex w-full flex-1 items-end"><div className="w-full rounded-t bg-primary/75 transition-colors group-hover:bg-primary" style={{ height: `${Math.max(point.requests ? 4 : 1, point.requests / maxTimeline * 100)}%` }}><span className="absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] text-white shadow-card group-hover:block">{number(point.requests)} calls · {number(point.errors)} errors</span></div></div>{(data.timeline.length <= 24 || index % Math.ceil(data.timeline.length / 12) === 0) && <span className="h-4 truncate text-[9px] text-muted">{point.label}</span>}</div>)}
          </div>
        </Panel>
        <Panel eyebrow="Latency distribution" title="Observed response bands" note={`p95: ${m.p95Band}`}>
          <div className="mt-6 space-y-4">{data.latencyBands.map((band) => <div key={band.label}><div className="mb-1.5 flex justify-between text-xs"><span className="text-body">{band.label}</span><strong className="text-ink">{number(band.value)}</strong></div><div className="h-2 overflow-hidden rounded-full bg-surface-soft"><div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${band.value / maxLatency * 100}%` }}/></div></div>)}</div>
        </Panel>
      </section>

      <section className="mt-5"><Panel eyebrow="Endpoint detail" title="API route performance" note={`${data.routes.length} method and route combinations`}>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[1080px] text-left"><thead><tr className="border-b border-hairline-soft text-[10px] uppercase tracking-wide text-muted"><Th>Route</Th><Th>Calls</Th><Th>Errors</Th><Th>Avg latency</Th><Th>Avg CPU</Th><Th>Avg memory</Th><Th>Avg payload</Th><Th>Last status</Th></tr></thead><tbody>{data.routes.map((route) => <tr key={`${route.method}-${route.route}`} className="border-b border-hairline-soft/70 last:border-0"><Td><div className="flex items-center gap-2"><Method value={route.method}/><code className="text-xs font-semibold text-ink">{route.route}</code></div><span className="mt-1 block text-[10px] text-muted">Last seen {dateTime(route.lastSeenAt)} · {route.samples} samples</span></Td><Td><strong>{number(route.requests)}</strong></Td><Td><span className={route.serverErrors ? "font-semibold text-error" : "text-body"}>{number(route.clientErrors + route.serverErrors)}</span><span className="ml-1 text-[10px] text-muted">{decimal(route.errorRate, 1)}%</span></Td><Td>{decimal(route.averageDurationMs)} ms</Td><Td>{decimal(route.averageCpuMs)} ms</Td><Td>{decimal(route.averageMemoryMb)} MB</Td><Td>{decimal(route.averageRequestKb)} KB</Td><Td><StatusCode value={route.lastStatus}/></Td></tr>)}</tbody></table></div>
      </Panel></section>
    </>}

    <section className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <Panel eyebrow="Failure detail" title="Recent server errors" note={`${data.recentErrors.length} retained events`}>
        <div className="mt-4 space-y-2">{data.recentErrors.length ? data.recentErrors.map((error) => <article key={error.id} className="rounded-xl border border-red-100 bg-red-50/55 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Method value={error.method}/><code className="text-xs font-semibold text-red-900">{error.route}</code></div><span className="text-[11px] text-red-700">{dateTime(error.createdAt)}</span></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-red-800"><span>Status {error.status}</span><span>{decimal(error.durationMs)} ms</span>{error.region && <span>Region {error.region}</span>}{error.errorName && <span>{error.errorName}</span>}</div>{error.requestId && <code className="mt-2 block truncate text-[10px] text-red-700">Request {error.requestId}</code>}</article>) : <p className="rounded-xl bg-surface-soft p-5 text-sm text-muted">No captured 5xx failures in this period.</p>}</div>
      </Panel>
      <Panel eyebrow="Backend activity" title="Operational counters" note="Current and last 24 hours">
        <dl className="mt-5 grid grid-cols-2 gap-3"><Counter label="Active rate-limit buckets" value={data.operational.activeRateLimits}/><Counter label="Audit events · 24h" value={data.operational.auditEvents}/><Counter label="Active sessions" value={data.operational.activeSessions}/><Counter label="Stripe webhooks · 24h" value={data.operational.webhookEvents}/></dl>
        <div className="mt-5 rounded-xl border border-hairline-soft bg-surface-soft p-4"><p className="text-xs font-semibold text-ink">Low-load collection policy</p><p className="mt-2 text-xs leading-5 text-muted">Production successes default to a 25% sample and client errors to 50%; results are weighted. Server errors are captured completely. Hourly buckets expire after 90 days and individual 5xx events after 30 days. No bodies, query strings, user IDs, tokens or raw IP addresses are stored.</p></div>
      </Panel>
    </section>
  </main>;
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) { return <Link href={href} className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize transition ${active ? "bg-ink text-white shadow-sm" : "border border-hairline bg-white text-muted hover:text-ink"}`}>{children}</Link>; }
function Metric({ label, value, detail, icon, tone = "normal" }: { label: string; value: string; detail: string; icon: React.ReactNode; tone?: "normal" | "danger" }) { return <article className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><span className="text-sm font-medium text-muted">{label}</span><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone === "danger" ? "bg-red-50 text-error" : "bg-surface-soft text-primary"}`}>{icon}</span></div><strong className="mt-5 block text-2xl font-semibold tracking-tight text-ink">{value}</strong><p className="mt-2 text-xs text-muted">{detail}</p></article>; }
function SmallMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) { return <article className="rounded-xl border border-black/5 bg-white p-4"><span className="text-primary">{icon}</span><strong className="mt-3 block truncate text-base text-ink sm:text-lg">{value}</strong><span className="mt-1 block text-[10px] leading-4 text-muted sm:text-[11px]">{label}</span></article>; }
function Panel({ eyebrow, title, note, children }: { eyebrow: string; title: string; note: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-primary">{eyebrow}</p><h2 className="mt-1 text-lg font-semibold text-ink">{title}</h2></div><span className="text-right text-[11px] text-muted">{note}</span></div>{children}</section>; }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-3 py-3 font-semibold">{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-3 py-4 text-xs text-body">{children}</td>; }
function Method({ value }: { value: string }) { const tone = value === "GET" ? "bg-blue-50 text-blue-700" : value === "POST" ? "bg-emerald-50 text-emerald-700" : value === "DELETE" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"; return <span className={`rounded px-1.5 py-1 text-[9px] font-bold ${tone}`}>{value}</span>; }
function StatusCode({ value }: { value: number | null }) { if (!value) return <span className="text-muted">—</span>; const tone = value >= 500 ? "bg-red-50 text-red-700" : value >= 400 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"; return <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${tone}`}>{value}</span>; }
function Counter({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-hairline-soft p-4"><dt className="text-[11px] leading-4 text-muted">{label}</dt><dd className="mt-2 text-xl font-semibold text-ink">{number(value)}</dd></div>; }
function EmptyMonitoring({ environment }: { environment: string }) { return <section className="mt-6 rounded-2xl border border-dashed border-hairline bg-white px-6 py-12 text-center"><RadioTower size={28} className="mx-auto text-primary"/><h2 className="mt-4 text-lg font-semibold text-ink">Waiting for {environment} API traffic</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">Telemetry begins after this version is deployed and API handlers receive requests. Refresh this page after using the site; no historical Vercel logs are imported.</p></section>; }
