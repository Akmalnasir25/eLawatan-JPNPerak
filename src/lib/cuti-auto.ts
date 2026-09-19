import { supabase } from './supabase'
import { CUTI_PERAK, type CutiKalendar } from './cuti-kalendar'

export type RekodCuti = { id: string; nama: string; mula: string; tamat: string; amaran: string[] }
export type CalonCuti = {
  tahun: number; jenis: 'umum' | 'sekolah'; id: string; data: RekodCuti; versi: string
  keputusan: 'menunggu' | 'diterima' | 'ditolak'; diterbitkan: RekodCuti | null
  disahkan_pada: string | null; dilihat_pada: string
}
export type CutiDiterima = Pick<CalonCuti, 'tahun' | 'jenis' | 'disahkan_pada'> & { data: RekodCuti }
export type StatusCuti = {
  kerja: { cubaan_pada: string | null; selesai_pada: string | null; sedang_berjalan: boolean }
  sumber: { tahun: number; jenis: 'umum' | 'sekolah'; cubaan_pada: string; berjaya_pada: string | null; status: 'berjaya' | 'belum_tersedia' | 'gagal'; mesej: string | null }[]
  calon: CalonCuti[]
}

export async function bacaCuti(dari: number, hingga: number): Promise<CutiDiterima[]> {
  const { data, error } = await supabase.rpc('cuti_diterima', { p_dari: dari, p_hingga: hingga })
  if (error) throw new Error('Kemas kini cuti belum dapat dimuatkan. Semak sambungan atau log masuk semula, kemudian cuba lagi.')
  return data as CutiDiterima[]
}

export async function statusCuti(): Promise<StatusCuti> {
  const { data, error } = await supabase.rpc('status_cuti_admin')
  if (error) throw new Error(error.message)
  return data as StatusCuti
}

export async function putuskanCuti(c: CalonCuti, terima: boolean): Promise<void> {
  const { error } = await supabase.rpc('putuskan_cuti', {
    p_tahun: c.tahun, p_jenis: c.jenis, p_id: c.id, p_versi: c.versi, p_terima: terima,
  })
  if (error) throw new Error(error.message)
}

export async function tarikBalikCuti(c: CalonCuti): Promise<void> {
  const { error } = await supabase.rpc('tarik_balik_cuti', {
    p_tahun: c.tahun, p_jenis: c.jenis, p_id: c.id, p_versi: c.versi,
  })
  if (error) throw new Error(error.message)
}

/** Rujukan rasmi 2026 kekal. Padanan jenis/julat tidak menggandakan label. */
export function gabungCuti(rekod: CutiDiterima[]): CutiKalendar[] {
  const hasil = [...CUTI_PERAK]
  for (const c of rekod) {
    if (CUTI_PERAK.some((asal) => asal.jenis === c.jenis && asal.mula === c.data.mula && asal.tamat === c.data.tamat)) continue
    if (!hasil.some((r) => r.jenis === c.jenis && r.mula === c.data.mula && r.tamat === c.data.tamat && r.nama === c.data.nama)) {
      hasil.push({ ...c.data, jenis: c.jenis, sumber: 'api' })
    }
  }
  return hasil
}
