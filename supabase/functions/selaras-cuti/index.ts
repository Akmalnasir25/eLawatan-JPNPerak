import { klienPentadbir } from '../_shared/supabase.ts'
import { muatCuti, tahunSasaran, type JenisCuti, type RekodCuti } from '../_shared/cuti-api.ts'

function jawapan(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

async function tokenSama(diberi: string, rahsia: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const [a, b] = await Promise.all([diberi, rahsia].map(async (s) => new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(s)))))
  let beza = 0
  for (let i = 0; i < a.length; i++) beza |= a[i] ^ b[i]
  return beza === 0
}

type HasilSumber = { tahun: number; jenis: JenisCuti; data: RekodCuti[]; status: 'berjaya' | 'belum_tersedia' | 'gagal'; mesej: string | null }

export async function kendali(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } })
  const rahsia = Deno.env.get('CUTI_CRON_TOKEN') ?? ''
  if (rahsia.trim().length < 32) return jawapan({ ralat: 'Penyelarasan belum dikonfigurasi.' }, 503)
  const diberi = req.headers.get('x-cuti-token') ?? ''
  if (!diberi || diberi.length > 1024 || !await tokenSama(diberi, rahsia)) return jawapan({ ralat: 'Akses tidak dibenarkan.' }, 401)

  const db = klienPentadbir()
  let token: string | null = null
  let gagalSimpan = false
  let calonBaharu = 0
  const kira = { berjaya: 0, belum_tersedia: 0, gagal: 0 }
  try {
    const mula = await db.rpc('mula_selaras_cuti')
    if (mula.error) throw new Error('mula')
    if (!mula.data) return jawapan({ status: 'sedang_berjalan' }, 202)
    token = mula.data as string
    // Only public holiday endpoints receive requests; no application or personal data leaves here.
    const tugas = tahunSasaran(new Date()).flatMap((tahun) => (['umum', 'sekolah'] as JenisCuti[]).map(async (jenis): Promise<HasilSumber> => {
      try {
        return { tahun, jenis, data: await muatCuti(tahun, jenis), status: 'berjaya', mesej: null }
      } catch (error) {
        const belum = error instanceof Error && error.message === 'Data tahun ini belum tersedia.'
        return {
          tahun, jenis, data: [], status: belum ? 'belum_tersedia' : 'gagal',
          mesej: belum
            ? 'Sumber belum menyediakan data tahun ini. Sistem akan mencuba lagi pada jadual seterusnya.'
            : 'Data sumber tidak dapat diambil atau gagal pengesahan. Salinan terakhir dikekalkan. Sistem akan mencuba lagi; semak sumber rasmi jika berulang.',
        }
      }
    }))
    const hasil = await Promise.all(tugas)
    for (const sumber of hasil) {
      // Save each source independently so an unavailable year cannot discard successful years.
      try {
        const simpan = await db.rpc('simpan_selaras_cuti', {
          p_token: token, p_tahun: sumber.tahun, p_jenis: sumber.jenis,
          p_data: sumber.data, p_status: sumber.status, p_mesej: sumber.mesej,
        })
        if (simpan.error) throw new Error('simpan')
        calonBaharu += Number(simpan.data ?? 0)
        kira[sumber.status]++
      } catch {
        gagalSimpan = true
        console.error('Penyimpanan hasil cuti gagal.', { tahun: sumber.tahun, jenis: sumber.jenis })
      }
    }
  } catch {
    gagalSimpan = true
    console.error('Penyelarasan cuti gagal pada pangkalan data.')
  } finally {
    if (token) {
      try {
        const tamat = await db.rpc('tamat_selaras_cuti', { p_token: token })
        if (tamat.error) throw new Error('tamat')
      } catch {
        gagalSimpan = true
        console.error('Kunci penyelarasan cuti tidak dapat dilepaskan; ia akan luput secara automatik.')
      }
    }
  }
  if (gagalSimpan) return jawapan({ status: 'gagal_pangkalan_data', sumber: kira, calon_baharu: calonBaharu }, 500)
  return jawapan({ status: kira.gagal || kira.belum_tersedia ? 'separa' : 'selesai', sumber: kira, calon_baharu: calonBaharu })
}

Deno.serve(kendali)
