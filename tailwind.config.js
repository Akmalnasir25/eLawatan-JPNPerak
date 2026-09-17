/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Biru tua korporat — warna utama sektor pendidikan
        jata: {
          50: '#f0f4fa', 100: '#dde6f3', 200: '#bccde6', 300: '#8eaad3',
          400: '#5b81ba', 500: '#3a62a0', 600: '#1f4785', 700: '#17386b',
          800: '#122c55', 900: '#0c1f3f', 950: '#081530',
        },
        // Aksen emas — digunakan dengan berhemat
        emas: {
          50: '#fdf8ea', 100: '#f9edc8', 200: '#f3dc92', 300: '#ecc767',
          400: '#e2b13c', 500: '#c9971f', 600: '#a47716', 700: '#7c5912',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        borang: ['"Times New Roman"', 'Times', 'Georgia', 'serif'],
      },
      boxShadow: {
        kad: '0 1px 2px rgba(12, 31, 63, 0.04), 0 1px 3px rgba(12, 31, 63, 0.06)',
        timbul: '0 4px 12px rgba(12, 31, 63, 0.08), 0 2px 4px rgba(12, 31, 63, 0.05)',
      },
    },
  },
  plugins: [],
}
