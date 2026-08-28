'use client';

import { useEffect, useRef, useState } from 'react';
import {
    Check,
    Info,
    LoaderCircle,
    Sparkles,
    TriangleAlert,
    X,
} from 'lucide-react';
import toast, { resolveValue, Toaster, useToasterStore, type Toast } from 'react-hot-toast';

import { MAX_TOAST_MS } from '@/app/libs/toastDuration';
import { syncToastCount } from '@/app/libs/toastQueue';

type Kind = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'custom';

const toastDetails: Record<Kind, { eyebrow: string; icon: typeof Check; className: string }> = {
    success: { eyebrow: 'All set', icon: Check, className: 'redrive-toast--success' },
    error: { eyebrow: 'Something went wrong', icon: TriangleAlert, className: 'redrive-toast--error' },
    warning: { eyebrow: 'Heads up', icon: TriangleAlert, className: 'redrive-toast--warning' },
    info: { eyebrow: 'For your information', icon: Info, className: 'redrive-toast--info' },
    loading: { eyebrow: 'Working on it', icon: LoaderCircle, className: 'redrive-toast--loading' },
    custom: { eyebrow: 'A little update', icon: Sparkles, className: 'redrive-toast--custom' },
};

function kindOf(item: Toast): Kind {
    if (item.type === 'success' || item.type === 'error' || item.type === 'loading' || item.type === 'custom') {
        return item.type;
    }
    if (item.className?.includes('redrive-kind-warning')) return 'warning';
    if (item.className?.includes('redrive-kind-info')) return 'info';
    return 'info';
}

const SWIPE_DISMISS_PX = 64;

function RedriveToast({ item }: { item: Toast }) {
    const kind = kindOf(item);
    const details = toastDetails[kind];
    const Icon = details.icon;
    const countdown = Number.isFinite(item.duration) ? (item.duration as number) : 0;

    // Touch swipe-to-dismiss (mobile). Horizontal drag past the threshold clears
    // the toast; a short drag springs back.
    const startX = useRef<number | null>(null);
    const [dragX, setDragX] = useState(0);

    const onTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
    };
    const onTouchMove = (e: React.TouchEvent) => {
        if (startX.current === null) return;
        setDragX(e.touches[0].clientX - startX.current);
    };
    const onTouchEnd = () => {
        if (Math.abs(dragX) > SWIPE_DISMISS_PX) {
            toast.dismiss(item.id);
        }
        startX.current = null;
        setDragX(0);
    };

    return (
        <div
            className={`redrive-toast ${details.className} ${item.visible ? 'redrive-toast--visible' : 'redrive-toast--hidden'}`}
            role={item.ariaProps.role}
            aria-live={item.ariaProps['aria-live']}
            onClick={kind === 'loading' ? undefined : () => toast.dismiss(item.id)}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={dragX ? { transform: `translateX(${dragX}px)`, opacity: 1 - Math.min(1, Math.abs(dragX) / 160), transition: 'none' } : undefined}
        >
            <div className="redrive-toast__route" aria-hidden="true">
                {countdown ? (
                    <span
                        className="redrive-toast__route-bar"
                        style={{ animationDuration: `${Math.min(countdown, MAX_TOAST_MS)}ms` }}
                    />
                ) : (
                    <span className="redrive-toast__route-dot" />
                )}
            </div>
            <span className="redrive-toast__icon" aria-hidden="true">
                <Icon size={19} strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1 py-0.5">
                <p className="redrive-toast__eyebrow">{details.eyebrow}</p>
                <div className="redrive-toast__message">{resolveValue(item.message, item)}</div>
            </div>
            {kind !== 'loading' && (
                <button
                    type="button"
                    className="redrive-toast__close"
                    onClick={(e) => { e.stopPropagation(); toast.dismiss(item.id); }}
                    aria-label="Dismiss notification"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
}

const ToasterProvider = () => {
    const { toasts } = useToasterStore();

    // Feed the on-screen count back to the queue so it can release waiting toasts.
    useEffect(() => {
        syncToastCount(toasts.filter((t) => t.visible).length);
    }, [toasts]);

    return (
        <Toaster
            position="bottom-right"
            reverseOrder={false}
            gutter={10}
            containerClassName="redrive-toaster"
            containerStyle={{ zIndex: 9999 }}
            toastOptions={{ duration: 4200, loading: { duration: Infinity } }}
        >
            {(item) => <RedriveToast item={item} />}
        </Toaster>
    );
};

export default ToasterProvider;
