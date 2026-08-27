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
        // Monochrome. Four source greys carry the identity --
        // Mist #D9D9D9, Ash #B5B5B5, Slate #636363 and Graphite #3B3B3B --
        // and every token below is derived from them, holding the contrast
        // ratios the previous palette had.
        primary: "#3B3B3B",
        "primary-active": "#2E2E2E",
        "primary-disabled": "#B5B5B5",
        secondary: "#636363",
        "secondary-active": "#3B3B3B",
        "secondary-soft": "#EDEDED",
        accent: "#B5B5B5",
        "accent-active": "#636363",
        "accent-soft": "#EDEDED",
        ink: "#3B3B3B",
        body: "#3B3B3B",
        muted: "#636363",
        "muted-soft": "#8A8A8A",
        hairline: "#D9D9D9",
        "hairline-soft": "#E7E7E7",
        "border-strong": "#B5B5B5",
        "surface-soft": "#F4F4F4",
        "surface-strong": "#E4E4E4",
        error: "#C0281B",
        "error-hover": "#9B1F15",
        "legal-link": "#3B3B3B",
        luxe: "#636363",
        plus: "#B5B5B5",
        favorite: "#3B3B3B",
        "favorite-active": "#2E2E2E",
        "favorite-soft": "#EDEDED",
      },
      backgroundImage: {
        // Monochrome gradients drawn from the four source greys.
        graphite: "linear-gradient(135deg, #3B3B3B 0%, #636363 100%)",
        "graphite-vivid": "linear-gradient(135deg, #2E2E2E 0%, #636363 100%)",
        mist: "linear-gradient(160deg, #F4F4F4 0%, #E4E4E4 100%)",
        "mist-strong": "linear-gradient(160deg, #E7E7E7 0%, #D9D9D9 100%)",
        "ash-ring": "linear-gradient(135deg, #B5B5B5 0%, #636363 100%)",
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
