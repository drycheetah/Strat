/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'strat-green': '#14f195',
        'strat-purple': '#9945ff',
      },
    },
  },
  plugins: [],
}
