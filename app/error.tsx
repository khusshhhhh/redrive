'use client';

import { useEffect } from "react";

import EmptyState from "./components/EmptyState";

interface ErrorStateProps {
    error: Error;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error }) => {
    useEffect(() => {
        console.error(error);
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
