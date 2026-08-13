'use client';

const Loader = () => {
    return (
        <div className="h-[70vh] flex flex-col justify-center items-center" role="status" aria-live="polite">
            <div className="relative flex h-14 w-14 items-center justify-center">
                <span className="loader-orbit absolute inset-0 rounded-full border border-hairline border-t-primary" />
                <span className="loader-core h-3 w-3 rounded-full bg-primary" />
            </div>
            <p className="mt-4 text-xs font-medium tracking-wide text-muted">Getting things ready</p>
            <span className="sr-only">Loading</span>
        </div>
    );
};

export default Loader;
