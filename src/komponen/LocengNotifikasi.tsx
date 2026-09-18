import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { kiraanBelumBaca, senaraiNotifikasi, tandaiDibaca } from '@/lib/notifikasi'
import { formatMasa, kelas } from '@/lib/guna'
import type { Notifikasi } from '@/lib/jenis'

const SELANG_MS = 60_000

/** Loceng notifikasi pada kepala halaman. Kiraan disegar setiap minit dan setiap tukar halaman. */
export function LocengNotifikasi() {
  const navigate = useNavigate()
  const lokasi = useLocation()
  const [buka, setBuka] = useState(false)
  const [kiraan, setKiraan] = useState(0)
  const [senarai, setSenarai] = useState<Notifikasi[] | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const segarKiraan = useCallback(() => {
    kiraanBelumBaca().then(setKiraan).catch(() => {})
  }, [])

  useEffect(() => {
    segarKiraan()
    const t = window.setInterval(segarKiraan, SELANG_MS)
    return () => window.clearInterval(t)
  }, [segarKiraan, lokasi.pathname])

  useEffect(() => {
    if (!buka) return
    senaraiNotifikasi(20).then(setSenarai).catch(() => setSenarai([]))
    const luar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setBuka(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setBuka(false)
    document.addEventListener('mousedown', luar)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', luar)
      document.removeEventListener('keydown', esc)
    }
  }, [buka])

  async function pilih(n: Notifikasi) {
    setBuka(false)
    if (!n.dibaca_pada) {
      await tandaiDibaca(n.id).catch(() => {})
      segarKiraan()
    }
    if (n.pautan) navigate(n.pautan)
  }

  async function semuaDibaca() {
    await tandaiDibaca().catch(() => {})
    setSenarai((s) => s?.map((n) => ({ ...n, dibaca_pada: n.dibaca_pada ?? new Date().toISOString() })) ?? s)
    setKiraan(0)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setBuka((b) => !b)}
        className="relative rounded-full p-2 text-jata-900 hover:bg-latar"
        aria-label={kiraan > 0 ? `Notifikasi, ${kiraan} belum dibaca` : 'Notifikasi'}
        aria-expanded={buka}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {kiraan > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-600 px-1 text-[0.65rem] font-bold text-white ring-2 ring-white">
            {kiraan > 99 ? '99+' : kiraan}
          </span>
        )}
      </button>

      {buka && (
        <div
          className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-kad border border-slate-100 bg-white shadow-timbul"
          role="dialog"
          aria-label="Notifikasi"
        >
          <div className="flex items-center justify-between border-b border-slate-100 bg-jata-50/60 px-4 py-2.5">
            <p className="text-sm font-semibold text-jata-900">Notifikasi</p>
            {kiraan > 0 && (
              <button
                type="button"
                onClick={semuaDibaca}
                className="inline-flex items-center gap-1 text-xs font-semibold text-biru-600 hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                Tandai semua dibaca
              </button>
            )}
          </div>
          <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
            {senarai === null && <li className="px-4 py-6 text-center text-sm text-slate-500">Memuatkan…</li>}
            {senarai?.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-500">Tiada notifikasi.</li>
            )}
            {senarai?.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => pilih(n)}
                  className={kelas(
                    'flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50',
                    !n.dibaca_pada && 'bg-biru-50/40',
                  )}
                >
                  <span
                    className={kelas(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      n.dibaca_pada ? 'bg-transparent' : 'bg-biru-500',
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-jata-900">{n.tajuk}</span>
                    <span className="mt-0.5 line-clamp-3 block text-xs leading-relaxed text-slate-600">{n.mesej}</span>
                    <span className="mt-1 block text-[0.68rem] text-slate-400">{formatMasa(n.dicipta_pada)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
