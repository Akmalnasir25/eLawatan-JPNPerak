import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'logo-jabatan.png'],
      manifest: {
        name: 'eLAWATAN Perak',
        short_name: 'eLAWATAN',
        description: 'Sistem Permohonan dan Kelulusan Lawatan Murid Sekolah',
        theme_color: '#22326e',
        background_color: '#f6f8fb',
        display: 'standalone',
        lang: 'ms',
        start_url: '/',
        icons: [
          { src: 'ikon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'ikon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Mod demo menggantikan Supabase dengan Postgres dalam pelayar.
      // Binaan pengeluaran tidak pernah melihat kod demo.
      '#klien': path.resolve(
        __dirname,
        mode === 'demo' ? './src/demo/klien.ts' : './src/lib/klien-sebenar.ts',
      ),
    },
  },
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        // Asingkan pustaka besar supaya halaman borang tidak menunggu
        // kod QR, dan sebaliknya.
        manualChunks: {
          supabase: ['@supabase/supabase-js'],
          qr: ['qrcode'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
}))
