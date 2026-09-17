import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  Contrast,
  FilePlus2,
  Files,
  Globe,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Phone,
  Settings,
  ShieldCheck,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { gunaAuth } from '@/lib/auth'
import { gunaJabatan } from '@/lib/jabatan'
import { gunaPaparan, type SaizTeks } from '@/lib/paparan'
import { LABEL_PERANAN } from '@/lib/istilah'
import { formatHari, formatTarikh, kelas } from '@/lib/guna'
import { LogoRasmi } from './LogoRasmi'

type Pautan = { ke: string; teks: string; ikon: LucideIcon }

function pautanBagi(peranan: string): Pautan[] {
  if (peranan === 'sekolah') {
    return [
      { ke: '/', teks: 'Papan Pemuka', ikon: LayoutDashboard },
      { ke: '/permohonan/baharu', teks: 'Permohonan Baharu', ikon: FilePlus2 },
      { ke: '/senarai', teks: 'Senarai Permohonan', ikon: Files },
      { ke: '/laporan', teks: 'Laporan', ikon: BarChart3 },
    ]
  }
  const asas: Pautan[] = [
    { ke: '/', teks: peranan === 'admin' ? 'Papan Pemuka' : 'Peti Tindakan', ikon: peranan === 'admin' ? LayoutDashboard : Inbox },
    { ke: '/senarai', teks: 'Semua Permohonan', ikon: Files },
    { ke: '/laporan', teks: 'Laporan', ikon: BarChart3 },
  ]
  if (peranan === 'admin') asas.push({ ke: '/pentadbir', teks: 'Pentadbiran', ikon: Settings })
  return asas
}

// ── Bar utiliti ─────────────────────────────────────────────────────

export function BarUtiliti() {
  const { saiz, setSaiz, kontras, togolKontras } = gunaPaparan()
  const { jabatan } = gunaJabatan()
  const kini = new Date().toISOString()
  const pilihanSaiz: { s: SaizTeks; label: string; tajuk: string }[] = [
    { s: 'kecil', label: 'A−', tajuk: 'Teks kecil' },
    { s: 'biasa', label: 'A', tajuk: 'Teks biasa' },
    { s: 'besar', label: 'A+', tajuk: 'Teks besar' },
  ]

  return (
    <div className="tanpa-cetak bg-jata-700 text-[0.72rem] text-white/85">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-1.5 sm:px-6">
        <p className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-biru-300" aria-hidden />
          <span>Sistem rasmi {jabatan.nama}</span>
          <span className="hidden text-white/60 sm:inline">
            · {formatHari(kini)}, {formatTarikh(kini)}
          </span>
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5" role="group" aria-label="Saiz teks">
            <span className="mr-1 hidden text-white/60 sm:inline">Saiz teks</span>
            {pilihanSaiz.map((p) => (
              <button
                key={p.s}
                type="button"
                title={p.tajuk}
                aria-pressed={saiz === p.s}
                onClick={() => setSaiz(p.s)}
                className={kelas(
                  'min-w-[1.75rem] rounded-full px-1.5 py-0.5 font-semibold transition',
                  saiz === p.s ? 'bg-white text-jata-900' : 'hover:bg-white/10',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={togolKontras}
            aria-pressed={kontras}
            className={kelas(
              'flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold transition',
              kontras ? 'bg-white text-jata-900' : 'hover:bg-white/10',
            )}
          >
            <Contrast className="h-3.5 w-3.5" aria-hidden />
            Kontras
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Kepala jabatan ──────────────────────────────────────────────────

export function KepalaJabatan({ kanan }: { kanan?: ReactNode }) {
  const { jabatan } = gunaJabatan()
  return (
    <div className="bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3.5 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          {/* Logo korporat sudah membawa nama kementerian */}
          <LogoRasmi varian="penuh" saiz={72} className="hidden sm:block" />
          <LogoRasmi varian="penuh" saiz={46} className="sm:hidden" />
          <div className="min-w-0 border-l border-slate-200 pl-3 leading-tight">
            <p className="truncate text-sm font-extrabold uppercase text-jata-900 sm:text-lg">
              <span className="sm:hidden">{jabatan.nama_ringkas || jabatan.nama}</span>
              <span className="hidden sm:inline">{jabatan.nama}</span>
            </p>
            <p className="truncate text-xs text-slate-600">
              <span className="font-bold text-biru-500">eLAWATAN</span>
              <span className="hidden sm:inline">
                {' '}· Sistem Permohonan dan Kelulusan Lawatan Murid Sekolah
              </span>
            </p>
          </div>
        </Link>
        {kanan && <div className="ml-auto flex items-center gap-2">{kanan}</div>}
      </div>
    </div>
  )
}

// ── Menu pengguna ───────────────────────────────────────────────────

function MenuPengguna() {
  const { pegawai, sekolah, keluar } = gunaAuth()
  const navigate = useNavigate()
  const [buka, setBuka] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!buka) return
    const tutup = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setBuka(false)
    }
    const kekunci = (e: KeyboardEvent) => e.key === 'Escape' && setBuka(false)
    document.addEventListener('mousedown', tutup)
    document.addEventListener('keydown', kekunci)
    return () => {
      document.removeEventListener('mousedown', tutup)
      document.removeEventListener('keydown', kekunci)
    }
  }, [buka])

  if (!pegawai) return null
  const skop =
    pegawai.peranan === 'sekolah'
      ? (sekolah?.kod_sekolah ?? pegawai.kod_skop)
      : (pegawai.kod_skop ?? 'Seluruh negeri')
  const inisial = pegawai.nama
    .replace(/\b(Tuan|Puan|Encik|Cik|Dato'?|Datuk|Haji|Hajah|Dr\.?|SK|SMK|bin|binti)\b/gi, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0])
    .join('')
    .toUpperCase()

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setBuka((b) => !b)}
        aria-expanded={buka}
        aria-haspopup="menu"
        className="flex items-center gap-2.5 rounded-full border border-transparent py-1 pl-1 pr-3 text-left transition hover:border-slate-200 hover:bg-latar"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-jata-900 text-xs font-bold text-white ring-2 ring-biru-200">
          {inisial || <UserRound className="h-4 w-4" />}
        </span>
        <span className="hidden max-w-[220px] leading-tight md:block">
          <span className="block truncate text-sm font-semibold text-jata-900">{pegawai.nama}</span>
          <span className="block truncate text-[0.7rem] text-slate-500">
            {LABEL_PERANAN[pegawai.peranan]} · {skop}
          </span>
        </span>
        <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" aria-hidden />
      </button>

      {buka && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-kad border border-slate-100 bg-white shadow-timbul"
        >
          <div className="border-b border-slate-100 bg-jata-50/60 px-4 py-3">
            <p className="truncate text-sm font-semibold text-jata-900">{pegawai.nama}</p>
            <p className="truncate text-xs text-slate-500">{pegawai.emel}</p>
          </div>
          <Link
            to="/profil"
            role="menuitem"
            onClick={() => setBuka(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <UserRound className="h-4 w-4 text-biru-500" aria-hidden />
            Profil, tandatangan &amp; cop
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              await keluar()
              navigate('/masuk', { replace: true })
            }}
            className="flex w-full items-center gap-2.5 border-t border-slate-100 px-4 py-2.5 text-left text-sm text-rose-700 hover:bg-rose-50"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Log keluar
          </button>
        </div>
      )}
    </div>
  )
}

// ── Kaki laman ──────────────────────────────────────────────────────

export function KakiLaman() {
  const { jabatan } = gunaJabatan()
  const tahun = new Date().getFullYear()
  return (
    <footer className="app-kaki tanpa-cetak mt-12 bg-jata-700 text-white/85">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <LogoRasmi saiz={44} terang />
            <div className="leading-tight">
              <p className="font-bold text-white">{jabatan.nama}</p>
              <p className="text-xs text-white/60">{jabatan.sektor}</p>
            </div>
          </div>
          <ul className="mt-5 space-y-2.5 text-[0.85rem] text-white/85">
            {jabatan.alamat && (
              <li className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/70" aria-hidden />
                {jabatan.alamat}
              </li>
            )}
            {jabatan.telefon && (
              <li className="flex gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-white/70" aria-hidden />
                {jabatan.telefon}
                {jabatan.faks && ` · Faks ${jabatan.faks}`}
              </li>
            )}
            {jabatan.emel && (
              <li className="flex gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-white/70" aria-hidden />
                {jabatan.emel}
              </li>
            )}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-sm font-bold text-white">Pautan</p>
          <ul className="divide-y divide-white/10 text-[0.85rem] [&>li]:py-2 [&>li:first-child]:pt-0">
            <li><Link to="/" className="hover:text-white hover:underline">Laman utama sistem</Link></li>
            <li><Link to="/sah" className="hover:text-white hover:underline">Semak kesahihan surat kelulusan</Link></li>
            <li><Link to="/profil" className="hover:text-white hover:underline">Profil pengguna</Link></li>
            {jabatan.laman_web && (
              <li>
                <a
                  href={jabatan.laman_web}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-white hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" aria-hidden />
                  Portal rasmi {jabatan.nama_ringkas}
                </a>
              </li>
            )}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-sm font-bold text-white">Rujukan dasar</p>
          <ul className="divide-y divide-white/10 text-[0.85rem] text-white/85 [&>li]:py-2 [&>li:first-child]:pt-0">
            <li>Surat Pekeliling Ikhtisas KPM Bil. 9 Tahun 2023</li>
            <li>Peraturan Lawatan Sekolah 1957</li>
            <li>Senarai Semak BSS Pin.1/2023</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-[0.72rem] text-white/60 sm:px-6">
          <p>Hak Cipta Terpelihara © {tahun} {jabatan.nama}</p>
          <p>Paparan terbaik: Google Chrome, Microsoft Edge atau Mozilla Firefox versi terkini</p>
        </div>
      </div>
    </footer>
  )
}

// ── Rangka aplikasi ─────────────────────────────────────────────────

export function Rangka({ children }: { children: ReactNode }) {
  const lokasi = useLocation()
  const { pegawai } = gunaAuth()
  const [menuBuka, setMenuBuka] = useState(false)

  if (!pegawai) return <>{children}</>
  const pautan = pautanBagi(pegawai.peranan)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="app-bar tanpa-cetak">
        <BarUtiliti />
        <KepalaJabatan
          kanan={
            <>
              <MenuPengguna />
              <button
                type="button"
                className="rounded-full p-2 text-jata-900 hover:bg-latar lg:hidden"
                onClick={() => setMenuBuka((b) => !b)}
                aria-label={menuBuka ? 'Tutup menu' : 'Buka menu'}
                aria-expanded={menuBuka}
              >
                {menuBuka ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </>
          }
        />
      </header>

      <nav className="app-nav tanpa-cetak sticky top-0 z-30 border-t border-slate-100 bg-white shadow-[0_2px_6px_rgba(0,0,0,0.08)]" aria-label="Navigasi utama">
        <div className="mx-auto hidden max-w-7xl items-stretch px-4 sm:px-6 lg:flex">
          {pautan.map((p) => (
            <NavLink
              key={p.ke}
              to={p.ke}
              end={p.ke === '/'}
              className={({ isActive }) =>
                kelas(
                  'flex items-center gap-2 border-b-[3px] px-4 py-3 text-sm font-bold transition',
                  isActive
                    ? 'border-biru-500 text-biru-500'
                    : 'border-transparent text-jata-900 hover:text-biru-500',
                )
              }
            >
              <p.ikon className="h-4 w-4" aria-hidden />
              {p.teks}
            </NavLink>
          ))}
        </div>

        {menuBuka && (
          <div className="border-t border-slate-100 px-2 py-2 lg:hidden">
            {[...pautan, { ke: '/profil', teks: 'Profil', ikon: UserRound }].map((p) => (
              <NavLink
                key={p.ke}
                to={p.ke}
                end={p.ke === '/'}
                onClick={() => setMenuBuka(false)}
                className={({ isActive }) =>
                  kelas(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold',
                    isActive ? 'bg-biru-50 text-biru-600' : 'text-jata-900',
                  )
                }
              >
                <p.ikon className="h-4 w-4" aria-hidden />
                {p.teks}
              </NavLink>
            ))}
          </div>
        )}
        {!menuBuka && <div className="h-1 lg:hidden" />}
      </nav>

      <main
        key={lokasi.pathname}
        className="halaman-masuk mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8"
      >
        {children}
      </main>

      <KakiLaman />
    </div>
  )
}

// ── Tajuk halaman dengan jejak ──────────────────────────────────────

export type Jejak = { teks: string; ke?: string }

export function TajukHalaman({
  tajuk,
  nota,
  aksi,
  jejak = [],
  ikon: Ikon,
}: {
  tajuk: string
  nota?: ReactNode
  aksi?: ReactNode
  jejak?: Jejak[]
  ikon?: LucideIcon
}) {
  return (
    <div className="mb-6">
      {jejak.length > 0 && (
      <nav aria-label="Jejak halaman" className="mb-3">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
          <li>
            <Link to="/" className="hover:text-biru-500 hover:underline">Utama</Link>
          </li>
          {jejak.map((j, i) => (
            <li key={i} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3 text-slate-400" aria-hidden />
              {j.ke ? (
                <Link to={j.ke} className="hover:text-biru-500 hover:underline">{j.teks}</Link>
              ) : (
                <span className="font-medium text-slate-700">{j.teks}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex min-w-0 items-start gap-3">
          {Ikon && (
            <span className="mt-0.5 hidden h-11 w-11 shrink-0 place-items-center rounded-xl bg-jata-900 text-white shadow-sm sm:grid">
              <Ikon className="h-5 w-5" aria-hidden />
            </span>
          )}
          <div className="min-w-0 border-l-4 border-biru-500 pl-3 sm:border-0 sm:pl-0">
            <h1 className="break-words text-xl font-extrabold tracking-tight text-jata-900 sm:text-2xl">
              {tajuk}
            </h1>
            {nota && <p className="mt-1 text-sm text-slate-600">{nota}</p>}
          </div>
        </div>
        {aksi && <div className="flex flex-wrap items-center gap-2">{aksi}</div>}
      </div>
    </div>
  )
}

/** Rangka untuk halaman sebelum log masuk. */
export function RangkaAwam({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-latar">
      <header className="tanpa-cetak">
        <BarUtiliti />
        <KepalaJabatan />
        <div className="h-px bg-slate-200" />
      </header>
      <main className="flex-1">{children}</main>
      <KakiLaman />
    </div>
  )
}
