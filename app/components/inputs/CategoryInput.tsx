'use client';

import { IconType } from "react-icons";

interface CategoryInputProps {
    icon: IconType;
    label: string;
    selected?: boolean;
    onClick: (value: string) => void;
}

const CategoryInput: React.FC<CategoryInputProps> = ({
    icon: Icon,
    label,
    selected,
    onClick
}) => {
    return (
        <div
            onClick={() => onClick(label)}
            className={`
        rounded-md
        border
        p-4
        flex
        flex-col
        gap-3
        hover:border-ink
        transition
        cursor-pointer
        items-start
        text-ink
        ${selected ? 'border-ink shadow-card' : 'border-hairline'}
      `}
        >
            <Icon size={32} />
            <div className="font-semibold">
                {label}
            </div>
        </div>
    );
};

export default CategoryInput;