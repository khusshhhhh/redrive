'use client';

import {
    Check,
    Compass,
    LoaderCircle,
    Sparkles,
    TriangleAlert,
    X,
} from 'lucide-react';
import toast, { resolveValue, Toaster, type Toast } from 'react-hot-toast';

const toastDetails = {
    success: { eyebrow: 'All set', icon: Check, className: 'redrive-toast--success' },
    error: { eyebrow: 'Quick detour', icon: TriangleAlert, className: 'redrive-toast--error' },
    loading: { eyebrow: 'On the way', icon: LoaderCircle, className: 'redrive-toast--loading' },
    blank: { eyebrow: 'Heads up', icon: Compass, className: 'redrive-toast--blank' },
    custom: { eyebrow: 'A little update', icon: Sparkles, className: 'redrive-toast--custom' },
} as const;

function RedriveToast({ item }: { item: Toast }) {
    const details = toastDetails[item.type];
    const Icon = details.icon;

    return (
        <div
            className={`redrive-toast ${details.className} ${item.visible ? 'redrive-toast--visible' : 'redrive-toast--hidden'}`}
            role={item.ariaProps.role}
            aria-live={item.ariaProps['aria-live']}
        >
            <div className="redrive-toast__route" aria-hidden="true">
                <span className="redrive-toast__route-dot" />
            </div>
            <span className="redrive-toast__icon" aria-hidden="true">
                <Icon size={19} strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1 py-0.5">
                <p className="redrive-toast__eyebrow">{details.eyebrow}</p>
                <div className="redrive-toast__message">{resolveValue(item.message, item)}</div>
            </div>
            {item.type !== 'loading' && (
                <button
                    type="button"
                    className="redrive-toast__close"
                    onClick={() => toast.dismiss(item.id)}
                    aria-label="Dismiss notification"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
}

const ToasterProvider = () => (
    <Toaster
        position="top-center"
        reverseOrder={false}
        gutter={10}
        containerStyle={{ top: 18, left: 12, right: 12, zIndex: 9999 }}
        toastOptions={{ duration: 4200, loading: { duration: Infinity } }}
    >
        {(item) => <RedriveToast item={item} />}
    </Toaster>
);

export default ToasterProvider;
