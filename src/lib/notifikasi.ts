// Notifikasi dalam sistem. Baris dicipta oleh pencetus pangkalan data;
// klien hanya membaca milik sendiri (RLS) dan menandanya dibaca.

import { supabase } from './supabase'
import type { Notifikasi } from './jenis'

export async function senaraiNotifikasi(had = 20): Promise<Notifikasi[]> {
  const { data, error } = await supabase
    .from('notifikasi')
    .select('id,pegawai_id,permohonan_id,jenis,tajuk,mesej,pautan,dicipta_pada,dibaca_pada')
    .order('dicipta_pada', { ascending: false })
    .limit(had)
  if (error) throw new Error(error.message)
  return (data ?? []) as Notifikasi[]
}

export async function kiraanBelumBaca(): Promise<number> {
  const { data, error } = await supabase.rpc('kiraan_notifikasi_belum_baca')
  if (error) throw new Error(error.message)
  return Number(data ?? 0)
}

/** Tanda satu notifikasi, atau semua jika id tidak diberi. */
export async function tandaiDibaca(id?: number): Promise<void> {
  const { error } = await supabase.rpc('tandai_notifikasi_dibaca', { p_id: id ?? null })
  if (error) throw new Error(error.message)
}

/** Pentadbir: jalankan peringatan had masa, tarikh tutup dan laporan pasca sekarang. */
export async function janaPeringatan(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('jana_peringatan_pentadbir')
  if (error) throw new Error(error.message)
  return data as Record<string, number>
}
