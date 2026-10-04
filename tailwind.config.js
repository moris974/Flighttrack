/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#0a0f1e",
          900: "#0f1626",
          800: "#161f36",
          700: "#212c47",
        },
        accent: {
          teal: "#2dd4bf",
          blue: "#3b82f6",
        },
      },
    },
  },
  plugins: [],
};
