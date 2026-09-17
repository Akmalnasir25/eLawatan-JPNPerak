/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Biru tua indigo — warna utama, mengikut portal rasmi JPN Perak
        // (bar atas & kaki laman #22326e, teks tajuk #15124a)
        jata: {
          50: '#f3f5fb', 100: '#e4e8f5', 200: '#c8cfea', 300: '#9ea8d4',
          400: '#6e7bbb', 500: '#4054b2', 600: '#2d3f8f', 700: '#22326e',
          800: '#1c2860', 900: '#15124a', 950: '#0e0c33',
        },
        // Biru terang portal — pautan, keadaan aktif dan aksen
        biru: {
          50: '#eef4ff', 100: '#dbe7fe', 200: '#bfd4fe', 300: '#93b8fd',
          400: '#5f93fa', 500: '#1b69f4', 600: '#1257d6', 700: '#1146ad',
        },
        // Kuning amaran — hanya untuk perkara yang perlu tindakan
        emas: {
          50: '#fdf8ea', 100: '#f9edc8', 200: '#f3dc92', 300: '#ecc767',
          400: '#e2b13c', 500: '#c9971f', 600: '#a47716', 700: '#7c5912',
        },
        latar: '#f6f8fb',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        borang: ['"Times New Roman"', 'Times', 'Georgia', 'serif'],
      },
      borderRadius: {
        kad: '15px',
      },
      boxShadow: {
        kad: '0 5px 15px rgba(0, 0, 0, 0.06)',
        timbul: '0 0 10px 4px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
}
