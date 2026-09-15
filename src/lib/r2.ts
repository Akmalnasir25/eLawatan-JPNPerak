// Muat naik dokumen sokongan terus ke Cloudflare R2.
//
// Bait fail tidak pernah melalui Supabase. Cincangan SHA-256 dikira
// dalam pelayar sebelum penghantaran dan disimpan bersama rekod, supaya
// pegawai boleh membuktikan dokumen yang diluluskan ialah fail yang sama.

import { panggilFungsi, supabase } from './supabase'
import { cincangFail } from './guna'
import type { Dokumen } from './jenis'

type JawapanPresign = {
  url: string
  kunci_r2: string
  tamat_dalam_saat: number
}

export type KemajuanMuatNaik = {
  peratus: number
  fasa: 'cincang' | 'hantar' | 'rekod' | 'siap'
}

export async function muatNaikDokumen(
  permohonanId: string,
  jenisDokumen: string,
  fail: File,
  pegawaiId: string | null,
  onKemajuan?: (k: KemajuanMuatNaik) => void,
): Promise<Dokumen> {
  onKemajuan?.({ peratus: 5, fasa: 'cincang' })
  const cincangan = await cincangFail(fail)

  onKemajuan?.({ peratus: 15, fasa: 'hantar' })
  const presign = await panggilFungsi<JawapanPresign>('r2-naik', {
    permohonan_id: permohonanId,
    jenis_dokumen: jenisDokumen,
    nama_fail: fail.name,
    jenis_mime: fail.type || 'application/octet-stream',
    saiz: fail.size,
  })

  await hantarKeR2(presign.url, fail, (p) =>
    onKemajuan?.({ peratus: 15 + Math.round(p * 0.75), fasa: 'hantar' }),
  )

  onKemajuan?.({ peratus: 92, fasa: 'rekod' })

  // Satu dokumen setiap jenis: ganti yang lama jika ada.
  await supabase
    .from('dokumen')
    .delete()
    .eq('permohonan_id', permohonanId)
    .eq('jenis_dokumen', jenisDokumen)

  const { data, error } = await supabase
    .from('dokumen')
    .insert({
      permohonan_id: permohonanId,
      jenis_dokumen: jenisDokumen,
      nama_fail: fail.name,
      kunci_r2: presign.kunci_r2,
      saiz: fail.size,
      jenis_mime: fail.type || 'application/octet-stream',
      cincangan_sha256: cincangan,
      dimuat_naik_oleh: pegawaiId,
    })
    .select()
    .single()

  if (error) throw new Error(`Gagal merekod dokumen: ${error.message}`)

  await supabase.from('log_audit').insert({
    permohonan_id: permohonanId,
    pegawai_id: pegawaiId,
    peristiwa: 'DOKUMEN_DIMUAT_NAIK',
    nilai_baharu: {
      jenis_dokumen: jenisDokumen,
      nama_fail: fail.name,
      cincangan_sha256: cincangan,
    },
  })

  onKemajuan?.({ peratus: 100, fasa: 'siap' })
  return data as Dokumen
}

/** PUT dengan kemajuan — fetch() tidak melaporkan kemajuan muat naik. */
function hantarKeR2(
  url: string,
  fail: File,
  onKemajuan: (peratus: number) => void,
): Promise<void> {
  return new Promise((selesai, gagal) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url, true)
    xhr.setRequestHeader(
      'Content-Type',
      fail.type || 'application/octet-stream',
    )
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onKemajuan(e.loaded / e.total)
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? selesai()
        : gagal(new Error(`Muat naik ke storan gagal (HTTP ${xhr.status}).`))
    xhr.onerror = () =>
      gagal(
        new Error(
          'Muat naik gagal. Semak sambungan internet dan tetapan CORS bucket R2.',
        ),
      )
    xhr.send(fail)
  })
}

export type ButiranDokumen = {
  url: string
  tamat_dalam_saat: number
  dokumen: {
    nama_fail: string
    jenis_mime: string | null
    saiz: number
    cincangan_sha256: string
    dimuat_naik_pada: string
  }
}

export function lihatDokumen(dokumenId: string): Promise<ButiranDokumen> {
  return panggilFungsi<ButiranDokumen>('r2-lihat', { dokumen_id: dokumenId })
}

export function padamDokumen(dokumenId: string): Promise<{ berjaya: boolean }> {
  return panggilFungsi<{ berjaya: boolean }>('r2-padam', {
    dokumen_id: dokumenId,
  })
}
