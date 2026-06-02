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
        // e-marketing.io brand colors (from brand guidelines PDF)
        // #EEBC2E = gold (primary), #EE9535 = orange (primary CTA)
        brand: {
          50:  '#fffbec',
          100: '#fef3c7',
          200: '#fde58a',
          300: '#fbd24e',
          400: '#EEBC2E', // brand gold
          500: '#EE9535', // brand orange — primary CTA
          600: '#d4781a',
          700: '#af5e14',
          800: '#8c4a11',
          900: '#733c10',
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
        // secondary brand colors from guidelines
        teal: {
          400: '#65C9CF',
          500: '#4ab5bb',
        },
        primary: {
          50:  '#fffbec',
          100: '#fef3c7',
          500: '#EE9535',
          600: '#d4781a',
          700: '#af5e14',
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
