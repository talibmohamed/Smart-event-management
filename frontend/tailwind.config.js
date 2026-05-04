import { heroui } from "@heroui/react"

export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Inter Variable"',
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: ['"Inter Variable"', "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "elev-1": "0 18px 55px rgba(148, 163, 184, 0.14)",
        "elev-2": "0 24px 70px rgba(148, 163, 184, 0.14)",
        "elev-1-dark": "0 18px 55px rgba(2, 6, 23, 0.35)",
        "elev-2-dark": "0 24px 70px rgba(2, 6, 23, 0.4)",
        pop: "0 26px 70px rgba(148, 163, 184, 0.24)",
        "glow-sky": "0 10px 30px rgba(56, 189, 248, 0.45)",
      },
      borderRadius: {
        card: "1.75rem",
        section: "2rem",
      },
    },
  },
  plugins: [heroui()],
}
