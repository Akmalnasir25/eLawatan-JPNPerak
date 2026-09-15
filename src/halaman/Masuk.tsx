import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { DOMAIN_DIBENARKAN, panggilFungsi, supabase } from '@/lib/supabase'
import { gunaAuth } from '@/lib/auth'
import { LABEL_PERANAN } from '@/lib/istilah'
import { Berputar, Mesej } from '@/komponen/ui'
import type { Peranan } from '@/lib/jenis'

type Semakan = {
  status:
    | 'DOMAIN_TIDAK_SAH'
    | 'SUDAH_BERDAFTAR'
    | 'AKAUN_TIDAK_AKTIF'
    | 'PEGAWAI_MENUNGGU'
    | 'TIADA_DALAM_SENARAI'
    | 'SEKOLAH_TIDAK_AKTIF'
    | 'PADANAN_DIJUMPAI'
  mesej: string
  peranan?: Peranan
  pegawai?: { nama: string; peranan: Peranan; jawatan: string | null; kod_skop: string | null }
  sekolah?: {
    kod_sekolah: string
    nama: string
    jenis: string
    kod_ppd: string
    nama_ppd: string
    kod_jpn: string
    negeri: string
  }
}

type Fasa = 'emel' | 'padanan' | 'otp'

export function Masuk() {
  const { sesi, memuat } = gunaAuth()
  const navigate = useNavigate()
  const lokasi = useLocation()

  const [fasa, setFasa] = useState<Fasa>('emel')
  const [emel, setEmel] = useState('')
  const [kod, setKod] = useState('')
  const [semakan, setSemakan] = useState<Semakan | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [kiraSemula, setKiraSemula] = useState(0)
  const kodRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (kiraSemula <= 0) return
    const t = setTimeout(() => setKiraSemula((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [kiraSemula])

  useEffect(() => {
    if (fasa === 'otp') kodRef.current?.focus()
  }, [fasa])

  if (!memuat && sesi) {
    const dari = (lokasi.state as { dari?: string } | null)?.dari ?? '/'
    return <Navigate to={dari} replace />
  }

  async function semakEmel(e: React.FormEvent) {
    e.preventDefault()
    setRalat(null)
    setSibuk(true)
    try {
      const hasil = await panggilFungsi<Semakan>('daftar-semak', {
        emel: emel.trim().toLowerCase(),
      })
      setSemakan(hasil)

      if (
        hasil.status === 'DOMAIN_TIDAK_SAH' ||
        hasil.status === 'TIADA_DALAM_SENARAI' ||
        hasil.status === 'AKAUN_TIDAK_AKTIF' ||
        hasil.status === 'SEKOLAH_TIDAK_AKTIF'
      ) {
        setRalat(hasil.mesej)
        return
      }

      if (hasil.status === 'PADANAN_DIJUMPAI') {
        setFasa('padanan')
        return
      }

      // Pegawai berdaftar atau menunggu log masuk pertama — hantar kod terus
      await hantarKod(hasil.status !== 'SUDAH_BERDAFTAR')
    } catch (err) {
      setRalat(err instanceof Error ? err.message : 'Ralat tidak dijangka.')
    } finally {
      setSibuk(false)
    }
  }

  async function hantarKod(ciptaPengguna: boolean) {
    setSibuk(true)
    setRalat(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: emel.trim().toLowerCase(),
      options: { shouldCreateUser: ciptaPengguna },
    })
    setSibuk(false)
    if (error) {
      setRalat(
        error.message.includes('rate')
          ? 'Terlalu kerap meminta kod. Sila tunggu seminit.'
          : error.message,
      )
      return
    }
    setFasa('otp')
    setKiraSemula(60)
  }

  async function sahkanKod(e: React.FormEvent) {
    e.preventDefault()
    setRalat(null)
    setSibuk(true)
    const { error } = await supabase.auth.verifyOtp({
      email: emel.trim().toLowerCase(),
      token: kod.trim(),
      type: 'email',
    })
    setSibuk(false)
    if (error) {
      setRalat('Kod OTP tidak sepadan. Sila cuba lagi.')
      setKod('')
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-jata-600 text-lg font-bold text-white">
              eL
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-jata-700">
              eLAWATAN
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Permohonan dan Kelulusan Lawatan Murid Sekolah
              <br />
              Jabatan Pendidikan Negeri Perak
            </p>
          </div>

          <div className="kad">
            <div className="kad-isi space-y-5">
              {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}

              {/* ── Langkah 1: e-mel ─────────────────────────────── */}
              {fasa === 'emel' && (
                <form onSubmit={semakEmel} className="space-y-4">
                  <div>
                    <label className="label" htmlFor="emel">
                      E-mel rasmi
                    </label>
                    <input
                      id="emel"
                      type="email"
                      required
                      autoFocus
                      autoComplete="email"
                      className="medan"
                      placeholder={`nama@${DOMAIN_DIBENARKAN[0]}`}
                      value={emel}
                      onChange={(e) => setEmel(e.target.value)}
                    />
                    <p className="nota">
                      Hanya domain {DOMAIN_DIBENARKAN.join(' dan ')} diterima.
                      Bagi sekolah, gunakan e-mel rasmi sekolah — bukan e-mel guru.
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="btn-utama w-full"
                    disabled={sibuk || !emel.includes('@')}
                  >
                    {sibuk ? <Berputar /> : null}
                    Teruskan
                  </button>
                </form>
              )}

              {/* ── Langkah 5: papar padanan senarai JPN ─────────── */}
              {fasa === 'padanan' && semakan?.sekolah && (
                <div className="space-y-4">
                  <Mesej jenis="maklumat" tajuk="Padanan senarai JPN">
                    Maklumat ini diambil daripada senarai rasmi JPN dan tidak
                    boleh diubah oleh sekolah. Hubungi pentadbir sistem jika
                    terdapat kesilapan.
                  </Mesej>
                  <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-4">
                    {[
                      ['Nama sekolah', semakan.sekolah.nama],
                      ['Kod sekolah', semakan.sekolah.kod_sekolah],
                      ['Daerah', semakan.sekolah.nama_ppd],
                      ['Negeri', semakan.sekolah.negeri],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 py-2.5">
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          {k}
                        </dt>
                        <dd className="text-right text-sm font-medium text-slate-800">
                          {v}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-kedua flex-1"
                      onClick={() => {
                        setFasa('emel')
                        setSemakan(null)
                      }}
                    >
                      Kembali
                    </button>
                    <button
                      type="button"
                      className="btn-utama flex-1"
                      disabled={sibuk}
                      onClick={() => hantarKod(true)}
                    >
                      {sibuk ? <Berputar /> : null}
                      Sahkan &amp; Hantar Kod
                    </button>
                  </div>
                </div>
              )}

              {/* ── Langkah 7: masukkan OTP ──────────────────────── */}
              {fasa === 'otp' && (
                <form onSubmit={sahkanKod} className="space-y-4">
                  {semakan?.pegawai && (
                    <Mesej jenis="maklumat" tajuk="Akaun pegawai dijumpai">
                      {semakan.pegawai.nama} —{' '}
                      {LABEL_PERANAN[semakan.pegawai.peranan]}
                      {semakan.pegawai.kod_skop
                        ? ` · ${semakan.pegawai.kod_skop}`
                        : ''}
                    </Mesej>
                  )}
                  <div>
                    <label className="label" htmlFor="kod">
                      Kod pengesahan 6 digit
                    </label>
                    <input
                      id="kod"
                      ref={kodRef}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      pattern="[0-9]{6}"
                      required
                      className="medan text-center text-2xl font-semibold tracking-[0.5em]"
                      value={kod}
                      onChange={(e) =>
                        setKod(e.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                    />
                    <p className="nota">
                      Kod dihantar ke <strong>{emel}</strong>. Sah selama 10 minit.
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="btn-utama w-full"
                    disabled={sibuk || kod.length !== 6}
                  >
                    {sibuk ? <Berputar /> : null}
                    Sahkan &amp; Log Masuk
                  </button>
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      className="text-slate-500 hover:text-slate-700"
                      onClick={() => {
                        setFasa('emel')
                        setKod('')
                        setSemakan(null)
                      }}
                    >
                      Tukar e-mel
                    </button>
                    <button
                      type="button"
                      disabled={kiraSemula > 0 || sibuk}
                      className="font-medium text-jata-600 hover:text-jata-700 disabled:text-slate-400"
                      onClick={() => hantarKod(semakan?.status !== 'SUDAH_BERDAFTAR')}
                    >
                      {kiraSemula > 0
                        ? `Hantar semula dalam ${kiraSemula}s`
                        : 'Hantar semula kod'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
            Peringkat capaian ditentukan oleh e-mel yang log masuk.
            <br />
            Pengguna tidak memilih peranan sendiri.
          </p>
        </div>
      </div>
    </div>
  )
}
