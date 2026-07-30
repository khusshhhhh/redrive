import { ClassNamesConfig, StylesConfig } from "react-select";

// Shared, dark-mode-aware styling for every react-select instance in the app.
// `unstyled` must be passed alongside these classNames — otherwise react-select's
// own inline default styles (white bg, near-invisible text in dark mode) win.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const selectClassNames: ClassNamesConfig<any, boolean> = {
    control: (state) =>
        `flex items-center rounded-lg border bg-white dark:bg-neutral-800 px-2 py-1.5 text-base transition-colors ${
            state.isFocused
                ? "border-limespark ring-2 ring-limespark/40"
                : "border-gray-300 dark:border-neutral-600"
        } ${state.isDisabled ? "opacity-60 cursor-not-allowed" : ""}`,
    placeholder: () => "text-gray-400 dark:text-neutral-500 ml-1",
    input: () => "text-gray-900 dark:text-neutral-100 ml-1",
    singleValue: () => "text-gray-900 dark:text-neutral-100 ml-1",
    valueContainer: () => "gap-1",
    indicatorsContainer: () => "text-gray-400 dark:text-neutral-500",
    dropdownIndicator: () => "p-1 hover:text-gray-600 dark:hover:text-neutral-300",
    clearIndicator: () => "p-1 hover:text-red-500",
    indicatorSeparator: () => "bg-gray-300 dark:bg-neutral-600 my-2",
    menu: () =>
        "mt-2 overflow-hidden rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg z-50",
    menuList: () => "py-1 max-h-64",
    option: (state) =>
        `px-3 py-2 cursor-pointer text-sm ${
            state.isSelected
                ? "bg-limespark text-graphite font-medium"
                : state.isFocused
                ? "bg-gray-100 dark:bg-neutral-700 text-gray-900 dark:text-neutral-100"
                : "text-gray-900 dark:text-neutral-100"
        }`,
    noOptionsMessage: () => "px-3 py-2 text-sm text-gray-400 dark:text-neutral-500",
    loadingMessage: () => "px-3 py-2 text-sm text-gray-400 dark:text-neutral-500",
};

// react-select's `unstyled` prop still injects its own emotion styles for
// non-cosmetic properties (position, width, and a hardcoded `zIndex: 1` on
// the menu). That inline emotion stylesheet can be inserted after Tailwind's,
// so a plain `z-50` utility class isn't guaranteed to beat it. Overriding
// `zIndex` here goes through the same emotion merge and always wins.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const selectStyles: StylesConfig<any, boolean> = {
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, zIndex: 9999 }),
};
