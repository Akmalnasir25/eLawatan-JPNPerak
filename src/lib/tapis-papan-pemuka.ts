import type { PermohonanRingkas, Status } from './jenis'

export const LABEL_TAPIS_PAPAN = {
  draf: 'Draf & perlu pindaan',
  tindakan: 'Menunggu tindakan anda',
  proses: 'Dalam proses kelulusan',
  lulus: 'Diluluskan & selesai',
  laporan_perlu: 'Laporan pasca-lawatan sekolah — Perlu disiapkan',
  laporan_siap: 'Laporan pasca-lawatan sekolah — Siap',
} as const
export type TapisPapan = keyof typeof LABEL_TAPIS_PAPAN
export function kenalTapisPapan(nilai: string | null): TapisPapan | null {
  return nilai && Object.hasOwn(LABEL_TAPIS_PAPAN, nilai) ? nilai as TapisPapan : null
}

/** Digunakan bersama oleh kad dan senarai supaya kiraan/keahlian sepadan. */
export function dalamTapisPapan(p: Pick<PermohonanRingkas, 'status' | 'tarikh_tamat' | 'laporan_dihantar'>,
  tapis: TapisPapan | null, hariIni: string, statusSaya: Status[] = []): boolean {
  switch (tapis) {
    case 'draf': return p.status === 'DRAF' || p.status === 'DIKEMBALIKAN'
    case 'tindakan': return statusSaya.includes(p.status)
    case 'proses': return p.status.startsWith('MENUNGGU')
    case 'lulus': return p.status === 'DILULUSKAN' || p.status === 'SELESAI'
    case 'laporan_siap': return p.laporan_dihantar === true
    case 'laporan_perlu': return p.status === 'DILULUSKAN' && p.laporan_dihantar === false &&
      !!p.tarikh_tamat && p.tarikh_tamat < hariIni
    default: return true
  }
}
