'use client';

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import EmptyState from "./components/EmptyState";

interface ErrorStateProps {
    error: Error & { digest?: string };
}

const ErrorState: React.FC<ErrorStateProps> = ({ error }) => {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <EmptyState
            title="Something went wrong"
            subtitle="That request hit a bump. Try again, or head back to explore."
            illustration="lost"
            actionLabel="Back to explore"
            actionHref="/explore"
        />
    );
};

export default ErrorState;
