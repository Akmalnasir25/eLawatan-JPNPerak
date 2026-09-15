import { useEffect, useMemo, useState } from 'react'
import { senaraiPermohonan } from '@/lib/api'
import { LABEL_KATEGORI, LABEL_STATUS } from '@/lib/istilah'
import { formatWang, keCsv, kelas, muatTurun } from '@/lib/guna'
import { Kosong, Memuat, Mesej } from '@/komponen/ui'
import { TajukHalaman } from '@/komponen/Rangka'
import type { PermohonanRingkas, Status } from '@/lib/jenis'

const BULAN = [
  'Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis',
]

export function Laporan() {
  const [senarai, setSenarai] = useState<PermohonanRingkas[] | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)
  const [tahun, setTahun] = useState(new Date().getFullYear())

  useEffect(() => {
    senaraiPermohonan({ had: 2000 })
      .then(setSenarai)
      .catch((e) => setRalat(e.message))
  }, [])

  const data = useMemo(() => {
    if (!senarai) return null
    const dalamTahun = senarai.filter((p) => {
      const t = p.tarikh_mula ?? p.dicipta_pada
      return new Date(t).getFullYear() === tahun
    })

    const ikutDaerah = new Map<string, { jumlah: number; lulus: number; murid: number }>()
    const ikutKategori = new Map<string, number>()
    const ikutStatus = new Map<Status, number>()
    const ikutBulan = Array.from({ length: 12 }, () => 0)
    let jumlahKos = 0
    let jumlahMurid = 0

    for (const p of dalamTahun) {
      const daerah = p.nama_ppd ?? p.kod_ppd
      const d = ikutDaerah.get(daerah) ?? { jumlah: 0, lulus: 0, murid: 0 }
      d.jumlah += 1
      d.murid += p.bil_murid
      if (p.status === 'DILULUSKAN' || p.status === 'SELESAI') d.lulus += 1
      ikutDaerah.set(daerah, d)

      if (p.kategori) {
        ikutKategori.set(p.kategori, (ikutKategori.get(p.kategori) ?? 0) + 1)
      }
      ikutStatus.set(p.status, (ikutStatus.get(p.status) ?? 0) + 1)

      if (p.tarikh_mula) {
        ikutBulan[new Date(p.tarikh_mula).getMonth()] += 1
      }
      jumlahKos += Number(p.jumlah_a) + Number(p.jumlah_b)
      jumlahMurid += p.bil_murid
    }

    return {
      dalamTahun,
      ikutDaerah: [...ikutDaerah.entries()].sort((a, b) => b[1].jumlah - a[1].jumlah),
      ikutKategori: [...ikutKategori.entries()],
      ikutStatus: [...ikutStatus.entries()].sort((a, b) => b[1] - a[1]),
      ikutBulan,
      jumlahKos,
      jumlahMurid,
    }
  }, [senarai, tahun])

  const tahunTersedia = useMemo(() => {
    if (!senarai) return [new Date().getFullYear()]
    const set = new Set(
      senarai.map((p) =>
        new Date(p.tarikh_mula ?? p.dicipta_pada).getFullYear(),
      ),
    )
    set.add(new Date().getFullYear())
    return [...set].sort((a, b) => b - a)
  }, [senarai])

  if (ralat) return <Mesej jenis="ralat">{ralat}</Mesej>
  if (!senarai || !data) return <Memuat />

  const maksBulan = Math.max(...data.ikutBulan, 1)

  function eksport() {
    muatTurun(
      `elawatan-laporan-${tahun}.csv`,
      keCsv(
        data!.ikutDaerah.map(([daerah, d]) => ({
          daerah,
          jumlah_permohonan: d.jumlah,
          diluluskan: d.lulus,
          jumlah_murid: d.murid,
        })),
      ),
      'text/csv;charset=utf-8',
    )
  }

  return (
    <>
      <TajukHalaman
        tajuk="Laporan"
        nota="Statistik dijana serta-merta daripada rekod dalam skop capaian anda."
        aksi={
          <>
            <select
              className="medan w-auto"
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
            >
              {tahunTersedia.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-kedua"
              onClick={eksport}
              disabled={data.dalamTahun.length === 0}
            >
              Eksport CSV
            </button>
          </>
        }
      />

      {data.dalamTahun.length === 0 ? (
        <Kosong
          tajuk={`Tiada rekod bagi tahun ${tahun}`}
          nota="Pilih tahun lain atau tunggu permohonan pertama."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Petak2 label="Jumlah permohonan" nilai={data.dalamTahun.length} />
            <Petak2
              label="Diluluskan"
              nilai={
                data.dalamTahun.filter(
                  (p) => p.status === 'DILULUSKAN' || p.status === 'SELESAI',
                ).length
              }
              warna="text-emerald-600"
            />
            <Petak2 label="Jumlah murid terlibat" nilai={data.jumlahMurid} />
            <Petak2
              label="Anggaran kos keseluruhan"
              teks={formatWang(data.jumlahKos)}
            />
          </div>

          <section className="kad">
            <div className="kad-tajuk">
              <h2 className="text-sm font-semibold text-slate-900">
                Taburan Bulanan — Tarikh Lawatan {tahun}
              </h2>
            </div>
            <div className="kad-isi">
              <div className="flex items-end gap-1.5" style={{ height: 160 }}>
                {data.ikutBulan.map((n, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-xs font-medium tabular-nums text-slate-600">
                      {n || ''}
                    </span>
                    <div
                      className={kelas(
                        'w-full rounded-t transition-all',
                        n > 0 ? 'bg-jata-500' : 'bg-slate-100',
                      )}
                      style={{ height: `${Math.max(3, (n / maksBulan) * 110)}px` }}
                    />
                    <span className="text-[10px] text-slate-400">{BULAN[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="kad">
              <div className="kad-tajuk">
                <h2 className="text-sm font-semibold text-slate-900">
                  Mengikut Daerah
                </h2>
              </div>
              <div className="kad-isi overflow-x-auto">
                <table className="jadual">
                  <thead>
                    <tr>
                      <th>Daerah</th>
                      <th className="text-right">Permohonan</th>
                      <th className="text-right">Diluluskan</th>
                      <th className="text-right">Murid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ikutDaerah.map(([daerah, d]) => (
                      <tr key={daerah}>
                        <td>{daerah}</td>
                        <td className="text-right tabular-nums">{d.jumlah}</td>
                        <td className="text-right tabular-nums text-emerald-600">
                          {d.lulus}
                        </td>
                        <td className="text-right tabular-nums">{d.murid}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="space-y-6">
              <section className="kad">
                <div className="kad-tajuk">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Mengikut Kategori
                  </h2>
                </div>
                <div className="kad-isi space-y-2.5">
                  {data.ikutKategori.map(([k, n]) => (
                    <div key={k}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-slate-700">
                          {LABEL_KATEGORI[k as keyof typeof LABEL_KATEGORI] ?? k}
                        </span>
                        <span className="tabular-nums font-medium text-slate-900">
                          {n}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded bg-slate-100">
                        <div
                          className="h-full bg-jata-500"
                          style={{
                            width: `${(n / data.dalamTahun.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="kad">
                <div className="kad-tajuk">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Mengikut Status
                  </h2>
                </div>
                <div className="kad-isi">
                  <ul className="space-y-1.5 text-sm">
                    {data.ikutStatus.map(([s, n]) => (
                      <li key={s} className="flex justify-between">
                        <span className="text-slate-600">{LABEL_STATUS[s]}</span>
                        <span className="tabular-nums font-medium">{n}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Petak2({
  label,
  nilai,
  teks,
  warna = 'text-slate-900',
}: {
  label: string
  nilai?: number
  teks?: string
  warna?: string
}) {
  return (
    <div className="kad px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={kelas('mt-1 text-xl font-semibold tabular-nums', warna)}>
        {teks ?? nilai}
      </p>
    </div>
  )
}
