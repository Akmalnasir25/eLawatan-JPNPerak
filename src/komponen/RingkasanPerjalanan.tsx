import type { Permohonan } from '@/lib/jenis'
import { formatTarikh } from '@/lib/guna'

/** Maklumat tambahan, tidak menggantikan jadual destinasi Lampiran A. */
export function RingkasanPerjalanan({ p }: { p: Permohonan }) {
  if (!p.masa_bertolak && !p.masa_pulang && !p.masa_tiba && !p.tarikh_pulang && !p.tarikh_tiba) return null
  const pulang = p.tarikh_pulang || p.tarikh_tamat
  return <div className="mt-3 text-sm" style={{ breakInside: 'avoid' }}>
    <strong>Maklumat perjalanan keseluruhan</strong>
    <p>Bertolak dari sekolah/lokasi ditetapkan: {formatTarikh(p.tarikh_mula)} · {p.masa_bertolak?.slice(0, 5) || 'Masa belum diisi'}</p>
    <p>Bertolak pulang: {formatTarikh(pulang)} · {p.masa_pulang?.slice(0, 5) || 'Masa belum diisi'}</p>
    <p>Anggaran tiba semula di sekolah/lokasi ditetapkan: {formatTarikh(p.tarikh_tiba || pulang)} · {p.masa_tiba?.slice(0, 5) || 'Masa belum diisi'}</p>
  </div>
}
