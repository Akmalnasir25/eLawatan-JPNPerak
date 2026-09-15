// ════════════════════════════════════════════════════════════════════
// r2-naik — Pautan bertandatangan untuk memuat naik dokumen sokongan
//
// Pelayar mengira cincangan SHA-256 dan menghantar fail terus ke
// Cloudflare R2. Fungsi ini hanya mengeluarkan kebenaran — bait fail
// tidak pernah melalui Supabase.
// ════════════════════════════════════════════════════════════════════

import { jawapan, kendaliOptions, ralat } from '../_shared/cors.ts'
import { klienPentadbir, pegawaiSemasa } from '../_shared/supabase.ts'
import { binaKunci, presignNaik } from '../_shared/r2.ts'

type Permintaan = {
  permohonan_id: string
  jenis_dokumen: string
  nama_fail: string
  jenis_mime: string
  saiz: number
}

Deno.serve(async (req) => {
  const pra = kendaliOptions(req)
  if (pra) return pra

  try {
    const pegawai = await pegawaiSemasa(req)
    if (!pegawai) return ralat('Tidak dibenarkan.', 401)

    const badan = (await req.json()) as Permintaan
    const { permohonan_id, jenis_dokumen, nama_fail, jenis_mime, saiz } = badan

    if (!permohonan_id || !jenis_dokumen || !nama_fail || !jenis_mime) {
      return ralat('Maklumat permintaan tidak lengkap.')
    }

    const db = klienPentadbir()

    // Had saiz dan jenis fail — tetapan pentadbir
    const { data: tetapan } = await db
      .from('tetapan').select('nilai').eq('kunci', 'had_fail').maybeSingle()
    const had = (tetapan?.nilai ?? {}) as {
      saiz_maks_mb?: number
      jenis_dibenar?: string[]
    }
    const maksBait = (had.saiz_maks_mb ?? 10) * 1024 * 1024

    if (saiz > maksBait) {
      return ralat(`Saiz fail melebihi had ${had.saiz_maks_mb ?? 10} MB.`, 413)
    }
    if (had.jenis_dibenar?.length && !had.jenis_dibenar.includes(jenis_mime)) {
      return ralat(
        `Jenis fail tidak dibenarkan. Terima: ${had.jenis_dibenar.join(', ')}.`,
        415,
      )
    }

    // Jenis dokumen mesti wujud dan bukan dokumen janaan sistem
    const { data: jenis } = await db
      .from('jenis_dokumen')
      .select('kod, dijana_sistem, aktif')
      .eq('kod', jenis_dokumen)
      .maybeSingle()
    if (!jenis || !jenis.aktif || jenis.dijana_sistem) {
      return ralat('Jenis dokumen tidak sah untuk muat naik.')
    }

    // Keizinan — gunakan semula peraturan yang sama seperti RLS
    const { data: boleh, error: ralatSemak } = await db
      .rpc('boleh_sunting_permohonan_bagi', {
        p_id: permohonan_id,
        p_pegawai_id: pegawai.id,
      })
    if (ralatSemak) {
      console.error('semak keizinan', ralatSemak)
      return ralat('Gagal menyemak keizinan.', 500)
    }
    if (!boleh) {
      return ralat(
        'Permohonan ini tidak boleh disunting oleh akaun anda pada status semasa.',
        403,
      )
    }

    const kunci = binaKunci(permohonan_id, jenis_dokumen, nama_fail)
    const url = await presignNaik(kunci, jenis_mime, 900)

    return jawapan({ url, kunci_r2: kunci, tamat_dalam_saat: 900 })
  } catch (e) {
    console.error('r2-naik', e)
    return ralat('Ralat pelayan semasa menyediakan pautan muat naik.', 500)
  }
})
