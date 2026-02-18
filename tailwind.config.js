/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Default colors are sufficient for the spec: Slate, Blue, Emerald, Amber, Rose
    },
  },
  plugins: [],
}
