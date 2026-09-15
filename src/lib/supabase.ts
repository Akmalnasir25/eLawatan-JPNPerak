import { createClient } from '@supabase/supabase-js'

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

export const DOMAIN_DIBENARKAN = (
  import.meta.env.VITE_DOMAIN_DIBENARKAN ?? 'moe-dl.edu.my,moe.gov.my'
)
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean)

export const URL_SISTEM =
  import.meta.env.VITE_URL_SISTEM ?? window.location.origin

/** Panggil satu Edge Function dan lempar mesej ralat bahasa Melayu. */
export async function panggilFungsi<T>(
  nama: string,
  badan: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(nama, { body: badan })
  if (error) {
    // Edge Function mengembalikan { ralat } dalam badan respons
    const mesej = (data as { ralat?: string } | null)?.ralat ?? error.message
    throw new Error(mesej)
  }
  if (data && typeof data === 'object' && 'ralat' in data) {
    throw new Error(String((data as { ralat: string }).ralat))
  }
  return data as T
}
