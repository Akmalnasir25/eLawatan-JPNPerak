import { Link } from 'react-router-dom'
import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FolderOpen,
  Info,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { kelas } from '@/lib/guna'
import { kurangkanGerakan } from '@/lib/gerakan'
import { LABEL_STATUS, WARNA_STATUS } from '@/lib/istilah'
import type { Status } from '@/lib/jenis'

// ── Penunjuk memuat ────────────────────────────────────────────────

export function Memuat({ teks = 'Memuatkan…' }: { teks?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-jata-100 border-t-jata-700" />
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
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {LABEL_STATUS[status]}
    </span>
  )
}

// ── Kad statistik ──────────────────────────────────────────────────

const NADA_STATISTIK = {
  biru: 'bg-jata-50 text-jata-700 ring-jata-100',
  emas: 'bg-emas-50 text-emas-700 ring-emas-100',
  hijau: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  kelabu: 'bg-slate-100 text-slate-600 ring-slate-200',
} as const

export function KadStatistik({
  label,
  nilai,
  ikon: Ikon,
  nada = 'biru',
  nota,
  ke,
}: {
  ke?: string
  label: string
  nilai: ReactNode
  ikon: LucideIcon
  nada?: keyof typeof NADA_STATISTIK
  nota?: string
}) {
  const isi = (
    <div className="kad kad-hidup h-full flex items-center gap-4 px-4 py-3.5 sm:px-5 sm:py-4">
      <span className={kelas('hidden h-12 w-12 shrink-0 place-items-center rounded-lg ring-1 ring-inset sm:grid', NADA_STATISTIK[nada])}>
        <Ikon className="h-6 w-6" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums leading-none text-jata-900">
          {typeof nilai === 'number' ? <NomborNaik nilai={nilai} /> : nilai}
        </p>
        <p className="mt-1.5 text-xs font-medium text-slate-600">{label}</p>
        {nota && <p className="text-[0.7rem] text-slate-400">{nota}</p>}
      </div>
    </div>
  )
  return ke ? <Link to={ke} aria-label={`${label}: ${nilai}. Lihat senarai`} className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-jata-600 hover:ring-2 hover:ring-jata-200">{isi}</Link> : isi
}

/** Nombor mengira dari 0 apabila mula kelihatan di skrin. */
export function NomborNaik({ nilai, tempoh = 900 }: { nilai: number; tempoh?: number }) {
  const [papar, setPapar] = useState(kurangkanGerakan() ? nilai : 0)
  const ref = useRef<HTMLSpanElement>(null)
  const dari = useRef(0)

  useEffect(() => {
    if (kurangkanGerakan() || typeof IntersectionObserver === 'undefined') {
      setPapar(nilai)
      return
    }
    let bingkai = 0
    const mula = () => {
      const awal = dari.current
      const t0 = performance.now()
      const langkah = (t: number) => {
        const k = Math.min(1, (t - t0) / tempoh)
        const lega = 1 - Math.pow(1 - k, 3)
        setPapar(Math.round(awal + (nilai - awal) * lega))
        if (k < 1) bingkai = requestAnimationFrame(langkah)
        else dari.current = nilai
      }
      bingkai = requestAnimationFrame(langkah)
    }
    const pemerhati = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) {
        pemerhati.disconnect()
        mula()
      }
    })
    if (ref.current) pemerhati.observe(ref.current)
    return () => {
      pemerhati.disconnect()
      cancelAnimationFrame(bingkai)
    }
  }, [nilai, tempoh])

  return (
    <span ref={ref} aria-label={String(nilai)}>
      {papar.toLocaleString('ms-MY')}
    </span>
  )
}

// ── Mesej ──────────────────────────────────────────────────────────

type JenisMesej = 'ralat' | 'amaran' | 'maklumat' | 'berjaya'

const GAYA_MESEJ: Record<JenisMesej, string> = {
  ralat: 'border-rose-200 border-l-rose-600 bg-rose-50 text-rose-900',
  amaran: 'border-amber-200 border-l-amber-500 bg-amber-50 text-amber-900',
  maklumat: 'border-jata-100 border-l-jata-600 bg-jata-50 text-jata-900',
  berjaya: 'border-emerald-200 border-l-emerald-600 bg-emerald-50 text-emerald-900',
}

const IKON_MESEJ: Record<JenisMesej, LucideIcon> = {
  ralat: XCircle,
  amaran: AlertTriangle,
  maklumat: Info,
  berjaya: CheckCircle2,
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
  const Ikon = IKON_MESEJ[jenis]
  return (
    <div
      role={jenis === 'ralat' ? 'alert' : 'status'}
      className={kelas('flex gap-3 rounded-md border border-l-4 px-4 py-3 text-sm', GAYA_MESEJ[jenis])}
    >
      <Ikon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {tajuk && <p className="mb-0.5 font-semibold">{tajuk}</p>}
        <div className="leading-relaxed">{children}</div>
      </div>
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
  // Pautkan label kepada input tunggal supaya pembaca skrin mengenalinya
  // dan klik pada label memfokuskan medan.
  const idAuto = useId()
  const kawalan =
    isValidElement(children) &&
    typeof children.type === 'string' &&
    ['input', 'select', 'textarea'].includes(children.type)
      ? (children as ReactElement<{ id?: string }>)
      : null
  const id = kawalan ? (kawalan.props.id ?? idAuto) : undefined

  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
        {perlu && <span className="ml-1 text-rose-600">*</span>}
      </label>
      {kawalan ? cloneElement(kawalan, { id }) : children}
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
          ? 'border-jata-400 bg-jata-50 ring-1 ring-jata-200'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-slate-400 accent-jata-700"
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
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-jata-950/50 p-4 pt-[8vh] backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={tajuk}
    >
      <div className={kelas('w-full overflow-hidden rounded-kad bg-white shadow-2xl', lebar)}>
        <div className="flex items-center justify-between bg-jata-700 px-5 py-3.5">
          <h2 className="text-base font-semibold text-white">{tajuk}</h2>
          <button
            type="button"
            onClick={tutup}
            className="rounded-md p-1 text-jata-200 hover:bg-white/10 hover:text-white"
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
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-jata-50 text-jata-400">
        <FolderOpen className="h-6 w-6" aria-hidden />
      </span>
      <p className="text-sm font-semibold text-jata-900">{tajuk}</p>
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
