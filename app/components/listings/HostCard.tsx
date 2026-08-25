"use client";

import {
    IconCalendar,
    IconCar,
    IconLock,
    IconMapPin,
    IconMessageCircle,
    IconShieldCheckFilled,
} from "@tabler/icons-react";
import { PublicHost } from "@/app/types";
import Avatar from "../Avatar";
import Button from "../Button";

interface HostCardProps {
    user: PublicHost;
    hostingSinceLabel: string;
    isOwnListing: boolean;
    contactingHost: boolean;
    onContactHost: () => Promise<void>;
}

const HostCard: React.FC<HostCardProps> = ({
    user,
    hostingSinceLabel,
    isOwnListing,
    contactingHost,
    onContactHost,
}) => {
    const hostName = user.name?.trim() || "Redrive host";
    const firstName = hostName.split(" ")[0];
    const location = [user.suburb, user.state].filter(Boolean).join(", ") || "Australia";
    const listingCount = user.listings?.length ?? 0;
    const isVerified = user.profileVerified === "Y";

    return (
        <section className="relative my-4 overflow-hidden rounded-lg border border-hairline bg-white shadow-[0_16px_40px_rgba(24,54,58,0.09)]" aria-labelledby="host-card-title">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" aria-hidden="true" />

            <div className="grid md:grid-cols-[220px_1fr]">
                <div className="relative flex flex-col items-center border-b border-hairline-soft bg-gradient-to-b from-surface-soft to-white px-6 py-8 text-center md:border-b-0 md:border-r">
                    {isVerified ? (
                        <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink">
                            <IconShieldCheckFilled size={15} className="text-accent-active" aria-hidden="true" />
                            Verified host
                        </span>
                    ) : (
                        <span className="mb-5 rounded-full border border-hairline bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                            Host profile
                        </span>
                    )}

                    <div className="relative rounded-full border-4 border-white shadow-[0_10px_28px_rgba(24,54,58,0.16)]">
                        <Avatar src={user.image} size={104} alt={`${user.name || "Redrive host"} profile photo`} />
                        {isVerified && (
                            <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-sm" aria-label="Profile verified">
                                <IconShieldCheckFilled size={17} aria-hidden="true" />
                            </span>
                        )}
                    </div>

                    <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Hosted by</p>
                    <h2 id="host-card-title" className="mt-1 text-xl font-semibold tracking-tight text-ink">{hostName}</h2>
                    <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted">
                        <IconMapPin size={16} aria-hidden="true" />
                        {location}
                    </p>
                </div>

                <div className="p-6 sm:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Your local point of contact</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-ink sm:text-2xl">Plan the details with {firstName}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                        Ask about pickup arrangements, vehicle features, availability, or anything specific to your trip before you book.
                    </p>

                    <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <HostStat icon={IconCalendar} label="Hosting experience" value={hostingSinceLabel} />
                        <HostStat icon={IconCar} label="Vehicles listed" value={`${listingCount} ${listingCount === 1 ? "vehicle" : "vehicles"}`} />
                        <HostStat icon={IconShieldCheckFilled} label="Profile status" value={isVerified ? "Verified" : "Not yet verified"} highlighted={isVerified} />
                    </dl>

                    <div className="mt-6 border-t border-hairline-soft pt-5">
                        {!isOwnListing ? (
                            <>
                                <Button
                                    small
                                    label={`Message ${firstName}`}
                                    icon={IconMessageCircle}
                                    loading={contactingHost}
                                    loadingLabel="Opening conversation"
                                    disabled={contactingHost}
                                    onClick={onContactHost}
                                    className="my-0"
                                />
                                <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-xs leading-5 text-muted">
                                    <IconLock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                                    Keep messages on Redrive so questions and trip details stay together.
                                </p>
                            </>
                        ) : (
                            <div className="rounded-md bg-surface-soft px-4 py-3 text-sm leading-6 text-muted">
                                This is how guests see your host profile. Keeping your location and verification current helps them book with confidence.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

interface HostStatProps {
    icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
    label: string;
    value: string;
    highlighted?: boolean;
}

const HostStat: React.FC<HostStatProps> = ({ icon: Icon, label, value, highlighted = false }) => (
    <div className="rounded-md border border-hairline-soft bg-surface-soft/60 p-4">
        <div className="flex items-center gap-2 text-muted">
            <Icon size={17} className={highlighted ? "text-primary" : "text-muted"} aria-hidden="true" />
            <dt className="text-[10px] font-semibold uppercase tracking-[0.1em]">{label}</dt>
        </div>
        <dd className={`mt-2 text-sm font-semibold ${highlighted ? "text-primary" : "text-ink"}`}>{value}</dd>
    </div>
);

export default HostCard;
