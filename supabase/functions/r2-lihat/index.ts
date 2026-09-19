// ════════════════════════════════════════════════════════════════════
// r2-lihat — Pautan bertandatangan berumur pendek untuk memapar dokumen
//
// Pegawai mana-mana peringkat dalam skopnya boleh melihat; pautan
// tamat dalam lima minit supaya ia tidak boleh diedarkan semula.
// ════════════════════════════════════════════════════════════════════

import { jawapan, kendaliOptions, ralat } from '../_shared/cors.ts'
import { klienPentadbir, pegawaiSemasa } from '../_shared/supabase.ts'
import { presignLihat } from '../_shared/storan.ts'

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
      .select('id, permohonan_id, kunci_r2, nama_fail, jenis_mime, saiz, cincangan_sha256, dimuat_naik_pada')
      .eq('id', dokumen_id)
      .maybeSingle()

    if (!dok) return ralat('Dokumen tidak dijumpai.', 404)

    const { data: boleh } = await db.rpc('boleh_lihat_permohonan_bagi', {
      p_id: dok.permohonan_id,
      p_pegawai_id: pegawai.id,
    })
    if (!boleh) return ralat('Dokumen ini di luar skop capaian anda.', 403)

    const url = await presignLihat(dok.kunci_r2, dok.nama_fail, 300)

    // Capaian dokumen murid dicatat — data peribadi, bukan fail biasa.
    await db.from('log_audit').insert({
      permohonan_id: dok.permohonan_id,
      pegawai_id: pegawai.id,
      emel_pegawai: pegawai.emel,
      peristiwa: 'DOKUMEN_DILIHAT',
      nilai_baharu: { dokumen_id: dok.id, nama_fail: dok.nama_fail },
    })

    return jawapan({
      url,
      tamat_dalam_saat: 300,
      dokumen: {
        nama_fail: dok.nama_fail,
        jenis_mime: dok.jenis_mime,
        saiz: dok.saiz,
        cincangan_sha256: dok.cincangan_sha256,
        dimuat_naik_pada: dok.dimuat_naik_pada,
      },
    })
  } catch (e) {
    console.error('r2-lihat', e)
    return ralat('Ralat pelayan semasa menyediakan pautan dokumen.', 500)
  }
})
