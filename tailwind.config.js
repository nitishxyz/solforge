/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./src/gui/public/index.html",
    "./src/gui/src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0f172a",
          surface: "#111827",
          elevated: "#1f2937",
        },
        accent: {
          primary: "#22d3ee",
          hover: "#67e8f9",
        },
      },
      boxShadow: {
        soft: "0 10px 25px -15px rgba(15, 23, 42, 0.9)",
      },
    },
  },
  plugins: [],
};
