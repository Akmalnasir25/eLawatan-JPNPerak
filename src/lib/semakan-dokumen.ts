import { supabase } from './supabase'
import type { Dokumen, Peranan } from './jenis'

export type StatusSemakan = 'DIBUKA' | 'PATUH' | 'PEMBETULAN'
export type SemakanDokumen = {
  id: string
  permohonan_id: string
  dokumen_id: string
  cincangan_sha256: string
  nama_fail: string
  pegawai_id: string
  nama_pegawai: string
  peranan: Peranan
  status: StatusSemakan
  catatan: string
  masa: string
}

export const LABEL_SEMAKAN = {
  DIBUKA: 'Dibuka · belum selesai semakan',
  PATUH: 'Jelas dan patuh',
  PEMBETULAN: 'Perlu pembetulan',
}

export async function senaraiSemakanDokumen(id: string): Promise<SemakanDokumen[]> {
  const { data, error } = await supabase.from('semakan_dokumen').select('*')
    .eq('permohonan_id', id).order('masa', { ascending: false })
  if (error) throw new Error('Rekod semakan belum dapat dimuatkan. Sila cuba lagi; pastikan pangkalan data telah dikemas kini.')
  return (data ?? []) as SemakanDokumen[]
}

export async function rekodSemakanDokumen(d: Dokumen, status: StatusSemakan, catatan = ''): Promise<SemakanDokumen> {
  const { data, error } = await supabase.rpc('rekod_semakan_dokumen', {
    p_dokumen_id: d.id, p_cincangan: d.cincangan_sha256, p_status: status, p_catatan: catatan,
  })
  if (error) throw new Error('Semakan tidak disimpan. Pastikan sesi dan giliran semakan masih sah, kemudian cuba lagi. Catatan anda dikekalkan.')
  return data as SemakanDokumen
}

/** Senarai sudah disusun terbaru dahulu. Membuka semula tidak memadam keputusan. */
export function semakanSendiri(rekod: SemakanDokumen[], d: Dokumen, pegawaiId: string) {
  const sendiri = rekod.filter((r) => r.dokumen_id === d.id &&
    r.cincangan_sha256 === d.cincangan_sha256 && r.pegawai_id === pegawaiId)
  return sendiri.find((r) => r.status !== 'DIBUKA') ?? sendiri[0]
}
