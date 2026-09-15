/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        jata: {
          50: '#eef5fb', 100: '#d6e6f4', 200: '#adcde9', 300: '#7fb0db',
          400: '#4f8fca', 500: '#2b72b4', 600: '#0f4c81', 700: '#0d3f6b',
          800: '#0b3356', 900: '#082742',
        },
        emas: { 400: '#d9a441', 500: '#c08b2a', 600: '#9c6f1f' },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        borang: ['"Times New Roman"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
