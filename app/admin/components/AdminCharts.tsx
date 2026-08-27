"use client";

import { useMemo, useState } from "react";
import type { AdminDashboardData } from "@/app/libs/adminData";

type Monthly = AdminDashboardData["monthly"];

export function TrendChart({ monthly }: { monthly: Monthly }) {
  const [metric, setMetric] = useState<"bookings" | "revenue" | "users" | "listings">("bookings");
  const [months, setMonths] = useState<6 | 12>(12);
  const data = monthly.slice(-months);
  const max = Math.max(...data.map((item) => item[metric]), 1);
  const width = 760, height = 245, padX = 20, padTop = 20, padBottom = 36;
  const points = data.map((item, index) => ({ ...item, x: padX + index * ((width - padX * 2) / Math.max(data.length - 1, 1)), y: padTop + (1 - item[metric] / max) * (height - padTop - padBottom) }));
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const area = `${line} L${points.at(-1)?.x || padX},${height - padBottom} L${padX},${height - padBottom} Z`;
  const labels = { bookings: "Bookings", revenue: "Platform revenue", users: "New users", listings: "New listings" };

  return <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-primary">12-month trend</p><h2 className="mt-1 text-lg font-semibold text-ink">Marketplace momentum</h2></div><div className="flex flex-wrap gap-2"><select value={metric} onChange={(event) => setMetric(event.target.value as typeof metric)} aria-label="Chart metric" className="rounded-lg border border-hairline bg-white px-3 py-2 text-xs font-semibold text-ink outline-none">{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><div className="flex rounded-lg bg-surface-soft p-1">{([6, 12] as const).map((value) => <button key={value} onClick={() => setMonths(value)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${months === value ? "bg-white text-ink shadow-sm" : "text-muted"}`}>{value}M</button>)}</div></div></div>
    <div className="mt-5 overflow-x-auto"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${labels[metric]} over the last ${months} months`} className="min-w-[620px]">
      <defs><linearGradient id="adminArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3B3B3B" stopOpacity=".24"/><stop offset="1" stopColor="#3B3B3B" stopOpacity="0"/></linearGradient></defs>
      {[0, .25, .5, .75, 1].map((ratio) => <line key={ratio} x1={padX} x2={width-padX} y1={padTop + ratio*(height-padTop-padBottom)} y2={padTop + ratio*(height-padTop-padBottom)} stroke="#EDEDED" strokeDasharray="4 6" />)}
      <path d={area} fill="url(#adminArea)"/><path d={line} fill="none" stroke="#3B3B3B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      {points.map((point) => <g key={point.key} className="group"><circle cx={point.x} cy={point.y} r="11" fill="transparent"/><circle cx={point.x} cy={point.y} r="4" fill="white" stroke="#3B3B3B" strokeWidth="3"/><g className="opacity-0 transition group-hover:opacity-100"><rect x={point.x-34} y={Math.max(0, point.y-34)} width="68" height="24" rx="7" fill="#3B3B3B"/><text x={point.x} y={Math.max(16, point.y-18)} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">{metric === "revenue" ? `$${point[metric].toLocaleString()}` : point[metric]}</text></g><text x={point.x} y={height-12} textAnchor="middle" fill="#636363" fontSize="11">{point.label}</text></g>)}
    </svg></div>
  </section>;
}

export function StatusDonut({ statuses, total }: { statuses: AdminDashboardData["statuses"]; total: number }) {
  const colours = ["#3B3B3B", "#B5B5B5", "#636363", "#808080", "#8A8A8A", "#B5B5B5"];
  const gradient = useMemo(() => { let cursor = 0; return statuses.map((status, index) => { const start = cursor; cursor += total ? status.value / total * 100 : 0; return `${colours[index % colours.length]} ${start}% ${cursor}%`; }).join(", "); }, [statuses, total]);
  return <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-semibold uppercase tracking-[.15em] text-primary">Booking pipeline</p><h2 className="mt-1 text-lg font-semibold text-ink">Status distribution</h2><div className="mt-7 flex flex-col items-center gap-7 sm:flex-row"><div className="relative h-40 w-40 shrink-0 rounded-full" style={{ background: statuses.length ? `conic-gradient(${gradient})` : "#EDEDED" }}><div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-white"><strong className="text-2xl text-ink">{total}</strong><span className="text-[11px] text-muted">bookings</span></div></div><div className="w-full space-y-3">{statuses.map((status, index) => <div key={status.label} className="flex items-center justify-between gap-4 text-sm"><span className="flex items-center gap-2 text-body"><i className="h-2.5 w-2.5 rounded-full" style={{ background: colours[index % colours.length] }} />{status.label.toLowerCase().replace(/^./, (letter) => letter.toUpperCase())}</span><span className="font-semibold text-ink">{status.value} <small className="font-normal text-muted">· {total ? Math.round(status.value/total*100) : 0}%</small></span></div>)}</div></div></section>;
}

export function RankingBars({ title, eyebrow, rows }: { title: string; eyebrow: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-semibold uppercase tracking-[.15em] text-primary">{eyebrow}</p><h2 className="mt-1 text-lg font-semibold text-ink">{title}</h2><div className="mt-6 space-y-4">{rows.length ? rows.map((row) => <div key={row.label}><div className="mb-1.5 flex justify-between text-xs"><span className="font-medium text-body">{row.label || "Unspecified"}</span><span className="font-semibold text-ink">{row.value}</span></div><div className="h-2 overflow-hidden rounded-full bg-surface-soft"><div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all" style={{ width: `${Math.max(4, row.value/max*100)}%` }} /></div></div>) : <p className="text-sm text-muted">No data yet.</p>}</div></section>;
}
