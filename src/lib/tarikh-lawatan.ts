import type { PermohonanRingkas } from './jenis'

type Lawatan = Pick<PermohonanRingkas, 'id' | 'tarikh_mula' | 'tarikh_tamat' | 'status'>
const SEHARI = 86_400_000
const formatPenuh = new Intl.DateTimeFormat('ms-MY', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const formatBulan = new Intl.DateTimeFormat('ms-MY', { month: 'long', year: 'numeric', timeZone: 'UTC' })

export function hariMalaysia(kini = new Date()): string {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(kini)
  const nilai = (jenis: string) => p.find((x) => x.type === jenis)!.value
  return `${nilai('year')}-${nilai('month')}-${nilai('day')}`
}

function nomborHari(tarikh: string | null): number | null {
  if (!tarikh || !/^\d{4}-\d{2}-\d{2}$/.test(tarikh)) return null
  const n = Date.parse(`${tarikh}T00:00:00Z`)
  if (!Number.isFinite(n) || new Date(n).toISOString().slice(0, 10) !== tarikh) return null
  return n / SEHARI
}

function julat(p: Lawatan) {
  const mula = nomborHari(p.tarikh_mula)
  const akhir = nomborHari(p.tarikh_tamat)
  return { mula, tamat: mula === null ? null : Math.max(mula, akhir ?? mula) }
}

export function paparanTarikhLawatan(p: Lawatan, hariIni: string) {
  const { mula, tamat } = julat(p)
  if (mula === null || tamat === null) return { tarikh: 'Belum ditetapkan', kiraan: null, mendesak: false }
  const dari = new Date(mula * SEHARI)
  const hingga = new Date(tamat * SEHARI)
  const tarikh = mula === tamat ? formatPenuh.format(dari)
    : p.tarikh_mula?.slice(0, 7) === p.tarikh_tamat?.slice(0, 7)
      ? `${dari.getUTCDate()}–${hingga.getUTCDate()} ${formatBulan.format(hingga)}`
      : `${formatPenuh.format(dari)} – ${formatPenuh.format(hingga)}`
  if (['DITOLAK', 'BATAL', 'SELESAI'].includes(p.status)) return { tarikh, kiraan: null, mendesak: false }
  const hari = nomborHari(hariIni)!
  const baki = mula - hari
  const kiraan = baki === 0 ? 'Hari ini' : baki === 1 ? 'Esok' : baki > 1 ? `${baki} hari lagi`
    : tamat >= hari ? 'Sedang berlangsung' : 'Tarikh telah berlalu'
  return { tarikh, kiraan, mendesak: baki >= 0 && baki <= 7 && p.status.startsWith('MENUNGGU') }
}

/** Susun salinan; data asal tidak diubah dan tarikh sama stabil mengikut ID. */
export function susunTarikhLawatan<T extends Lawatan>(senarai: T[], hariIni: string): T[] {
  const hari = nomborHari(hariIni)!
  const kunci = (p: T): [number, number, number] => {
    const { mula, tamat } = julat(p)
    if (mula === null || tamat === null) return [3, 0, 0]
    if (mula <= hari && tamat >= hari) return [0, mula, tamat]
    if (mula > hari) return [1, mula, tamat]
    return [2, -tamat, -mula]
  }
  return [...senarai].sort((a, b) => {
    const x = kunci(a), y = kunci(b)
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2] || a.id.localeCompare(b.id)
  })
}
