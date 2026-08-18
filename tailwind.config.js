/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        "primary-deep": "rgb(var(--primary-deep) / <alpha-value>)",
        mystic: "rgb(var(--mystic) / <alpha-value>)",
        ember: "rgb(var(--ember) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)"
      },
      fontFamily: {
        display: ["Cinzel", "Georgia", "serif"],
        body: ["Roboto", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
