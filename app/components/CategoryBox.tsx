'use client';

import { useRouter, useSearchParams } from "next/navigation";
import { IconType } from "react-icons";
import qs from "query-string"
import { useCallback, useTransition } from "react";
import DotLoader from "./DotLoader";


interface CategoryBoxProps {
    icon: IconType;
    label: string;
    selected?: boolean;
    compact?: boolean;
}

const CategoryBox: React.FC<CategoryBoxProps> = ({
    icon: Icon,
    label,
    selected,
    compact = false,
}) => {
    const router = useRouter();
    const params = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const handleClick = useCallback(() => {
        let currentQuery = {};

        if (params) {
            currentQuery = qs.parse(params.toString());
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatedQuery: any = {
            ...currentQuery,
            category: label
        };

        if (params?.get('category') === label) {
            delete updatedQuery.category;
        }

        const url = qs.stringifyUrl({
            url: '/',
            query: updatedQuery
        }, { skipNull: true });

        startTransition(() => {
            router.push(url);
        });

    }, [label, params, router, startTransition]);


    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={isPending}
            aria-busy={isPending}
            aria-pressed={selected}
            aria-label={isPending ? `Loading ${label} vehicles` : `${selected ? "Remove" : "Show"} ${label} filter`}
            className={`
          flex min-w-0 w-full flex-col items-center justify-center border-b-2 px-1 hover:text-ink transition-[min-height,gap,padding,color,border-color] duration-300 cursor-pointer outline-none focus-visible:bg-surface-soft focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-2 motion-reduce:transition-none
          ${compact ? "min-h-11 gap-0.5 py-1 sm:min-h-12" : "min-h-14 gap-1.5 py-2 sm:min-h-16 sm:gap-2"}
          ${selected ? "border-b-secondary" : "border-transparent"}
          ${selected ? "text-secondary-active" : "text-muted"}
          ${isPending ? "cursor-wait border-b-primary bg-surface-soft text-primary" : ""}
        `}
        >
            <span className={`flex items-center justify-center text-current transition-[width,height] duration-300 ${compact ? "h-5 w-6 sm:h-6 sm:w-6 [&_svg]:h-5 [&_svg]:w-5 sm:[&_svg]:h-6 sm:[&_svg]:w-6" : "h-7 w-7 sm:h-8 sm:w-8 [&_svg]:h-7 [&_svg]:w-7 sm:[&_svg]:h-8 sm:[&_svg]:w-8"}`}>
                {isPending ? <DotLoader size="sm" color="#3B3B3B" /> : <Icon aria-hidden="true" />}
            </span>
            <div className={`max-w-full truncate font-semibold transition-[font-size] duration-300 ${compact ? "text-[9px] sm:text-[10px] lg:text-xs" : "text-[11px] sm:text-xs lg:text-sm"}`}>{label}</div>
        </button>
    );
};

export default CategoryBox;
