import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  dapatPermohonan,
  dapatTetapan,
  senaraiAudit,
  tindakanKelulusan,
  type BundelPermohonan,
} from '@/lib/api'
import { gunaAuth } from '@/lib/auth'
import { lihatDokumen } from '@/lib/r2'
import {
  BAHAGIAN_PELULUS,
  LABEL_KATEGORI,
  LABEL_PENGANGKUTAN,
  LABEL_PERANAN,
  LABEL_PERISTIWA_AUDIT,
  LABEL_PESERTA,
  LABEL_STATUS,
  LABEL_TINDAKAN,
  PERANAN_BAGI_STATUS,
  PERINGKAT_SEMAK,
  SEMAKAN_BAGI_PENGESAH,
  labelSokong,
} from '@/lib/istilah'
import { formatMasa, formatSaiz, formatTarikh, formatWang, kelas, laluan } from '@/lib/guna'
import {
  Baris,
  Berputar,
  LencanaStatus,
  Memuat,
  Mesej,
  Modal,
} from '@/komponen/ui'
import { TajukHalaman } from '@/komponen/Rangka'
import { RantaianKelulusan } from '@/komponen/RantaianKelulusan'
import { PaparanPengesah } from '@/komponen/PaparanPengesah'
import {
  Banknote,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Files,
  History,
  MapPinned,
  PencilLine,
  Printer,
  RotateCcw,
  School,
  ShieldAlert,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { Dokumen, ItemSemakan, LogAudit, Tindakan } from '@/lib/jenis'

export function PaparPermohonan() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { pegawai } = gunaAuth()

  const [b, setB] = useState<BundelPermohonan | null>(null)
  const [audit, setAudit] = useState<LogAudit[]>([])
  const [ralat, setRalat] = useState<string | null>(null)
  const [tindakan, setTindakan] = useState<Tindakan | null>(null)
  const [catatan, setCatatan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [dokPapar, setDokPapar] = useState<Dokumen | null>(null)
  const [itemSemakan, setItemSemakan] = useState<ItemSemakan[]>([])
  const [ditanda, setDitanda] = useState<string[]>([])
  const [paparPenuh, setPaparPenuh] = useState(false)

  const muat = useCallback(async () => {
    if (!id) return
    try {
      setB(await dapatPermohonan(id))
      setAudit(await senaraiAudit(100, id))
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal memuatkan rekod.')
    }
  }, [id])

  useEffect(() => {
    void muat()
  }, [muat])

  useEffect(() => {
    void dapatTetapan<ItemSemakan[]>('item_semakan').then((i) => setItemSemakan(i ?? []))
  }, [])

  if (ralat && !b) return <Mesej jenis="ralat">{ralat}</Mesej>
  if (!b) return <Memuat />

  const p = b.permohonan
  const peranan = pegawai!.peranan
  const peranPerlu = PERANAN_BAGI_STATUS[p.status]
  const giliranSaya = peranPerlu === peranan
  const pintasan = peranan === 'admin' && !!peranPerlu && !giliranSaya
  const bolehBertindak = giliranSaya || pintasan
  const tahapSemak = PERINGKAT_SEMAK.includes(p.status)
  const semuaDitanda = itemSemakan.every((i) => ditanda.includes(i.kod))
  const modPengesah = bolehBertindak && !!SEMAKAN_BAGI_PENGESAH[p.status]
  const ringkas = modPengesah && !paparPenuh
  const milikSekolah = peranan === 'sekolah' && pegawai!.kod_skop === p.kod_sekolah
  const bolehSunting =
    (milikSekolah || peranan === 'admin') &&
    (p.status === 'DRAF' || p.status === 'DIKEMBALIKAN')

  const jumlahA =
    Number(p.kutipan_murid) + Number(p.kutipan_guru) + Number(p.sumber_lain)
  const jumlahB = b.penaja.reduce((n, x) => n + Number(x.jumlah), 0)
  const ketua = b.peserta.find((x) => x.kategori === 'KETUA_ROMBONGAN')

  async function hantarTindakan() {
    if (!tindakan || !id) return
    setSibuk(true)
    setRalat(null)
    try {
      await tindakanKelulusan(
        id,
        tindakan,
        catatan.trim() || undefined,
        tahapSemak && tindakan === 'SOKONG' ? ditanda : undefined,
      )
      setTindakan(null)
      setCatatan('')
      setDitanda([])
      setPaparPenuh(false)
      await muat()
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Tindakan gagal.')
    } finally {
      setSibuk(false)
    }
  }

  async function bukaDokumen(d: Dokumen) {
    try {
      const hasil = await lihatDokumen(d.id)
      window.open(hasil.url, '_blank', 'noopener')
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal membuka dokumen.')
    }
  }

  return (
    <>
      <TajukHalaman
        ikon={FileText}
        jejak={[
          { teks: 'Permohonan', ke: '/senarai' },
          { teks: p.no_rujukan ?? 'Draf' },
        ]}
        tajuk={p.no_rujukan ?? 'Draf Permohonan'}
        nota={
          <span className="flex flex-wrap items-center gap-2">
            <LencanaStatus status={p.status} />
            <span>{b.sekolah.nama} · {b.ppd?.nama ?? p.kod_ppd}</span>
          </span>
        }
        aksi={
          <>
            {bolehSunting && (
              <Link to={`/permohonan/${p.id}/sunting`} className="btn-utama">
                <PencilLine className="h-4 w-4" aria-hidden />
                Sunting
              </Link>
            )}
            <a href={laluan(`cetak/lampiran-a/${p.id}`)} target="_blank" rel="noreferrer" className="btn-kedua">
              <Printer className="h-4 w-4" aria-hidden />
              Lampiran A
            </a>
            <a href={laluan(`cetak/senarai-semak/${p.id}`)} target="_blank" rel="noreferrer" className="btn-kedua">
              <Printer className="h-4 w-4" aria-hidden />
              Senarai Semak
            </a>
            {(p.status === 'DILULUSKAN' || p.status === 'SELESAI') && (
              <a href={laluan(`cetak/surat-kelulusan/${p.id}`)} target="_blank" rel="noreferrer" className="btn-hijau">
                <Printer className="h-4 w-4" aria-hidden />
                Surat Kelulusan
              </a>
            )}
          </>
        }
      />

      {ralat && (
        <div className="mb-5">
          <Mesej jenis="ralat">{ralat}</Mesej>
        </div>
      )}

      {p.status === 'DIKEMBALIKAN' && p.catatan_kembali && (
        <div className="mb-5">
          <Mesej jenis="amaran" tajuk="Dikembalikan untuk pindaan">
            {p.catatan_kembali}
          </Mesej>
        </div>
      )}
      {p.status === 'DITOLAK' && p.catatan_kembali && (
        <div className="mb-5">
          <Mesej jenis="ralat" tajuk="Permohonan ditolak">
            {p.catatan_kembali}
          </Mesej>
        </div>
      )}

      {ringkas && (
        <PaparanPengesah
          b={b}
          peranan={peranPerlu!}
          pintasan={pintasan}
          onTindakan={setTindakan}
          onPaparPenuh={() => setPaparPenuh(true)}
        />
      )}

      {modPengesah && paparPenuh && (
        <div className="mb-5">
          <button type="button" className="btn-kedua btn-kecil" onClick={() => setPaparPenuh(false)}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Kembali ke paparan ringkas
          </button>
        </div>
      )}

      {!ringkas && (
      <>
      {/* ── Aliran kelulusan ──────────────────────────────────── */}
      {p.kategori && (
        <section className="kad mb-6">
          <div className="kad-tajuk">
            <h2 className="flex items-center gap-2">
              <History className="h-4 w-4 text-jata-600" aria-hidden />
              Aliran Kelulusan
            </h2>
            <span className="text-xs text-slate-500">
              {LABEL_KATEGORI[p.kategori]} · Pelulus akhir: {BAHAGIAN_PELULUS[p.kategori]}
            </span>
          </div>
          <div className="kad-isi">
            <RantaianKelulusan permohonan={p} kelulusan={b.kelulusan} />
          </div>
        </section>
      )}

      {/* ── Panel tindakan ─────────────────────────────────────── */}
      {bolehBertindak && (
        <section className="mb-6 overflow-hidden rounded-lg border-2 border-emas-400 bg-white shadow-timbul">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-emas-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-emas-400 text-jata-950">
                {pintasan ? <ShieldAlert className="h-5 w-5" /> : <ClipboardCheck className="h-5 w-5" />}
              </span>
              <div>
                <h2 className="text-base font-bold text-jata-900">
                  {pintasan ? 'Pintasan pentadbir' : 'Tindakan anda diperlukan'}
                </h2>
                <p className="text-xs text-slate-600">
                  {pintasan
                    ? `Peringkat ini sepatutnya ditindak oleh ${LABEL_PERANAN[peranPerlu!]}`
                    : `${LABEL_PERANAN[peranan]} · ${LABEL_STATUS[p.status]}`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-hijau"
                disabled={tahapSemak && !semuaDitanda}
                title={tahapSemak && !semuaDitanda ? 'Tanda semua perkara semakan dahulu' : undefined}
                onClick={() => setTindakan('SOKONG')}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                {labelSokong(p.status, p.kategori)}
              </button>
              <button type="button" className="btn-jingga" onClick={() => setTindakan('KEMBALI')}>
                <RotateCcw className="h-4 w-4" aria-hidden />
                {LABEL_TINDAKAN.KEMBALI}
              </button>
              <button type="button" className="btn-merah" onClick={() => setTindakan('TOLAK')}>
                <XCircle className="h-4 w-4" aria-hidden />
                {LABEL_TINDAKAN.TOLAK}
              </button>
            </div>
          </div>
          {tahapSemak && (
            <fieldset className="border-t border-emas-200 px-5 py-4">
              <legend className="sr-only">Senarai semak penyemak</legend>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-jata-900">
                  Senarai semak penyemak
                  <span className="ml-2 text-xs font-medium text-slate-500">
                    {ditanda.length}/{itemSemakan.length} ditanda
                  </span>
                </p>
                <button
                  type="button"
                  className="btn-halus btn-kecil"
                  onClick={() => setDitanda(semuaDitanda ? [] : itemSemakan.map((i) => i.kod))}
                >
                  {semuaDitanda ? 'Kosongkan semua' : 'Tanda semua'}
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {itemSemakan.map((i) => (
                  <label
                    key={i.kod}
                    className={kelas(
                      'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition',
                      ditanda.includes(i.kod)
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-biru-300',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
                      checked={ditanda.includes(i.kod)}
                      onChange={(e) =>
                        setDitanda((d) =>
                          e.target.checked ? [...d, i.kod] : d.filter((k) => k !== i.kod),
                        )
                      }
                    />
                    {i.label}
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Dengan memperakukan, anda mengesahkan setiap perkara di atas telah disemak.
                Pengesah akan membaca perakuan ini tanpa menyemak semula butiran.
              </p>
            </fieldset>
          )}
          {pintasan && (
            <p className="border-t border-emas-200 px-5 py-2.5 text-xs text-amber-900">
              Tindakan anda direkodkan dalam log audit sebagai pintasan pentadbir dan tidak
              membawa tandatangan sesiapa.
            </p>
          )}
        </section>
      )}

      {/* ── Laporan pasca-lawatan ──────────────────────────────── */}
      {p.status === 'DILULUSKAN' && milikSekolah && (
        <div className="mb-6">
          <Mesej jenis="maklumat" tajuk="Laporan pasca-lawatan">
            Laporan Lampiran G hendaklah dikemukakan dalam tempoh tujuh hari
            selepas lawatan tamat.{' '}
            <Link
              to={`/permohonan/${p.id}/laporan`}
              className="font-medium underline"
            >
              Isi laporan sekarang
            </Link>
          </Mesej>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Bahagian A & B1 */}
          <section className="kad">
            <TajukKad ikon={School} bahagian="A · B1">Sekolah dan Lawatan</TajukKad>
            <div className="kad-isi">
              <dl>
                <Baris label="Sekolah">
                  {b.sekolah.nama} ({b.sekolah.kod_sekolah})
                </Baris>
                <Baris label="Guru Besar / Pengetua">
                  {b.sekolah.nama_guru_besar ?? '—'}
                </Baris>
                <Baris label="Kategori">
                  {p.kategori ? LABEL_KATEGORI[p.kategori] : '—'}
                </Baris>
                <Baris label="Tujuan">{p.tujuan ?? '—'}</Baris>
                <Baris label="Pengangkutan">
                  {p.pengangkutan.length === 0
                    ? '—'
                    : p.pengangkutan
                        .map((x) => LABEL_PENGANGKUTAN[x])
                        .join(', ')}
                </Baris>
                <Baris label="Ciri lawatan">
                  {[
                    p.ada_penginapan && 'Penginapan',
                    p.ada_risiko_tinggi && 'Aktiviti berisiko tinggi',
                    p.ada_aktiviti_air && 'Aktiviti air',
                    p.anjuran_pihak_luar &&
                      `Anjuran pihak luar (${p.nama_penganjur_luar ?? '—'})`,
                    p.ada_anggota_keselamatan && 'Pengiring anggota keselamatan',
                    p.lawatan_berperingkat && 'Lawatan berperingkat',
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Tiada'}
                </Baris>
              </dl>
            </div>
          </section>

          {/* Bahagian B1.4 */}
          <section className="kad">
            <TajukKad ikon={MapPinned} bahagian="B1.4">Tempat Dilawati</TajukKad>
            <div className="kad-isi overflow-x-auto">
              {b.tempat.length === 0 ? (
                <p className="text-sm text-slate-500">Tiada tempat direkodkan.</p>
              ) : (
                <table className="jadual">
                  <thead>
                    <tr>
                      <th>Tempat</th>
                      <th>Lokasi</th>
                      <th>Tarikh</th>
                      {p.ada_penginapan && <th>Penginapan</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {b.tempat.map((t) => (
                      <tr key={t.id}>
                        <td>{t.tempat || '—'}</td>
                        <td className="text-xs text-slate-500">
                          {[t.negeri, t.negara].filter(Boolean).join(', ')}
                        </td>
                        <td className="whitespace-nowrap text-xs">
                          {formatTarikh(t.tarikh_dari)}
                          {t.tarikh_hingga !== t.tarikh_dari &&
                            ` – ${formatTarikh(t.tarikh_hingga)}`}
                        </td>
                        {p.ada_penginapan && (
                          <td className="text-xs">{t.penginapan || '—'}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Bahagian D & E */}
          <section className="kad">
            <TajukKad ikon={Users} bahagian="D · E">Anggota Rombongan</TajukKad>
            <div className="kad-isi space-y-4">
              <dl>
                <Baris label="Ketua rombongan">
                  {ketua ? (
                    <>
                      {ketua.nama}
                      {ketua.jawatan ? ` — ${ketua.jawatan}` : ''}
                      <span className="mt-0.5 block text-xs text-slate-500">
                        KP {ketua.kp ?? '—'} · Tel {ketua.telefon ?? '—'}
                        {ketua.pasport ? ` · Pasport ${ketua.pasport}` : ''}
                      </span>
                    </>
                  ) : (
                    '—'
                  )}
                </Baris>
                <Baris label="Bilangan peserta">
                  {p.bil_murid} murid · {p.bil_guru} guru ·{' '}
                  {p.bil_bukan_guru} bukan guru ={' '}
                  <strong>{p.bil_murid + p.bil_guru + p.bil_bukan_guru}</strong>{' '}
                  orang
                </Baris>
              </dl>

              {(['GURU_PENGIRING', 'BUKAN_MURID', 'ANGGOTA_KESELAMATAN', 'PEMUNGUT_BAYARAN'] as const).map(
                (kat) => {
                  const senarai = b.peserta.filter((x) => x.kategori === kat)
                  if (senarai.length === 0) return null
                  return (
                    <div key={kat}>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {LABEL_PESERTA[kat]} ({senarai.length})
                      </p>
                      <ul className="space-y-1 text-sm">
                        {senarai.map((x) => (
                          <li key={x.id} className="text-slate-700">
                            {x.nama || '—'}
                            {x.kp && (
                              <span className="ml-2 text-xs text-slate-400">
                                {x.kp}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                },
              )}
            </div>
          </section>

          {/* Dokumen */}
          <section className="kad">
            <TajukKad ikon={Files}>Dokumen Sokongan ({b.dokumen.length})</TajukKad>
            <div className="kad-isi">
              {b.dokumen.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Tiada dokumen dimuat naik.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {b.dokumen.map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-slate-800">
                          {d.nama_fail}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatSaiz(d.saiz)} ·{' '}
                          {formatMasa(d.dimuat_naik_pada)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-kedua px-3 py-1.5 text-xs"
                          onClick={() => setDokPapar(d)}
                        >
                          Butiran
                        </button>
                        <button
                          type="button"
                          className="btn-utama px-3 py-1.5 text-xs"
                          onClick={() => bukaDokumen(d)}
                        >
                          Lihat
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        {/* ── Lajur sisi ───────────────────────────────────────── */}
        <div className="space-y-6">
          <section className="kad">
            <TajukKad ikon={Banknote} bahagian="C">Kewangan</TajukKad>
            <div className="kad-isi space-y-2 text-sm">
              <Wang label="Kutipan murid" nilai={Number(p.kutipan_murid)} />
              <Wang label="Kutipan guru" nilai={Number(p.kutipan_guru)} />
              <Wang label="Sumber lain" nilai={Number(p.sumber_lain)} />
              <div className="flex justify-between border-t border-slate-200 pt-2 font-medium">
                <span>JUMLAH A</span>
                <span className="tabular-nums">{formatWang(jumlahA)}</span>
              </div>
              <Wang label="Penaja (JUMLAH B)" nilai={jumlahB} />
              <div className="flex justify-between border-t-2 border-slate-300 pt-2 text-base font-semibold text-jata-700">
                <span>A + B</span>
                <span className="tabular-nums">
                  {formatWang(jumlahA + jumlahB)}
                </span>
              </div>
            </div>
          </section>

          {p.justifikasi_nisbah && (
            <section className="kad">
              <TajukKad ikon={ShieldAlert} bahagian="I">Pengecualian Nisbah</TajukKad>
              <div className="kad-isi text-sm leading-relaxed text-slate-700">
                {p.justifikasi_nisbah}
              </div>
            </section>
          )}

          <section className="kad">
            <TajukKad ikon={ClipboardCheck}>Rekod Tindakan</TajukKad>
            <div className="kad-isi">
              {b.kelulusan.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada tindakan.</p>
              ) : (
                <ol className="space-y-4">
                  {b.kelulusan.map((k) => (
                    <li key={k.id} className="text-sm">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={kelas(
                            'mt-1 h-2 w-2 shrink-0 rounded-full',
                            k.tindakan === 'SOKONG'
                              ? 'bg-emerald-500'
                              : k.tindakan === 'KEMBALI'
                                ? 'bg-orange-500'
                                : 'bg-rose-500',
                          )}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800">
                            {LABEL_TINDAKAN[k.tindakan]}
                            {k.bahagian && (
                              <span className="ml-1.5 text-xs font-normal text-slate-500">
                                Bhg. {k.bahagian}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            {k.nama_pegawai}
                            {k.jawatan_pegawai ? ` — ${k.jawatan_pegawai}` : ''}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatMasa(k.tarikh_tindakan)}
                          </p>
                          {k.semakan && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" aria-hidden />
                              {k.semakan.length} perkara disemak
                            </p>
                          )}
                          {k.pintasan_admin && (
                            <p className="mt-0.5 text-xs font-medium text-amber-700">
                              (pintasan pentadbir)
                            </p>
                          )}
                          {k.catatan && (
                            <p className="mt-1.5 rounded bg-slate-50 px-2.5 py-1.5 text-xs leading-relaxed text-slate-600">
                              {k.catatan}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>

          {peranan !== 'sekolah' && audit.length > 0 && (
            <section className="kad">
              <div className="kad-tajuk">
                <h2 className="flex items-center gap-2">
                  <History className="h-4 w-4 text-jata-600" aria-hidden />
                  Log Audit
                </h2>
                <span className="text-[0.7rem] text-slate-500">Tambah sahaja</span>
              </div>
              <div className="kad-isi max-h-80 overflow-y-auto">
                <ul className="space-y-2.5 text-xs">
                  {audit.map((a) => (
                    <li key={a.id} className="border-l-2 border-slate-200 pl-3">
                      <p className="font-medium text-slate-700">
                        {LABEL_PERISTIWA_AUDIT[a.peristiwa] ?? a.peristiwa}
                      </p>
                      <p className="text-slate-400">
                        {a.emel_pegawai ?? '—'} · {formatMasa(a.masa)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      </div>
      </>
      )}

      {/* ── Modal tindakan ─────────────────────────────────────── */}
      <Modal
        tajuk={
          tindakan === 'SOKONG'
            ? labelSokong(p.status, p.kategori)
            : tindakan
              ? LABEL_TINDAKAN[tindakan]
              : ''
        }
        buka={!!tindakan}
        tutup={() => {
          setTindakan(null)
          setCatatan('')
        }}
      >
        <p className="mb-4 text-sm leading-relaxed text-slate-600">
          {tindakan === 'SOKONG' &&
            (tahapSemak
              ? `Anda memperakukan ${itemSemakan.length} perkara semakan. Permohonan akan dihantar ke peringkat seterusnya. Catatan adalah pilihan.`
              : 'Permohonan akan maju ke peringkat seterusnya. Catatan adalah pilihan.')}
          {tindakan === 'KEMBALI' &&
            'Sekolah boleh menyunting dan menghantar semula. Catatan wajib — nyatakan dengan jelas apa yang perlu dibetulkan.'}
          {tindakan === 'TOLAK' &&
            'Rekod ditutup dan permohonan baharu diperlukan. Catatan wajib.'}
        </p>
        <label className="label">
          Catatan
          {tindakan !== 'SOKONG' && <span className="ml-1 text-rose-600">*</span>}
        </label>
        <textarea
          className="medan min-h-[110px]"
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder={
            tindakan === 'SOKONG'
              ? 'Catatan tambahan (pilihan)'
              : 'Nyatakan sebab dengan jelas — sekurang-kurangnya 10 aksara'
          }
        />
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="btn-kedua"
            onClick={() => {
              setTindakan(null)
              setCatatan('')
            }}
          >
            Batal
          </button>
          <button
            type="button"
            className={
              tindakan === 'SOKONG'
                ? 'btn-hijau'
                : tindakan === 'KEMBALI'
                  ? 'btn-jingga'
                  : 'btn-merah'
            }
            disabled={
              sibuk || (tindakan !== 'SOKONG' && catatan.trim().length < 10)
            }
            onClick={hantarTindakan}
          >
            {sibuk ? <Berputar /> : null}
            Sahkan
          </button>
        </div>
      </Modal>

      {/* ── Modal butiran dokumen ──────────────────────────────── */}
      <Modal
        tajuk="Butiran dokumen"
        buka={!!dokPapar}
        tutup={() => setDokPapar(null)}
      >
        {dokPapar && (
          <dl>
            <Baris label="Nama fail">{dokPapar.nama_fail}</Baris>
            <Baris label="Jenis">{dokPapar.jenis_mime ?? '—'}</Baris>
            <Baris label="Saiz">{formatSaiz(dokPapar.saiz)}</Baris>
            <Baris label="Dimuat naik">
              {formatMasa(dokPapar.dimuat_naik_pada)}
            </Baris>
            <Baris label="Lokasi storan">
              <span className="break-all font-mono text-xs text-slate-500">
                r2://{dokPapar.kunci_r2}
              </span>
            </Baris>
            <Baris label="Cincangan SHA-256">
              <span className="break-all font-mono text-xs">
                {dokPapar.cincangan_sha256}
              </span>
            </Baris>
          </dl>
        )}
        <p className="mt-4 rounded-lg bg-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600">
          Cincangan dikira semasa muat naik. Jika fail ditukar selepas kelulusan,
          nilai ini berubah — membuktikan dokumen yang diluluskan ialah dokumen
          yang sama.
        </p>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="btn-utama"
            onClick={() => dokPapar && bukaDokumen(dokPapar)}
          >
            Buka dokumen
          </button>
        </div>
      </Modal>
    </>
  )
}

function Wang({ label, nilai }: { label: string; nilai: number }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span className="tabular-nums">{formatWang(nilai)}</span>
    </div>
  )
}

function TajukKad({
  ikon: Ikon,
  bahagian,
  children,
}: {
  ikon: LucideIcon
  bahagian?: string
  children: React.ReactNode
}) {
  return (
    <div className="kad-tajuk">
      <h2 className="flex items-center gap-2">
        <Ikon className="h-4 w-4 text-jata-600" aria-hidden />
        {children}
      </h2>
      {bahagian && (
        <span className="rounded bg-jata-50 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-jata-700">
          Bhg. {bahagian}
        </span>
      )}
    </div>
  )
}
