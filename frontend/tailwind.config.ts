import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: {
          50: "#eef6ff",
          500: "#2f6fed",
          600: "#275bd0",
        },
      },
    },
  },
  plugins: [],
};

export default config;
