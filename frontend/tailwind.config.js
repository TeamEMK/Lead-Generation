/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // e-marketing.io primary orange
        brand: {
          50:  '#fef7e8',
          100: '#fdecc4',
          200: '#fbd489',
          300: '#f9bb4e',
          400: '#f0a220',
          500: '#E8951A',
          600: '#c97c12',
          700: '#a5620d',
          800: '#854e0c',
          900: '#6c3f0b',
        },
        // e-marketing.io dark navy
        navy: {
          50:  '#eef0f8',
          100: '#dde1f1',
          200: '#bbc3e3',
          300: '#99a4d5',
          400: '#7786c7',
          500: '#2B3467',
          600: '#252d59',
          700: '#1e254a',
          800: '#181d3c',
          900: '#1A1F35',
        },
        primary: {
          50:  '#fef7e8',
          100: '#fdecc4',
          500: '#E8951A',
          600: '#c97c12',
          700: '#a5620d',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'in': 'modalIn 0.18s ease-out',
      },
      keyframes: {
        modalIn: {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
