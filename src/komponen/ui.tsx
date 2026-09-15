import type { ReactNode } from 'react'
import { kelas } from '@/lib/guna'
import { LABEL_STATUS, WARNA_STATUS } from '@/lib/istilah'
import type { Status } from '@/lib/jenis'

// ── Penunjuk memuat ────────────────────────────────────────────────

export function Memuat({ teks = 'Memuatkan…' }: { teks?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-jata-600" />
      <span className="text-sm">{teks}</span>
    </div>
  )
}

export function Berputar({ saiz = 16 }: { saiz?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-white/40 border-t-white"
      style={{ width: saiz, height: saiz }}
    />
  )
}

// ── Lencana status ─────────────────────────────────────────────────

export function LencanaStatus({ status }: { status: Status }) {
  return (
    <span className={kelas('lencana', WARNA_STATUS[status])}>
      {LABEL_STATUS[status]}
    </span>
  )
}

// ── Mesej ──────────────────────────────────────────────────────────

type JenisMesej = 'ralat' | 'amaran' | 'maklumat' | 'berjaya'

const GAYA_MESEJ: Record<JenisMesej, string> = {
  ralat: 'border-rose-200 bg-rose-50 text-rose-800',
  amaran: 'border-amber-200 bg-amber-50 text-amber-900',
  maklumat: 'border-sky-200 bg-sky-50 text-sky-900',
  berjaya: 'border-emerald-200 bg-emerald-50 text-emerald-900',
}

export function Mesej({
  jenis = 'maklumat',
  tajuk,
  children,
}: {
  jenis?: JenisMesej
  tajuk?: string
  children: ReactNode
}) {
  return (
    <div className={kelas('rounded-lg border px-4 py-3 text-sm', GAYA_MESEJ[jenis])}>
      {tajuk && <p className="mb-1 font-semibold">{tajuk}</p>}
      <div className="leading-relaxed">{children}</div>
    </div>
  )
}

export function SenaraiRalat({ ralat }: { ralat: string[] }) {
  if (ralat.length === 0) return null
  return (
    <Mesej jenis="ralat" tajuk={`${ralat.length} perkara perlu dilengkapkan`}>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {ralat.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </Mesej>
  )
}

// ── Medan borang ───────────────────────────────────────────────────

export function Medan({
  label,
  nota,
  perlu,
  children,
}: {
  label: string
  nota?: string
  perlu?: boolean
  children: ReactNode
}) {
  return (
    <div>
      <label className="label">
        {label}
        {perlu && <span className="ml-1 text-rose-600">*</span>}
      </label>
      {children}
      {nota && <p className="nota">{nota}</p>}
    </div>
  )
}

export function Petak({
  label,
  nota,
  checked,
  onChange,
  disabled,
}: {
  label: string
  nota?: string
  checked: boolean
  onChange: (n: boolean) => void
  disabled?: boolean
}) {
  return (
    <label
      className={kelas(
        'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition',
        checked
          ? 'border-jata-300 bg-jata-50'
          : 'border-slate-200 bg-white hover:bg-slate-50',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-jata-600 focus:ring-jata-500"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm">
        <span className="font-medium text-slate-800">{label}</span>
        {nota && <span className="mt-0.5 block text-xs text-slate-500">{nota}</span>}
      </span>
    </label>
  )
}

// ── Modal ──────────────────────────────────────────────────────────

export function Modal({
  tajuk,
  buka,
  tutup,
  lebar = 'max-w-lg',
  children,
}: {
  tajuk: string
  buka: boolean
  tutup: () => void
  lebar?: string
  children: ReactNode
}) {
  if (!buka) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-[8vh]">
      <div className={kelas('w-full rounded-xl bg-white shadow-xl', lebar)}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{tajuk}</h2>
          <button
            type="button"
            onClick={tutup}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Tutup"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.3 6.3a1 1 0 011.4 0L10 8.6l2.3-2.3a1 1 0 111.4 1.4L11.4 10l2.3 2.3a1 1 0 01-1.4 1.4L10 11.4l-2.3 2.3a1 1 0 01-1.4-1.4L8.6 10 6.3 7.7a1 1 0 010-1.4z" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

// ── Keadaan kosong ─────────────────────────────────────────────────

export function Kosong({
  tajuk,
  nota,
  aksi,
}: {
  tajuk: string
  nota?: string
  aksi?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <p className="text-sm font-medium text-slate-700">{tajuk}</p>
      {nota && <p className="mt-1 max-w-md text-sm text-slate-500">{nota}</p>}
      {aksi && <div className="mt-5">{aksi}</div>}
    </div>
  )
}

// ── Baris maklumat ─────────────────────────────────────────────────

export function Baris({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-slate-100 py-2.5 last:border-0 sm:grid-cols-[minmax(0,180px)_1fr] sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="text-sm text-slate-800">{children}</dd>
    </div>
  )
}
