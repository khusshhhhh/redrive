"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { IconMapPin } from "@tabler/icons-react";
import DotLoader from "../DotLoader";

export interface ParsedAddress {
    formattedAddress?: string;
    streetAddress: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    lat?: number;
    lng?: number;
}

interface Suggestion {
    placeId: string;
    description: string;
    mainText: string;
    secondaryText: string;
}

interface AddressAutocompleteProps {
    id: string;
    label: string;
    disabled?: boolean;
    required?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    register: UseFormRegister<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setValue: UseFormSetValue<any>;
    errors: FieldErrors;
    validate?: (value: string) => true | string;
    /** Mirrors the raw typed text into the parent's own local state, if it keeps one. */
    onManualChange?: (value: string) => void;
    /** Fired once the user picks a suggestion and its full details have loaded. */
    onSelect?: (result: ParsedAddress) => void;
}

const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
    id,
    label,
    disabled,
    required,
    register,
    setValue,
    errors,
    validate,
    onManualChange,
    onSelect,
}) => {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const sessionTokenRef = useRef<string>(crypto.randomUUID());

    const { onChange: registerOnChange, ...registered } = register(id, { required, validate });

    // Close the dropdown on outside click.
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const search = (query: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.trim().length < MIN_CHARS) {
            setSuggestions([]);
            setIsOpen(false);
            setLoading(false);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            setLoading(true);
            try {
                const res = await axios.get("/api/places", {
                    params: { input: query, sessiontoken: sessionTokenRef.current },
                    signal: controller.signal,
                });
                setSuggestions(res.data || []);
                setIsOpen(true);
                setHighlightedIndex(-1);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                if (error?.name !== "CanceledError") {
                    console.error("Address search failed:", error);
                }
            } finally {
                setLoading(false);
            }
        }, DEBOUNCE_MS);
    };

    const handleSelect = async (suggestion: Suggestion) => {
        setIsOpen(false);
        setSuggestions([]);

        try {
            const res = await axios.get("/api/places/details", {
                params: { placeId: suggestion.placeId, sessiontoken: sessionTokenRef.current },
            });
            const result: ParsedAddress = res.data;

            setValue(id, result.streetAddress, { shouldValidate: true, shouldDirty: true });
            onManualChange?.(result.streetAddress);
            onSelect?.(result);
            // Each completed selection ends a Google-billed "session" - start a fresh one.
            sessionTokenRef.current = crypto.randomUUID();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error) {
            console.error("Failed to load address details:", error);
            // Fall back to at least filling in the description the user picked.
            setValue(id, suggestion.mainText, { shouldValidate: true, shouldDirty: true });
            onManualChange?.(suggestion.mainText);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen || suggestions.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
        } else if (e.key === "Enter") {
            if (highlightedIndex >= 0) {
                e.preventDefault();
                handleSelect(suggestions[highlightedIndex]);
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    return (
        <div className="w-full relative" ref={wrapperRef}>
            <IconMapPin size={18} className="text-muted absolute top-5 left-4 z-10" />

            <input
                id={id}
                disabled={disabled}
                {...registered}
                onChange={(e) => {
                    registerOnChange(e);
                    onManualChange?.(e.target.value);
                    search(e.target.value);
                }}
                onFocus={(e) => {
                    if (e.target.value.trim().length >= MIN_CHARS) search(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                placeholder=" "
                type="text"
                className={`peer w-full p-4 pt-6 pl-11 font-normal bg-white text-ink border rounded-sm outline-none transition disabled:opacity-70 disabled:cursor-not-allowed
                             ${errors[id] ? "border-error" : "border-hairline"}
                             ${errors[id] ? "focus:border-error focus:border-2" : "focus:border-ink focus:border-2"}`}
            />
            <label
                className={`absolute text-body-md duration-150 transform -translate-y-3 top-5 z-10 origin-[0] left-11
                    peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0
                    peer-focus:scale-75 peer-focus:-translate-y-4
                    ${errors[id] ? "text-error" : "text-muted"}`}
            >
                {label}
            </label>

            {loading && (
                <div className="absolute right-4 top-6">
                    <DotLoader size="sm" color="#705C52" />
                </div>
            )}

            {isOpen && suggestions.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full bg-white border border-hairline-soft rounded-sm shadow-card max-h-64 overflow-y-auto">
                    {suggestions.map((s, index) => (
                        <li
                            key={s.placeId}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelect(s)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={`px-4 py-3 cursor-pointer flex items-start gap-3 ${
                                index === highlightedIndex ? "bg-surface-soft" : ""
                            }`}
                        >
                            <IconMapPin size={16} className="text-muted mt-0.5 shrink-0" />
                            <div className="flex flex-col text-body-sm">
                                <span className="text-ink font-medium">{s.mainText}</span>
                                {s.secondaryText && <span className="text-muted">{s.secondaryText}</span>}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default AddressAutocomplete;
