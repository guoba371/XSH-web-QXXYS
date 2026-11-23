import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: "#05070D",
        midnight: "#0B1220",
        champagne: "#D9BD8B",
        paper: "#ECE8DF",
        mist: "#9297A3",
      },
      fontFamily: {
        sans: ["SF Pro Text", "PingFang SC", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["SF Pro Display", "PingFang SC", "Helvetica Neue", "Arial", "sans-serif"],
        quote: ["Songti SC", "STSong", "Noto Serif SC", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
