import { useEffect, useMemo, useState } from 'react'
import { prestasiKelulusan, senaraiPermohonan, type PrestasiKelulusan as PrestasiKelulusanData } from '@/lib/api'
import { gunaAuth } from '@/lib/auth'
import { LABEL_KATEGORI, LABEL_STATUS } from '@/lib/istilah'
import { formatWang, keCsv, kelas, muatTurun } from '@/lib/guna'
import { Kosong, Memuat, Mesej } from '@/komponen/ui'
import { TajukHalaman } from '@/komponen/Rangka'
import { BarChart3, Download, Timer } from 'lucide-react'
import type { PermohonanRingkas, Status } from '@/lib/jenis'

const BULAN = [
  'Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis',
]

export function Laporan() {
  const { pegawai } = gunaAuth()
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
        ikon={BarChart3}
        jejak={[{ teks: 'Laporan' }]}
        tajuk="Laporan Statistik Lawatan"
        nota="Statistik dijana serta-merta daripada rekod dalam skop capaian anda."
        aksi={
          <>
            <select
              aria-label="Tahun"
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
              <Download className="h-4 w-4" aria-hidden />
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
              <h2>
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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="kad">
              <div className="kad-tajuk">
                <h2>
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
                  <h2>
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
                  <h2>
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

      {pegawai!.peranan !== 'sekolah' && <PrestasiKelulusan tahun={tahun} />}
    </>
  )
}

const LABEL_PERINGKAT: Partial<Record<Status, string>> = {
  MENUNGGU_PPD_SEMAK: 'Semakan PPD',
  MENUNGGU_PPD_SAH: 'Pengesahan KPPD',
  MENUNGGU_JPN_SEMAK: 'Semakan JPN',
  MENUNGGU_JPN_SAH: 'Pengesahan Pengarah',
  MENUNGGU_KPM: 'Bahagian KPM',
}

/** Masa tindakan setiap peringkat dan setiap pegawai, dalam hari bekerja. */
function PrestasiKelulusan({ tahun }: { tahun: number }) {
  const [data, setData] = useState<PrestasiKelulusanData | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)

  useEffect(() => {
    setData(null)
    prestasiKelulusan(tahun)
      .then(setData)
      .catch((e) => setRalat(e instanceof Error ? e.message : 'Gagal memuatkan prestasi.'))
  }, [tahun])

  if (ralat) return <div className="mt-6"><Mesej jenis="ralat">{ralat}</Mesej></div>
  if (!data) return <Memuat />
  if (data.peringkat.length === 0) return null

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="kad">
        <div className="kad-tajuk">
          <h2 className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-biru-500" aria-hidden />
            Prestasi Kelulusan {tahun}
          </h2>
          <p className="-mt-1 basis-full text-xs text-slate-500">
            Hari bekerja dari permohonan tiba di peringkat itu hingga tindakan diambil.
          </p>
        </div>
        <div className="kad-isi overflow-x-auto">
          <table className="jadual">
            <thead>
              <tr>
                <th>Peringkat</th>
                <th className="text-right">Tindakan</th>
                <th className="text-right">Purata</th>
                <th className="text-right">Paling lama</th>
                <th className="text-right">Melebihi had</th>
              </tr>
            </thead>
            <tbody>
              {data.peringkat.map((r) => (
                <tr key={r.peringkat}>
                  <td>
                    {LABEL_PERINGKAT[r.peringkat] ?? LABEL_STATUS[r.peringkat]}
                    {r.had !== null && <span className="block text-[0.7rem] text-slate-400">Had {r.had} hari</span>}
                  </td>
                  <td className="text-right tabular-nums">{r.bil}</td>
                  <td className={kelas('text-right tabular-nums font-medium', r.had !== null && r.purata > r.had && 'text-rose-600')}>
                    {r.purata} hari
                  </td>
                  <td className="text-right tabular-nums">{r.maksimum} hari</td>
                  <td className={kelas('text-right tabular-nums', r.lewat > 0 ? 'font-semibold text-rose-600' : 'text-slate-400')}>
                    {r.lewat}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="kad">
        <div className="kad-tajuk">
          <h2>Mengikut Pegawai</h2>
          <p className="-mt-1 basis-full text-xs text-slate-500">Disusun mengikut tindakan lewat terbanyak.</p>
        </div>
        <div className="kad-isi max-h-[360px] overflow-auto">
          <table className="jadual">
            <thead>
              <tr>
                <th>Pegawai</th>
                <th className="text-right">Tindakan</th>
                <th className="text-right">Purata</th>
                <th className="text-right">Lewat</th>
              </tr>
            </thead>
            <tbody>
              {data.pegawai.map((r) => (
                <tr key={`${r.nama_pegawai}-${r.peringkat}`}>
                  <td>
                    {r.nama_pegawai}
                    <span className="block text-[0.7rem] text-slate-400">{LABEL_PERINGKAT[r.peringkat] ?? r.peringkat}</span>
                  </td>
                  <td className="text-right tabular-nums">{r.bil}</td>
                  <td className="text-right tabular-nums">{r.purata} hari</td>
                  <td className={kelas('text-right tabular-nums', r.lewat > 0 ? 'font-semibold text-rose-600' : 'text-slate-400')}>
                    {r.lewat}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
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
