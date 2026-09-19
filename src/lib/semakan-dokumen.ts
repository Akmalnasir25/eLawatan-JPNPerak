import { supabase } from './supabase'
import type { Dokumen, Pegawai, Peranan, Permohonan } from './jenis'

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
  const semua: SemakanDokumen[] = []
  for (let mula = 0; ; mula += 500) {
    const { data, error } = await supabase.from('semakan_dokumen').select('*')
      .eq('permohonan_id', id).order('masa', { ascending: false })
      .order('id', { ascending: true }).range(mula, mula + 499)
    if (error) throw new Error('Rekod semakan belum dapat dimuatkan. Sila cuba lagi; pastikan pangkalan data telah dikemas kini.')
    const baris = (data ?? []) as SemakanDokumen[]
    semua.push(...baris)
    if (baris.length < 500) return semua
  }
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

export function penyemakBagiPengesah(peranan: Peranan) {
  if (peranan === 'ppd_ketua') return 'ppd_pegawai'
  if (peranan === 'jpn_pengarah') return 'jpn_pegawai'
  return null
}

/** JPN membaca semakan PPD bagi urusan daerah atau permohonan yang masih di PPD. */
export function paparanRujukanPPD(peranan: Peranan, p: Pick<Permohonan, 'kategori' | 'status'>) {
  return (peranan === 'jpn_pegawai' || peranan === 'jpn_pengarah') &&
    (p.kategori === 'DALAM_DAERAH' || p.status === 'MENUNGGU_PPD_SEMAK' || p.status === 'MENUNGGU_PPD_SAH')
}

/** Pengesah membaca keputusan penyemak peringkatnya, bukan status dirinya.
 * Pembukaan selepas keputusan tidak menukar warna; versi fail mesti sepadan.
 */
export function semakanUntukPaparan(rekod: SemakanDokumen[], d: Dokumen, pegawai: Pick<Pegawai, 'id' | 'peranan'>, rujukanPPD = false) {
  // Pemohon melihat keputusan pegawai terkini untuk versi fail ini.
  // Membuka fail sendiri atau pembukaan pegawai bukan keputusan semakan.
  if (pegawai.peranan === 'sekolah') {
    return rekod.filter((r) => r.dokumen_id === d.id &&
      r.cincangan_sha256 === d.cincangan_sha256 &&
      (r.peranan === 'ppd_pegawai' || r.peranan === 'jpn_pegawai') && r.status !== 'DIBUKA')
      .sort((a, b) => b.masa.localeCompare(a.masa) || a.id.localeCompare(b.id))[0]
  }
  const peranan = rujukanPPD && (pegawai.peranan === 'jpn_pegawai' || pegawai.peranan === 'jpn_pengarah')
    ? 'ppd_pegawai' : penyemakBagiPengesah(pegawai.peranan)
  if (!peranan) return semakanSendiri(rekod, d, pegawai.id)
  const sepadan = rekod.filter((r) => r.dokumen_id === d.id &&
    r.cincangan_sha256 === d.cincangan_sha256 && r.peranan === peranan)
    .sort((a, b) => b.masa.localeCompare(a.masa) || a.id.localeCompare(b.id))
  return sepadan.find((r) => r.status !== 'DIBUKA') ?? sepadan[0]
}
