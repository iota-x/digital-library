import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        playfair: ["var(--font-playfair)", "serif"],
        caveat:   ["var(--font-caveat)",   "cursive"],
        lato:     ["var(--font-lato)",     "sans-serif"],
      },
      colors: {
        pink: {
          DEFAULT: "#f472b6",
          light:   "#fce7f3",
          mid:     "#fbcfe8",
          deep:    "#ec4899",
        },
        cream: "#fffbf7",
        rose:  "#fff1f2",
      },
    },
  },
  plugins: [],
};

export default config;