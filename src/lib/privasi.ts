// Notis privasi (PDPA 2010) dan tempoh simpanan rekod.

import { supabase } from './supabase'

/**
 * Versi notis privasi semasa. Tukar nilai ini apabila kandungan notis
 * dipinda — setiap pengguna akan diminta bersetuju semula.
 */
export const VERSI_PRIVASI = '2026-09-18'

export async function setujuPrivasi(): Promise<void> {
  const { error } = await supabase.rpc('setuju_privasi', { p_versi: VERSI_PRIVASI })
  if (error) throw new Error(error.message)
}

export type RekodLuput = {
  id: string
  no_rujukan: string | null
  status: string
  nama_sekolah: string
  tujuan: string | null
  tarikh_mula: string | null
  dikemaskini_pada: string
  bil_peserta: number
  bil_dokumen: number
}

export async function rekodLuput(): Promise<RekodLuput[]> {
  const { data, error } = await supabase.rpc('rekod_luput')
  if (error) throw new Error(error.message)
  return (data ?? []) as RekodLuput[]
}

/** Padam data peribadi peserta; pulangkan id dokumen untuk dipadam dari R2. */
export async function anonimkanPermohonan(id: string): Promise<{ bil_peserta: number; dokumen: string[] }> {
  const { data, error } = await supabase.rpc('anonimkan_permohonan', { p_id: id })
  if (error) throw new Error(error.message)
  return data as { bil_peserta: number; dokumen: string[] }
}
