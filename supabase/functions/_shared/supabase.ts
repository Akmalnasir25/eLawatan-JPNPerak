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
  return (Deno.env.get('DOMAIN_DIBENARKAN') ?? 'moe-dl.edu.my,moe.edu.my,moe.gov.my')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
}

/** Klien anon tanpa sesi — untuk log masuk kata laluan di sisi pelayan. */
export function klienAnon(): SupabaseClient {
  return createClient(URL_SUPABASE, KUNCI_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Dasar kata laluan: sekurang-kurangnya 12 aksara dan tidak pernah bocor.
 * Semakan kebocoran menggunakan API julat HaveIBeenPwned — hanya lima
 * aksara pertama cincangan SHA-1 dihantar, tidak pernah kata laluan.
 */
export const PANJANG_KATA_LALUAN = 12

export async function semakKataLaluan(
  kataLaluan: string,
  emel: string,
): Promise<string | null> {
  const k = kataLaluan ?? ''
  if (k.length < PANJANG_KATA_LALUAN) {
    return `Kata laluan mesti sekurang-kurangnya ${PANJANG_KATA_LALUAN} aksara.`
  }
  if (k.trim().length < PANJANG_KATA_LALUAN) {
    return 'Kata laluan tidak boleh terdiri daripada ruang kosong.'
  }
  if (k.toLowerCase().includes(emel.split('@')[0].toLowerCase())) {
    return 'Kata laluan tidak boleh mengandungi nama e-mel anda.'
  }

  try {
    const bait = new TextEncoder().encode(k)
    const cincang = [...new Uint8Array(await crypto.subtle.digest('SHA-1', bait))]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
    const res = await fetch(`https://api.pwnedpasswords.com/range/${cincang.slice(0, 5)}`, {
      headers: { 'Add-Padding': 'true' },
    })
    if (res.ok) {
      const ekor = cincang.slice(5)
      for (const baris of (await res.text()).split('\n')) {
        const [suf, kira] = baris.trim().split(':')
        if (suf === ekor && Number(kira) > 0) {
          return 'Kata laluan ini pernah bocor dalam kebocoran data awam. Sila pilih yang lain.'
        }
      }
    }
  } catch {
    // Perkhidmatan semakan tidak dapat dihubungi — panjang minimum tetap dikuatkuasakan.
  }
  return null
}
