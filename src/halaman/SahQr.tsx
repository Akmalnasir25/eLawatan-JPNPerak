import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { sahLawatan } from '@/lib/api'
import { LABEL_KATEGORI, LABEL_STATUS } from '@/lib/istilah'
import { formatMasa, formatTarikh } from '@/lib/guna'
import { Berputar, Memuat, Mesej } from '@/komponen/ui'
import type { Kategori, Status } from '@/lib/jenis'

type Hasil = {
  sah: boolean
  no_rujukan?: string
  nama_sekolah?: string
  kategori?: Kategori
  tujuan?: string
  tarikh_mula?: string
  tarikh_tamat?: string
  bil_murid?: number
  bil_guru?: number
  status?: Status
  diluluskan_pada?: string
}

export function SahQr() {
  const { kod } = useParams<{ kod: string }>()
  const [masukan, setMasukan] = useState(kod ?? '')
  const [hasil, setHasil] = useState<Hasil | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [ralat, setRalat] = useState<string | null>(null)

  async function semak(k: string) {
    if (!k.trim()) return
    setSibuk(true)
    setRalat(null)
    try {
      setHasil((await sahLawatan(k.trim())) as Hasil)
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Ralat semasa menyemak kod.')
    } finally {
      setSibuk(false)
    }
  }

  useEffect(() => {
    if (kod) void semak(kod)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kod])

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-jata-600 text-sm font-bold text-white">
              eL
            </div>
            <h1 className="mt-4 text-xl font-bold tracking-tight text-jata-700">
              Pengesahan Surat Kelulusan
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              eLAWATAN · Jabatan Pendidikan Negeri Perak
            </p>
          </div>

          <div className="kad">
            <div className="kad-isi space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void semak(masukan)
                }}
                className="flex gap-2"
              >
                <input
                  className="medan font-mono uppercase"
                  placeholder="Kod pengesahan pada surat"
                  value={masukan}
                  onChange={(e) => setMasukan(e.target.value.toUpperCase())}
                />
                <button type="submit" className="btn-utama" disabled={sibuk}>
                  {sibuk ? <Berputar /> : null}
                  Semak
                </button>
              </form>

              {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}

              {sibuk && !hasil && <Memuat teks="Menyemak kod…" />}

              {hasil && !hasil.sah && (
                <Mesej jenis="ralat" tajuk="Kod tidak sah">
                  Tiada surat kelulusan aktif sepadan dengan kod ini. Semak
                  semula kod pada surat, atau hubungi PPD/JPN yang mengeluarkan
                  surat tersebut.
                </Mesej>
              )}

              {hasil?.sah && (
                <>
                  <Mesej jenis="berjaya" tajuk="Surat kelulusan sah">
                    Permohonan ini telah diluluskan dan direkodkan dalam sistem
                    eLAWATAN.
                  </Mesej>
                  <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-4">
                    {[
                      ['Nombor rujukan', hasil.no_rujukan],
                      ['Sekolah', hasil.nama_sekolah],
                      [
                        'Kategori',
                        hasil.kategori ? LABEL_KATEGORI[hasil.kategori] : '—',
                      ],
                      ['Tujuan', hasil.tujuan],
                      [
                        'Tarikh lawatan',
                        `${formatTarikh(hasil.tarikh_mula)} – ${formatTarikh(hasil.tarikh_tamat)}`,
                      ],
                      [
                        'Bilangan peserta',
                        `${hasil.bil_murid} murid, ${hasil.bil_guru} guru`,
                      ],
                      [
                        'Status',
                        hasil.status ? LABEL_STATUS[hasil.status] : '—',
                      ],
                      ['Diluluskan pada', formatMasa(hasil.diluluskan_pada)],
                    ].map(([k, v]) => (
                      <div key={String(k)} className="py-2.5">
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          {k}
                        </dt>
                        <dd className="mt-0.5 text-sm text-slate-800">
                          {v ?? '—'}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
            Halaman ini terbuka kepada umum dan hanya memaparkan butiran minimum
            bagi tujuan pengesahan. Maklumat peribadi murid tidak didedahkan.
          </p>
        </div>
      </div>
    </div>
  )
}
