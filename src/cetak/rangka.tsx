import { useEffect, useState, type ReactNode } from 'react'
import { dapatPermohonan, dapatTetapan, type BundelPermohonan } from '@/lib/api'
import { imejCetak } from '@/lib/profil'
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
  const [imej, setImej] = useState<Record<string, string>>({})
  const [jpn, setJpn] = useState<MaklumatJpn | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([dapatPermohonan(id), dapatTetapan<MaklumatJpn>('maklumat_jpn')])
      .then(([b, m]) => {
        setBundel(b)
        setJpn(m)
        // Imej gagal dimuat tidak menghalang cetakan — ruang kosong
        // kekal untuk tandatangan basah.
        imejCetak(b.permohonan.id).then(setImej).catch(() => setImej({}))
      })
      .catch((e) => setRalat(e instanceof Error ? e.message : 'Gagal memuatkan.'))
  }, [id])

  /** URL imej bagi kunci yang dibekukan, atau undefined. */
  const url = (kunci: string | null | undefined) => (kunci ? imej[kunci] : undefined)

  return { bundel, jpn, ralat, url }
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
  tandatangan,
  cop,
  tanpaCop = false,
}: {
  nama?: string | null
  jawatan?: string | null
  tarikh?: string | null
  label?: string
  /** URL imej tandatangan yang dibekukan (jika ada). */
  tandatangan?: string
  /** URL imej cop rasmi yang dibekukan (jika ada). */
  cop?: string
  tanpaCop?: boolean
}) {
  return (
    <div className="elak-pecah">
      <ImejTandatangan tandatangan={tandatangan} cop={cop} />
      <div className="garis-tandatangan">
        {label}
        {nama ? `: ${nama}` : ''}
      </div>
      {jawatan && <div style={{ fontSize: '9.5pt' }}>{jawatan}</div>}
      <div style={{ fontSize: '9.5pt' }}>Tarikh: {tarikh ?? '________________'}</div>
      {!tanpaCop && !cop && (
        <div style={{ fontSize: '9.5pt', marginTop: 2 }}>Cop rasmi:</div>
      )}
    </div>
  )
}

/** Kawasan tandatangan dengan cop bertindih — dikongsi dengan cetakan. */
export function ImejTandatangan({
  tandatangan,
  cop,
}: {
  tandatangan?: string
  cop?: string
}) {
  return (
    <div style={{ position: 'relative', height: 64, marginTop: 6 }}>
      {tandatangan && (
        <img
          src={tandatangan}
          alt="Tandatangan"
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            maxHeight: 60,
            maxWidth: 190,
            objectFit: 'contain',
          }}
        />
      )}
      {cop && (
        <img
          src={cop}
          alt="Cop rasmi"
          style={{
            position: 'absolute',
            left: 120,
            top: -14,
            height: 86,
            maxWidth: 150,
            objectFit: 'contain',
            opacity: 0.88,
            mixBlendMode: 'multiply',
          }}
        />
      )}
    </div>
  )
}

export function Pangkah({ ditanda }: { ditanda: boolean }) {
  return <span className="kotak-pangkah">{ditanda ? '✓' : ''}</span>
}
