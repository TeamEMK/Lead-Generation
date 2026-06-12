/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 400: '#EEBC2E', 500: '#EE9535', 600: '#d4831f' },
      },
    },
  },
  plugins: [],
}
