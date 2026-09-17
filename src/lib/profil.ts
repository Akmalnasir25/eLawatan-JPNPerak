// Profil akaun, tandatangan digital dan cop rasmi.

import { hantarFail, panggilFungsi, supabase } from './supabase'
import type { Pegawai } from './jenis'

export type JenisImej = 'tandatangan' | 'cop'

const MIME_DIBENAR = ['image/png', 'image/jpeg', 'image/webp']
export const SAIZ_IMEJ_MAKS = 1024 * 1024

export async function kemasProfil(isi: {
  nama?: string | null
  jawatan?: string | null
  telefon?: string | null
  nama_pemohon?: string | null
  nama_guru_besar?: string | null
}): Promise<Pegawai> {
  const { data, error } = await supabase.rpc('kemas_profil', {
    p_nama: isi.nama ?? null,
    p_jawatan: isi.jawatan ?? null,
    p_telefon: isi.telefon ?? null,
    p_nama_pemohon: isi.nama_pemohon ?? null,
    p_nama_guru_besar: isi.nama_guru_besar ?? null,
  })
  if (error) throw new Error(error.message)
  return data as Pegawai
}

/** Muat naik imej baharu dan jadikan ia imej semasa profil. */
export async function muatNaikImejProfil(jenis: JenisImej, fail: File): Promise<void> {
  if (!MIME_DIBENAR.includes(fail.type)) {
    throw new Error('Hanya imej PNG, JPEG atau WebP diterima. PNG berlatar lutsinar paling sesuai.')
  }
  if (fail.size > SAIZ_IMEJ_MAKS) {
    throw new Error('Saiz imej mesti tidak melebihi 1 MB.')
  }
  const { url, kunci_r2 } = await panggilFungsi<{ url: string; kunci_r2: string }>(
    'r2-tandatangan',
    { tujuan: 'naik', jenis, jenis_mime: fail.type, saiz: fail.size },
  )
  await hantarFail(url, fail, () => {})
  await tetapkanImej(jenis, kunci_r2)
}

/**
 * Buang imej daripada profil. Fail dalam storan TIDAK dipadam kerana
 * dokumen yang sudah ditandatangani masih merujuknya.
 */
export const buangImejProfil = (jenis: JenisImej) => tetapkanImej(jenis, null)

async function tetapkanImej(jenis: JenisImej, kunci: string | null) {
  const { error } = await supabase.rpc('tetapkan_imej_profil', {
    p_jenis: jenis,
    p_kunci: kunci,
  })
  if (error) throw new Error(error.message)
}

type PetaImej = Record<string, string>

export async function imejProfilSendiri(): Promise<PetaImej> {
  const r = await panggilFungsi<{ imej: PetaImej }>('r2-tandatangan', { tujuan: 'profil' })
  return r.imej
}

/** Pautan imej tandatangan dan cop yang dibekukan pada satu permohonan. */
export async function imejCetak(permohonanId: string): Promise<PetaImej> {
  const r = await panggilFungsi<{ imej: PetaImej }>('r2-tandatangan', {
    tujuan: 'cetak',
    permohonan_id: permohonanId,
  })
  return r.imej
}
