'use client';

import { useRouter, useSearchParams } from "next/navigation";
import { IconType } from "react-icons";
import qs from "query-string"
import { useCallback } from "react";


interface CategoryBoxProps {
    icon: IconType;
    label: string;
    selected?: boolean;
}

const CategoryBox: React.FC<CategoryBoxProps> = ({
    icon: Icon,
    label,
    selected
}) => {
    const router = useRouter();
    const params = useSearchParams();

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

        router.push(url);

    }, [label, params, router]);


    return (
        <button
            type="button"
            onClick={handleClick}
            aria-pressed={selected}
            aria-label={`${selected ? "Remove" : "Show"} ${label} filter`}
            className={`
          flex min-h-14 min-w-0 w-full flex-col items-center justify-center
          gap-1.5 border-b-2 px-1 py-2 hover:text-ink transition cursor-pointer outline-none focus-visible:bg-surface-soft focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:min-h-16 sm:gap-2 sm:px-2
          ${selected ? "border-b-secondary" : "border-transparent"}
          ${selected ? "text-secondary-active" : "text-muted"}
        `}
        >
            <span className="flex text-current [&_svg]:h-7 [&_svg]:w-7 sm:[&_svg]:h-8 sm:[&_svg]:w-8">
                <Icon aria-hidden="true" />
            </span>
            <div className="max-w-full truncate text-[11px] font-semibold sm:text-xs lg:text-sm">{label}</div>
        </button>
    );
};

export default CategoryBox;
