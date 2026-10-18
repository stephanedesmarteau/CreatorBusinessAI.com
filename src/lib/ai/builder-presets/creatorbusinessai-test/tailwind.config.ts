import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          500: "#7c3aed",
          600: "#6d28d9",
          700: "#5b21b6",
        },
        mint: "#36c9a3"
      },
      boxShadow: {
        glow: "0 20px 70px -25px rgba(124, 58, 237, 0.55)",
      soft: "0 20px 60px rgba(38, 32, 74, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
