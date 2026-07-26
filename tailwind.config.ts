import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette: Graphite (dark surfaces) + Lime Spark (accent) + White (base).
        graphite: "#23262F",
        limespark: "#B6FF2E",
        // Retint the dark-mode-only end of the neutral scale to Graphite tones so
        // every existing `dark:bg-neutral-900` / `-800` / `-700` class picks it up
        // automatically. 50-600 are untouched (still used for light-mode grays).
        neutral: {
          700: "#3A3D4A",
          800: "#2E313C",
          900: "#23262F",
        },
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
