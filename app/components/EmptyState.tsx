'use client';

import { useRouter, useSearchParams } from "next/navigation";
import Heading from "./Heading";
import Illustration, { IllustrationName } from "./Illustration";
import { IconCalendarEvent, IconCategory, IconMapPin, IconRefresh } from "@tabler/icons-react";

interface EmptyState {
    title?: string;
    subtitle?: string;
    showReset?: boolean;
    actionLabel?: string;
    actionHref?: string;
    illustration?: IllustrationName;
}

const EmptyState: React.FC<EmptyState> = ({
    title = "No exact matches",
    subtitle = "Try changing or removing some of your filters",
    showReset,
    actionLabel,
    actionHref,
    illustration = "empty-search",
}) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const applyRecovery = (remove: string[]) => {
        const next = new URLSearchParams(searchParams?.toString() || "");
        remove.forEach((key) => next.delete(key));
        router.push(next.toString() ? `/explore?${next.toString()}` : "/explore");
    };

    const state = searchParams?.get("state");
    const hasSuburb = Boolean(searchParams?.get("suburb"));
    const hasDates = Boolean(searchParams?.get("startDate") || searchParams?.get("endDate"));
    const hasCategory = Boolean(searchParams?.get("category"));
    const recoveries = [
        hasSuburb ? { label: state ? `Search nearby and across ${state}` : "Search nearby suburbs", detail: "Keep the state and expand beyond the selected suburb", icon: IconMapPin, remove: ["suburb"] } : null,
        hasDates ? { label: "Try flexible dates", detail: "Keep your other filters and remove only the dates", icon: IconCalendarEvent, remove: ["startDate", "endDate"] } : null,
        hasCategory ? { label: "Explore other vehicle types", detail: "Keep location, dates and budget", icon: IconCategory, remove: ["category"] } : null,
    ].filter(Boolean) as Array<{ label: string; detail: string; icon: typeof IconMapPin; remove: string[] }>;

    return (
        <div
            className="flex min-h-[55vh] flex-col items-center justify-center py-12"
        >
            <Illustration name={illustration} width={260} className="mb-6 h-auto w-[220px] sm:w-[260px]" priority />
            <Heading center title={title} subtitle={subtitle} />
            {recoveries.length > 0 && <div className="mt-7 grid w-full max-w-3xl gap-3 sm:grid-cols-3">{recoveries.map((recovery) => <button key={recovery.label} type="button" onClick={() => applyRecovery(recovery.remove)} className="min-h-24 rounded-md border border-hairline bg-white p-4 text-left outline-none transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><recovery.icon size={20} className="text-primary" /><span className="mt-3 block text-sm font-semibold text-ink">{recovery.label}</span><span className="mt-1 block text-xs leading-5 text-muted">{recovery.detail}</span></button>)}</div>}
            {showReset && <button type="button" onClick={() => router.push('/explore')} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-ink px-5 text-sm font-semibold text-ink transition hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><IconRefresh size={17} /> Remove all filters</button>}
            {actionLabel && actionHref && <button type="button" onClick={() => router.push(actionHref)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{actionLabel}</button>}
        </div>
    );
};

export default EmptyState;
