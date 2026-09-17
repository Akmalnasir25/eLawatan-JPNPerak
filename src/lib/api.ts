// Lapisan capaian data. RLS menguatkuasakan skop — pertanyaan di sini
// tidak menapis mengikut daerah atau negeri, pangkalan data yang buat.

import { supabase } from './supabase'
import type {
  Dokumen,
  JenisDokumen,
  Kelengkapan,
  Kelulusan,
  LaporanPasca,
  LogAudit,
  Pegawai,
  Penaja,
  Peringkat,
  Permohonan,
  PermohonanRingkas,
  Peserta,
  Ppd,
  Sekolah,
  Status,
  Tempat,
  Tindakan,
} from './jenis'

function semak<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message)
  return data as T
}

// ── Permohonan ────────────────────────────────────────────────────

export async function senaraiPermohonan(tapis?: {
  status?: Status[]
  kodSekolah?: string
  carian?: string
  had?: number
}): Promise<PermohonanRingkas[]> {
  let q = supabase
    .from('v_permohonan_ringkas')
    .select('*')
    .order('dikemaskini_pada', { ascending: false, nullsFirst: false })
    .order('dicipta_pada', { ascending: false })
    .limit(tapis?.had ?? 200)

  if (tapis?.status?.length) q = q.in('status', tapis.status)
  if (tapis?.kodSekolah) q = q.eq('kod_sekolah', tapis.kodSekolah)
  if (tapis?.carian) {
    const c = `%${tapis.carian}%`
    q = q.or(`no_rujukan.ilike.${c},tujuan.ilike.${c},nama_sekolah.ilike.${c}`)
  }

  const { data, error } = await q
  return semak(data, error) as PermohonanRingkas[]
}

export type BundelPermohonan = {
  permohonan: Permohonan
  sekolah: Sekolah
  ppd: Ppd | null
  tempat: Tempat[]
  peringkat: Peringkat[]
  penaja: Penaja[]
  peserta: Peserta[]
  dokumen: Dokumen[]
  kelulusan: Kelulusan[]
  laporan: LaporanPasca | null
  kodQr: string | null
}

export async function dapatPermohonan(id: string): Promise<BundelPermohonan> {
  const { data: p, error } = await supabase
    .from('permohonan').select('*').eq('id', id).single()
  const permohonan = semak(p, error) as Permohonan

  const [sk, pd, tp, pr, pj, ps, dk, kl, lp, qr] = await Promise.all([
    supabase.from('sekolah').select('*').eq('kod_sekolah', permohonan.kod_sekolah).single(),
    supabase.from('ppd').select('*').eq('kod_ppd', permohonan.kod_ppd).maybeSingle(),
    supabase.from('permohonan_tempat').select('*').eq('permohonan_id', id).order('susunan'),
    supabase.from('permohonan_peringkat').select('*').eq('permohonan_id', id).order('susunan'),
    supabase.from('permohonan_penaja').select('*').eq('permohonan_id', id).order('susunan'),
    supabase.from('peserta').select('*').eq('permohonan_id', id).order('kategori').order('susunan'),
    supabase.from('dokumen').select('*').eq('permohonan_id', id),
    supabase.from('kelulusan').select('*').eq('permohonan_id', id).order('tarikh_tindakan'),
    supabase.from('laporan_pasca').select('*').eq('permohonan_id', id).maybeSingle(),
    supabase.from('pengesahan_qr').select('kod').eq('permohonan_id', id).maybeSingle(),
  ])

  return {
    permohonan,
    sekolah: sk.data as Sekolah,
    ppd: (pd.data as Ppd) ?? null,
    tempat: (tp.data ?? []) as Tempat[],
    peringkat: (pr.data ?? []) as Peringkat[],
    penaja: (pj.data ?? []) as Penaja[],
    peserta: (ps.data ?? []) as Peserta[],
    dokumen: (dk.data ?? []) as Dokumen[],
    kelulusan: (kl.data ?? []) as Kelulusan[],
    laporan: (lp.data as LaporanPasca) ?? null,
    kodQr: (qr.data as { kod: string } | null)?.kod ?? null,
  }
}

export async function ciptaPermohonan(
  sekolah: Sekolah,
  pegawaiId: string | null,
  nisbahKategori: string,
): Promise<Permohonan> {
  const { data, error } = await supabase
    .from('permohonan')
    .insert({
      kod_sekolah: sekolah.kod_sekolah,
      kod_ppd: sekolah.kod_ppd,
      kod_jpn: sekolah.kod_jpn,
      status: 'DRAF',
      nisbah_kategori: nisbahKategori,
      dicipta_oleh: pegawaiId,
    })
    .select()
    .single()
  return semak(data, error) as Permohonan
}

export async function simpanPermohonan(
  id: string,
  ubah: Partial<Permohonan>,
): Promise<Permohonan> {
  const { data, error } = await supabase
    .from('permohonan').update(ubah).eq('id', id).select().single()
  return semak(data, error) as Permohonan
}

export async function padamPermohonan(id: string): Promise<void> {
  const { error } = await supabase.from('permohonan').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function semakKelengkapan(id: string): Promise<Kelengkapan> {
  const { data, error } = await supabase.rpc('semak_kelengkapan', {
    p_permohonan_id: id,
  })
  return semak(data, error) as Kelengkapan
}

export async function dokumenDiperlukan(id: string): Promise<JenisDokumen[]> {
  const { data, error } = await supabase.rpc('dokumen_diperlukan', {
    p_permohonan_id: id,
  })
  return semak(data, error) as JenisDokumen[]
}

export async function hantarPermohonan(id: string): Promise<Permohonan> {
  const { data, error } = await supabase.rpc('hantar_permohonan', {
    p_permohonan_id: id,
  })
  return semak(data, error) as Permohonan
}

export async function tindakanKelulusan(
  id: string,
  tindakan: Tindakan,
  catatan?: string,
  semakan?: string[],
): Promise<Permohonan> {
  const { data, error } = await supabase.rpc('tindakan_kelulusan', {
    p_permohonan_id: id,
    p_tindakan: tindakan,
    p_catatan: catatan ?? null,
    p_semakan: semakan ?? null,
  })
  return semak(data, error) as Permohonan
}

export async function tukarStatusPentadbir(
  id: string,
  status: Status,
  sebab: string,
): Promise<Permohonan> {
  const { data, error } = await supabase.rpc('tukar_status_pentadbir', {
    p_permohonan_id: id,
    p_status: status,
    p_sebab: sebab,
  })
  return semak(data, error) as Permohonan
}

// ── Baris anak ────────────────────────────────────────────────────

type Jadual =
  | 'permohonan_tempat'
  | 'permohonan_peringkat'
  | 'permohonan_penaja'
  | 'peserta'

export async function tambahBaris<T>(jadual: Jadual, baris: object): Promise<T> {
  const { data, error } = await supabase.from(jadual).insert(baris).select().single()
  return semak(data, error) as T
}

export async function kemasBaris<T>(
  jadual: Jadual,
  id: string,
  ubah: object,
): Promise<T> {
  const { data, error } = await supabase
    .from(jadual).update(ubah).eq('id', id).select().single()
  return semak(data, error) as T
}

export async function padamBaris(jadual: Jadual, id: string): Promise<void> {
  const { error } = await supabase.from(jadual).delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Rujukan ───────────────────────────────────────────────────────

export async function semuaJenisDokumen(): Promise<JenisDokumen[]> {
  const { data, error } = await supabase
    .from('jenis_dokumen').select('*').eq('aktif', true).order('susunan')
  return semak(data, error) as JenisDokumen[]
}

export async function semuaPpd(): Promise<Ppd[]> {
  const { data, error } = await supabase.from('ppd').select('*').order('nama')
  return semak(data, error) as Ppd[]
}

export async function dapatTetapan<T = unknown>(kunci: string): Promise<T | null> {
  const { data } = await supabase
    .from('tetapan').select('nilai').eq('kunci', kunci).maybeSingle()
  return ((data as { nilai: T } | null)?.nilai ?? null)
}

export async function semuaTetapan() {
  const { data, error } = await supabase.from('tetapan').select('*').order('kunci')
  return semak(data, error) as {
    kunci: string
    nilai: unknown
    nota: string | null
    dikunci: boolean
  }[]
}

export async function simpanTetapan(kunci: string, nilai: unknown) {
  const { error } = await supabase
    .from('tetapan')
    .update({ nilai, dikemaskini_pada: new Date().toISOString() })
    .eq('kunci', kunci)
  if (error) throw new Error(error.message)
}

// ── Pentadbiran ───────────────────────────────────────────────────

export async function senaraiPegawai(): Promise<Pegawai[]> {
  const { data, error } = await supabase
    .from('pegawai').select('*').order('peranan').order('nama')
  return semak(data, error) as Pegawai[]
}

export async function simpanPegawai(
  id: string | null,
  baris: Partial<Pegawai>,
): Promise<Pegawai> {
  const q = id
    ? supabase.from('pegawai').update(baris).eq('id', id)
    : supabase.from('pegawai').insert(baris)
  const { data, error } = await q.select().single()
  return semak(data, error) as Pegawai
}

export async function padamPegawai(id: string): Promise<void> {
  const { error } = await supabase.from('pegawai').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function senaraiSekolah(kodPpd?: string): Promise<Sekolah[]> {
  let q = supabase.from('sekolah').select('*').order('nama')
  if (kodPpd) q = q.eq('kod_ppd', kodPpd)
  const { data, error } = await q
  return semak(data, error) as Sekolah[]
}

export async function simpanSekolah(
  kod: string | null,
  baris: Partial<Sekolah>,
): Promise<Sekolah> {
  const q = kod
    ? supabase.from('sekolah').update(baris).eq('kod_sekolah', kod)
    : supabase.from('sekolah').insert(baris)
  const { data, error } = await q.select().single()
  return semak(data, error) as Sekolah
}

export async function importSekolah(baris: Partial<Sekolah>[]) {
  const { error } = await supabase
    .from('sekolah')
    .upsert(baris, { onConflict: 'kod_sekolah' })
  if (error) throw new Error(error.message)
}

export async function importPegawai(baris: Partial<Pegawai>[]) {
  const { error } = await supabase
    .from('pegawai')
    .upsert(baris, { onConflict: 'emel' })
  if (error) throw new Error(error.message)
}

export async function senaraiAudit(had = 300, permohonanId?: string): Promise<LogAudit[]> {
  let q = supabase
    .from('log_audit').select('*').order('masa', { ascending: false }).limit(had)
  if (permohonanId) q = q.eq('permohonan_id', permohonanId)
  const { data, error } = await q
  return semak(data, error) as LogAudit[]
}

export async function catatAudit(
  peristiwa: string,
  pegawaiId: string | null,
  butiran?: Record<string, unknown>,
  permohonanId?: string,
) {
  await supabase.from('log_audit').insert({
    permohonan_id: permohonanId ?? null,
    pegawai_id: pegawaiId,
    peristiwa,
    nilai_baharu: butiran ?? null,
  })
}

// ── Laporan pasca-lawatan ─────────────────────────────────────────

/**
 * Hantar laporan Lampiran G dan tutup rekod. Status ditukar kepada
 * SELESAI di dalam fungsi pangkalan data — sekolah tidak boleh
 * menetapkannya secara terus.
 */
export async function hantarLaporanPasca(isi: {
  permohonan_id: string
  ringkasan: string
  bil_hadir_murid: number
  bil_hadir_guru: number
  ada_insiden: boolean
  butiran_insiden?: string | null
  cadangan?: string | null
}): Promise<LaporanPasca> {
  const { data, error } = await supabase.rpc('hantar_laporan_pasca', {
    p_permohonan_id: isi.permohonan_id,
    p_ringkasan: isi.ringkasan,
    p_bil_hadir_murid: isi.bil_hadir_murid,
    p_bil_hadir_guru: isi.bil_hadir_guru,
    p_ada_insiden: isi.ada_insiden,
    p_butiran_insiden: isi.butiran_insiden ?? null,
    p_cadangan: isi.cadangan ?? null,
  })
  return semak(data, error) as LaporanPasca
}

// ── Pengesahan awam ───────────────────────────────────────────────

export async function sahLawatan(kod: string) {
  const { data, error } = await supabase.rpc('sah_lawatan', { p_kod: kod })
  return semak(data, error) as Record<string, unknown>
}
