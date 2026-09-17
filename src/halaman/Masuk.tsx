import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { DOMAIN_DIBENARKAN, panggilFungsi, supabase } from '@/lib/supabase'
import { gunaAuth } from '@/lib/auth'
import { LABEL_PERANAN } from '@/lib/istilah'
import { Berputar, Mesej } from '@/komponen/ui'
import { RangkaAwam } from '@/komponen/Rangka'
import {
  ArrowRight,
  BadgeCheck,
  FileSignature,
  KeyRound,
  Mail,
  Route,
  ShieldCheck,
} from 'lucide-react'
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

  const tajukKad =
    fasa === 'emel' ? 'Log Masuk' : fasa === 'padanan' ? 'Sahkan Maklumat Sekolah' : 'Kod Pengesahan'
  const ikonKad = fasa === 'emel' ? Mail : fasa === 'padanan' ? BadgeCheck : KeyRound
  const IkonKad = ikonKad

  return (
    <RangkaAwam>
      <div className="relative overflow-hidden bg-jata-900">
        {/* Corak latar halus */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:py-16">
          {/* ── Lajur maklumat ───────────────────────────────── */}
          <div className="text-white">
            <p className="inline-flex items-center gap-2 rounded-full border border-emas-400/40 bg-emas-400/10 px-3 py-1 text-xs font-semibold text-emas-300">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              SPI KPM Bil. 9 Tahun 2023
            </p>
            <h1 className="mt-5 text-3xl font-bold leading-tight text-white sm:text-4xl">
              Permohonan dan Kelulusan
              <br />
              <span className="text-emas-300">Lawatan Murid Sekolah</span>
            </h1>
            <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-jata-100">
              Satu saluran rasmi untuk sekolah, Pejabat Pendidikan Daerah dan
              Jabatan Pendidikan Negeri Perak — dari permohonan hingga surat
              kelulusan berkod QR.
            </p>

            <ol className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                { ikon: FileSignature, tajuk: 'Isi borang', nota: 'Lampiran A digital, enam langkah' },
                { ikon: Route, tajuk: 'Kelulusan berperingkat', nota: 'PPD, JPN dan KPM mengikut kategori' },
                { ikon: BadgeCheck, tajuk: 'Surat kelulusan', nota: 'Berkod QR, boleh disemak awam' },
              ].map((l, i) => (
                <li key={l.tajuk} className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-emas-400 text-xs font-bold text-jata-950">
                      {i + 1}
                    </span>
                    <l.ikon className="h-4 w-4 text-emas-300" aria-hidden />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">{l.tajuk}</p>
                  <p className="mt-0.5 text-xs leading-snug text-jata-200">{l.nota}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* ── Kad log masuk ───────────────────────────────── */}
          <div className="w-full max-w-md justify-self-center lg:justify-self-end">
            <div className="overflow-hidden rounded-lg bg-white shadow-2xl">
              <div className="flex items-center gap-3 border-b-2 border-emas-400 bg-jata-50 px-6 py-4">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-jata-700 text-white">
                  <IkonKad className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-jata-900">{tajukKad}</h2>
                  <p className="text-xs text-slate-500">
                    {fasa === 'emel'
                      ? 'Sekolah dan pegawai menggunakan pintu yang sama'
                      : fasa === 'padanan'
                        ? 'Langkah 2 daripada 3'
                        : 'Langkah 3 daripada 3'}
                  </p>
                </div>
              </div>
            <div className="space-y-5 px-6 py-6">
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
                    className="btn-utama w-full py-3"
                    disabled={sibuk || !emel.includes('@')}
                  >
                    {sibuk ? <Berputar /> : null}
                    Teruskan
                    {!sibuk && <ArrowRight className="h-4 w-4" aria-hidden />}
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
                    className="btn-utama w-full py-3"
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

            <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-[0.7rem] leading-relaxed text-slate-500">
              Peringkat capaian ditentukan oleh e-mel yang log masuk — pengguna
              tidak memilih peranan sendiri. Sekolah kali pertama didaftarkan
              automatik jika e-mel ada dalam senarai JPN.
            </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-3">
        {[
          { tajuk: 'Siapa boleh log masuk?', teks: 'E-mel rasmi sekolah (moe-dl.edu.my) dan pegawai KPM (moe.gov.my) yang didaftarkan oleh pentadbir JPN.' },
          { tajuk: 'Tiada kata laluan', teks: 'Kod pengesahan sekali guna dihantar ke e-mel anda setiap kali log masuk. Kod sah selama 10 minit.' },
          { tajuk: 'Semak surat kelulusan', teks: 'Ibu bapa dan pihak luar boleh mengesahkan surat melalui kod QR tanpa log masuk.' },
        ].map((k) => (
          <div key={k.tajuk} className="kad px-5 py-4">
            <p className="text-sm font-semibold text-jata-900">{k.tajuk}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{k.teks}</p>
          </div>
        ))}
      </div>
    </RangkaAwam>
  )
}
