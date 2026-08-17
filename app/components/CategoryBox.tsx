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
        <div
            onClick={handleClick}
            className={`
          flex flex-col items-center justify-center snap-start
          min-w-[64px] min-h-14 gap-1 px-2 py-1.5 border-b-2 hover:text-ink transition cursor-pointer shrink-0 sm:min-w-[72px] sm:gap-1.5 sm:px-3 sm:py-2
          ${selected ? "border-b-secondary" : "border-transparent"}
          ${selected ? "text-secondary-active" : "text-muted"}
        `}
        >
            <Icon size={24} />
            <div className="text-xs font-medium sm:text-sm">{label}</div>
        </div>
    );
};

export default CategoryBox;
