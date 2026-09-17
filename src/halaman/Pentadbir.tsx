import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  catatAudit,
  importPegawai,
  importSekolah,
  padamPegawai,
  padamPermohonan,
  semuaPpd,
  semuaTetapan,
  senaraiAudit,
  senaraiPegawai,
  senaraiPermohonan,
  senaraiSekolah,
  simpanPegawai,
  simpanSekolah,
  simpanTetapan,
  tukarStatusPentadbir,
} from '@/lib/api'
import { gunaAuth } from '@/lib/auth'
import { DOMAIN_DIBENARKAN } from '@/lib/supabase'
import {
  LABEL_KATEGORI,
  LABEL_PERANAN,
  LABEL_PERISTIWA_AUDIT,
  LABEL_STATUS,
} from '@/lib/istilah'
import { formatMasa, huraiCsv, kelas, muatTurun } from '@/lib/guna'
import {
  Berputar,
  LencanaStatus,
  Medan,
  Memuat,
  Mesej,
  Modal,
} from '@/komponen/ui'
import { TajukHalaman } from '@/komponen/Rangka'
import { segarJabatan, type MaklumatJabatan, MAKLUMAT_LALAI } from '@/lib/jabatan'
import { Settings } from 'lucide-react'
import type {
  LogAudit,
  Pegawai,
  Peranan,
  PermohonanRingkas,
  Ppd,
  Sekolah,
  Status,
} from '@/lib/jenis'

const TAB = [
  { kod: 'pegawai', teks: 'Pegawai & Peranan' },
  { kod: 'import', teks: 'Import Akaun' },
  { kod: 'sekolah', teks: 'Profil Sekolah' },
  { kod: 'kategori', teks: 'Tetapan & Surat' },
  { kod: 'permohonan', teks: 'Semua Permohonan' },
  { kod: 'sistem', teks: 'Sistem' },
] as const

type KodTab = (typeof TAB)[number]['kod']

export function Pentadbir() {
  const [tab, setTab] = useState<KodTab>('pegawai')

  return (
    <>
      <TajukHalaman
        ikon={Settings}
        jejak={[{ teks: 'Pentadbiran' }]}
        tajuk="Panel Pentadbir"
        nota="Setiap tindakan pentadbir direkodkan dalam log audit."
      />

      <div className="mb-6 overflow-x-auto border-b border-slate-200">
        <nav className="flex min-w-max gap-1" role="tablist">
          {TAB.map((t) => (
            <button
              key={t.kod}
              type="button"
              onClick={() => setTab(t.kod)}
              className={kelas(
                '-mb-px border-b-[3px] px-4 py-3 text-sm font-semibold transition',
                tab === t.kod
                  ? 'border-biru-500 text-jata-900'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-jata-800',
              )}
            >
              {t.teks}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'pegawai' && <TabPegawai />}
      {tab === 'import' && <TabImport />}
      {tab === 'sekolah' && <TabSekolah />}
      {tab === 'kategori' && <TabKategori />}
      {tab === 'permohonan' && <TabPermohonan />}
      {tab === 'sistem' && <TabSistem />}
    </>
  )
}

// ══ Tab 1 — Pegawai & Peranan ═══════════════════════════════════════

const PERANAN_SENARAI: Peranan[] = [
  'sekolah', 'ppd_pegawai', 'ppd_ketua',
  'jpn_pegawai', 'jpn_pengarah', 'kpm', 'admin',
]

function TabPegawai() {
  const { pegawai: saya } = gunaAuth()
  const [senarai, setSenarai] = useState<Pegawai[] | null>(null)
  const [ppd, setPpd] = useState<Ppd[]>([])
  const [ralat, setRalat] = useState<string | null>(null)
  const [sunting, setSunting] = useState<Partial<Pegawai> | null>(null)
  const [sibuk, setSibuk] = useState(false)

  async function muat() {
    try {
      setSenarai(await senaraiPegawai())
      setPpd(await semuaPpd())
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal memuatkan.')
    }
  }
  useEffect(() => {
    void muat()
  }, [])

  async function simpan() {
    if (!sunting?.emel || !sunting.nama || !sunting.peranan) return
    const domain = sunting.emel.split('@')[1]?.toLowerCase() ?? ''
    if (!DOMAIN_DIBENARKAN.includes(domain)) {
      setRalat(`Hanya domain ${DOMAIN_DIBENARKAN.join(' atau ')} diterima.`)
      return
    }
    setSibuk(true)
    setRalat(null)
    try {
      await simpanPegawai(sunting.id ?? null, {
        emel: sunting.emel.trim().toLowerCase(),
        nama: sunting.nama.trim(),
        peranan: sunting.peranan,
        kod_skop: sunting.kod_skop?.trim() || null,
        jawatan: sunting.jawatan?.trim() || null,
        telefon: sunting.telefon?.trim() || null,
        aktif: sunting.aktif ?? true,
      })
      await catatAudit(
        sunting.id ? 'PEGAWAI_DIKEMASKINI' : 'PEGAWAI_DIDAFTARKAN',
        saya?.id ?? null,
        { emel: sunting.emel, peranan: sunting.peranan },
      )
      setSunting(null)
      await muat()
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal menyimpan pegawai.')
    } finally {
      setSibuk(false)
    }
  }

  async function padam(p: Pegawai) {
    if (p.id === saya?.id) {
      setRalat('Anda tidak boleh memadam akaun anda sendiri.')
      return
    }
    setSibuk(true)
    try {
      await padamPegawai(p.id)
      await catatAudit('PEGAWAI_DIPADAM', saya?.id ?? null, { emel: p.emel })
      await muat()
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal memadam.')
    } finally {
      setSibuk(false)
    }
  }

  if (!senarai) return <Memuat />

  return (
    <div className="space-y-4">
      {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}

      <div className="flex justify-between">
        <p className="text-sm text-slate-500">
          {senarai.length} akaun berdaftar. Peranan diberi kepada jawatan —
          tukar e-mel untuk menukar pemegang tanpa menyekat permohonan.
        </p>
        <button
          type="button"
          className="btn-utama"
          onClick={() => setSunting({ peranan: 'ppd_pegawai', aktif: true })}
        >
          Daftar pegawai
        </button>
      </div>

      <div className="kad overflow-x-auto">
        <table className="jadual">
          <thead>
            <tr>
              <th>Nama</th>
              <th>E-mel</th>
              <th>Peranan</th>
              <th>Skop</th>
              <th>Jawatan</th>
              <th>Tandatangan / cop</th>
              <th>Log masuk</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {senarai.map((p) => (
              <tr key={p.id} className={kelas(!p.aktif && 'opacity-50')}>
                <td className="font-medium">{p.nama}</td>
                <td className="font-mono text-xs">{p.emel}</td>
                <td className="text-xs">{LABEL_PERANAN[p.peranan]}</td>
                <td className="font-mono text-xs">{p.kod_skop ?? '—'}</td>
                <td className="text-xs text-slate-500">{p.jawatan ?? '—'}</td>
                <td className="whitespace-nowrap text-xs">
                  <span className={p.kunci_tandatangan ? 'text-emerald-600' : 'text-slate-400'}>
                    {p.kunci_tandatangan ? 'Tandatangan ✓' : 'Tiada tandatangan'}
                  </span>
                  <br />
                  <span className={p.kunci_cop ? 'text-emerald-600' : 'text-slate-400'}>
                    {p.kunci_cop ? 'Cop ✓' : 'Tiada cop'}
                  </span>
                </td>
                <td className="text-xs">
                  {p.user_id ? (
                    <span className="text-emerald-600">Pernah</span>
                  ) : (
                    <span className="text-slate-400">Belum</span>
                  )}
                </td>
                <td className="whitespace-nowrap">
                  <button
                    type="button"
                    className="text-xs font-medium text-jata-600 hover:underline"
                    onClick={() => setSunting(p)}
                  >
                    Sunting
                  </button>
                  <button
                    type="button"
                    className="ml-3 text-xs font-medium text-rose-600 hover:underline"
                    onClick={() => padam(p)}
                    disabled={sibuk}
                  >
                    Padam
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        tajuk={sunting?.id ? 'Sunting pegawai' : 'Daftar pegawai baharu'}
        buka={!!sunting}
        tutup={() => setSunting(null)}
      >
        {sunting && (
          <div className="space-y-4">
            <Medan label="Nama penuh" perlu>
              <input
                className="medan"
                value={sunting.nama ?? ''}
                onChange={(e) => setSunting({ ...sunting, nama: e.target.value })}
              />
            </Medan>
            <Medan
              label="E-mel"
              perlu
              nota={`Domain dibenarkan: ${DOMAIN_DIBENARKAN.join(', ')}`}
            >
              <input
                className="medan"
                type="email"
                value={sunting.emel ?? ''}
                onChange={(e) => setSunting({ ...sunting, emel: e.target.value })}
              />
            </Medan>
            <Medan label="Peranan" perlu>
              <select
                className="medan"
                value={sunting.peranan ?? 'ppd_pegawai'}
                onChange={(e) =>
                  setSunting({ ...sunting, peranan: e.target.value as Peranan })
                }
              >
                {PERANAN_SENARAI.map((r) => (
                  <option key={r} value={r}>
                    {LABEL_PERANAN[r]}
                  </option>
                ))}
              </select>
            </Medan>
            <Medan
              label="Kod skop"
              nota="Kod PPD bagi peranan PPD, kod JPN (A) bagi peranan JPN, kod sekolah bagi akaun sekolah. Kosongkan bagi KPM dan pentadbir."
            >
              {sunting.peranan === 'ppd_pegawai' || sunting.peranan === 'ppd_ketua' ? (
                <select
                  className="medan"
                  value={sunting.kod_skop ?? ''}
                  onChange={(e) =>
                    setSunting({ ...sunting, kod_skop: e.target.value })
                  }
                >
                  <option value="">— pilih daerah —</option>
                  {ppd.map((d) => (
                    <option key={d.kod_ppd} value={d.kod_ppd}>
                      {d.nama} ({d.kod_ppd})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="medan"
                  value={sunting.kod_skop ?? ''}
                  onChange={(e) =>
                    setSunting({ ...sunting, kod_skop: e.target.value })
                  }
                />
              )}
            </Medan>
            <Medan label="Jawatan">
              <input
                className="medan"
                value={sunting.jawatan ?? ''}
                onChange={(e) =>
                  setSunting({ ...sunting, jawatan: e.target.value })
                }
              />
            </Medan>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-jata-600"
                checked={sunting.aktif ?? true}
                onChange={(e) =>
                  setSunting({ ...sunting, aktif: e.target.checked })
                }
              />
              Akaun aktif
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn-kedua"
                onClick={() => setSunting(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-utama"
                onClick={simpan}
                disabled={sibuk}
              >
                {sibuk ? <Berputar /> : null}
                Simpan
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ══ Tab 2 — Import Akaun ════════════════════════════════════════════

function TabImport() {
  const { pegawai: saya } = gunaAuth()
  const [mod, setMod] = useState<'sekolah' | 'pegawai'>('sekolah')
  const [teks, setTeks] = useState('')
  const [ralat, setRalat] = useState<string | null>(null)
  const [berjaya, setBerjaya] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)

  const baris = teks.trim() ? huraiCsv(teks.trim()) : []
  const kepala = baris[0] ?? []
  const isi = baris.slice(1)

  const lajurSekolah = ['kod_sekolah', 'nama', 'emel', 'kod_ppd', 'jenis', 'nama_guru_besar']
  const lajurPegawai = ['emel', 'nama', 'peranan', 'kod_skop', 'jawatan']
  const lajurPerlu = mod === 'sekolah' ? lajurSekolah.slice(0, 4) : lajurPegawai.slice(0, 3)
  const lajurJangka = mod === 'sekolah' ? lajurSekolah : lajurPegawai

  const kepalaSah = lajurPerlu.every((l) =>
    kepala.map((k) => k.toLowerCase()).includes(l),
  )

  function nilai(b: string[], lajur: string): string {
    const i = kepala.findIndex((k) => k.toLowerCase() === lajur)
    return i >= 0 ? (b[i] ?? '') : ''
  }

  function sahBaris(b: string[]): string | null {
    for (const l of lajurPerlu) {
      if (!nilai(b, l)) return `Lajur ${l} kosong`
    }
    const emel = nilai(b, 'emel').toLowerCase()
    const domain = emel.split('@')[1] ?? ''
    if (!DOMAIN_DIBENARKAN.includes(domain)) return 'Domain e-mel tidak sah'
    if (mod === 'pegawai') {
      const r = nilai(b, 'peranan')
      if (!PERANAN_SENARAI.includes(r as Peranan)) return `Peranan "${r}" tidak dikenali`
    }
    return null
  }

  const sah = isi.filter((b) => !sahBaris(b))

  async function import_() {
    setSibuk(true)
    setRalat(null)
    setBerjaya(null)
    try {
      if (mod === 'sekolah') {
        await importSekolah(
          sah.map((b) => ({
            kod_sekolah: nilai(b, 'kod_sekolah').toUpperCase(),
            nama: nilai(b, 'nama'),
            emel: nilai(b, 'emel').toLowerCase(),
            kod_ppd: nilai(b, 'kod_ppd').toUpperCase(),
            jenis: nilai(b, 'jenis').toUpperCase() || 'RENDAH',
            nama_guru_besar: nilai(b, 'nama_guru_besar') || null,
          })),
        )
      } else {
        await importPegawai(
          sah.map((b) => ({
            emel: nilai(b, 'emel').toLowerCase(),
            nama: nilai(b, 'nama'),
            peranan: nilai(b, 'peranan') as Peranan,
            kod_skop: nilai(b, 'kod_skop') || null,
            jawatan: nilai(b, 'jawatan') || null,
          })),
        )
      }
      await catatAudit('IMPORT_PUKAL', saya?.id ?? null, {
        mod,
        bilangan: sah.length,
      })
      setBerjaya(`${sah.length} baris diimport.`)
      setTeks('')
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Import gagal.')
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div className="space-y-4">
      {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}
      {berjaya && <Mesej jenis="berjaya">{berjaya}</Mesej>}

      <div className="flex gap-2">
        {(['sekolah', 'pegawai'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMod(m)}
            className={kelas(
              'rounded-lg px-4 py-2 text-sm font-medium transition',
              mod === m
                ? 'bg-jata-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-300',
            )}
          >
            {m === 'sekolah' ? 'Senarai sekolah JPN' : 'Akaun pegawai'}
          </button>
        ))}
      </div>

      <section className="kad">
        <div className="kad-tajuk">
          <h2>
            Tampal CSV
          </h2>
          <p className="-mt-1 basis-full text-xs text-slate-500">
            Baris pertama mesti kepala lajur. Lajur dijangka:{' '}
            <span className="font-mono">{lajurJangka.join(', ')}</span>. Lajur
            wajib: <span className="font-mono">{lajurPerlu.join(', ')}</span>.
          </p>
        </div>
        <div className="kad-isi space-y-3">
          <textarea
            className="medan min-h-[180px] font-mono text-xs"
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            placeholder={
              mod === 'sekolah'
                ? 'kod_sekolah,nama,emel,kod_ppd,jenis,nama_guru_besar\nABA1234,SK Seri Kinta,aba1234@moe-dl.edu.my,PRK-KU,RENDAH,Tuan Haji Zulkifli'
                : 'emel,nama,peranan,kod_skop,jawatan\nppd.ku.pegawai@moe.gov.my,Encik Hafiz,ppd_pegawai,PRK-KU,Pegawai Unit Pengurusan Sekolah'
            }
          />
          <button
            type="button"
            className="btn-kedua"
            onClick={() =>
              muatTurun(
                `templat-import-${mod}.csv`,
                `${lajurJangka.join(',')}\n`,
                'text/csv;charset=utf-8',
              )
            }
          >
            Muat turun templat
          </button>
        </div>
      </section>

      {isi.length > 0 && (
        <section className="kad">
          <div className="kad-tajuk">
            <h2>
              Pratonton — {sah.length} daripada {isi.length} baris sah
            </h2>
            <button
              type="button"
              className="btn-utama"
              disabled={!kepalaSah || sah.length === 0 || sibuk}
              onClick={import_}
            >
              {sibuk ? <Berputar /> : null}
              Import {sah.length} baris
            </button>
          </div>
          <div className="kad-isi overflow-x-auto">
            {!kepalaSah && (
              <div className="mb-3">
                <Mesej jenis="ralat">
                  Kepala lajur tidak sepadan. Diperlukan: {lajurPerlu.join(', ')}.
                </Mesej>
              </div>
            )}
            <table className="jadual">
              <thead>
                <tr>
                  <th className="w-10">#</th>
                  {kepala.map((k) => (
                    <th key={k}>{k}</th>
                  ))}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isi.slice(0, 50).map((b, i) => {
                  const masalah = sahBaris(b)
                  return (
                    <tr key={i} className={kelas(masalah && 'bg-rose-50/50')}>
                      <td className="text-slate-400">{i + 1}</td>
                      {kepala.map((_, j) => (
                        <td key={j} className="max-w-[180px] truncate text-xs">
                          {b[j] ?? ''}
                        </td>
                      ))}
                      <td className="text-xs">
                        {masalah ? (
                          <span className="text-rose-600">{masalah}</span>
                        ) : (
                          <span className="text-emerald-600">Sah</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {isi.length > 50 && (
              <p className="mt-3 text-xs text-slate-500">
                Memaparkan 50 baris pertama daripada {isi.length}.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

// ══ Tab 3 — Profil Sekolah ══════════════════════════════════════════

function TabSekolah() {
  const [senarai, setSenarai] = useState<Sekolah[] | null>(null)
  const [ppd, setPpd] = useState<Ppd[]>([])
  const [carian, setCarian] = useState('')
  const [sunting, setSunting] = useState<Sekolah | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)

  async function muat() {
    try {
      setSenarai(await senaraiSekolah())
      setPpd(await semuaPpd())
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal memuatkan.')
    }
  }
  useEffect(() => {
    void muat()
  }, [])

  if (!senarai) return <Memuat />

  const c = carian.trim().toLowerCase()
  const ditapis = c
    ? senarai.filter((s) =>
        [s.nama, s.kod_sekolah, s.emel, s.kod_ppd].some((n) =>
          n.toLowerCase().includes(c),
        ),
      )
    : senarai

  async function simpan() {
    if (!sunting) return
    setSibuk(true)
    try {
      await simpanSekolah(sunting.kod_sekolah, {
        nama: sunting.nama,
        emel: sunting.emel.toLowerCase(),
        jenis: sunting.jenis,
        kod_ppd: sunting.kod_ppd,
        nama_guru_besar: sunting.nama_guru_besar,
        alamat: sunting.alamat,
        poskod: sunting.poskod,
        bandar: sunting.bandar,
        telefon: sunting.telefon,
        faks: sunting.faks,
        aktif: sunting.aktif,
      })
      setSunting(null)
      await muat()
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal menyimpan.')
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div className="space-y-4">
      {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}
      <div className="flex items-center justify-between gap-4">
        <input
          className="medan max-w-sm"
          placeholder="Cari sekolah, kod atau e-mel…"
          value={carian}
          onChange={(e) => setCarian(e.target.value)}
        />
        <p className="text-sm text-slate-500">
          {ditapis.length} daripada {senarai.length} sekolah
        </p>
      </div>

      <Mesej jenis="maklumat">
        Pemetaan sekolah kepada PPD di sini menentukan permohonan sampai ke meja
        mana. Ketepatan senarai ini adalah asas keseluruhan sistem.
      </Mesej>

      <div className="kad overflow-x-auto">
        <table className="jadual">
          <thead>
            <tr>
              <th>Kod</th>
              <th>Nama sekolah</th>
              <th>Jenis</th>
              <th>E-mel</th>
              <th>PPD</th>
              <th>Guru Besar</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {ditapis.slice(0, 200).map((s) => (
              <tr key={s.kod_sekolah} className={kelas(!s.aktif && 'opacity-50')}>
                <td className="font-mono text-xs">{s.kod_sekolah}</td>
                <td className="font-medium">{s.nama}</td>
                <td className="text-xs">{s.jenis}</td>
                <td className="font-mono text-xs">{s.emel}</td>
                <td className="text-xs">
                  {ppd.find((d) => d.kod_ppd === s.kod_ppd)?.nama ?? s.kod_ppd}
                </td>
                <td className="text-xs text-slate-500">
                  {s.nama_guru_besar ?? '—'}
                </td>
                <td>
                  <button
                    type="button"
                    className="text-xs font-medium text-jata-600 hover:underline"
                    onClick={() => setSunting(s)}
                  >
                    Sunting
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        tajuk={`Sunting — ${sunting?.nama ?? ''}`}
        buka={!!sunting}
        tutup={() => setSunting(null)}
        lebar="max-w-2xl"
      >
        {sunting && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Medan label="Nama sekolah" perlu>
                <input
                  className="medan"
                  value={sunting.nama}
                  onChange={(e) => setSunting({ ...sunting, nama: e.target.value })}
                />
              </Medan>
            </div>
            <Medan label="E-mel rasmi" perlu>
              <input
                className="medan"
                value={sunting.emel}
                onChange={(e) => setSunting({ ...sunting, emel: e.target.value })}
              />
            </Medan>
            <Medan label="PPD" perlu>
              <select
                className="medan"
                value={sunting.kod_ppd}
                onChange={(e) =>
                  setSunting({ ...sunting, kod_ppd: e.target.value })
                }
              >
                {ppd.map((d) => (
                  <option key={d.kod_ppd} value={d.kod_ppd}>
                    {d.nama}
                  </option>
                ))}
              </select>
            </Medan>
            <Medan label="Jenis sekolah">
              <select
                className="medan"
                value={sunting.jenis}
                onChange={(e) => setSunting({ ...sunting, jenis: e.target.value })}
              >
                {['RENDAH', 'MENENGAH', 'PRASEKOLAH', 'KHAS', 'TEKNIK', 'SBP', 'AGAMA'].map(
                  (j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ),
                )}
              </select>
            </Medan>
            <Medan label="Pengetua / Guru Besar">
              <input
                className="medan"
                value={sunting.nama_guru_besar ?? ''}
                onChange={(e) =>
                  setSunting({ ...sunting, nama_guru_besar: e.target.value })
                }
              />
            </Medan>
            <div className="sm:col-span-2">
              <Medan label="Alamat">
                <input
                  className="medan"
                  value={sunting.alamat ?? ''}
                  onChange={(e) =>
                    setSunting({ ...sunting, alamat: e.target.value })
                  }
                />
              </Medan>
            </div>
            <Medan label="Poskod">
              <input
                className="medan"
                value={sunting.poskod ?? ''}
                onChange={(e) => setSunting({ ...sunting, poskod: e.target.value })}
              />
            </Medan>
            <Medan label="Bandar">
              <input
                className="medan"
                value={sunting.bandar ?? ''}
                onChange={(e) => setSunting({ ...sunting, bandar: e.target.value })}
              />
            </Medan>
            <Medan label="Telefon">
              <input
                className="medan"
                value={sunting.telefon ?? ''}
                onChange={(e) =>
                  setSunting({ ...sunting, telefon: e.target.value })
                }
              />
            </Medan>
            <Medan label="Faks">
              <input
                className="medan"
                value={sunting.faks ?? ''}
                onChange={(e) => setSunting({ ...sunting, faks: e.target.value })}
              />
            </Medan>
            <div className="sm:col-span-2 flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-jata-600"
                  checked={sunting.aktif}
                  onChange={(e) =>
                    setSunting({ ...sunting, aktif: e.target.checked })
                  }
                />
                Sekolah aktif
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-kedua"
                  onClick={() => setSunting(null)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn-utama"
                  onClick={simpan}
                  disabled={sibuk}
                >
                  {sibuk ? <Berputar /> : null}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ══ Tab 4 — Kategori & Tempoh ═══════════════════════════════════════

function TabKategori() {
  const { pegawai: saya } = gunaAuth()
  const [tempoh, setTempoh] = useState<Record<string, number> | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)
  const [berjaya, setBerjaya] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)

  useEffect(() => {
    semuaTetapan()
      .then((t) => {
        const baris = t.find((x) => x.kunci === 'tempoh_minimum')
        setTempoh((baris?.nilai as Record<string, number>) ?? {})
      })
      .catch((e) => setRalat(e.message))
  }, [])

  async function simpan() {
    if (!tempoh) return
    setSibuk(true)
    setRalat(null)
    setBerjaya(null)
    try {
      await simpanTetapan('tempoh_minimum', tempoh)
      await catatAudit('TETAPAN_DIUBAH', saya?.id ?? null, {
        kunci: 'tempoh_minimum',
        nilai: tempoh,
      })
      setBerjaya('Tempoh minimum dikemas kini.')
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal menyimpan tetapan.')
    } finally {
      setSibuk(false)
    }
  }

  if (!tempoh) return <Memuat />

  return (
    <div className="space-y-4">
      {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}
      {berjaya && <Mesej jenis="berjaya">{berjaya}</Mesej>}

      <section className="kad">
        <div className="kad-tajuk">
          <h2>
            Tempoh Minimum Permohonan
          </h2>
          <p className="-mt-1 basis-full text-xs text-slate-500">
            Bilangan hari sebelum tarikh lawatan. Asal: Lampiran E dan F,
            SPI Bil. 9/2023.
          </p>
        </div>
        <div className="kad-isi grid gap-4 sm:grid-cols-4">
          {Object.entries(LABEL_KATEGORI).map(([kod, label]) => (
            <Medan key={kod} label={label}>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  className="medan pr-12"
                  value={tempoh[kod] ?? 0}
                  onChange={(e) =>
                    setTempoh({ ...tempoh, [kod]: Number(e.target.value) || 0 })
                  }
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  hari
                </span>
              </div>
            </Medan>
          ))}
        </div>
        <div className="border-t border-slate-200 px-5 py-3 text-right">
          <button
            type="button"
            className="btn-utama"
            onClick={simpan}
            disabled={sibuk}
          >
            {sibuk ? <Berputar /> : null}
            Simpan tempoh
          </button>
        </div>
      </section>

      <EditorJabatan />

      <section className="kad">
        <div className="kad-tajuk justify-start">
          <h2>
            Laluan Kelulusan &amp; Nisbah Lampiran C
          </h2>
          <span className="lencana bg-slate-100 text-slate-600 ring-slate-200">
            Dikunci
          </span>
        </div>
        <div className="kad-isi space-y-3 text-sm">
          <p className="text-slate-600">
            Kedua-duanya terikat kepada SPI Bil. 9/2023 dan tidak boleh diubah
            dari antara muka. Perubahan memerlukan migrasi pangkalan data dan
            pindaan dasar yang sepadan.
          </p>
          <ul className="space-y-2 text-xs text-slate-600">
            <li>
              <strong>Dalam Daerah</strong> — Sekolah › Pegawai PPD › PPD (Bhg. G)
            </li>
            <li>
              <strong>Antara Daerah / Antara Negeri</strong> — Sekolah › Pegawai
              PPD › PPD (Bhg. G) › Pegawai JPN › Pengarah JPN (Bhg. H)
            </li>
            <li>
              <strong>Luar Negara</strong> — laluan di atas, kemudian Bahagian
              Penyelaras KPM (Bhg. J)
            </li>
          </ul>
        </div>
      </section>
    </div>
  )
}

// ══ Tab 5 — Semua Permohonan ════════════════════════════════════════

const SEMUA_STATUS = Object.keys(LABEL_STATUS) as Status[]

function TabPermohonan() {
  const [senarai, setSenarai] = useState<PermohonanRingkas[] | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)
  const [tukar, setTukar] = useState<PermohonanRingkas | null>(null)
  const [statusBaharu, setStatusBaharu] = useState<Status>('DRAF')
  const [sebab, setSebab] = useState('')
  const [sibuk, setSibuk] = useState(false)

  async function muat() {
    try {
      setSenarai(await senaraiPermohonan({ had: 500 }))
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal memuatkan.')
    }
  }
  useEffect(() => {
    void muat()
  }, [])

  if (!senarai) return <Memuat />

  async function laksanaTukar() {
    if (!tukar) return
    setSibuk(true)
    setRalat(null)
    try {
      await tukarStatusPentadbir(tukar.id, statusBaharu, sebab.trim())
      setTukar(null)
      setSebab('')
      await muat()
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal menukar status.')
    } finally {
      setSibuk(false)
    }
  }

  async function padam(p: PermohonanRingkas) {
    setSibuk(true)
    try {
      await padamPermohonan(p.id)
      await muat()
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal memadam.')
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div className="space-y-4">
      {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}
      <Mesej jenis="amaran">
        Menukar status secara manual memintas rantaian kelulusan. Setiap
        pertukaran direkodkan dengan nama anda dan sebab yang diberikan.
      </Mesej>

      <div className="kad overflow-x-auto">
        <table className="jadual">
          <thead>
            <tr>
              <th>No. Rujukan</th>
              <th>Sekolah</th>
              <th>Tujuan</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {senarai.map((p) => (
              <tr key={p.id}>
                <td className="whitespace-nowrap">
                  <Link
                    to={`/permohonan/${p.id}`}
                    className="font-mono text-xs text-jata-600 hover:underline"
                  >
                    {p.no_rujukan ?? 'Draf'}
                  </Link>
                </td>
                <td className="max-w-[180px] truncate text-xs">
                  {p.nama_sekolah}
                </td>
                <td className="max-w-[220px] truncate text-xs">
                  {p.tujuan ?? '—'}
                </td>
                <td>
                  <LencanaStatus status={p.status} />
                </td>
                <td className="whitespace-nowrap">
                  <button
                    type="button"
                    className="text-xs font-medium text-jata-600 hover:underline"
                    onClick={() => {
                      setTukar(p)
                      setStatusBaharu(p.status)
                    }}
                  >
                    Tukar status
                  </button>
                  {p.status === 'DRAF' && (
                    <button
                      type="button"
                      className="ml-3 text-xs font-medium text-rose-600 hover:underline"
                      onClick={() => padam(p)}
                      disabled={sibuk}
                    >
                      Padam
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        tajuk="Tukar status secara manual"
        buka={!!tukar}
        tutup={() => setTukar(null)}
      >
        {tukar && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {tukar.no_rujukan ?? 'Draf'} — {tukar.nama_sekolah}
            </p>
            <Medan label="Status baharu">
              <select
                className="medan"
                value={statusBaharu}
                onChange={(e) => setStatusBaharu(e.target.value as Status)}
              >
                {SEMUA_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {LABEL_STATUS[s]}
                  </option>
                ))}
              </select>
            </Medan>
            <Medan label="Sebab pertukaran" perlu nota="Sekurang-kurangnya 10 aksara.">
              <textarea
                className="medan min-h-[90px]"
                value={sebab}
                onChange={(e) => setSebab(e.target.value)}
              />
            </Medan>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-kedua"
                onClick={() => setTukar(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-merah"
                disabled={sibuk || sebab.trim().length < 10}
                onClick={laksanaTukar}
              >
                {sibuk ? <Berputar /> : null}
                Tukar status
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ══ Tab 6 — Sistem ══════════════════════════════════════════════════

function TabSistem() {
  const [audit, setAudit] = useState<LogAudit[] | null>(null)
  const [kiraan, setKiraan] = useState<{
    permohonan: number
    sekolah: number
    pegawai: number
  } | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([senaraiAudit(200), senaraiPermohonan({ had: 2000 }), senaraiSekolah(), senaraiPegawai()])
      .then(([a, p, s, g]) => {
        setAudit(a)
        setKiraan({ permohonan: p.length, sekolah: s.length, pegawai: g.length })
      })
      .catch((e) => setRalat(e.message))
  }, [])

  async function eksportJson() {
    const [permohonan, sekolah, pegawai, log] = await Promise.all([
      senaraiPermohonan({ had: 2000 }),
      senaraiSekolah(),
      senaraiPegawai(),
      senaraiAudit(2000),
    ])
    muatTurun(
      `elawatan-eksport-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(
        { dieksport_pada: new Date().toISOString(), permohonan, sekolah, pegawai, log_audit: log },
        null,
        2,
      ),
      'application/json',
    )
  }

  if (ralat) return <Mesej jenis="ralat">{ralat}</Mesej>
  if (!audit || !kiraan) return <Memuat />

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="kad px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Permohonan</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{kiraan.permohonan}</p>
        </div>
        <div className="kad px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Sekolah</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{kiraan.sekolah}</p>
        </div>
        <div className="kad px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Akaun</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{kiraan.pegawai}</p>
        </div>
      </div>

      <section className="kad">
        <div className="kad-tajuk">
          <h2>
            Kuasa Pentadbir Sistem
          </h2>
        </div>
        <div className="kad-isi">
          <ul className="space-y-2 text-sm text-slate-600">
            <li>· Daftar, sunting dan padam akaun pegawai serta tetapkan skop</li>
            <li>· Import senarai sekolah JPN dan akaun pegawai secara pukal</li>
            <li>· Sunting profil sekolah dan pemetaan sekolah kepada PPD</li>
            <li>· Ubah tempoh minimum setiap kategori lawatan</li>
            <li>· Bertindak bagi pihak mana-mana peringkat kelulusan (pintasan)</li>
            <li>· Tukar status permohonan secara manual dengan sebab bertulis</li>
            <li>· Eksport keseluruhan rekod dalam format JSON</li>
          </ul>
          <p className="mt-4 rounded-lg bg-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600">
            Pentadbir <strong>tidak boleh</strong> memadam log audit. Jadual
            <span className="font-mono"> log_audit </span> hanya membenarkan
            INSERT pada peringkat pangkalan data — tiada dasar UPDATE atau DELETE
            wujud untuk mana-mana peranan pengguna.
          </p>
        </div>
      </section>

      <section className="kad">
        <div className="kad-tajuk">
          <h2>
            Log Audit Terkini
          </h2>
          <button type="button" className="btn-kedua px-3 py-1.5 text-xs" onClick={eksportJson}>
            Eksport JSON
          </button>
        </div>
        <div className="kad-isi max-h-[500px] overflow-y-auto">
          <table className="jadual">
            <thead>
              <tr>
                <th>Masa</th>
                <th>Peristiwa</th>
                <th>Pegawai</th>
                <th>Rujukan</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap text-xs text-slate-500">
                    {formatMasa(a.masa)}
                  </td>
                  <td className="text-xs font-medium">
                    {LABEL_PERISTIWA_AUDIT[a.peristiwa] ?? a.peristiwa}
                  </td>
                  <td className="font-mono text-xs text-slate-500">
                    {a.emel_pegawai ?? '—'}
                  </td>
                  <td className="font-mono text-xs text-slate-500">
                    {a.no_rujukan ?? '—'}
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

// ── Maklumat jabatan dan slogan surat ───────────────────────────────

const MEDAN_JABATAN: { kunci: keyof MaklumatJabatan; label: string; lebar?: boolean }[] = [
  { kunci: 'nama', label: 'Nama jabatan', lebar: true },
  { kunci: 'nama_ringkas', label: 'Nama ringkas' },
  { kunci: 'kementerian', label: 'Kementerian' },
  { kunci: 'sektor', label: 'Sektor / unit pengeluar surat', lebar: true },
  { kunci: 'alamat', label: 'Alamat penuh', lebar: true },
  { kunci: 'telefon', label: 'Telefon' },
  { kunci: 'faks', label: 'Faks' },
  { kunci: 'emel', label: 'E-mel' },
  { kunci: 'laman_web', label: 'Laman web' },
]

function EditorJabatan() {
  const { pegawai: saya } = gunaAuth()
  const [jabatan, setJabatan] = useState<MaklumatJabatan | null>(null)
  const [slogan, setSlogan] = useState('')
  const [mesej, setMesej] = useState<{ jenis: 'berjaya' | 'ralat'; teks: string } | null>(null)
  const [sibuk, setSibuk] = useState(false)

  useEffect(() => {
    semuaTetapan().then((t) => {
      const j = t.find((x) => x.kunci === 'maklumat_jpn')?.nilai as Partial<MaklumatJabatan> | undefined
      const s = t.find((x) => x.kunci === 'slogan_surat')?.nilai as string[] | undefined
      setJabatan({ ...MAKLUMAT_LALAI, ...(j ?? {}) })
      setSlogan((s ?? []).join('\n'))
    })
  }, [])

  async function simpan() {
    if (!jabatan) return
    setSibuk(true)
    setMesej(null)
    try {
      const senaraiSlogan = slogan.split('\n').map((x) => x.trim()).filter(Boolean)
      await simpanTetapan('maklumat_jpn', jabatan)
      await simpanTetapan('slogan_surat', senaraiSlogan)
      await catatAudit('TETAPAN_DIUBAH', saya?.id ?? null, {
        kunci: 'maklumat_jpn, slogan_surat',
      })
      segarJabatan()
      setMesej({ jenis: 'berjaya', teks: 'Maklumat jabatan dan slogan disimpan. Muat semula halaman untuk melihat kepala laman baharu.' })
    } catch (e) {
      setMesej({ jenis: 'ralat', teks: e instanceof Error ? e.message : 'Gagal menyimpan.' })
    } finally {
      setSibuk(false)
    }
  }

  if (!jabatan) return <Memuat />

  return (
    <section className="kad">
      <div className="kad-tajuk">
        <h2>Maklumat Jabatan &amp; Surat Rasmi</h2>
        <p className="-mt-1 basis-full text-xs text-slate-500">
          Dipaparkan pada kepala laman, kaki laman, dan kepala surat kelulusan.
          Sahkan setiap medan dengan pejabat JPN sebelum pelancaran.
        </p>
      </div>
      <div className="kad-isi space-y-4">
        {mesej && <Mesej jenis={mesej.jenis}>{mesej.teks}</Mesej>}
        <div className="grid gap-4 sm:grid-cols-2">
          {MEDAN_JABATAN.map((m) => (
            <div key={m.kunci} className={m.lebar ? 'sm:col-span-2' : undefined}>
              <Medan label={m.label}>
                <input
                  className="medan"
                  value={jabatan[m.kunci]}
                  onChange={(e) => setJabatan({ ...jabatan, [m.kunci]: e.target.value })}
                />
              </Medan>
            </div>
          ))}
          <div className="sm:col-span-2">
            <Medan
              label="Slogan surat rasmi"
              nota="Satu slogan setiap baris. Dicetak dalam tanda petik sebelum 'Saya yang menjalankan amanah'."
            >
              <textarea
                className="medan min-h-[80px] font-semibold uppercase"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
              />
            </Medan>
          </div>
        </div>
        <p className="rounded-md bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
          Logo Korporat KPM dibaca daripada{' '}
          <code className="rounded bg-white px-1 py-0.5 font-mono text-[0.7rem] ring-1 ring-slate-200">
            public/logo-jabatan.png
          </code>{' '}
          (lambang, untuk kepala dan kaki laman) dan{' '}
          <code className="rounded bg-white px-1 py-0.5 font-mono text-[0.7rem] ring-1 ring-slate-200">
            public/logo-kpm.png
          </code>{' '}
          (lambang dan tulisan, untuk kepala surat). Ganti kedua-dua fail jika logo dikemas kini.
        </p>
      </div>
      <div className="flex justify-end border-t border-slate-200 px-5 py-3">
        <button type="button" className="btn-utama" onClick={simpan} disabled={sibuk}>
          {sibuk ? <Berputar /> : null}
          Simpan maklumat jabatan
        </button>
      </div>
    </section>
  )
}
