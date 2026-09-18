import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { KadPermohonan } from './KadPermohonan'
import { LencanaStatus } from './ui'
import { LencanaHadMasa } from './HadMasa'
import { LABEL_KATEGORI } from '@/lib/istilah'
import { formatTarikh, hariLagi, kelas } from '@/lib/guna'
import type { PermohonanRingkas } from '@/lib/jenis'

/** Jadual pada skrin lebar, kad pada telefon. */
export function JadualPermohonan({
  senarai,
  tunjukSekolah = true,
  tindakan = 'Buka',
}: {
  senarai: PermohonanRingkas[]
  tunjukSekolah?: boolean
  tindakan?: string
}) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {senarai.map((p) => (
          <KadPermohonan key={p.id} p={p} tunjukSekolah={tunjukSekolah} />
        ))}
      </div>

      <div className="kad hidden overflow-x-auto md:block">
        <table className="jadual">
          <thead>
            <tr>
              <th className="w-[1%] whitespace-nowrap">No. Rujukan</th>
              <th>Lawatan</th>
              <th className="whitespace-nowrap">Tarikh Lawatan</th>
              <th>Status</th>
              <th className="w-[1%]" />
            </tr>
          </thead>
          <tbody>
            {senarai.map((p) => {
              const hari = hariLagi(p.tarikh_mula)
              const mendesak = hari !== null && hari >= 0 && hari <= 7 && p.status.startsWith('MENUNGGU')
              return (
                <tr key={p.id}>
                  <td className="whitespace-nowrap font-mono text-[0.7rem] leading-snug text-jata-700">
                    <NoRujukan no={p.no_rujukan} />
                  </td>
                  <td className="min-w-[220px]">
                    <Link
                      to={`/permohonan/${p.id}`}
                      className="line-clamp-2 font-medium text-jata-900 hover:text-jata-600 hover:underline"
                    >
                      {p.tujuan || 'Tanpa tujuan'}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {[
                        p.kategori ? LABEL_KATEGORI[p.kategori] : null,
                        `${p.bil_murid + p.bil_guru + p.bil_bukan_guru} peserta`,
                        tunjukSekolah ? p.nama_sekolah : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </td>
                  <td className="whitespace-nowrap text-xs">
                    <span className="text-slate-700">{formatTarikh(p.tarikh_mula)}</span>
                    {hari !== null && hari >= 0 && (
                      <span
                        className={kelas(
                          'mt-0.5 block text-[0.7rem] font-medium',
                          mendesak ? 'text-rose-700' : 'text-slate-400',
                        )}
                      >
                        {hari === 0 ? 'Hari ini' : `${hari} hari lagi`}
                      </span>
                    )}
                  </td>
                  <td>
                    <LencanaStatus status={p.status} />
                    <div>
                      <LencanaHadMasa p={p} />
                    </div>
                  </td>
                  <td>
                    <Link
                      to={`/permohonan/${p.id}`}
                      className="btn-kedua btn-kecil whitespace-nowrap"
                      aria-label={`${tindakan} ${p.no_rujukan ?? 'draf'}`}
                    >
                      {tindakan}
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

/** JPNPk/LWT/2026/PRK-KU/ABA1234/0147 dipecah selepas tahun supaya jadual kekal padat. */
export function NoRujukan({ no }: { no: string | null }) {
  if (!no) return <span className="font-sans text-xs italic text-slate-400">Draf</span>
  const b = no.split('/')
  if (b.length < 6) return <>{no}</>
  return (
    <>
      <span className="block text-slate-400">{b.slice(0, 3).join('/')}/</span>
      <span className="block font-semibold">{b.slice(3).join('/')}</span>
    </>
  )
}
