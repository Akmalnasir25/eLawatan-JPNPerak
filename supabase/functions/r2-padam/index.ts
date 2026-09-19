// ════════════════════════════════════════════════════════════════════
// r2-padam — Buang dokumen daripada R2 dan daripada pangkalan data
//
// Hanya sekolah pemilik semasa permohonan masih DRAF atau DIKEMBALIKAN,
// atau pentadbir sistem. Pemadaman dicatat dalam log audit.
// ════════════════════════════════════════════════════════════════════

import { jawapan, kendaliOptions, ralat } from '../_shared/cors.ts'
import { klienPentadbir, pegawaiSemasa } from '../_shared/supabase.ts'
import { padamObjek } from '../_shared/storan.ts'

Deno.serve(async (req) => {
  const pra = kendaliOptions(req)
  if (pra) return pra

  try {
    const pegawai = await pegawaiSemasa(req)
    if (!pegawai) return ralat('Tidak dibenarkan.', 401)

    const { dokumen_id } = await req.json()
    if (!dokumen_id) return ralat('dokumen_id diperlukan.')

    const db = klienPentadbir()
    const { data: dok } = await db
      .from('dokumen')
      .select('id, permohonan_id, kunci_r2, nama_fail, jenis_dokumen')
      .eq('id', dokumen_id)
      .maybeSingle()

    if (!dok) return ralat('Dokumen tidak dijumpai.', 404)

    const { data: boleh } = await db.rpc('boleh_sunting_permohonan_bagi', {
      p_id: dok.permohonan_id,
      p_pegawai_id: pegawai.id,
    })
    if (!boleh) {
      return ralat(
        'Dokumen tidak boleh dipadam pada status permohonan semasa.',
        403,
      )
    }

    const dibuang = await padamObjek(dok.kunci_r2)
    if (!dibuang) return ralat('Gagal memadam fail daripada storan.', 502)

    await db.from('dokumen').delete().eq('id', dok.id)

    await db.from('log_audit').insert({
      permohonan_id: dok.permohonan_id,
      pegawai_id: pegawai.id,
      emel_pegawai: pegawai.emel,
      peristiwa: 'DOKUMEN_DIPADAM',
      nilai_lama: {
        dokumen_id: dok.id,
        nama_fail: dok.nama_fail,
        jenis_dokumen: dok.jenis_dokumen,
      },
    })

    return jawapan({ berjaya: true })
  } catch (e) {
    console.error('r2-padam', e)
    return ralat('Ralat pelayan semasa memadam dokumen.', 500)
  }
})
