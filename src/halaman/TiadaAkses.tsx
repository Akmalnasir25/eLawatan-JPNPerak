import { useNavigate } from 'react-router-dom'
import { gunaAuth } from '@/lib/auth'

export function TiadaAkses() {
  const { sesi, keluar } = gunaAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-200">
          <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 1.6a8.4 8.4 0 100 16.8 8.4 8.4 0 000-16.8zM9 6a1 1 0 112 0v5a1 1 0 11-2 0V6zm1 9.4a1.1 1.1 0 100-2.2 1.1 1.1 0 000 2.2z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h1 className="mt-5 text-lg font-semibold text-slate-900">
          Akaun ini belum diberikan capaian
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          E-mel <strong className="text-slate-700">{sesi?.user.email}</strong>{' '}
          telah disahkan, tetapi tiada dalam senarai sekolah JPN dan belum
          didaftarkan sebagai pegawai.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Sila hubungi pentadbir sistem di JPN Perak untuk mendaftarkan akaun
          ini, atau log masuk menggunakan e-mel rasmi sekolah anda.
        </p>
        <button
          type="button"
          className="btn-kedua mt-6"
          onClick={async () => {
            await keluar()
            navigate('/masuk', { replace: true })
          }}
        >
          Log keluar dan cuba e-mel lain
        </button>
      </div>
    </div>
  )
}
