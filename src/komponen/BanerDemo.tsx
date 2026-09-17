import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { demo as demoKlien, MOD_DEMO } from '@/lib/supabase'
import { gunaAuth } from '@/lib/auth'
import type { demo as JenisDemo } from '@/demo/klien'

// `#klien` sebenar mengeksport `demo = null`; dalam mod demo ia objek kawalan.
const demo = demoKlien as unknown as typeof JenisDemo | null

export function BanerDemo() {
  if (!MOD_DEMO || !demo) return null
  return <Baner d={demo} />
}

function Baner({ d }: { d: typeof JenisDemo }) {
  const { sesi } = gunaAuth()
  const navigate = useNavigate()
  const [sedia, setSedia] = useState(false)
  const [otp, setOtp] = useState<{ emel: string; kod: string } | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [kecil, setKecil] = useState(false)

  useEffect(() => {
    d.sedia().then(() => setSedia(true))
    const dengar = (e: Event) => setOtp((e as CustomEvent).detail)
    window.addEventListener('elawatan-demo-otp', dengar)
    return () => window.removeEventListener('elawatan-demo-otp', dengar)
  }, [d])

  useEffect(() => {
    if (sesi) setOtp(null)
  }, [sesi])

  async function tukar(emel: string) {
    if (!emel) return
    setSibuk(true)
    await d.logMasukSebagai(emel)
    setSibuk(false)
    navigate('/', { replace: true })
  }

  async function setSemula() {
    if (!window.confirm('Padam semua data demo dan mula semula?')) return
    setSibuk(true)
    await d.setSemula()
    window.location.href = '/masuk'
  }

  return (
    <>
      {otp && (
        <div className="tanpa-cetak fixed right-4 top-4 z-[60] w-72 rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            E-mel OTP (demo)
          </p>
          <p className="mt-1 text-xs text-amber-900">Kepada {otp.emel}</p>
          <p data-kod-otp className="mt-2 text-center text-3xl font-bold tracking-[0.3em] text-amber-900">
            {otp.kod}
          </p>
          <p className="mt-2 text-[11px] leading-snug text-amber-800">
            Dalam sistem sebenar kod ini dihantar ke peti e-mel.
          </p>
        </div>
      )}

      <div className="tanpa-cetak fixed inset-x-0 bottom-0 z-50 border-t-2 border-amber-400 bg-amber-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-xs sm:px-6">
          <span className="rounded bg-amber-400 px-2 py-0.5 font-bold uppercase tracking-wide text-amber-950">
            Mod demo
          </span>
          {!kecil && (
            <span className="text-amber-900">
              {sedia
                ? 'Postgres berjalan dalam pelayar ini. Data tidak dihantar ke mana-mana.'
                : 'Menyediakan pangkalan data demo… (kali pertama mengambil beberapa saat)'}
            </span>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs text-slate-800"
              value={sesi?.user.email ?? ''}
              disabled={!sedia || sibuk}
              onChange={(e) => tukar(e.target.value)}
            >
              <option value="">Log masuk pantas sebagai…</option>
              {d.akaun.map((a) => (
                <option key={a.emel} value={a.emel}>
                  {a.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="rounded-md border border-amber-300 bg-white px-2 py-1 text-amber-900 hover:bg-amber-100"
              onClick={setSemula}
              disabled={sibuk}
            >
              Set semula
            </button>
            <button
              type="button"
              className="px-1 text-amber-700 hover:text-amber-900"
              onClick={() => setKecil((k) => !k)}
              aria-label="Kecilkan"
            >
              {kecil ? '▴' : '▾'}
            </button>
          </div>
        </div>
      </div>
      <div className="tanpa-cetak h-12" aria-hidden />
    </>
  )
}
