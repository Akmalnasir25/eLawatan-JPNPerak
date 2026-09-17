// Klien pengeluaran: Supabase sebenar dan muat naik terus ke Cloudflare R2.
// Mod demo menggantikan modul ini melalui alias `#klien` (vite.config.ts).

import { createClient } from '@supabase/supabase-js'

export const MOD_DEMO = false
export const demo = null

const url = import.meta.env.VITE_SUPABASE_URL
const kunci = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !kunci) {
  throw new Error(
    'VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY belum ditetapkan. Salin .env.example ke .env.',
  )
}

export const supabase = createClient(url, kunci, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'elawatan-sesi',
  },
})

/** PUT dengan kemajuan — fetch() tidak melaporkan kemajuan muat naik. */
export function hantarFail(
  url: string,
  fail: File,
  onKemajuan: (peratus: number) => void,
): Promise<void> {
  return new Promise((selesai, gagal) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url, true)
    xhr.setRequestHeader('Content-Type', fail.type || 'application/octet-stream')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onKemajuan(e.loaded / e.total)
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? selesai()
        : gagal(new Error(`Muat naik ke storan gagal (HTTP ${xhr.status}).`))
    xhr.onerror = () =>
      gagal(
        new Error('Muat naik gagal. Semak sambungan internet dan tetapan CORS bucket R2.'),
      )
    xhr.send(fail)
  })
}
