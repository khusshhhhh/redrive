import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Coast and Country: ocean teal, eucalyptus green and wattle gold.
        primary: "#087985",
        "primary-active": "#06636D",
        "primary-disabled": "#9BC8CC",
        secondary: "#39715A",
        "secondary-active": "#2D5A48",
        "secondary-soft": "#E2EFE8",
        accent: "#D39A12",
        "accent-active": "#9A6E08",
        "accent-soft": "#FFF4CF",
        ink: "#18363A",
        body: "#304C4C",
        muted: "#526D68",
        "muted-soft": "#748B85",
        hairline: "#D2E6E0",
        "hairline-soft": "#E5F0EC",
        "border-strong": "#A9CCC1",
        "surface-soft": "#F1F8F5",
        "surface-strong": "#E1F0EA",
        error: "#B42318",
        "error-hover": "#8F1D14",
        "legal-link": "#06636D",
        luxe: "#39715A",
        plus: "#D39A12",
        favorite: "#D94F70",
        "favorite-active": "#B93B59",
        "favorite-soft": "#FFF0F4",
      },
      borderRadius: {
        none: "0px",
        xs: "4px",
        sm: "8px",
        md: "14px",
        lg: "20px",
        xl: "32px",
      },
      fontSize: {
        // Airbnb-style type scale (see DESIGN-airbnb.md). Weight is applied
        // separately via font-{weight} utilities to match the spec table.
        "rating-display": ["64px", { lineHeight: "1.1", letterSpacing: "-1px" }],
        "display-xl": ["28px", { lineHeight: "1.43", letterSpacing: "0" }],
        "display-lg": ["22px", { lineHeight: "1.18", letterSpacing: "-0.44px" }],
        "display-md": ["21px", { lineHeight: "1.43", letterSpacing: "0" }],
        "display-sm": ["20px", { lineHeight: "1.20", letterSpacing: "-0.18px" }],
        "title-md": ["16px", { lineHeight: "1.25", letterSpacing: "0" }],
        "title-sm": ["16px", { lineHeight: "1.25", letterSpacing: "0" }],
        "body-md": ["16px", { lineHeight: "1.5", letterSpacing: "0" }],
        "body-sm": ["14px", { lineHeight: "1.43", letterSpacing: "0" }],
        caption: ["14px", { lineHeight: "1.29", letterSpacing: "0" }],
        "caption-sm": ["13px", { lineHeight: "1.23", letterSpacing: "0" }],
        badge: ["11px", { lineHeight: "1.18", letterSpacing: "0" }],
        "micro-label": ["12px", { lineHeight: "1.33", letterSpacing: "0" }],
        "uppercase-tag": ["8px", { lineHeight: "1.25", letterSpacing: "0.32px" }],
        "button-md": ["16px", { lineHeight: "1.25", letterSpacing: "0" }],
        "button-sm": ["14px", { lineHeight: "1.29", letterSpacing: "0" }],
        link: ["14px", { lineHeight: "1.43", letterSpacing: "0" }],
        "nav-link": ["16px", { lineHeight: "1.25", letterSpacing: "0" }],
      },
      boxShadow: {
        card: "rgba(0, 0, 0, 0.02) 0 0 0 1px, rgba(0, 0, 0, 0.04) 0 2px 6px 0, rgba(0, 0, 0, 0.1) 0 4px 8px 0",
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        pop: 'pop 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
