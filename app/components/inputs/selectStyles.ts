import { ClassNamesConfig, StylesConfig } from "react-select";

// Shared Airbnb-style theming for every react-select instance in the app.
// `unstyled` must be passed alongside these classNames — otherwise react-select's
// own inline default styles win.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const selectClassNames: ClassNamesConfig<any, boolean> = {
    control: (state) =>
        `flex items-center rounded-sm border bg-white px-2 py-1.5 text-base transition-colors ${
            state.isFocused
                ? "border-ink border-2"
                : "border-hairline"
        } ${state.isDisabled ? "opacity-60 cursor-not-allowed" : ""}`,
    placeholder: () => "ml-1 text-sm text-muted-soft",
    input: () => "text-ink ml-1",
    singleValue: () => "text-ink ml-1",
    valueContainer: () => "gap-1",
    indicatorsContainer: () => "text-muted",
    dropdownIndicator: () => "p-1 hover:text-ink",
    clearIndicator: () => "p-1 hover:text-error",
    indicatorSeparator: () => "bg-hairline my-2",
    menu: () =>
        "mt-2 overflow-hidden rounded-sm border border-hairline bg-white shadow-card z-50",
    menuList: () => "py-1 max-h-64",
    option: (state) =>
        `px-3 py-2 cursor-pointer text-sm ${
            state.isSelected
                ? "bg-ink text-white font-medium"
                : state.isFocused
                ? "bg-surface-soft text-ink"
                : "text-ink"
        }`,
    noOptionsMessage: () => "px-3 py-2 text-sm text-muted",
    loadingMessage: () => "px-3 py-2 text-sm text-muted",
};

// react-select's `unstyled` prop still injects its own emotion styles for
// non-cosmetic properties (position, width, and a hardcoded `zIndex: 1` on
// the menu). That inline emotion stylesheet can be inserted after Tailwind's,
// so a plain `z-50` utility class isn't guaranteed to beat it. Overriding
// `zIndex` here goes through the same emotion merge and always wins.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const selectStyles: StylesConfig<any, boolean> = {
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    // `unstyled` strips react-select's own menu background, and when the menu is
    // portalled to <body> the Tailwind `bg-white` class can lose the specificity
    // race against emotion's injected styles — leaving a see-through panel that
    // lets the page behind it bleed through. Pin an opaque background here so it
    // always wins.
    menu: (base) => ({ ...base, zIndex: 9999, backgroundColor: "#ffffff" }),
};
