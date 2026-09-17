import { Link } from 'react-router-dom'
import { CalendarDays, ChevronRight, Users } from 'lucide-react'
import { LencanaStatus } from './ui'
import { LABEL_KATEGORI } from '@/lib/istilah'
import { formatTarikh, hariLagi, kelas } from '@/lib/guna'
import type { PermohonanRingkas } from '@/lib/jenis'

export function KadPermohonan({
  p,
  tunjukSekolah = false,
}: {
  p: PermohonanRingkas
  tunjukSekolah?: boolean
}) {
  const hari = hariLagi(p.tarikh_mula)
  const mendesak = hari !== null && hari >= 0 && hari <= 7 && p.status.startsWith('MENUNGGU')

  return (
    <Link
      to={`/permohonan/${p.id}`}
      className="kad kad-hidup group block min-w-0 border-l-4 border-l-jata-700 transition hover:border-l-biru-500 hover:shadow-timbul"
    >
      <div className="px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate font-mono text-[0.7rem] text-jata-600">
            {p.no_rujukan ?? 'Draf — belum bernombor'}
          </p>
          <span className="shrink-0">
            <LencanaStatus status={p.status} />
          </span>
        </div>
        <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold text-jata-900">
          {p.tujuan || 'Tanpa tujuan'}
        </h3>
        {tunjukSekolah && (
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {p.nama_sekolah} · {p.nama_ppd ?? p.kod_ppd}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-2.5 text-xs text-slate-600">
          {p.kategori && <span className="font-medium">{LABEL_KATEGORI[p.kategori]}</span>}
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            {formatTarikh(p.tarikh_mula)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            {p.bil_murid + p.bil_guru + p.bil_bukan_guru}
          </span>
          {hari !== null && hari >= 0 && (
            <span
              className={kelas(
                'rounded px-1.5 py-0.5 font-semibold',
                mendesak ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600',
              )}
            >
              {hari === 0 ? 'Hari ini' : `${hari} hari lagi`}
            </span>
          )}
          <ChevronRight className="ml-auto h-4 w-4 text-slate-300 group-hover:text-jata-600" aria-hidden />
        </div>
        {p.status === 'DIKEMBALIKAN' && p.catatan_kembali && (
          <p className="mt-2.5 rounded border-l-2 border-orange-400 bg-orange-50 px-3 py-2 text-xs leading-relaxed text-orange-900">
            <span className="font-semibold">Catatan pelulus:</span> {p.catatan_kembali}
          </p>
        )}
      </div>
    </Link>
  )
}
