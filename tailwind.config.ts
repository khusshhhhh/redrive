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
        // Monochrome, pulled close to black. Four source greys carry the
        // identity -- Mist #CBCBCB, Ash #9C9C9C, Slate #454545 and near-black
        // Graphite #1F1F1F -- and every token below is derived from them.
        // The "white" ground is a soft neutral grey; recessed surfaces sit a
        // step darker than it so cards still read.
        white: "#F4F4F4",
        primary: "#1F1F1F",
        "primary-active": "#111111",
        "primary-disabled": "#9C9C9C",
        secondary: "#454545",
        "secondary-active": "#1F1F1F",
        "secondary-soft": "#E7E7E7",
        accent: "#9C9C9C",
        "accent-active": "#454545",
        "accent-soft": "#E7E7E7",
        ink: "#1F1F1F",
        body: "#1F1F1F",
        muted: "#454545",
        "muted-soft": "#6E6E6E",
        hairline: "#CBCBCB",
        "hairline-soft": "#DCDCDC",
        "border-strong": "#9C9C9C",
        "surface-soft": "#ECECEC",
        "surface-strong": "#DFDFDF",
        error: "#C0281B",
        "error-hover": "#9B1F15",
        "legal-link": "#1F1F1F",
        luxe: "#454545",
        plus: "#9C9C9C",
        favorite: "#1F1F1F",
        "favorite-active": "#111111",
        "favorite-soft": "#E7E7E7",
      },
      backgroundImage: {
        // Monochrome gradients drawn from the four source greys.
        graphite: "linear-gradient(135deg, #1F1F1F 0%, #454545 100%)",
        "graphite-vivid": "linear-gradient(135deg, #111111 0%, #454545 100%)",
        mist: "linear-gradient(160deg, #F4F4F4 0%, #E4E4E4 100%)",
        "mist-strong": "linear-gradient(160deg, #E7E7E7 0%, #D9D9D9 100%)",
        "ash-ring": "linear-gradient(135deg, #9C9C9C 0%, #454545 100%)",
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
        // Oversized display sizes used only by the marketing / showcase surfaces.
        "display-hero": ["clamp(2.75rem, 6vw + 1rem, 5.25rem)", { lineHeight: "0.98", letterSpacing: "-0.035em" }],
        "display-3xl": ["clamp(2.25rem, 3.5vw + 1rem, 3.5rem)", { lineHeight: "1.02", letterSpacing: "-0.03em" }],
        "display-2xl": ["clamp(1.85rem, 2vw + 1rem, 2.5rem)", { lineHeight: "1.08", letterSpacing: "-0.025em" }],
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
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'step-in': {
          '0%': { opacity: '0', transform: 'translateY(14px) scale(0.985)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        pop: 'pop 0.2s ease-out',
        marquee: 'marquee 38s linear infinite',
        'marquee-slow': 'marquee 64s linear infinite',
        floaty: 'floaty 6s ease-in-out infinite',
        'gradient-pan': 'gradient-pan 14s ease infinite',
        'step-in': 'step-in 460ms cubic-bezier(.16,1,.3,1) both',
      },
    },
  },
  plugins: [],
};

export default config;
