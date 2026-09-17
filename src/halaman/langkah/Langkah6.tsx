import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dokumenDiperlukan, hantarPermohonan } from '@/lib/api'
import { gunaAuth } from '@/lib/auth'
import { lihatDokumen, muatNaikDokumen, padamDokumen } from '@/lib/r2'
import { LABEL_KUMPULAN_DOKUMEN } from '@/lib/istilah'
import { formatMasa, formatSaiz, kelas, laluan } from '@/lib/guna'
import { Berputar, Memuat, Mesej, Modal, SenaraiRalat } from '@/komponen/ui'
import type { Dokumen, JenisDokumen } from '@/lib/jenis'
import type { PropLangkah } from '../BorangPermohonan'

export function Langkah6({ bundel, muatSemula, kelengkapan }: PropLangkah) {
  const { permohonan: p, dokumen } = bundel
  const { pegawai } = gunaAuth()
  const navigate = useNavigate()

  const [diperlukan, setDiperlukan] = useState<JenisDokumen[] | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)
  const [menghantar, setMenghantar] = useState(false)
  const [sahHantar, setSahHantar] = useState(false)

  useEffect(() => {
    dokumenDiperlukan(p.id)
      .then(setDiperlukan)
      .catch((e) => setRalat(e.message))
  }, [p.id, p.pengangkutan, p.kategori, p.bil_bukan_guru])

  async function hantar() {
    setMenghantar(true)
    setRalat(null)
    try {
      const hasil = await hantarPermohonan(p.id)
      setSahHantar(false)
      navigate(`/permohonan/${hasil.id}`, { replace: true })
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal menghantar permohonan.')
      setSahHantar(false)
    } finally {
      setMenghantar(false)
    }
  }

  if (!diperlukan) return <Memuat teks="Menyemak dokumen wajib…" />

  const kumpulan = [...new Set(diperlukan.map((d) => d.kumpulan))]
  const adaSemua = diperlukan.every((d) =>
    dokumen.some((x) => x.jenis_dokumen === d.kod),
  )
  const bolehHantar = kelengkapan?.boleh_hantar ?? false

  return (
    <>
      {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}

      <section className="kad">
        <div className="kad-tajuk">
          <h2>
            Dokumen Sokongan
          </h2>
          <p className="-mt-1 basis-full text-xs text-slate-500">
            Senarai Semak Permohonan Lawatan Murid Sekolah, BSS Pin.1/2023.
            Senarai berubah mengikut jenis pengangkutan, kategori dan ciri
            lawatan yang dipilih.
          </p>
        </div>
        <div className="kad-isi">
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-slate-100 px-4 py-2.5 text-sm">
            <span
              className={kelas(
                'h-2 w-2 shrink-0 rounded-full',
                adaSemua ? 'bg-emerald-500' : 'bg-amber-500',
              )}
            />
            <span className="text-slate-700">
              {dokumen.filter((x) =>
                diperlukan.some((d) => d.kod === x.jenis_dokumen),
              ).length}{' '}
              daripada {diperlukan.length} dokumen wajib telah dimuat naik
            </span>
          </div>

          <div className="space-y-6">
            {kumpulan.map((k) => (
              <div key={k}>
                <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {LABEL_KUMPULAN_DOKUMEN[k] ?? k}
                </h3>
                <div className="space-y-2">
                  {diperlukan
                    .filter((d) => d.kumpulan === k)
                    .map((d) => (
                      <BarisDokumen
                        key={d.kod}
                        jenis={d}
                        dokumen={dokumen.find((x) => x.jenis_dokumen === d.kod)}
                        permohonanId={p.id}
                        pegawaiId={pegawai?.id ?? null}
                        selesai={muatSemula}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Semakan akhir ────────────────────────────────────────── */}
      <section className="kad">
        <div className="kad-tajuk">
          <h2>
            Semakan Akhir Sebelum Hantar
          </h2>
        </div>
        <div className="kad-isi space-y-4">
          {kelengkapan && kelengkapan.ralat.length > 0 && (
            <SenaraiRalat ralat={kelengkapan.ralat} />
          )}

          {kelengkapan && kelengkapan.amaran.length > 0 && (
            <Mesej jenis="amaran" tajuk="Perhatian">
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {kelengkapan.amaran.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </Mesej>
          )}

          {bolehHantar && (
            <Mesej jenis="berjaya" tajuk="Permohonan lengkap">
              Semua syarat dipenuhi. Setelah dihantar, permohonan dikunci
              daripada suntingan dan bergerak ke meja Pegawai PPD untuk semakan
              pertama.
            </Mesej>
          )}

          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            <a
              href={laluan(`cetak/lampiran-a/${p.id}`)}
              target="_blank"
              rel="noreferrer"
              className="btn-kedua"
            >
              Pratonton Lampiran A
            </a>
            <a
              href={laluan(`cetak/senarai-semak/${p.id}`)}
              target="_blank"
              rel="noreferrer"
              className="btn-kedua"
            >
              Pratonton Senarai Semak
            </a>
            <button
              type="button"
              className="btn-utama ml-auto"
              disabled={!bolehHantar || menghantar}
              onClick={() => setSahHantar(true)}
            >
              {menghantar ? <Berputar /> : null}
              Hantar Permohonan
            </button>
          </div>
        </div>
      </section>

      <Modal
        tajuk="Sahkan penghantaran"
        buka={sahHantar}
        tutup={() => setSahHantar(false)}
      >
        <p className="text-sm leading-relaxed text-slate-700">
          Permohonan akan dihantar ke{' '}
          <strong>{bundel.ppd?.nama ?? bundel.permohonan.kod_ppd}</strong> untuk
          semakan pertama. Selepas ini permohonan tidak boleh disunting kecuali
          dikembalikan oleh pegawai.
        </p>
        <p className="mt-3 rounded-lg bg-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600">
          Pastikan Bahagian F (Ulasan Pengetua atau Guru Besar) telah
          ditandatangani pada salinan bercetak Lampiran A di sekolah sebelum
          permohonan dihantar.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="btn-kedua"
            onClick={() => setSahHantar(false)}
          >
            Batal
          </button>
          <button
            type="button"
            className="btn-utama"
            onClick={hantar}
            disabled={menghantar}
          >
            {menghantar ? <Berputar /> : null}
            Ya, hantar sekarang
          </button>
        </div>
      </Modal>
    </>
  )
}

function BarisDokumen({
  jenis,
  dokumen,
  permohonanId,
  pegawaiId,
  selesai,
}: {
  jenis: JenisDokumen
  dokumen: Dokumen | undefined
  permohonanId: string
  pegawaiId: string | null
  selesai: () => Promise<void>
}) {
  const [kemajuan, setKemajuan] = useState<number | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)

  async function pilihFail(e: React.ChangeEvent<HTMLInputElement>) {
    const fail = e.target.files?.[0]
    e.target.value = ''
    if (!fail) return
    setRalat(null)
    setKemajuan(0)
    try {
      await muatNaikDokumen(permohonanId, jenis.kod, fail, pegawaiId, (k) =>
        setKemajuan(k.peratus),
      )
      await selesai()
    } catch (err) {
      setRalat(err instanceof Error ? err.message : 'Muat naik gagal.')
    } finally {
      setKemajuan(null)
    }
  }

  async function buang() {
    if (!dokumen) return
    setSibuk(true)
    try {
      await padamDokumen(dokumen.id)
      await selesai()
    } catch (err) {
      setRalat(err instanceof Error ? err.message : 'Gagal memadam.')
    } finally {
      setSibuk(false)
    }
  }

  async function lihat() {
    if (!dokumen) return
    setSibuk(true)
    try {
      const hasil = await lihatDokumen(dokumen.id)
      window.open(hasil.url, '_blank', 'noopener')
    } catch (err) {
      setRalat(err instanceof Error ? err.message : 'Gagal membuka dokumen.')
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div
      className={kelas(
        'rounded-lg border p-3',
        dokumen ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800">
            {jenis.nama}
            {jenis.bil_salinan > 1 && (
              <span className="ml-2 text-xs font-normal text-slate-500">
                {jenis.bil_salinan} salinan
              </span>
            )}
          </p>
          {jenis.perlu_sah_kj && (
            <p className="mt-0.5 text-xs text-amber-700">
              Perlu disahkan Ketua Jabatan
            </p>
          )}
          {dokumen && (
            <p className="mt-1 truncate text-xs text-slate-500">
              {dokumen.nama_fail} · {formatSaiz(dokumen.saiz)} ·{' '}
              {formatMasa(dokumen.dimuat_naik_pada)}
            </p>
          )}
          {dokumen && (
            <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400">
              SHA-256 {dokumen.cincangan_sha256}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {dokumen ? (
            <>
              <button
                type="button"
                className="btn-kedua px-3 py-1.5 text-xs"
                onClick={lihat}
                disabled={sibuk}
              >
                Lihat
              </button>
              <button
                type="button"
                className="px-2 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700"
                onClick={buang}
                disabled={sibuk}
              >
                Buang
              </button>
            </>
          ) : (
            <label className="btn-kedua cursor-pointer px-3 py-1.5 text-xs">
              {kemajuan !== null ? `${kemajuan}%` : 'Muat naik'}
              <input
                type="file"
                className="hidden"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={pilihFail}
                disabled={kemajuan !== null}
              />
            </label>
          )}
        </div>
      </div>

      {kemajuan !== null && (
        <div className="mt-2 h-1 overflow-hidden rounded bg-slate-200">
          <div
            className="h-full bg-jata-600 transition-all"
            style={{ width: `${kemajuan}%` }}
          />
        </div>
      )}
      {ralat && <p className="mt-2 text-xs text-rose-600">{ralat}</p>}
    </div>
  )
}
