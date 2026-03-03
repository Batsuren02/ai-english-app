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
        sans: ['var(--font-body)', 'sans-serif'],
        display: ['var(--font-display)', 'serif'],
        mono: ['var(--font-monospace)', 'monospace'],
      },
      colors: {
        ink: {
          50: '#f5f4ef',
          100: '#e8e6dc',
          200: '#d4d0c0',
          300: '#b8b29a',
          400: '#9a9278',
          500: '#7d7560',
          600: '#635d4c',
          700: '#4f4a3d',
          800: '#3d3930',
          900: '#2c2820',
          950: '#1a1710',
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        }
      }
    },
  },
  plugins: [],
}
