// Pemangku pengesah (KPPD dan Pengarah JPN). Semua peraturan — siapa
// layak, skop, tempoh dan pertindihan — dikuatkuasakan di pangkalan data.

import { supabase } from './supabase'
import type { Pemangkuan, PemangkuanAktif, Peranan } from './jenis'

/** Peranan pengesah yang boleh mempunyai pemangku. */
export const PERANAN_BOLEH_DIPANGKU: Peranan[] = ['ppd_ketua', 'jpn_pengarah']

export type CalonPemangku = { id: string; nama: string; jawatan: string | null; peranan: Peranan; emel: string }

export async function senaraiPemangkuan(): Promise<Pemangkuan[]> {
  const { data, error } = await supabase.rpc('senarai_pemangkuan')
  if (error) throw new Error(error.message)
  return (data ?? []) as Pemangkuan[]
}

export async function calonPemangku(pegawaiAsal?: string | null): Promise<CalonPemangku[]> {
  const { data, error } = await supabase.rpc('calon_pemangku', { p_pegawai_asal: pegawaiAsal ?? null })
  if (error) throw new Error(error.message)
  return (data ?? []) as CalonPemangku[]
}

export async function lantikPemangku(isi: {
  pemangku: string
  tarikh_mula: string
  tarikh_tamat: string
  sebab?: string | null
  pegawai_asal?: string | null
}): Promise<void> {
  const { error } = await supabase.rpc('lantik_pemangku', {
    p_pemangku: isi.pemangku,
    p_tarikh_mula: isi.tarikh_mula,
    p_tarikh_tamat: isi.tarikh_tamat,
    p_sebab: isi.sebab ?? null,
    p_pegawai_asal: isi.pegawai_asal ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function batalPemangku(id: string): Promise<void> {
  const { error } = await supabase.rpc('batal_pemangku', { p_id: id })
  if (error) throw new Error(error.message)
}

export async function pemangkuanSaya(): Promise<PemangkuanAktif[]> {
  const { data, error } = await supabase.rpc('pemangkuan_saya')
  if (error) throw new Error(error.message)
  return (data ?? []) as PemangkuanAktif[]
}
