/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        court: {
          50: "#eef7fb",
          100: "#d5ecf5",
          200: "#a9d6e9",
          300: "#75bbd9",
          400: "#3e9ec5",
          500: "#1e90d6",
          600: "#1576b3",
          700: "#125e8f",
          800: "#0f486f",
          900: "#0c3551",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "system-ui",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
