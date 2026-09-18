// Panel pentadbir: had masa & cuti umum, peringatan, tempoh simpanan
// (PDPA) dan sandaran. Dipasang dalam tab Tetapan & Surat dan Sistem.

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BellRing, DatabaseBackup, Hourglass, ShieldCheck } from 'lucide-react'
import { catatAudit, dapatTetapan, simpanTetapan } from '@/lib/api'
import { gunaAuth } from '@/lib/auth'
import { janaPeringatan } from '@/lib/notifikasi'
import { anonimkanPermohonan, rekodLuput, type RekodLuput } from '@/lib/privasi'
import { padamDokumen } from '@/lib/r2'
import { LABEL_STATUS } from '@/lib/istilah'
import { formatTarikh } from '@/lib/guna'
import { Berputar, Medan, Memuat, Mesej, Modal } from '@/komponen/ui'
import type { Status } from '@/lib/jenis'

const PERINGKAT: { kod: Status; label: string }[] = [
  { kod: 'MENUNGGU_PPD_SEMAK', label: 'Semakan PPD' },
  { kod: 'MENUNGGU_PPD_SAH', label: 'Pengesahan KPPD' },
  { kod: 'MENUNGGU_JPN_SEMAK', label: 'Semakan JPN' },
  { kod: 'MENUNGGU_JPN_SAH', label: 'Pengesahan Pengarah' },
  { kod: 'MENUNGGU_KPM', label: 'Bahagian KPM' },
]

const TARIKH_SAH = /^\d{4}-\d{2}-\d{2}$/

// ── Had masa, cuti umum dan e-mel ────────────────────────────────────

export function EditorHadMasa() {
  const { pegawai: saya } = gunaAuth()
  const [had, setHad] = useState<Record<string, number> | null>(null)
  const [cuti, setCuti] = useState('')
  const [emel, setEmel] = useState(true)
  const [ralat, setRalat] = useState<string | null>(null)
  const [berjaya, setBerjaya] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)

  useEffect(() => {
    Promise.all([
      dapatTetapan<Record<string, number>>('had_masa_tindakan'),
      dapatTetapan<string[]>('cuti_umum'),
      dapatTetapan<{ aktif: boolean }>('notifikasi_emel'),
    ])
      .then(([h, c, e]) => {
        setHad(h ?? {})
        setCuti((c ?? []).join('\n'))
        setEmel(e?.aktif ?? true)
      })
      .catch((e) => setRalat(e.message))
  }, [])

  async function simpan() {
    if (!had) return
    const tarikh = cuti
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean)
    const salah = tarikh.filter((t) => !TARIKH_SAH.test(t) || Number.isNaN(new Date(t).getTime()))
    if (salah.length) {
      setRalat(`Tarikh tidak sah: ${salah.join(', ')}. Gunakan format YYYY-MM-DD.`)
      return
    }
    setSibuk(true)
    setRalat(null)
    setBerjaya(null)
    try {
      const senarai = [...new Set(tarikh)].sort()
      await simpanTetapan('had_masa_tindakan', had)
      await simpanTetapan('cuti_umum', senarai)
      await simpanTetapan('notifikasi_emel', { aktif: emel })
      await catatAudit('TETAPAN_DIUBAH', saya?.id ?? null, {
        kunci: 'had_masa_tindakan, cuti_umum, notifikasi_emel',
        had,
        bil_cuti: senarai.length,
        emel,
      })
      setCuti(senarai.join('\n'))
      setBerjaya('Had masa, cuti umum dan tetapan e-mel disimpan.')
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal menyimpan tetapan.')
    } finally {
      setSibuk(false)
    }
  }

  if (!had) return ralat ? <Mesej jenis="ralat">{ralat}</Mesej> : <Memuat />

  return (
    <section className="kad">
      <div className="kad-tajuk">
        <h2 className="flex items-center gap-2">
          <Hourglass className="h-4 w-4 text-biru-500" aria-hidden />
          Had Masa Tindakan &amp; Cuti Umum
        </h2>
        <p className="-mt-1 basis-full text-xs text-slate-500">
          Dikira dalam hari bekerja (Isnin–Jumaat, tidak termasuk cuti umum). Permohonan yang
          melebihi had ditanda lewat dan pegawai dimaklumkan setiap hari.
        </p>
      </div>
      <div className="kad-isi space-y-5">
        {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}
        {berjaya && <Mesej jenis="berjaya">{berjaya}</Mesej>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {PERINGKAT.map((p) => (
            <Medan key={p.kod} label={p.label}>
              <input
                type="number"
                min={1}
                max={60}
                className="medan"
                value={had[p.kod] ?? ''}
                onChange={(e) => setHad({ ...had, [p.kod]: Math.max(1, Number(e.target.value) || 1) })}
              />
            </Medan>
          ))}
          <Medan label="Eskalasi selepas" nota="Hari selepas had">
            <input
              type="number"
              min={0}
              max={30}
              className="medan"
              value={had.eskalasi_selepas ?? 2}
              onChange={(e) => setHad({ ...had, eskalasi_selepas: Math.max(0, Number(e.target.value) || 0) })}
            />
          </Medan>
        </div>

        <Medan
          label="Cuti umum"
          nota="Satu tarikh setiap baris dalam format YYYY-MM-DD. Masukkan cuti persekutuan dan cuti negeri Perak."
        >
          <textarea
            className="medan min-h-[7rem] font-mono text-xs"
            value={cuti}
            onChange={(e) => setCuti(e.target.value)}
            placeholder={'Contoh:\n2026-12-25'}
          />
        </Medan>

        <label className="flex items-start gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
            checked={emel}
            onChange={(e) => setEmel(e.target.checked)}
          />
          <span>
            Hantar salinan notifikasi melalui e-mel
            <span className="block text-xs text-slate-500">
              Notifikasi sentiasa dipapar dalam sistem. E-mel memerlukan RESEND_API_KEY pada Edge Function
              hantar-notifikasi.
            </span>
          </span>
        </label>
      </div>
      <div className="border-t border-slate-200 px-5 py-3 text-right">
        <button type="button" className="btn-utama" onClick={simpan} disabled={sibuk}>
          {sibuk ? <Berputar /> : null}
          Simpan tetapan
        </button>
      </div>
    </section>
  )
}

// ── Peringatan manual ────────────────────────────────────────────────

export function PanelPeringatan() {
  const [hasil, setHasil] = useState<Record<string, number> | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)

  async function jalankan() {
    setSibuk(true)
    setRalat(null)
    try {
      setHasil(await janaPeringatan())
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal menjalankan peringatan.')
    } finally {
      setSibuk(false)
    }
  }

  return (
    <section className="kad">
      <div className="kad-tajuk">
        <h2 className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-biru-500" aria-hidden />
          Peringatan Automatik
        </h2>
        <button type="button" className="btn-kedua btn-kecil" onClick={jalankan} disabled={sibuk}>
          {sibuk ? <Berputar /> : null}
          Jalankan sekarang
        </button>
      </div>
      <div className="kad-isi space-y-3 text-sm text-slate-600">
        <p>
          Berjalan setiap hari pada jam 8 pagi apabila jadual pg_cron dipasang (lihat README). Peringatan dihantar kepada pegawai bagi permohonan yang
          melebihi had masa, kepada pegawai atasan selepas tempoh eskalasi, kepada sekolah tiga hari sebelum
          tarikh akhir menghantar, dan bagi laporan pasca-lawatan yang belum dihantar. Tiada peringatan
          berulang pada hari yang sama.
        </p>
        {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}
        {hasil && (
          <Mesej jenis="berjaya" tajuk="Peringatan dijalankan">
            {hasil.lewat} lewat · {hasil.eskalasi} eskalasi · {hasil.tarikh_tutup} tarikh akhir ·{' '}
            {hasil.laporan_pasca} laporan pasca
          </Mesej>
        )}
      </div>
    </section>
  )
}

// ── Tempoh simpanan & rekod luput (PDPA) ─────────────────────────────

export function PanelSimpanan() {
  const { pegawai: saya } = gunaAuth()
  const [tahun, setTahun] = useState<number | null>(null)
  const [senarai, setSenarai] = useState<RekodLuput[] | null>(null)
  const [sasaran, setSasaran] = useState<RekodLuput | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)
  const [berjaya, setBerjaya] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)

  const muat = useCallback(async () => {
    try {
      const [t, r] = await Promise.all([dapatTetapan<{ tahun: number }>('tempoh_simpanan'), rekodLuput()])
      setTahun(t?.tahun ?? 7)
      setSenarai(r)
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal memuatkan rekod luput.')
    }
  }, [])

  useEffect(() => {
    void muat()
  }, [muat])

  async function simpanTahun() {
    if (!tahun) return
    setSibuk(true)
    setRalat(null)
    try {
      await simpanTetapan('tempoh_simpanan', { tahun })
      await catatAudit('TETAPAN_DIUBAH', saya?.id ?? null, { kunci: 'tempoh_simpanan', tahun })
      setBerjaya(`Tempoh simpanan ditetapkan ${tahun} tahun.`)
      await muat()
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal menyimpan.')
    } finally {
      setSibuk(false)
    }
  }

  async function anonimkan(r: RekodLuput) {
    setSibuk(true)
    setRalat(null)
    setBerjaya(null)
    try {
      const h = await anonimkanPermohonan(r.id)
      // Fail R2 dipadam satu demi satu; kegagalan dilaporkan tetapi rekod sudah dianonimkan.
      let gagal = 0
      for (const id of h.dokumen) {
        await padamDokumen(id).catch(() => {
          gagal++
        })
      }
      setBerjaya(
        `${r.no_rujukan ?? 'Rekod'} dianonimkan: ${h.bil_peserta} peserta, ${h.dokumen.length - gagal} dokumen dipadam.` +
          (gagal ? ` ${gagal} dokumen gagal dipadam — cuba lagi melalui log audit.` : ''),
      )
      setSasaran(null)
      await muat()
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal menganonimkan rekod.')
    } finally {
      setSibuk(false)
    }
  }

  return (
    <section className="kad">
      <div className="kad-tajuk">
        <h2 className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-biru-500" aria-hidden />
          Tempoh Simpanan &amp; Rekod Luput
        </h2>
        <p className="-mt-1 basis-full text-xs text-slate-500">
          Rekod yang ditutup (Selesai, Ditolak, Dibatalkan) melebihi tempoh simpanan. Anonimkan memadam
          data peribadi peserta dan dokumen sokongan; rekod lawatan dan log audit dikekalkan.{' '}
          <Link to="/privasi" className="text-biru-600 hover:underline">Notis privasi</Link>
        </p>
      </div>
      <div className="kad-isi space-y-4">
        {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}
        {berjaya && <Mesej jenis="berjaya">{berjaya}</Mesej>}

        <div className="flex flex-wrap items-end gap-3">
          <Medan label="Tempoh simpanan (tahun)">
            <input
              type="number"
              min={1}
              max={50}
              className="medan w-32"
              value={tahun ?? ''}
              onChange={(e) => setTahun(Math.max(1, Number(e.target.value) || 1))}
            />
          </Medan>
          <button type="button" className="btn-kedua" onClick={simpanTahun} disabled={sibuk || !tahun}>
            Simpan tempoh
          </button>
        </div>

        {!senarai ? (
          <Memuat />
        ) : senarai.length === 0 ? (
          <p className="rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-600">
            Tiada rekod melepasi tempoh simpanan.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="jadual">
              <thead>
                <tr>
                  <th>Rujukan</th>
                  <th>Sekolah</th>
                  <th>Status</th>
                  <th>Ditutup</th>
                  <th>Data</th>
                  <th className="w-[1%]" />
                </tr>
              </thead>
              <tbody>
                {senarai.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs">{r.no_rujukan ?? '—'}</td>
                    <td className="text-xs">{r.nama_sekolah}</td>
                    <td className="text-xs">{LABEL_STATUS[r.status as Status] ?? r.status}</td>
                    <td className="whitespace-nowrap text-xs">{formatTarikh(r.dikemaskini_pada)}</td>
                    <td className="whitespace-nowrap text-xs">
                      {r.bil_peserta} peserta · {r.bil_dokumen} dokumen
                    </td>
                    <td>
                      <button type="button" className="btn-merah btn-kecil" onClick={() => setSasaran(r)} disabled={sibuk}>
                        Anonimkan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal tajuk="Anonimkan rekod" buka={!!sasaran} tutup={() => setSasaran(null)}>
        {sasaran && (
          <div className="space-y-4 text-sm text-slate-700">
            <p>
              Data peribadi <strong>{sasaran.bil_peserta} peserta</strong> (nama, kad pengenalan, pasport,
              alamat, telefon) dan <strong>{sasaran.bil_dokumen} dokumen sokongan</strong> bagi{' '}
              <span className="font-mono">{sasaran.no_rujukan}</span> akan dipadam secara kekal.
            </p>
            <p>Rekod lawatan, keputusan kelulusan dan log audit dikekalkan. Tindakan ini tidak boleh dibatalkan.</p>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-kedua" onClick={() => setSasaran(null)}>
                Batal
              </button>
              <button type="button" className="btn-merah" onClick={() => anonimkan(sasaran)} disabled={sibuk}>
                {sibuk ? <Berputar /> : null}
                Anonimkan sekarang
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}

// ── Sandaran ─────────────────────────────────────────────────────────

export function PanelSandaran() {
  return (
    <section className="kad">
      <div className="kad-tajuk">
        <h2 className="flex items-center gap-2">
          <DatabaseBackup className="h-4 w-4 text-biru-500" aria-hidden />
          Sandaran &amp; Pemulihan
        </h2>
      </div>
      <div className="kad-isi space-y-2 text-sm text-slate-600">
        <p>
          Sandaran utama dibuat oleh Supabase: sandaran harian automatik (pelan Pro) dan, jika diaktifkan,
          Point-in-Time Recovery untuk memulihkan pangkalan data kepada mana-mana saat dalam tempoh simpanan.
        </p>
        <p>
          Sebagai salinan kedua di luar Supabase, jalankan{' '}
          <code className="rounded bg-slate-100 px-1 font-mono text-xs">supabase db dump --data-only</code>{' '}
          sekurang-kurangnya seminggu sekali dan simpan fail itu dalam storan JPN yang disulitkan. Dokumen dalam
          Cloudflare R2 perlu disalin secara berasingan.
        </p>
        <p>
          Butang <strong>Eksport JSON</strong> di bawah ialah salinan ringkas untuk semakan, bukan sandaran penuh.
          Uji pemulihan sekurang-kurangnya sekali setiap suku tahun.
        </p>
      </div>
    </section>
  )
}
