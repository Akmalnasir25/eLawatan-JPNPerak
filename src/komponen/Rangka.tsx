import { NavLink, useNavigate } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import { gunaAuth } from '@/lib/auth'
import { LABEL_PERANAN } from '@/lib/istilah'
import { kelas } from '@/lib/guna'

type Pautan = { ke: string; teks: string }

function pautanBagi(peranan: string): Pautan[] {
  if (peranan === 'sekolah') {
    return [
      { ke: '/', teks: 'Papan Pemuka' },
      { ke: '/permohonan/baharu', teks: 'Permohonan Baharu' },
      { ke: '/laporan', teks: 'Laporan' },
      { ke: '/profil', teks: 'Profil' },
    ]
  }
  if (peranan === 'admin') {
    return [
      { ke: '/', teks: 'Papan Pemuka' },
      { ke: '/senarai', teks: 'Semua Permohonan' },
      { ke: '/laporan', teks: 'Laporan' },
      { ke: '/pentadbir', teks: 'Pentadbir' },
      { ke: '/profil', teks: 'Profil' },
    ]
  }
  return [
    { ke: '/', teks: 'Peti Tindakan' },
    { ke: '/senarai', teks: 'Semua Permohonan' },
    { ke: '/laporan', teks: 'Laporan' },
    { ke: '/profil', teks: 'Profil' },
  ]
}

export function Rangka({ children }: { children: ReactNode }) {
  const { pegawai, sekolah, keluar } = gunaAuth()
  const navigate = useNavigate()
  const [menuBuka, setMenuBuka] = useState(false)

  if (!pegawai) return <>{children}</>

  const pautan = pautanBagi(pegawai.peranan)
  const skop =
    pegawai.peranan === 'sekolah'
      ? (sekolah?.nama ?? pegawai.kod_skop)
      : (pegawai.kod_skop ?? 'Seluruh negeri')

  async function logKeluar() {
    await keluar()
    navigate('/masuk', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="app-bar sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-jata-600 text-sm font-bold text-white">
              eL
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold tracking-tight text-jata-700">
                eLAWATAN
              </span>
              <span className="hidden text-[11px] text-slate-500 sm:block">
                JPN Perak
              </span>
            </span>
          </NavLink>

          <nav className="app-nav ml-4 hidden items-center gap-1 md:flex">
            {pautan.map((p) => (
              <NavLink
                key={p.ke}
                to={p.ke}
                end={p.ke === '/'}
                className={({ isActive }) =>
                  kelas(
                    'rounded-lg px-3 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-jata-50 text-jata-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )
                }
              >
                {p.teks}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <NavLink
              to="/profil"
              className="hidden rounded-lg px-2 py-1 text-right hover:bg-slate-100 sm:block"
              title="Profil, tandatangan dan cop"
            >
              <p className="text-sm font-medium leading-tight text-slate-800">
                {pegawai.nama}
              </p>
              <p className="text-[11px] leading-tight text-slate-500">
                {LABEL_PERANAN[pegawai.peranan]} · {skop}
              </p>
            </NavLink>
            <button
              type="button"
              onClick={logKeluar}
              className="btn-kedua px-3 py-1.5 text-xs"
            >
              Log Keluar
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
              onClick={() => setMenuBuka((b) => !b)}
              aria-label="Menu"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 5h14v2H3V5zm0 4h14v2H3V9zm0 4h14v2H3v-2z" />
              </svg>
            </button>
          </div>
        </div>

        {menuBuka && (
          <nav className="app-nav border-t border-slate-200 px-4 py-2 md:hidden">
            {pautan.map((p) => (
              <NavLink
                key={p.ke}
                to={p.ke}
                end={p.ke === '/'}
                onClick={() => setMenuBuka(false)}
                className={({ isActive }) =>
                  kelas(
                    'block rounded-lg px-3 py-2.5 text-sm font-medium',
                    isActive ? 'bg-jata-50 text-jata-700' : 'text-slate-600',
                  )
                }
              >
                {p.teks}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      <footer className="app-kaki border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 text-xs leading-relaxed text-slate-500 sm:px-6">
          <p>
            Sistem Permohonan dan Kelulusan Lawatan Murid Sekolah ·
            Jabatan Pendidikan Negeri Perak
          </p>
          <p className="mt-1">
            Dikuatkuasakan menurut Surat Pekeliling Ikhtisas KPM Bil. 9 Tahun 2023
            dan Peraturan Lawatan Sekolah 1957.
          </p>
        </div>
      </footer>
    </div>
  )
}

/** Tajuk halaman dengan aksi di kanan. */
export function TajukHalaman({
  tajuk,
  nota,
  aksi,
}: {
  tajuk: string
  nota?: string
  aksi?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          {tajuk}
        </h1>
        {nota && <p className="mt-1 text-sm text-slate-500">{nota}</p>}
      </div>
      {aksi && <div className="flex flex-wrap items-center gap-2">{aksi}</div>}
    </div>
  )
}
