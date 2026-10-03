import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        academic: {
          navy: {
            50: "#f0f4f8",
            100: "#d9e2ec",
            200: "#bcccdc",
            300: "#9fb3c8",
            400: "#627d98",
            500: "#486581",
            600: "#334e68",
            700: "#243b53",
            800: "#102a43",
            900: "#0b1d33",
            950: "#06101e",
          },
          gold: {
            50: "#fffbeb",
            100: "#fef3c7",
            200: "#fde68a",
            300: "#fcd34d",
            400: "#fbbf24",
            500: "#c59b27",
            600: "#a87f18",
            700: "#8a6612",
            800: "#6e4f10",
            900: "#4e360b",
          },
          crimson: {
            50: "#fff1f2",
            100: "#ffe4e6",
            500: "#e11d48",
            700: "#be123c",
            900: "#881337",
          },
          slate: {
            50: "#f8fafc",
            100: "#f1f5f9",
            200: "#e2e8f0",
            300: "#cbd5e1",
            700: "#334155",
            800: "#1e293b",
            900: "#0f172a",
          }
        },
      },
    },
  },
  plugins: [],
};
export default config;
