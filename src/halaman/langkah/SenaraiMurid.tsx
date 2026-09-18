import { useMemo, useState } from 'react'
import { FileSpreadsheet, Upload } from 'lucide-react'
import { kemasBaris, padamBaris, padamMurid, tambahBanyakPeserta, tambahBaris } from '@/lib/api'
import { huraiJadual, indeksLajur } from '@/lib/import-jadual'
import { kelas, muatTurun } from '@/lib/guna'
import { Berputar, Mesej, Modal } from '@/komponen/ui'
import type { Peserta } from '@/lib/jenis'

type BarisMurid = { nama: string; kp: string; jantina: string; tahun_tingkatan: string }

const TEMPLAT = 'nama,no_kp_atau_sijil_lahir,jantina,tahun_tingkatan\nAli bin Abu,150101-08-1111,L,Tahun 5\n'

/** Tafsir tampalan: guna kepala lajur jika ada, jika tidak ikut susunan templat. */
function tafsir(teks: string): BarisMurid[] {
  const baris = huraiJadual(teks)
  if (baris.length === 0) return []
  const kepala = baris[0]
  const iNama = indeksLajur(kepala, ['nama', 'nama murid', 'nama penuh'])
  const adaKepala = iNama >= 0
  const i = adaKepala
    ? {
        nama: iNama,
        kp: indeksLajur(kepala, ['no_kp_atau_sijil_lahir', 'no kp', 'kp', 'mykid', 'no mykid', 'sijil lahir', 'no sijil lahir', 'ic']),
        jantina: indeksLajur(kepala, ['jantina', 'jan']),
        tahun: indeksLajur(kepala, ['tahun_tingkatan', 'tahun', 'tingkatan', 'kelas']),
      }
    : { nama: 0, kp: 1, jantina: 2, tahun: 3 }
  const sel = (b: string[], n: number) => (n >= 0 ? (b[n] ?? '').trim() : '')
  return (adaKepala ? baris.slice(1) : baris).map((b) => ({
    nama: sel(b, i.nama),
    kp: sel(b, i.kp),
    jantina: sel(b, i.jantina).toUpperCase().slice(0, 1),
    tahun_tingkatan: sel(b, i.tahun),
  }))
}

/**
 * Senarai murid pilihan (Bahagian D2). Senarai rasmi masih boleh dilampirkan
 * sebagai dokumen; baris di sini membolehkan kehadiran dan hubungan kecemasan.
 */
export function SenaraiMurid({
  permohonanId,
  peserta,
  bilMurid,
  jalankan,
  simpanBilangan,
  sibuk,
}: {
  permohonanId: string
  peserta: Peserta[]
  bilMurid: number
  jalankan: (k: () => Promise<unknown>) => Promise<void>
  simpanBilangan: (n: number) => void
  sibuk: boolean
}) {
  const murid = peserta.filter((x) => x.kategori === 'MURID')
  const [buka, setBuka] = useState(false)

  return (
    <section className="kad">
      <div className="kad-tajuk">
        <div>
          <h2>Bahagian D2 — Senarai Murid</h2>
          <p className="-mt-1 basis-full text-xs text-slate-500">
            Pilihan. Tampal terus dari Excel, atau lampirkan senarai rasmi sebagai dokumen pada Langkah 6.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-kedua px-3 py-1.5 text-xs" onClick={() => setBuka(true)} disabled={sibuk}>
            <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden />
            Import dari Excel
          </button>
          <button
            type="button"
            className="btn-kedua px-3 py-1.5 text-xs"
            disabled={sibuk}
            onClick={() =>
              jalankan(() =>
                tambahBaris<Peserta>('peserta', {
                  permohonan_id: permohonanId,
                  kategori: 'MURID',
                  susunan: murid.length,
                  nama: '',
                }),
              )
            }
          >
            + Tambah murid
          </button>
        </div>
      </div>
      <div className="kad-isi space-y-3">
        {murid.length > 0 && murid.length !== bilMurid && (
          <Mesej jenis="amaran">
            Senarai mengandungi {murid.length} murid tetapi bilangan murid ialah {bilMurid}.{' '}
            <button type="button" className="font-semibold underline" onClick={() => simpanBilangan(murid.length)}>
              Tetapkan bilangan kepada {murid.length}
            </button>
          </Mesej>
        )}
        {murid.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            Belum ada nama murid. Gunakan "Import dari Excel" untuk memasukkan seluruh senarai sekali gus.
          </p>
        ) : (
          <div className="max-h-[420px] overflow-auto">
            <table className="jadual">
              <thead>
                <tr>
                  <th className="w-10">#</th>
                  <th>Nama</th>
                  <th className="w-40">No. KP / Sijil lahir</th>
                  <th className="w-20">Jantina</th>
                  <th className="w-32">Tahun / Tingkatan</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {murid.map((x, n) => (
                  <tr key={x.id}>
                    <td className="text-slate-400">{n + 1}</td>
                    {(['nama', 'kp', 'jantina', 'tahun_tingkatan'] as const).map((m) => (
                      <td key={m}>
                        <input
                          className="medan py-1.5"
                          defaultValue={x[m] ?? ''}
                          maxLength={m === 'jantina' ? 1 : undefined}
                          onBlur={(e) =>
                            e.target.value !== (x[m] ?? '') &&
                            jalankan(() => kemasBaris('peserta', x.id, { [m]: e.target.value }))
                          }
                        />
                      </td>
                    ))}
                    <td>
                      <button
                        type="button"
                        className="text-xs font-medium text-rose-600 hover:text-rose-700"
                        disabled={sibuk}
                        onClick={() => jalankan(() => padamBaris('peserta', x.id))}
                      >
                        Buang
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DialogImport
        buka={buka}
        tutup={() => setBuka(false)}
        adaSedia={murid.length}
        import_={async (baris, ganti) => {
          await jalankan(async () => {
            if (ganti) await padamMurid(permohonanId)
            const mula = ganti ? 0 : murid.length
            await tambahBanyakPeserta(
              baris.map((b, n) => ({
                permohonan_id: permohonanId,
                kategori: 'MURID',
                susunan: mula + n,
                nama: b.nama,
                kp: b.kp || null,
                jantina: b.jantina || null,
                tahun_tingkatan: b.tahun_tingkatan || null,
              })),
            )
          })
          simpanBilangan((ganti ? 0 : murid.length) + baris.length)
          setBuka(false)
        }}
      />
    </section>
  )
}

function DialogImport({
  buka,
  tutup,
  adaSedia,
  import_,
}: {
  buka: boolean
  tutup: () => void
  adaSedia: number
  import_: (baris: BarisMurid[], ganti: boolean) => Promise<void>
}) {
  const [teks, setTeks] = useState('')
  const [ganti, setGanti] = useState(true)
  const [sibuk, setSibuk] = useState(false)
  const [ralat, setRalat] = useState<string | null>(null)

  const baris = useMemo(() => tafsir(teks), [teks])
  const sah = baris.filter((b) => b.nama.length >= 3)
  const tolak = baris.length - sah.length

  async function hantar() {
    setSibuk(true)
    setRalat(null)
    try {
      await import_(sah, ganti)
      setTeks('')
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Import gagal.')
    } finally {
      setSibuk(false)
    }
  }

  return (
    <Modal tajuk="Import senarai murid" buka={buka} tutup={tutup} lebar="max-w-2xl">
      <div className="space-y-4 text-sm">
        {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}
        <ol className="ml-5 list-decimal space-y-1 text-slate-600">
          <li>Dalam Excel, pilih lajur Nama, No. KP / Sijil lahir, Jantina dan Tahun / Tingkatan (termasuk baris kepala jika ada).</li>
          <li>Salin (Ctrl+C) dan tampal (Ctrl+V) di bawah, atau pilih fail CSV.</li>
        </ol>
        <textarea
          className="medan min-h-[140px] font-mono text-xs"
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          placeholder={'Nama\tNo KP\tJantina\tTahun\nAli bin Abu\t150101-08-1111\tL\tTahun 5'}
          aria-label="Tampal senarai murid"
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="btn-kedua btn-kecil cursor-pointer">
            <Upload className="h-3.5 w-3.5" aria-hidden />
            Pilih fail CSV
            <input
              type="file"
              accept=".csv,.txt,text/csv"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (f) setTeks(await f.text())
                e.target.value = ''
              }}
            />
          </label>
          <button
            type="button"
            className="btn-kedua btn-kecil"
            onClick={() => muatTurun('templat-senarai-murid.csv', TEMPLAT, 'text/csv;charset=utf-8')}
          >
            Muat turun templat
          </button>
        </div>

        {baris.length > 0 && (
          <div className="rounded-md border border-slate-200">
            <p className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
              {sah.length} murid sedia diimport
              {tolak > 0 && <span className="text-rose-600"> · {tolak} baris tanpa nama diabaikan</span>}
            </p>
            <div className="max-h-48 overflow-auto">
              <table className="jadual text-xs">
                <tbody>
                  {baris.slice(0, 8).map((b, n) => (
                    <tr key={n} className={kelas(b.nama.length < 3 && 'bg-rose-50/60 text-rose-700')}>
                      <td className="w-8 text-slate-400">{n + 1}</td>
                      <td>{b.nama || '(tiada nama)'}</td>
                      <td>{b.kp}</td>
                      <td>{b.jantina}</td>
                      <td>{b.tahun_tingkatan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {baris.length > 8 && (
              <p className="px-3 py-1.5 text-xs text-slate-500">… dan {baris.length - 8} baris lagi</p>
            )}
          </div>
        )}

        {adaSedia > 0 && (
          <label className="flex items-center gap-2 text-slate-700">
            <input type="checkbox" className="h-4 w-4" checked={ganti} onChange={(e) => setGanti(e.target.checked)} />
            Ganti {adaSedia} murid sedia ada (jika tidak, ditambah di hujung senarai)
          </label>
        )}
        <p className="text-xs text-slate-500">Bilangan murid pada borang dikemas kini secara automatik.</p>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-kedua" onClick={tutup}>Batal</button>
          <button type="button" className="btn-utama" onClick={hantar} disabled={sibuk || sah.length === 0}>
            {sibuk ? <Berputar /> : null}
            Import {sah.length} murid
          </button>
        </div>
      </div>
    </Modal>
  )
}
