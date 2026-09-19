import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Phone, Users } from 'lucide-react'
import { kalendarLawatan } from '@/lib/api'
import { LABEL_KATEGORI } from '@/lib/istilah'
import { formatHari, formatTarikh, kelas, tarikhHariIni, tarikhIso } from '@/lib/guna'
import { KadStatistik, LencanaStatus, Memuat, Mesej } from '@/komponen/ui'
import { TajukHalaman } from '@/komponen/Rangka'
import type { Kategori, LawatanKalendar } from '@/lib/jenis'
import { adaDataCuti, SUMBER_CUTI, TARIKH_SEMAKAN_CUTI } from '@/lib/cuti-kalendar'
import { bacaCuti, gabungCuti, type CutiDiterima } from '@/lib/cuti-auto'

const BULAN = [
  'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
  'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember',
]
const HARI_PENDEK = ['Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab', 'Ahd']

const WARNA_KATEGORI: Record<Kategori, string> = {
  DALAM_DAERAH: 'bg-emerald-600',
  ANTARA_DAERAH: 'bg-biru-500',
  ANTARA_NEGERI: 'bg-violet-600',
  LUAR_NEGARA: 'bg-amber-500',
}

type Tapisan = 'semua' | 'lulus'

const diluluskan = (l: LawatanKalendar) => l.status === 'DILULUSKAN' || l.status === 'SELESAI'
const peserta = (l: LawatanKalendar) => l.bil_murid + l.bil_guru + l.bil_bukan_guru
const berlangsung = (l: LawatanKalendar, hari: string) =>
  l.tarikh_mula <= hari && (l.tarikh_tamat ?? l.tarikh_mula) >= hari

/** Grid Isnin–Ahad yang meliputi seluruh bulan. */
function gridBulan(tahun: number, bulan: number): string[] {
  const pertama = new Date(tahun, bulan, 1)
  const mula = new Date(pertama)
  mula.setDate(1 - ((pertama.getDay() + 6) % 7))
  const akhir = new Date(tahun, bulan + 1, 0)
  const tamat = new Date(akhir)
  tamat.setDate(akhir.getDate() + (6 - ((akhir.getDay() + 6) % 7)))
  const hari: string[] = []
  for (const d = new Date(mula); d <= tamat; d.setDate(d.getDate() + 1)) hari.push(tarikhIso(d))
  return hari
}

export function Kalendar() {
  const hariIni = tarikhHariIni()
  const [bulan, setBulan] = useState(() => {
    const d = new Date()
    return { tahun: d.getFullYear(), bulan: d.getMonth() }
  })
  const [data, setData] = useState<LawatanKalendar[] | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)
  const [pilih, setPilih] = useState<string>(hariIni)
  const [tapisan, setTapisan] = useState<Tapisan>('semua')
  const [ppd, setPpd] = useState('')
  const [kategori, setKategori] = useState('')
  const [rekodCuti, setRekodCuti] = useState<CutiDiterima[]>([])
  const [ralatCuti, setRalatCuti] = useState<string | null>(null)
  const [memuatCuti, setMemuatCuti] = useState(true)
  const [cubaanCuti, setCubaanCuti] = useState(0)

  const grid = useMemo(() => gridBulan(bulan.tahun, bulan.bulan), [bulan])
  const tahunDari = Number(grid[0].slice(0, 4))
  const tahunHingga = Number(grid[grid.length - 1].slice(0, 4))
  useEffect(() => {
    let aktif = true
    setMemuatCuti(true)
    setRalatCuti(null)
    bacaCuti(tahunDari, tahunHingga).then((hasil) => {
      if (aktif) setRekodCuti((lama) => [...lama.filter((c) => c.tahun < tahunDari || c.tahun > tahunHingga), ...hasil])
    }).catch((e) => { if (aktif) setRalatCuti(e.message) })
      .finally(() => { if (aktif) setMemuatCuti(false) })
    return () => { aktif = false }
  }, [tahunDari, tahunHingga, cubaanCuti])
  const semuaCuti = useMemo(() => gabungCuti(rekodCuti), [rekodCuti])
  const cutiPadaTarikh = (tarikh: string) => semuaCuti.filter((c) => c.mula <= tarikh && tarikh <= c.tamat)
  const jenisBelumAda = (tahun: number) => adaDataCuti(tahun) ? [] : (['umum', 'sekolah'] as const)
    .filter((jenis) => !rekodCuti.some((c) => c.tahun === tahun && c.jenis === jenis))

  useEffect(() => {
    let aktif = true
    setData(null)
    setRalat(null)
    // Julat grid sentiasa merangkumi hari ini apabila bulan semasa dipapar.
    kalendarLawatan(grid[0], grid[grid.length - 1])
      .then((hasil) => { if (aktif) setData(hasil) })
      .catch((e) => { if (aktif) setRalat(e instanceof Error ? e.message : 'Gagal memuatkan kalendar.') })
    return () => { aktif = false }
  }, [grid])

  const senaraiPpd = useMemo(() => {
    const m = new Map<string, string>()
    data?.forEach((l) => m.set(l.kod_ppd, l.nama_ppd ?? l.kod_ppd))
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [data])

  const tapis = useMemo(
    () =>
      (data ?? []).filter(
        (l) =>
          (tapisan === 'semua' || diluluskan(l)) &&
          (!ppd || l.kod_ppd === ppd) &&
          (!kategori || l.kategori === kategori),
      ),
    [data, tapisan, ppd, kategori],
  )

  const padaHari = (h: string) => tapis.filter((l) => berlangsung(l, h))
  const hariIniSenarai = padaHari(hariIni).filter(diluluskan)
  const dipilih = padaHari(pilih)
  const cutiDipilih = cutiPadaTarikh(pilih)
  const bulanIni = `${bulan.tahun}-${String(bulan.bulan + 1).padStart(2, '0')}`
  const dalamBulan = tapis.filter(
    (l) => l.tarikh_mula.slice(0, 7) <= bulanIni && (l.tarikh_tamat ?? l.tarikh_mula).slice(0, 7) >= bulanIni,
  )

  function gerak(n: number) {
    setBulan(({ tahun, bulan: b }) => {
      const d = new Date(tahun, b + n, 1)
      return { tahun: d.getFullYear(), bulan: d.getMonth() }
    })
  }

  function keHariIni() {
    const d = new Date()
    setBulan({ tahun: d.getFullYear(), bulan: d.getMonth() })
    setPilih(hariIni)
  }

  return (
    <>
      <TajukHalaman
        ikon={CalendarDays}
        jejak={[{ teks: 'Kalendar' }]}
        tajuk="Kalendar Lawatan"
        nota="Lawatan yang dihantar dan diluluskan dalam skop capaian anda."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KadStatistik
          ikon={MapPin}
          nada={hariIniSenarai.length > 0 ? 'emas' : 'kelabu'}
          label="Lawatan berlangsung hari ini"
          nilai={data ? hariIniSenarai.length : '—'}
        />
        <KadStatistik
          ikon={Users}
          label="Peserta di luar sekolah hari ini"
          nilai={data ? hariIniSenarai.reduce((n, l) => n + peserta(l), 0) : '—'}
        />
        <KadStatistik ikon={CalendarDays} label={`Lawatan pada ${BULAN[bulan.bulan]}`} nilai={data ? dalamBulan.length : '—'} />
        <KadStatistik
          ikon={CalendarDays}
          nada="kelabu"
          label="Masih dalam proses kelulusan"
          nilai={data ? dalamBulan.filter((l) => !diluluskan(l)).length : '—'}
        />
      </div>

      {/* ── Kawalan ───────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button type="button" className="btn-kedua btn-kecil" onClick={() => gerak(-1)} aria-label="Bulan sebelumnya">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <h2 className="min-w-[10rem] text-center text-base font-bold text-jata-900" aria-live="polite">
            {BULAN[bulan.bulan]} {bulan.tahun}
          </h2>
          <button type="button" className="btn-kedua btn-kecil" onClick={() => gerak(1)} aria-label="Bulan seterusnya">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" className="btn-kedua btn-kecil ml-1" onClick={keHariIni}>
            Hari ini
          </button>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select className="medan w-auto py-1.5 text-sm" value={tapisan} onChange={(e) => setTapisan(e.target.value as Tapisan)} aria-label="Status">
            <option value="semua">Diluluskan &amp; dalam proses</option>
            <option value="lulus">Diluluskan sahaja</option>
          </select>
          <select className="medan w-auto py-1.5 text-sm" value={kategori} onChange={(e) => setKategori(e.target.value)} aria-label="Kategori">
            <option value="">Semua kategori</option>
            {Object.entries(LABEL_KATEGORI).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {senaraiPpd.length > 1 && (
            <select className="medan w-auto py-1.5 text-sm" value={ppd} onChange={(e) => setPpd(e.target.value)} aria-label="Daerah">
              <option value="">Semua daerah</option>
              {senaraiPpd.map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {(Object.keys(WARNA_KATEGORI) as Kategori[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={kelas('h-2.5 w-2.5 rounded-sm', WARNA_KATEGORI[k])} aria-hidden />
            {LABEL_KATEGORI[k]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-slate-500" aria-hidden />
          Dalam proses kelulusan
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border border-yellow-400 bg-yellow-100" aria-hidden />
          Cuti umum Perak / cuti sekolah Kumpulan B
        </span>
      </div>

      {memuatCuti && <p role="status" className="mb-3 text-sm text-slate-600">Memuatkan kemas kini cuti…</p>}
      {ralatCuti && <Mesej jenis="ralat">{ralatCuti} Salinan yang tersedia dikekalkan. <button className="underline" type="button" onClick={() => setCubaanCuti((n) => n + 1)}>Cuba lagi</button></Mesej>}
      {!memuatCuti && jenisBelumAda(bulan.tahun).length > 0 && <p role="status" className="mb-3 text-sm text-slate-600">
        Data cuti {jenisBelumAda(bulan.tahun).join(' dan ')} tahun {bulan.tahun} belum tersedia dalam sistem. Tarikh tanpa penanda tidak semestinya hari persekolahan.
      </p>}
      {!adaDataCuti(bulan.tahun) && rekodCuti.some((c) => c.tahun === bulan.tahun) && <p className="mb-3 text-sm text-slate-600">Hanya rekod yang sudah diterima admin dipaparkan. Senarai cuti tahun ini mungkin belum lengkap.</p>}
      <details className="mb-4 text-xs text-slate-600">
        <summary className="w-fit cursor-pointer py-2 underline underline-offset-2">Sumber dan kemas kini cuti</summary>
        <p className="my-2">Rujukan Perak 2026 disemak pada {formatTarikh(TARIKH_SEMAKAN_CUTI)}. Rekod tambahan daripada API dipaparkan selepas diterima admin. Penanda cuti bukan kelulusan atau larangan lawatan.</p>
        <ul className="space-y-2">{Object.entries(SUMBER_CUTI).map(([k, s]) => <li key={k}><a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">{s.nama}</a></li>)}</ul>
      </details>

      {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}
      {!data && !ralat && <Memuat />}

      {(
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
          {/* ── Grid bulan (skrin lebar) ─────────────────────────── */}
          <div className="kad hidden overflow-hidden md:block">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">
              {HARI_PENDEK.map((h) => (
                <div key={h} className="py-2">{h}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {grid.map((h) => {
                const senarai = padaHari(h)
                const cuti = cutiPadaTarikh(h)
                const luar = h.slice(0, 7) !== bulanIni
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setPilih(h)}
                    aria-pressed={pilih === h}
                    aria-label={`${formatTarikh(h)}: ${data ? `${senarai.length} lawatan` : 'Data lawatan belum tersedia'}${cuti.length ? `. ${cuti.map((c) => c.nama).join(', ')}` : ''}`}
                    className={kelas(
                      'flex min-h-[6.5rem] min-w-0 flex-col gap-1 border-b border-r border-slate-100 p-1.5 text-left transition',
                      cuti.length ? 'bg-yellow-100 hover:bg-yellow-200' : 'hover:bg-biru-50/40',
                      luar && !cuti.length && 'bg-slate-50/70 text-slate-400',
                      pilih === h && 'ring-2 ring-inset ring-biru-500',
                    )}
                  >
                    <span
                      className={kelas(
                        'grid h-6 w-6 place-items-center rounded-full text-xs font-semibold',
                        h === hariIni ? 'bg-jata-900 text-white' : luar ? 'text-slate-400' : 'text-jata-900',
                      )}
                    >
                      {Number(h.slice(8))}
                    </span>
                    {senarai.slice(0, 3).map((l) => (
                      <span
                        key={l.id}
                        className={kelas(
                          'block truncate rounded px-1.5 py-0.5 text-[0.65rem] font-medium',
                          diluluskan(l)
                            ? kelas('text-white', l.kategori ? WARNA_KATEGORI[l.kategori] : 'bg-slate-500')
                            : 'border border-dashed border-slate-400 bg-white text-slate-700',
                        )}
                      >
                        {l.nama_sekolah}
                      </span>
                    ))}
                    {senarai.length > 3 && (
                      <span className="text-[0.65rem] font-semibold text-slate-500">+{senarai.length - 3} lagi</span>
                    )}
                    {cuti.length > 0 && <span className="mt-auto block w-full space-y-1 pt-2 text-[0.65rem] leading-snug text-yellow-950">
                      {cuti.map((c) => <span key={`${c.jenis}-${c.nama}`} className="block break-words">{c.jenis === 'sekolah' ? `Cuti sekolah: ${c.nama}` : c.nama}</span>)}
                    </span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Agenda (telefon) ────────────────────────────────── */}
          <div className="space-y-2 md:hidden">
            {grid
              .filter((h) => h.slice(0, 7) === bulanIni && (padaHari(h).length > 0 || cutiPadaTarikh(h).length > 0))
              .map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setPilih(h)}
                  aria-pressed={pilih === h}
                  className={kelas(
                    'kad flex w-full items-center gap-3 px-4 py-3 text-left',
                    cutiPadaTarikh(h).length > 0 && '!bg-yellow-100',
                    pilih === h && 'ring-2 ring-biru-500',
                  )}
                >
                  <span className={kelas('grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-bold', h === hariIni ? 'bg-jata-900 text-white' : 'bg-jata-50 text-jata-900')}>
                    {Number(h.slice(8))}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-jata-900">{formatHari(h)}</span>
                    <span className={kelas('block truncate text-xs', cutiPadaTarikh(h).length ? 'text-yellow-950' : 'text-slate-500')}>
                      {data ? `${padaHari(h).length} lawatan` : 'Data lawatan belum tersedia'}{padaHari(h).length > 0 && ` · ${padaHari(h).map((l) => l.nama_sekolah).join(', ')}`}
                    </span>
                    {cutiPadaTarikh(h).map((c) => <span key={`${c.jenis}-${c.nama}`} className="mt-1 block text-xs text-yellow-950">{c.jenis === 'sekolah' ? `Cuti sekolah: ${c.nama}` : c.nama}</span>)}
                  </span>
                </button>
              ))}
            {data && dalamBulan.length === 0 && !grid.some((h) => h.slice(0, 7) === bulanIni && cutiPadaTarikh(h).length) && (
              <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                Tiada lawatan pada bulan ini.
              </p>
            )}
          </div>

          {/* ── Butiran hari dipilih ────────────────────────────── */}
          <aside className="kad h-fit xl:sticky xl:top-16">
            <div className="kad-tajuk">
              <h2>
                {formatHari(pilih)}, {formatTarikh(pilih)}
              </h2>
              <span className="text-xs text-slate-500">{data ? `${dipilih.length} lawatan` : 'Data lawatan belum tersedia'}</span>
            </div>
            <div className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
              {cutiDipilih.length > 0 && <div className="space-y-3 bg-yellow-100 px-5 py-3 text-sm text-yellow-950">
                {cutiDipilih.map((c) => <div key={`${c.jenis}-${c.nama}`}>
                  <p className="font-semibold">{c.nama}</p>
                  <p className="text-xs">{c.jenis === 'umum' ? 'Cuti umum Perak' : 'Cuti sekolah Kumpulan B'}{c.mula !== c.tamat && ` · ${formatTarikh(c.mula)} – ${formatTarikh(c.tamat)}`}</p>
                  <a href={SUMBER_CUTI[c.sumber].url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs underline underline-offset-2">{c.sumber === 'api' ? 'Sumber API · diterima admin' : 'Rujukan rasmi'}</a>
                </div>)}
              </div>}
              {jenisBelumAda(Number(pilih.slice(0, 4))).length > 0 && <p className="px-5 py-3 text-sm text-slate-600">Sebahagian data cuti tahun ini belum tersedia.</p>}
              {data && dipilih.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-slate-500">Tiada lawatan pada hari ini.</p>
              )}
              {dipilih.map((l) => (
                <article key={l.id} className="space-y-1.5 px-5 py-3.5 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/permohonan/${l.id}`} className="font-semibold text-jata-900 hover:text-biru-600 hover:underline">
                      {l.nama_sekolah}
                    </Link>
                    <LencanaStatus status={l.status} />
                  </div>
                  <p className="line-clamp-2 text-xs text-slate-600">{l.tujuan}</p>
                  <p className="flex items-start gap-1.5 text-xs text-slate-700">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                    {l.tempat.length
                      ? l.tempat
                          .map((t) => [t.tempat, t.negara !== 'Malaysia' ? t.negara : t.negeri].filter(Boolean).join(', '))
                          .join(' → ')
                      : '—'}
                  </p>
                  <p className="flex flex-wrap gap-x-3 text-xs text-slate-500">
                    <span>{formatTarikh(l.tarikh_mula)}{l.tarikh_tamat && l.tarikh_tamat !== l.tarikh_mula ? ` – ${formatTarikh(l.tarikh_tamat)}` : ''}</span>
                    <span>{peserta(l)} peserta</span>
                    {l.kategori && <span>{LABEL_KATEGORI[l.kategori]}</span>}
                    {l.nama_ppd && <span>{l.nama_ppd}</span>}
                  </p>
                  {l.ketua && (
                    <p className="flex items-center gap-1.5 text-xs text-slate-700">
                      <Phone className="h-3.5 w-3.5 text-biru-500" aria-hidden />
                      Ketua: {l.ketua.nama}
                      {l.ketua.telefon && (
                        <a href={`tel:${l.ketua.telefon.replace(/[^\d+]/g, '')}`} className="font-semibold text-biru-600 hover:underline">
                          {l.ketua.telefon}
                        </a>
                      )}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
