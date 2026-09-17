import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { senaraiPermohonan } from '@/lib/api'
import { gunaAuth } from '@/lib/auth'
import { LABEL_KATEGORI, LABEL_STATUS } from '@/lib/istilah'
import { formatTarikh, keCsv, muatTurun } from '@/lib/guna'
import { LencanaStatus, Kosong, Memuat, Mesej } from '@/komponen/ui'
import { TajukHalaman } from '@/komponen/Rangka'
import { Download, Files, Search } from 'lucide-react'
import { NoRujukan } from '@/komponen/JadualPermohonan'
import type { PermohonanRingkas, Status } from '@/lib/jenis'

const SEMUA_STATUS = Object.keys(LABEL_STATUS) as Status[]

export function SenaraiPermohonan() {
  const { pegawai } = gunaAuth()
  const [senarai, setSenarai] = useState<PermohonanRingkas[] | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)
  const [carian, setCarian] = useState('')
  const [tapisStatus, setTapisStatus] = useState<Status | ''>('')
  const [tapisKategori, setTapisKategori] = useState('')

  useEffect(() => {
    senaraiPermohonan({ had: 500 })
      .then(setSenarai)
      .catch((e) => setRalat(e.message))
  }, [])

  const ditapis = useMemo(() => {
    if (!senarai) return []
    const c = carian.trim().toLowerCase()
    return senarai.filter((p) => {
      if (tapisStatus && p.status !== tapisStatus) return false
      if (tapisKategori && p.kategori !== tapisKategori) return false
      if (!c) return true
      return [p.no_rujukan, p.tujuan, p.nama_sekolah, p.kod_sekolah]
        .filter(Boolean)
        .some((n) => String(n).toLowerCase().includes(c))
    })
  }, [senarai, carian, tapisStatus, tapisKategori])

  function eksport() {
    muatTurun(
      `elawatan-permohonan-${new Date().toISOString().slice(0, 10)}.csv`,
      keCsv(
        ditapis.map((p) => ({
          no_rujukan: p.no_rujukan ?? '',
          status: LABEL_STATUS[p.status],
          kategori: p.kategori ? LABEL_KATEGORI[p.kategori] : '',
          sekolah: p.nama_sekolah,
          kod_sekolah: p.kod_sekolah,
          ppd: p.nama_ppd ?? p.kod_ppd,
          tujuan: p.tujuan ?? '',
          tarikh_mula: p.tarikh_mula ?? '',
          tarikh_tamat: p.tarikh_tamat ?? '',
          bil_murid: p.bil_murid,
          bil_guru: p.bil_guru,
          bil_bukan_guru: p.bil_bukan_guru,
          jumlah_keseluruhan: Number(p.jumlah_a) + Number(p.jumlah_b),
          dihantar_pada: p.dihantar_pada ?? '',
          diluluskan_pada: p.diluluskan_pada ?? '',
        })),
      ),
      'text/csv;charset=utf-8',
    )
  }

  if (ralat) return <Mesej jenis="ralat">{ralat}</Mesej>
  if (!senarai) return <Memuat />

  return (
    <>
      <TajukHalaman
        ikon={Files}
        jejak={[{ teks: 'Permohonan' }]}
        tajuk={pegawai?.peranan === 'sekolah' ? 'Senarai Permohonan' : 'Semua Permohonan'}
        nota={`${ditapis.length} daripada ${senarai.length} rekod dalam skop capaian anda`}
        aksi={
          <button
            type="button"
            className="btn-kedua"
            onClick={eksport}
            disabled={ditapis.length === 0}
          >
            <Download className="h-4 w-4" aria-hidden />
            Eksport CSV
          </button>
        }
      />

      <div className="kad mb-5">
        <div className="kad-isi grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            className="medan pl-9"
            aria-label="Carian"
            placeholder="Cari nombor rujukan, tujuan atau sekolah…"
            value={carian}
            onChange={(e) => setCarian(e.target.value)}
          />
          </div>
          <select
            aria-label="Tapis status"
            className="medan"
            value={tapisStatus}
            onChange={(e) => setTapisStatus(e.target.value as Status | '')}
          >
            <option value="">Semua status</option>
            {SEMUA_STATUS.map((s) => (
              <option key={s} value={s}>
                {LABEL_STATUS[s]}
              </option>
            ))}
          </select>
          <select
            aria-label="Tapis kategori"
            className="medan"
            value={tapisKategori}
            onChange={(e) => setTapisKategori(e.target.value)}
          >
            <option value="">Semua kategori</option>
            {Object.entries(LABEL_KATEGORI).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {ditapis.length === 0 ? (
        <Kosong
          tajuk="Tiada rekod sepadan"
          nota="Longgarkan penapis atau ubah kata carian."
        />
      ) : (
        <div className="kad overflow-x-auto">
          <table className="jadual">
            <thead>
              <tr>
                <th>No. Rujukan</th>
                {pegawai?.peranan !== 'sekolah' && <th>Sekolah</th>}
                <th>Tujuan</th>
                <th>Kategori</th>
                <th>Tarikh</th>
                <th className="text-right">Peserta</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ditapis.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap">
                    <Link
                      to={`/permohonan/${p.id}`}
                      className="block font-mono text-[0.7rem] leading-snug text-jata-700 hover:underline"
                    >
                      <NoRujukan no={p.no_rujukan} />
                    </Link>
                  </td>
                  {pegawai?.peranan !== 'sekolah' && (
                    <td>
                      <span className="block max-w-[200px] truncate">
                        {p.nama_sekolah}
                      </span>
                      <span className="text-xs text-slate-400">
                        {p.nama_ppd ?? p.kod_ppd}
                      </span>
                    </td>
                  )}
                  <td>
                    <span className="block max-w-[260px] truncate">
                      {p.tujuan ?? '—'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-xs">
                    {p.kategori ? LABEL_KATEGORI[p.kategori] : '—'}
                  </td>
                  <td className="whitespace-nowrap text-xs">
                    {formatTarikh(p.tarikh_mula)}
                  </td>
                  <td className="whitespace-nowrap text-right tabular-nums">
                    {p.bil_murid + p.bil_guru + p.bil_bukan_guru}
                  </td>
                  <td>
                    <LencanaStatus status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
