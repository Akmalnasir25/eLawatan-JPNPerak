// ════════════════════════════════════════════════════════════════════
// r2-tandatangan — Imej tandatangan digital dan cop rasmi
//
//   tujuan = 'naik'   → pautan PUT untuk imej baharu dalam folder profil
//                        pemanggil sendiri (profil/<id>/<jenis>/<uuid>.<ext>)
//   tujuan = 'profil' → pautan GET bagi imej semasa pemanggil
//   tujuan = 'cetak'  → pautan GET bagi semua imej yang DIBEKUKAN pada satu
//                        permohonan, jika pemanggil boleh melihatnya
//
// Imej tidak pernah awam. SVG ditolak kerana boleh membawa skrip.
// ════════════════════════════════════════════════════════════════════

import { jawapan, kendaliOptions, ralat } from '../_shared/cors.ts'
import { klienPentadbir, pegawaiSemasa } from '../_shared/supabase.ts'
import { presignLihat, presignNaik } from '../_shared/r2.ts'

const JENIS_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}
const SAIZ_MAKS = 1024 * 1024

type Permintaan =
  | { tujuan: 'naik'; jenis: 'tandatangan' | 'cop'; jenis_mime: string; saiz: number }
  | { tujuan: 'profil' }
  | { tujuan: 'cetak'; permohonan_id: string }

async function tandatanganSemua(kunci: string[], tempoh: number) {
  const hasil: Record<string, string> = {}
  for (const k of new Set(kunci)) hasil[k] = await presignLihat(k, undefined, tempoh)
  return hasil
}

Deno.serve(async (req) => {
  const pra = kendaliOptions(req)
  if (pra) return pra

  try {
    const pegawai = await pegawaiSemasa(req)
    if (!pegawai) return ralat('Tidak dibenarkan.', 401)

    const b = (await req.json()) as Permintaan
    const db = klienPentadbir()

    if (b.tujuan === 'naik') {
      if (b.jenis !== 'tandatangan' && b.jenis !== 'cop') {
        return ralat('Jenis imej tidak sah.')
      }
      const ext = JENIS_MIME[b.jenis_mime]
      if (!ext) return ralat('Hanya imej PNG, JPEG atau WebP diterima.', 415)
      if (!(b.saiz > 0) || b.saiz > SAIZ_MAKS) {
        return ralat('Saiz imej mesti tidak melebihi 1 MB.', 413)
      }
      // Kunci baharu setiap kali: dokumen lama yang merujuk kunci lama
      // terus memaparkan imej asal.
      const kunci = `profil/${pegawai.id}/${b.jenis}/${crypto.randomUUID()}.${ext}`
      const url = await presignNaik(kunci, b.jenis_mime, 600)
      return jawapan({ url, kunci_r2: kunci })
    }

    if (b.tujuan === 'profil') {
      // Tandatangan Guru Besar dan cop milik sekolah, bukan akaun individu.
      const { data } =
        pegawai.peranan === 'sekolah'
          ? await db
              .from('sekolah')
              .select('kunci_tandatangan_gb, kunci_cop')
              .eq('kod_sekolah', pegawai.kod_skop ?? '')
              .maybeSingle()
          : await db
              .from('pegawai')
              .select('kunci_tandatangan, kunci_cop')
              .eq('id', pegawai.id)
              .maybeSingle()

      const rekod = (data ?? {}) as Record<string, string | null>
      const kunci = [
        rekod.kunci_tandatangan_gb ?? rekod.kunci_tandatangan,
        rekod.kunci_cop,
      ].filter(Boolean) as string[]
      return jawapan({ imej: await tandatanganSemua(kunci, 300) })
    }

    if (b.tujuan === 'cetak') {
      const { data: boleh } = await db.rpc('boleh_lihat_permohonan_bagi', {
        p_id: b.permohonan_id,
        p_pegawai_id: pegawai.id,
      })
      if (!boleh) return ralat('Permohonan ini di luar skop capaian anda.', 403)

      const { data, error } = await db.rpc('kunci_imej_permohonan', {
        p_id: b.permohonan_id,
      })
      if (error) return ralat('Gagal mendapatkan imej cetakan.', 500)
      // `setof text` boleh tiba sebagai ["a"] atau [{ kunci_imej_permohonan: "a" }]
      const kunci = ((data as unknown[] | null) ?? [])
        .map((x) =>
          typeof x === 'string'
            ? x
            : (x as Record<string, string>)?.kunci_imej_permohonan,
        )
        .filter((x): x is string => !!x)
      // Sepuluh minit — cukup untuk pratonton dan cetak.
      return jawapan({ imej: await tandatanganSemua(kunci, 600) })
    }

    return ralat('Tujuan permintaan tidak dikenali.')
  } catch (e) {
    console.error('r2-tandatangan', e)
    return ralat('Ralat pelayan semasa memproses imej.', 500)
  }
})
