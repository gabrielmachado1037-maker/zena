/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "zena-green-dark": "#1C4A2E",
        "zena-green-mid": "#2D6A4F",
        "zena-green-light": "#52B788",
        "zena-mint": "#B7E4C7",
        "zena-cream": "#F8F9F4",
        "zena-sand": "#F1EDE4",
        "zena-brown": "#6B4C3B",
        "zena-white": "#FFFFFF",
        "zena-text-dark": "#1A2E22",
        "zena-text-mid": "#4A6355",
        "zena-text-light": "#8FA897",
      },
      fontFamily: {
        sans: ["DM Sans", "Inter", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
