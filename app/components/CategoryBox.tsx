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
          flex min-h-12 min-w-0 w-full flex-col items-center justify-center
          gap-1 border-b-2 px-0.5 py-1.5 hover:text-ink transition cursor-pointer outline-none focus-visible:bg-surface-soft focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:min-h-14 sm:gap-1.5 sm:px-1 sm:py-2
          ${selected ? "border-b-secondary" : "border-transparent"}
          ${selected ? "text-secondary-active" : "text-muted"}
        `}
        >
            <Icon size={22} />
            <div className="hidden max-w-full truncate text-[10px] font-medium sm:block lg:text-sm">{label}</div>
        </button>
    );
};

export default CategoryBox;
