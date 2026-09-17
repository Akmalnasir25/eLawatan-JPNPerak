// ════════════════════════════════════════════════════════════════════
// daftar-semak — Langkah 1–5 aliran pendaftaran sekolah
//
// Padankan e-mel dengan senarai sekolah JPN sebelum sebarang kod OTP
// dihantar. Senarai JPN menentukan e-mel mana yang SAH; OTP Supabase Auth
// kemudian membuktikan siapa yang benar-benar memegangnya.
//
// Terbuka kepada anon — ia mendahului log masuk.
// ════════════════════════════════════════════════════════════════════

import { jawapan, kendaliOptions, ralat } from '../_shared/cors.ts'
import { domainDibenarkan, klienPentadbir } from '../_shared/supabase.ts'

// Pendikit ringkas dalam memori setiap isihan. Cloudflare/Supabase
// menyediakan had kadar di hadapan; ini hanya menahan gelung pantas.
const jejak = new Map<string, { bil: number; sehingga: number }>()
const HAD = 8
const TETINGKAP_MS = 60_000

function terlalu_kerap(kunci: string): boolean {
  const kini = Date.now()
  const rekod = jejak.get(kunci)
  if (!rekod || rekod.sehingga < kini) {
    jejak.set(kunci, { bil: 1, sehingga: kini + TETINGKAP_MS })
    return false
  }
  rekod.bil += 1
  return rekod.bil > HAD
}

Deno.serve(async (req) => {
  const pra = kendaliOptions(req)
  if (pra) return pra

  try {
    const { emel } = await req.json()
    if (typeof emel !== 'string' || !emel.includes('@')) {
      return ralat('Alamat e-mel tidak sah.')
    }

    const ip = req.headers.get('x-forwarded-for') ?? 'tanpa-ip'
    if (terlalu_kerap(ip)) {
      return ralat('Terlalu banyak cubaan. Sila cuba lagi sebentar nanti.', 429)
    }

    const bersih = emel.trim().toLowerCase()
    const domain = bersih.split('@')[1] ?? ''

    // Langkah 2 — semak domain
    if (!domainDibenarkan().includes(domain)) {
      return jawapan({
        status: 'DOMAIN_TIDAK_SAH',
        mesej: `Hanya e-mel domain ${domainDibenarkan().join(' atau ')} diterima.`,
      })
    }

    const db = klienPentadbir()

    // Langkah 3 — semak sama ada sudah berdaftar
    const { data: pegawai } = await db
      .from('pegawai')
      .select('nama, peranan, kod_skop, jawatan, user_id, aktif')
      .ilike('emel', bersih)
      .maybeSingle()

    if (pegawai && pegawai.user_id) {
      if (!pegawai.aktif) {
        return jawapan({
          status: 'AKAUN_TIDAK_AKTIF',
          mesej: 'Akaun ini telah dinyahaktifkan. Sila hubungi pentadbir sistem.',
        })
      }
      return jawapan({
        status: 'SUDAH_BERDAFTAR',
        mesej: 'E-mel ini sudah berdaftar. Sila log masuk terus.',
        peranan: pegawai.peranan,
      })
    }

    // Pegawai yang telah didaftarkan pentadbir tetapi belum pernah log masuk
    if (pegawai && !pegawai.user_id) {
      return jawapan({
        status: 'PEGAWAI_MENUNGGU',
        mesej: 'Akaun pegawai dijumpai. Kod pengesahan akan dihantar.',
        pegawai: {
          nama: pegawai.nama,
          peranan: pegawai.peranan,
          jawatan: pegawai.jawatan,
          kod_skop: pegawai.kod_skop,
        },
      })
    }

    // Langkah 4 — padankan dengan senarai sekolah JPN
    const { data: sekolah } = await db
      .from('sekolah')
      .select('kod_sekolah, nama, jenis, kod_ppd, kod_jpn, negeri, aktif, ppd(nama)')
      .ilike('emel', bersih)
      .maybeSingle()

    if (!sekolah) {
      return jawapan({
        status: 'TIADA_DALAM_SENARAI',
        mesej:
          'E-mel ini tiada dalam senarai sekolah JPN. Sila hubungi pentadbir sistem.',
      })
    }

    if (!sekolah.aktif) {
      return jawapan({
        status: 'SEKOLAH_TIDAK_AKTIF',
        mesej: 'Rekod sekolah ini tidak aktif. Sila hubungi pentadbir sistem.',
      })
    }

    // PostgREST memulangkan objek bagi hubungan banyak-ke-satu, tetapi
    // klien tanpa jenis menganggapnya tatasusunan. Terima kedua-duanya.
    const embed = sekolah.ppd as unknown as { nama: string } | { nama: string }[] | null
    const namaPpd = (Array.isArray(embed) ? embed[0]?.nama : embed?.nama) ?? sekolah.kod_ppd

    // Langkah 5 — papar padanan; sekolah tidak boleh mengubahnya
    return jawapan({
      status: 'PADANAN_DIJUMPAI',
      mesej: 'Padanan dijumpai. Sahkan maklumat di bawah sebelum meneruskan.',
      sekolah: {
        kod_sekolah: sekolah.kod_sekolah,
        nama: sekolah.nama,
        jenis: sekolah.jenis,
        kod_ppd: sekolah.kod_ppd,
        nama_ppd: namaPpd,
        kod_jpn: sekolah.kod_jpn,
        negeri: sekolah.negeri,
      },
    })
  } catch (e) {
    console.error('daftar-semak', e)
    return ralat('Ralat pelayan semasa menyemak pendaftaran.', 500)
  }
})
