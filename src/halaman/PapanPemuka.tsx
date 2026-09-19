import { hariMalaysia } from '@/lib/tarikh-lawatan'
import { dalamTapisPapan } from '@/lib/tapis-papan-pemuka'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FilePlus2,
  FileSearch,
  Hourglass,
  Inbox,
  LayoutDashboard,
  PencilLine,
  UserRound,
} from 'lucide-react'
import { gunaAuth, PERANAN_PELULUS } from '@/lib/auth'
import { dapatTetapan, permohonanDenganLaporan } from '@/lib/api'
import { LABEL_KATEGORI, LABEL_PERANAN, PERANAN_BAGI_STATUS } from '@/lib/istilah'
import { formatHari, formatTarikh } from '@/lib/guna'
import { JadualPermohonan } from '@/komponen/JadualPermohonan'
import { keadaanHadMasa } from '@/komponen/HadMasa'
import { KadStatistik, Kosong, Memuat, Mesej } from '@/komponen/ui'
import { TajukHalaman } from '@/komponen/Rangka'
import type { Kategori, PermohonanRingkas, Status } from '@/lib/jenis'

export function PapanPemuka() {
  const { pegawai, sekolah, pemangkuan, perananBertindak } = gunaAuth()
  const [senarai, setSenarai] = useState<PermohonanRingkas[] | null>(null)
  const [tempoh, setTempoh] = useState<Record<string, number> | null>(null)
  const [hariIni, setHariIni] = useState(hariMalaysia)
  const [ralat, setRalat] = useState<string | null>(null)

  useEffect(() => {
    permohonanDenganLaporan().then(setSenarai).catch((e) => setRalat(e.message))
    dapatTetapan<Record<string, number>>('tempoh_minimum').then(setTempoh)
  }, [])

  useEffect(() => {
    const segar = () => setHariIni(hariMalaysia())
    const sela = window.setInterval(segar, 60000)
    window.addEventListener('focus', segar)
    return () => { window.clearInterval(sela); window.removeEventListener('focus', segar) }
  }, [])

  const peranan = pegawai!.peranan
  const adalahSekolah = peranan === 'sekolah'
  const adalahPelulus = PERANAN_PELULUS.includes(peranan)

  // Termasuk peringkat pengesah yang sedang dipangku.
  const statusSaya = useMemo(
    () =>
      Object.entries(PERANAN_BAGI_STATUS)
        .filter(([, r]) => !!r && perananBertindak.includes(r))
        .map(([s]) => s as Status),
    [perananBertindak],
  )

  if (ralat) return <Mesej jenis="ralat">{ralat}</Mesej>
  if (!senarai) return <Memuat />

  const petiTindakan = senarai.filter(p => dalamTapisPapan(p, 'tindakan', hariIni, statusSaya))
  const draf = senarai.filter(p => dalamTapisPapan(p, 'draf', hariIni))
  const dalamProses = senarai.filter(p => dalamTapisPapan(p, 'proses', hariIni))
  const diluluskan = senarai.filter(p => dalamTapisPapan(p, 'lulus', hariIni))
  const perluLaporan = senarai.filter(p => dalamTapisPapan(p, 'laporan_perlu', hariIni))
  const siapLaporan = senarai.filter(p => dalamTapisPapan(p, 'laporan_siap', hariIni))
  const perlu = adalahSekolah ? draf : petiTindakan
  const kini = new Date().toISOString()
  // Pentadbir memantau semua peringkat; pelulus memantau peti sendiri.
  const lewat = (peranan === 'admin' ? dalamProses : petiTindakan).filter(
    (p) => keadaanHadMasa(p) === 'lewat',
  )

  return (
    <>
      <TajukHalaman
        ikon={adalahPelulus ? Inbox : LayoutDashboard}
        tajuk={adalahPelulus ? 'Peti Tindakan' : 'Papan Pemuka'}
        nota={
          <>
            Selamat datang, <strong className="text-jata-900">{adalahSekolah ? sekolah?.nama : pegawai!.nama}</strong>
            {' · '}
            {LABEL_PERANAN[peranan]}
            {' · '}
            {formatHari(kini)}, {formatTarikh(kini)}
          </>
        }
        aksi={
          // Hanya sekolah memohon; PPD, JPN dan pentadbir menyemak dan meluluskan.
          adalahSekolah ? (
            <Link to="/permohonan/baharu" className="btn-utama">
              <FilePlus2 className="h-4 w-4" aria-hidden />
              Permohonan Baharu
            </Link>
          ) : null
        }
      />

      {pemangkuan.length > 0 && (
        <div className="mb-4">
          <Mesej jenis="maklumat" tajuk="Anda sedang memangku">
            {pemangkuan.map((m) => (
              <span key={m.pegawai_asal} className="block">
                {m.nama}
                {m.jawatan ? ` (${m.jawatan})` : ''} hingga {formatTarikh(m.tarikh_tamat)}.
                Permohonan di peringkat pengesahan dipaparkan dalam peti tindakan anda.
              </span>
            ))}
          </Mesej>
        </div>
      )}

      {lewat.length > 0 && (
        <div className="mb-4">
          <Mesej jenis="amaran" tajuk={`${lewat.length} permohonan melebihi had masa tindakan`}>
            {peranan === 'admin'
              ? 'Pegawai berkenaan telah dimaklumkan. Semak permohonan bertanda merah dalam Semua Permohonan.'
              : 'Permohonan bertanda merah di bawah perlu diutamakan.'}
          </Mesej>
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <KadStatistik
          ikon={adalahSekolah ? PencilLine : Inbox}
          nada={perlu.length > 0 ? 'emas' : 'kelabu'}
          label={adalahSekolah ? 'Draf & perlu pindaan' : 'Menunggu tindakan anda'}
          ke={`/senarai?kumpulan=${adalahSekolah ? 'draf' : 'tindakan'}`}
          nilai={perlu.length}
        />
        <KadStatistik ke="/senarai?kumpulan=proses" ikon={Hourglass} label="Dalam proses kelulusan" nilai={dalamProses.length} />
        <KadStatistik ke="/senarai?kumpulan=lulus" ikon={CheckCircle2} nada="hijau" label="Diluluskan & selesai" nilai={diluluskan.length} />
        <KadStatistik
          ikon={ClipboardList}
          nada="kelabu"
          label={adalahSekolah ? 'Jumlah permohonan sekolah' : 'Jumlah rekod dalam skop'}
          ke="/senarai"
          nilai={senarai.length}
        />
        <KadStatistik ikon={ClipboardList} ke="/senarai?kumpulan=laporan_perlu"
          nada={perluLaporan.length ? 'emas' : 'kelabu'}
          label="Laporan pasca-lawatan sekolah — Perlu disiapkan" nilai={perluLaporan.length} nota="Lawatan tamat, laporan belum dihantar" />
        <KadStatistik ikon={CheckCircle2} ke="/senarai?kumpulan=laporan_siap" nada="hijau"
          label="Laporan pasca-lawatan sekolah — Siap" nilai={siapLaporan.length} nota="Laporan telah dihantar" />
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-8">
          <section>
            <h2 className="tajuk-seksyen">
              <span className="h-4 w-1 rounded bg-biru-500" aria-hidden />
              {adalahSekolah ? 'Perlu tindakan sekolah' : 'Menunggu tindakan anda'}
              {perlu.length > 0 && (
                <span className="rounded-full bg-emas-100 px-2 py-0.5 text-[0.65rem] text-emas-700">
                  {perlu.length}
                </span>
              )}
            </h2>
            {perlu.length === 0 ? (
              <Kosong
                tajuk={adalahSekolah ? 'Tiada draf tertunggak' : 'Tiada permohonan menunggu'}
                nota={
                  adalahSekolah
                    ? 'Mulakan permohonan baharu apabila lawatan seterusnya dirancang.'
                    : 'Semua permohonan pada peringkat anda telah diambil tindakan.'
                }
                aksi={
                  adalahSekolah ? (
                    <Link to="/permohonan/baharu" className="btn-utama">
                      <FilePlus2 className="h-4 w-4" aria-hidden />
                      Permohonan Baharu
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <JadualPermohonan
                senarai={perlu}
                tunjukSekolah={!adalahSekolah}
                tindakan={adalahSekolah ? 'Sunting' : 'Semak'}
              />
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="tajuk-seksyen mb-0">
                <span className="h-4 w-1 rounded bg-jata-600" aria-hidden />
                Rekod terkini
              </h2>
              {senarai.length > 8 && (
                <Link to="/senarai" className="inline-flex items-center gap-1 text-xs font-semibold text-jata-700 hover:underline">
                  Lihat semua {senarai.length} rekod
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              )}
            </div>
            {senarai.length === 0 ? (
              <Kosong tajuk="Belum ada rekod" />
            ) : (
              <JadualPermohonan senarai={senarai.slice(0, 8)} tunjukSekolah={!adalahSekolah} />
            )}
          </section>
        </div>

        {/* ── Lajur sisi ─────────────────────────────────────────── */}
        <aside className="space-y-5">
          <div className="kad">
            <div className="kad-tajuk">
              <h2>Tempoh minimum permohonan</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {(Object.keys(LABEL_KATEGORI) as Kategori[]).map((k) => (
                <li key={k} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <span className="text-slate-700">{LABEL_KATEGORI[k]}</span>
                  <span className="rounded bg-jata-50 px-2 py-0.5 text-xs font-bold tabular-nums text-jata-800">
                    {tempoh?.[k] ?? '—'} hari
                  </span>
                </li>
              ))}
            </ul>
            <p className="border-t border-slate-100 px-5 py-2.5 text-[0.7rem] text-slate-500">
              Sebelum tarikh lawatan — Lampiran E dan F, SPI Bil. 9/2023
            </p>
          </div>

          <div className="kad">
            <div className="kad-tajuk">
              <h2>Pautan pantas</h2>
            </div>
            <ul className="p-2 text-sm">
              {[
                { ke: '/senarai', teks: 'Semua permohonan', ikon: ClipboardList },
                { ke: '/sah', teks: 'Semak kesahihan surat', ikon: FileSearch },
                { ke: '/profil', teks: 'Profil, tandatangan & cop', ikon: UserRound },
              ].map((l) => (
                <li key={l.ke}>
                  <Link
                    to={l.ke}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-slate-700 hover:bg-jata-50 hover:text-jata-800"
                  >
                    <l.ikon className="h-4 w-4 text-jata-600" aria-hidden />
                    {l.teks}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </>
  )
}
