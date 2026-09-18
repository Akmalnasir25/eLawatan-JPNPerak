// ════════════════════════════════════════════════════════════════════
// tetap-kata-laluan — Cipta atau tetapkan semula kata laluan sendiri
//
// Dipanggil selepas pengguna mengesahkan OTP, jadi sesi yang sah sudah
// ada. Dasar kata laluan disemak di sini supaya ia tidak boleh dipintas
// dari pelayar, dan kata laluan ditulis melalui peranan perkhidmatan.
//
// Tiada sesiapa boleh menetapkan kata laluan pengguna lain: fungsi ini
// hanya menyentuh akaun pemilik token yang menghantar permintaan.
// ════════════════════════════════════════════════════════════════════

import { jawapan, kendaliOptions, ralat } from '../_shared/cors.ts'
import { klienPentadbir, semakKataLaluan } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const pra = kendaliOptions(req)
  if (pra) return pra

  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization) return ralat('Tidak dibenarkan.', 401)

    const { kata_laluan } = await req.json()
    if (typeof kata_laluan !== 'string') return ralat('Kata laluan diperlukan.')

    const db = klienPentadbir()
    const token = authorization.replace(/^Bearer\s+/i, '')
    const { data: { user }, error } = await db.auth.getUser(token)
    if (error || !user?.email) return ralat('Sesi tidak sah. Sila minta kod baharu.', 401)

    const { data: pegawai } = await db
      .from('pegawai')
      .select('id, emel, aktif')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!pegawai) return ralat('Akaun ini belum diberikan capaian sistem.', 403)
    if (!pegawai.aktif) return ralat('Akaun ini telah dinyahaktifkan.', 403)

    const masalah = await semakKataLaluan(kata_laluan, user.email)
    if (masalah) return jawapan({ ralat: masalah }, 422)

    const { error: ralatKemas } = await db.auth.admin.updateUserById(user.id, {
      password: kata_laluan,
    })
    if (ralatKemas) {
      console.error('tetap-kata-laluan', ralatKemas)
      return ralat('Gagal menyimpan kata laluan. Sila cuba lagi.', 500)
    }

    await db
      .from('pegawai')
      .update({ kata_laluan_ditetapkan: true, log_masuk_terakhir: new Date().toISOString() })
      .eq('id', pegawai.id)

    await db.from('log_audit').insert({
      pegawai_id: pegawai.id,
      emel_pegawai: pegawai.emel,
      peristiwa: 'KATA_LALUAN_DITETAPKAN',
    })

    // Percubaan gagal sebelum ini dikosongkan supaya sekatan tidak
    // terbawa selepas kata laluan ditetapkan semula.
    await db.rpc('rekod_cubaan', { p_emel: pegawai.emel, p_berjaya: true, p_ip: null })

    return jawapan({ berjaya: true })
  } catch (e) {
    console.error('tetap-kata-laluan', e)
    return ralat('Ralat pelayan semasa menetapkan kata laluan.', 500)
  }
})
