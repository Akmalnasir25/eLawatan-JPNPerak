// Pendaftaran pegawai, log masuk kata laluan dan penetapan kata laluan.

import { panggilFungsi, supabase } from './supabase'
import type { Pegawai, Peranan } from './jenis'

export const PANJANG_KATA_LALUAN = 12

export type Sekatan = {
  disekat: boolean
  cubaan_gagal: number
  baki_cubaan: number
  saat_lagi: number
  had: number
}

export type SemakanEmel = {
  status:
    | 'DOMAIN_TIDAK_SAH'
    | 'TIADA_DALAM_SENARAI'
    | 'AKAUN_TIDAK_AKTIF'
    | 'SEKOLAH_TIDAK_AKTIF'
    | 'PADANAN_DIJUMPAI'
    | 'PERLU_KATA_LALUAN'
    | 'ADA_KATA_LALUAN'
  mesej: string
  pernah_masuk?: boolean
  sekatan?: Sekatan
  pegawai?: { nama: string; peranan: Peranan; jawatan: string | null; kod_skop: string | null }
  sekolah?: {
    kod_sekolah: string
    nama: string
    jenis: string
    kod_ppd: string
    nama_ppd: string
    kod_jpn: string
    negeri: string
  }
}

export const semakEmel = (emel: string) =>
  panggilFungsi<SemakanEmel>('daftar-semak', { emel: emel.trim().toLowerCase() })

/**
 * Log masuk melalui Edge Function supaya sekatan selepas percubaan gagal
 * dikuatkuasakan di sisi pelayan, kemudian sesi dipasang dalam pelayar.
 */
export async function logMasukKataLaluan(emel: string, kataLaluan: string): Promise<void> {
  const r = await panggilFungsi<{ sesi: { access_token: string; refresh_token: string } }>(
    'log-masuk',
    { emel: emel.trim().toLowerCase(), kata_laluan: kataLaluan },
  )
  const { error } = await supabase.auth.setSession(r.sesi)
  if (error) throw new Error(error.message)
}

/** Dipanggil selepas OTP disahkan; sesi semasa milik pengguna sendiri. */
export async function tetapKataLaluan(kataLaluan: string): Promise<void> {
  await panggilFungsi<{ berjaya: boolean }>('tetap-kata-laluan', { kata_laluan: kataLaluan })
}

/** Panduan kekuatan untuk pengguna. Dasar sebenar disemak di pelayan. */
export function kekuatanKataLaluan(k: string): { skor: 0 | 1 | 2 | 3; label: string } {
  if (k.length < PANJANG_KATA_LALUAN) return { skor: 0, label: `Minimum ${PANJANG_KATA_LALUAN} aksara` }
  const jenis = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(k)).length
  if (k.length >= 16 && jenis >= 3) return { skor: 3, label: 'Kuat' }
  if (jenis >= 2) return { skor: 2, label: 'Sederhana' }
  return { skor: 1, label: 'Lemah — campurkan huruf, nombor atau simbol' }
}

// ── Urus pegawai dalam skop sendiri ───────────────────────────────

export async function daftarPegawai(isi: {
  nama: string
  emel: string
  peranan: Peranan
  jawatan?: string | null
  kod_skop?: string | null
}): Promise<Pegawai> {
  const { data, error } = await supabase.rpc('daftar_pegawai', {
    p_nama: isi.nama,
    p_emel: isi.emel,
    p_peranan: isi.peranan,
    p_jawatan: isi.jawatan ?? null,
    p_kod_skop: isi.kod_skop ?? null,
  })
  if (error) throw new Error(error.message)
  return data as Pegawai
}

export async function senaraiPegawaiSkop(): Promise<Pegawai[]> {
  const { data, error } = await supabase.rpc('senarai_pegawai_skop')
  if (error) throw new Error(error.message)
  return (data ?? []) as Pegawai[]
}

/** Nama dan jawatan boleh disunting bila-bila masa; e-mel hanya sebelum
 *  pegawai log masuk kali pertama (dikuatkuasakan di pangkalan data). */
export async function kemaskiniPegawai(
  id: string,
  isi: { nama: string; jawatan?: string | null; emel?: string | null },
): Promise<Pegawai> {
  const { data, error } = await supabase.rpc('kemaskini_pegawai', {
    p_id: id,
    p_nama: isi.nama,
    p_jawatan: isi.jawatan ?? null,
    p_emel: isi.emel ?? null,
  })
  if (error) throw new Error(error.message)
  return data as Pegawai
}

export async function tukarStatusPegawai(id: string, aktif: boolean): Promise<Pegawai> {
  const { data, error } = await supabase.rpc('tukar_status_pegawai', {
    p_id: id,
    p_aktif: aktif,
  })
  if (error) throw new Error(error.message)
  return data as Pegawai
}

/** Peranan yang boleh didaftarkan oleh peranan tertentu — sepadan dengan
 *  peranan_boleh_daftar() di pangkalan data. Antara muka sahaja; pangkalan
 *  data tetap menolak percubaan yang tidak sah. */
export function perananBolehDaftar(peranan: Peranan): Peranan[] {
  switch (peranan) {
    case 'admin':
      return ['sekolah', 'ppd_pegawai', 'ppd_ketua', 'jpn_pegawai', 'jpn_pengarah', 'kpm', 'admin']
    case 'jpn_pengarah':
    case 'jpn_pegawai':
      return ['jpn_pegawai']
    case 'ppd_ketua':
    case 'ppd_pegawai':
      return ['ppd_pegawai']
    case 'sekolah':
      return ['sekolah']
    default:
      return []
  }
}
