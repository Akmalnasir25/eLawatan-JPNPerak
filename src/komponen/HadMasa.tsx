import { Clock } from 'lucide-react'
import { kelas } from '@/lib/guna'

export type KeadaanHadMasa = 'lewat' | 'hampir' | 'biasa'

/** Keadaan had masa tindakan; null jika permohonan tidak menunggu tindakan. */
export function keadaanHadMasa(p: {
  hari_menunggu: number | null
  had_hari: number | null
}): KeadaanHadMasa | null {
  if (p.hari_menunggu === null || p.had_hari === null) return null
  if (p.hari_menunggu > p.had_hari) return 'lewat'
  if (p.had_hari - p.hari_menunggu <= 1) return 'hampir'
  return 'biasa'
}

const GAYA: Record<KeadaanHadMasa, string> = {
  lewat: 'bg-rose-50 text-rose-700 ring-rose-200',
  hampir: 'bg-amber-50 text-amber-800 ring-amber-200',
  biasa: 'bg-slate-50 text-slate-600 ring-slate-200',
}

/** Hari bekerja di peringkat semasa berbanding had yang ditetapkan pentadbir. */
export function LencanaHadMasa({
  p,
}: {
  p: { hari_menunggu: number | null; had_hari: number | null }
}) {
  const keadaan = keadaanHadMasa(p)
  if (!keadaan) return null
  const lebih = p.hari_menunggu! - p.had_hari!
  const teks =
    keadaan === 'lewat'
      ? `Lewat ${lebih} hari bekerja`
      : `Hari ke-${p.hari_menunggu} / ${p.had_hari}`
  return (
    <span
      className={kelas('mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.68rem] font-semibold ring-1 ring-inset', GAYA[keadaan])}
      title={`Had tindakan ${p.had_hari} hari bekerja di peringkat ini`}
    >
      <Clock className="h-3 w-3" aria-hidden />
      {teks}
    </span>
  )
}
