/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Aristocratic theme palette
        ivory: {
          50: '#FEFDFB',
          100: '#FBF9F5',
          200: '#F5F2EB',
          300: '#EDE8DC',
          400: '#E0D8C8',
        },
        charcoal: {
          600: '#4A4543',
          700: '#3A3634',
          800: '#2A2725',
          900: '#1A1817',
        },
        gold: {
          400: '#C9A962',
          500: '#B8963F',
          600: '#9A7B32',
        },
        burgundy: {
          500: '#7B2D42',
          600: '#6B2639',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
      },
    },
  },
  plugins: [],
}
