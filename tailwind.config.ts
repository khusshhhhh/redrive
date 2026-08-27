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
        // Crimson and Sand. Four source colours carry the identity --
        // Crimson Depth #710014, Warm Sand #B38F6F, Soft Pearl #F2F1ED and
        // Obsidian Black #161616 -- and every token below is derived from
        // them, holding the contrast ratios the previous palette had.
        primary: "#710014",
        "primary-active": "#55000F",
        "primary-disabled": "#C9A7AD",
        secondary: "#8A6849",
        "secondary-active": "#6E5239",
        "secondary-soft": "#F0E7DD",
        accent: "#B38F6F",
        "accent-active": "#8A6849",
        "accent-soft": "#F5ECE1",
        ink: "#161616",
        body: "#332F2C",
        muted: "#6B645E",
        "muted-soft": "#8F877F",
        hairline: "#DFDCD5",
        "hairline-soft": "#EBE8E2",
        "border-strong": "#C6C0B6",
        "surface-soft": "#F2F1ED",
        "surface-strong": "#E7E5DE",
        error: "#C0281B",
        "error-hover": "#9B1F15",
        "legal-link": "#710014",
        luxe: "#8A6849",
        plus: "#B38F6F",
        favorite: "#A3121F",
        "favorite-active": "#7C0D18",
        "favorite-soft": "#F9EAEB",
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
