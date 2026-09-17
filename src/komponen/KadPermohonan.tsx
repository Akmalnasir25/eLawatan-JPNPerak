import { Link } from 'react-router-dom'
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
  const mendesak =
    hari !== null &&
    hari >= 0 &&
    hari <= 7 &&
    p.status.startsWith('MENUNGGU')

  return (
    <Link
      to={`/permohonan/${p.id}`}
      className="kad block min-w-0 transition hover:border-jata-300 hover:shadow-md"
    >
      <div className="kad-isi">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs text-slate-400">
              {p.no_rujukan ?? 'Belum bernombor — draf'}
            </p>
            <h3 className="mt-1 truncate text-sm font-semibold text-slate-900">
              {p.tujuan || 'Tanpa tujuan'}
            </h3>
            {tunjukSekolah && (
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {p.nama_sekolah} · {p.nama_ppd ?? p.kod_ppd}
              </p>
            )}
          </div>
          <span className="shrink-0">
            <LencanaStatus status={p.status} />
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          {p.kategori && (
            <span className="font-medium text-slate-600">
              {LABEL_KATEGORI[p.kategori]}
            </span>
          )}
          <span>
            {formatTarikh(p.tarikh_mula)}
            {p.tarikh_tamat && p.tarikh_tamat !== p.tarikh_mula
              ? ` – ${formatTarikh(p.tarikh_tamat)}`
              : ''}
          </span>
          <span>
            {p.bil_murid} murid · {p.bil_guru} guru
            {p.bil_bukan_guru > 0 ? ` · ${p.bil_bukan_guru} bukan guru` : ''}
          </span>
          {hari !== null && hari >= 0 && (
            <span
              className={kelas(
                'rounded px-1.5 py-0.5 font-medium',
                mendesak
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-slate-100 text-slate-600',
              )}
            >
              {hari === 0 ? 'Lawatan hari ini' : `${hari} hari lagi`}
            </span>
          )}
        </div>

        {p.status === 'DIKEMBALIKAN' && p.catatan_kembali && (
          <p className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-xs leading-relaxed text-orange-800">
            <span className="font-semibold">Catatan pelulus:</span>{' '}
            {p.catatan_kembali}
          </p>
        )}
      </div>
    </Link>
  )
}
