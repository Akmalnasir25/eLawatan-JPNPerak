import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const URL_SUPABASE = Deno.env.get('SUPABASE_URL') ?? ''
const KUNCI_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const KUNCI_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

/** Klien peranan perkhidmatan — memintas RLS. Guna dengan berhati-hati. */
export function klienPentadbir(): SupabaseClient {
  return createClient(URL_SUPABASE, KUNCI_SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Klien yang mewarisi identiti pemanggil — RLS terpakai sepenuhnya. */
export function klienPengguna(req: Request): SupabaseClient {
  const authorization = req.headers.get('Authorization') ?? ''
  return createClient(URL_SUPABASE, KUNCI_ANON, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type Pegawai = {
  id: string
  emel: string
  nama: string
  peranan: string
  kod_skop: string | null
  jawatan: string | null
}

/** Sahkan token pemanggil dan pulangkan baris pegawainya. */
export async function pegawaiSemasa(req: Request): Promise<Pegawai | null> {
  const authorization = req.headers.get('Authorization')
  if (!authorization) return null

  const pentadbir = klienPentadbir()
  const token = authorization.replace(/^Bearer\s+/i, '')
  const { data: { user }, error } = await pentadbir.auth.getUser(token)
  if (error || !user) return null

  const { data } = await pentadbir
    .from('pegawai')
    .select('id, emel, nama, peranan, kod_skop, jawatan')
    .eq('user_id', user.id)
    .eq('aktif', true)
    .maybeSingle()

  return (data as Pegawai) ?? null
}

export function domainDibenarkan(): string[] {
  return (Deno.env.get('DOMAIN_DIBENARKAN') ?? 'moe-dl.edu.my,moe.gov.my')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
}
