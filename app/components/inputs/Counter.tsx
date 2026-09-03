'use client';
import { useCallback } from "react";
import { Minus, Plus } from "lucide-react";

interface CounterProps {
    title: string;
    subtitle: string;
    value: number;
    onChange: (value: number) => void;
}

const Counter: React.FC<CounterProps> = ({ title, subtitle, value, onChange }) => {
    const onAdd = useCallback(() => {
        onChange(value + 1);
    }, [onChange, value]);

    const onReduce = useCallback(() => {
        if (value === 0) {
            return;
        }
        onChange(value - 1);
    }, [onChange, value]);


    return (
        <div className="flex flex-row items-center justify-between">
            <div className="flex flex-col">
                <div className="font-medium text-ink">
                    {title}
                </div>
                <div className="font-normal text-muted">
                    {subtitle}
                </div>
            </div>
            <div className="flex flex-row items-center gap-4">
                <div
                    onClick={onReduce}
                    className="
                    w-8
                    h-8
                    rounded-full
                    border
                    border-hairline
                    flex
                    items-center
                    justify-center
                    text-ink
                    cursor-pointer
                    hover:border-ink
                    transition
                "
                >
                    <Minus />
                </div>
                <div className="font-normal text-xl text-ink">
                    {value}
                </div>
                <div
                    onClick={onAdd}
                    className="
                    w-8
                    h-8
                    rounded-full
                    border
                    border-hairline
                    flex
                    items-center
                    justify-center
                    text-ink
                    cursor-pointer
                    hover:border-ink
                    transition
                    "
                >
                    <Plus />
                </div>

            </div>
        </div>
    );

};

export default Counter;
