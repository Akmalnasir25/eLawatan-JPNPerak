import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { sahLawatan } from '@/lib/api'
import { LABEL_KATEGORI, LABEL_STATUS } from '@/lib/istilah'
import { formatMasa, formatTarikh } from '@/lib/guna'
import { Berputar, Memuat, Mesej } from '@/komponen/ui'
import { RangkaAwam } from '@/komponen/Rangka'
import { BadgeCheck, QrCode, SearchCheck } from 'lucide-react'
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
    <RangkaAwam>
      <div className="bg-jata-700 px-4 py-10 text-center text-white">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-biru-500 text-white">
          <QrCode className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-white">Pengesahan Surat Kelulusan</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-jata-200">
          Imbas kod QR pada surat, atau masukkan kod pengesahan yang tercetak di
          bawah kod QR untuk memastikan surat itu dikeluarkan oleh sistem ini.
        </p>
      </div>
      <div className="flex justify-center px-4 py-10">
        <div className="-mt-16 w-full max-w-xl">

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
                  aria-label="Kod pengesahan"
                  className="medan font-mono uppercase tracking-widest"
                  placeholder="Kod pengesahan pada surat"
                  value={masukan}
                  onChange={(e) => setMasukan(e.target.value.toUpperCase())}
                />
                <button type="submit" className="btn-utama" disabled={sibuk}>
                  {sibuk ? <Berputar /> : <SearchCheck className="h-4 w-4" aria-hidden />}
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
                  <div className="flex items-center gap-3 rounded-lg border-2 border-emerald-500 bg-emerald-50 px-4 py-4">
                    <BadgeCheck className="h-10 w-10 shrink-0 text-emerald-600" aria-hidden />
                    <div>
                      <p className="text-base font-bold text-emerald-900">Surat kelulusan SAH</p>
                      <p className="text-sm text-emerald-800">
                        Permohonan ini telah diluluskan dan direkodkan dalam sistem eLAWATAN.
                      </p>
                    </div>
                  </div>
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

          <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
            Halaman ini terbuka kepada umum dan hanya memaparkan butiran minimum
            bagi tujuan pengesahan. Maklumat peribadi murid tidak didedahkan.
          </p>
        </div>
      </div>
    </RangkaAwam>
  )
}
