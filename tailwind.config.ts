import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        paper: "#fafafa"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(9, 9, 11, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
