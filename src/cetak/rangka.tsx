import { useEffect, useState, type ReactNode } from 'react'
import { dapatPermohonan, dapatTetapan, type BundelPermohonan } from '@/lib/api'
import { Memuat, Mesej } from '@/komponen/ui'

export type MaklumatJpn = {
  nama: string
  sektor: string
  alamat: string
  telefon: string
  emel: string
}

/** Muatkan rekod penuh untuk halaman cetakan. */
export function gunaCetak(id: string | undefined) {
  const [bundel, setBundel] = useState<BundelPermohonan | null>(null)
  const [jpn, setJpn] = useState<MaklumatJpn | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([dapatPermohonan(id), dapatTetapan<MaklumatJpn>('maklumat_jpn')])
      .then(([b, m]) => {
        setBundel(b)
        setJpn(m)
      })
      .catch((e) => setRalat(e instanceof Error ? e.message : 'Gagal memuatkan.'))
  }, [id])

  return { bundel, jpn, ralat }
}

/**
 * Bingkai cetakan. Bar alat hilang automatik pada kertas melalui
 * kelas `tanpa-cetak` dalam lembaran gaya cetak.
 */
export function BingkaiCetak({
  tajuk,
  ralat,
  sedia,
  children,
}: {
  tajuk: string
  ralat: string | null
  sedia: boolean
  children: ReactNode
}) {
  if (ralat) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <Mesej jenis="ralat">{ralat}</Mesej>
      </div>
    )
  }
  if (!sedia) return <Memuat teks="Menyediakan cetakan…" />

  return (
    <div className="min-h-screen bg-slate-200 py-6 print:bg-white print:py-0">
      <div className="tanpa-cetak mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-4 px-4">
        <div>
          <h1 className="text-sm font-semibold text-slate-800">{tajuk}</h1>
          <p className="text-xs text-slate-500">
            Menu dan bar sistem tidak dicetak.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-kedua"
            onClick={() => window.close()}
          >
            Tutup
          </button>
          <button
            type="button"
            className="btn-utama"
            onClick={() => window.print()}
          >
            Cetak
          </button>
        </div>
      </div>

      <div className="halaman-cetak mx-auto w-[210mm] max-w-full bg-white p-[14mm] shadow-lg print:w-auto print:p-0 print:shadow-none">
        {children}
      </div>
    </div>
  )
}

/** Blok tandatangan standard pada borang rasmi. */
export function BlokTandatangan({
  nama,
  jawatan,
  tarikh,
  label = 'Tandatangan',
}: {
  nama?: string | null
  jawatan?: string | null
  tarikh?: string | null
  label?: string
}) {
  return (
    <div className="elak-pecah" style={{ marginTop: 8 }}>
      <div className="garis-tandatangan">
        {label}
        {nama ? `: ${nama}` : ''}
      </div>
      {jawatan && <div style={{ fontSize: '9.5pt' }}>{jawatan}</div>}
      <div style={{ fontSize: '9.5pt' }}>Tarikh: {tarikh ?? '________________'}</div>
      <div style={{ fontSize: '9.5pt', marginTop: 2 }}>Cop rasmi:</div>
    </div>
  )
}

export function Pangkah({ ditanda }: { ditanda: boolean }) {
  return <span className="kotak-pangkah">{ditanda ? '✓' : ''}</span>
}
