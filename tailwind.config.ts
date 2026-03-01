import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg))",
        card: "rgb(var(--card))",
        text: "rgb(var(--text))",
        primary: "rgb(var(--primary))",
        accent: "rgb(var(--accent))",
        border: "rgb(var(--border))"
      }
    }
  },
  plugins: []
} satisfies Config;
