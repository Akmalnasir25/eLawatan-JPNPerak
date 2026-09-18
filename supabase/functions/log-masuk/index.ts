// ════════════════════════════════════════════════════════════════════
// log-masuk — Log masuk kata laluan dengan sekatan sementara
//
// Log masuk melalui fungsi ini, bukan terus dari pelayar, supaya sekatan
// selepas percubaan gagal berulang dikuatkuasakan di sisi pelayan dan
// tidak boleh dipintas dengan mengubah kod pelayar.
//
// Mesej ralat sengaja tidak membezakan "e-mel tidak wujud" daripada
// "kata laluan salah", supaya tiada sesiapa boleh menguji e-mel mana
// yang berdaftar.
// ════════════════════════════════════════════════════════════════════

import { jawapan, kendaliOptions, ralat } from '../_shared/cors.ts'
import { klienAnon, klienPentadbir } from '../_shared/supabase.ts'

type Sekatan = {
  disekat: boolean
  cubaan_gagal: number
  baki_cubaan: number
  saat_lagi: number
  had: number
}

const MESEJ_GAGAL = 'E-mel atau kata laluan tidak betul.'

function minit(saat: number): string {
  const m = Math.ceil(saat / 60)
  return m <= 1 ? 'seminit' : `${m} minit`
}

Deno.serve(async (req) => {
  const pra = kendaliOptions(req)
  if (pra) return pra

  try {
    const { emel, kata_laluan } = await req.json()
    if (typeof emel !== 'string' || typeof kata_laluan !== 'string') {
      return ralat('Permintaan tidak lengkap.')
    }
    const bersih = emel.trim().toLowerCase()
    const ip = req.headers.get('x-forwarded-for') ?? null

    const db = klienPentadbir()

    const { data: sekatan } = await db.rpc('status_sekatan', { p_emel: bersih })
    const s = sekatan as Sekatan | null
    if (s?.disekat) {
      return jawapan(
        {
          ralat: `Akaun disekat sementara selepas ${s.had} percubaan gagal. Cuba lagi dalam ${minit(s.saat_lagi)}.`,
          disekat: true,
          saat_lagi: s.saat_lagi,
        },
        429,
      )
    }

    const { data, error } = await klienAnon().auth.signInWithPassword({
      email: bersih,
      password: kata_laluan,
    })

    if (error || !data.session) {
      await db.rpc('rekod_cubaan', { p_emel: bersih, p_berjaya: false, p_ip: ip })
      const { data: selepas } = await db.rpc('status_sekatan', { p_emel: bersih })
      const t = selepas as Sekatan | null
      if (t?.disekat) {
        return jawapan(
          {
            ralat: `Akaun disekat sementara selepas ${t.had} percubaan gagal. Cuba lagi dalam ${minit(t.saat_lagi)}.`,
            disekat: true,
            saat_lagi: t.saat_lagi,
          },
          429,
        )
      }
      return jawapan(
        {
          ralat: MESEJ_GAGAL,
          baki_cubaan: t?.baki_cubaan ?? null,
        },
        401,
      )
    }

    // Akaun yang dinyahaktifkan tidak boleh masuk walaupun kata laluan betul.
    const { data: pegawai } = await db
      .from('pegawai')
      .select('aktif')
      .eq('user_id', data.user?.id ?? '')
      .maybeSingle()

    if (pegawai && !pegawai.aktif) {
      await klienAnon().auth.signOut()
      return jawapan(
        { ralat: 'Akaun ini telah dinyahaktifkan. Sila hubungi pentadbir sistem.' },
        403,
      )
    }

    await db.rpc('rekod_cubaan', { p_emel: bersih, p_berjaya: true, p_ip: ip })

    return jawapan({
      sesi: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    })
  } catch (e) {
    console.error('log-masuk', e)
    return ralat('Ralat pelayan semasa log masuk.', 500)
  }
})
