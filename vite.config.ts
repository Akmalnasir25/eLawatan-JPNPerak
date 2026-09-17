import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'eLAWATAN Perak',
        short_name: 'eLAWATAN',
        description: 'Sistem Permohonan dan Kelulusan Lawatan Murid Sekolah',
        theme_color: '#0f4c81',
        background_color: '#f8fafc',
        display: 'standalone',
        lang: 'ms',
        start_url: '/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
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
