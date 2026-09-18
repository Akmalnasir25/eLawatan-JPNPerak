import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  FileSignature,
  KeyRound,
  Lock,
  Mail,
  Route,
  ShieldCheck,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { gunaAuth } from '@/lib/auth'
import {
  kekuatanKataLaluan,
  logMasukKataLaluan,
  PANJANG_KATA_LALUAN,
  semakEmel as semakEmelApi,
  tetapKataLaluan,
  type SemakanEmel,
} from '@/lib/akaun'
import { LABEL_PERANAN } from '@/lib/istilah'
import { kelas } from '@/lib/guna'
import { Berputar, Mesej } from '@/komponen/ui'
import { RangkaAwam } from '@/komponen/Rangka'

type Fasa = 'emel' | 'padanan' | 'otp' | 'cipta' | 'kata_laluan'
type TujuanOtp = 'cipta' | 'set-semula'

const TAJUK: Record<Fasa, { tajuk: string; nota: string; ikon: typeof Mail }> = {
  emel: { tajuk: 'Log Masuk', nota: 'Sekolah dan pegawai menggunakan pintu yang sama', ikon: Mail },
  padanan: { tajuk: 'Sahkan Maklumat Sekolah', nota: 'Padanan daripada senarai rasmi JPN', ikon: BadgeCheck },
  otp: { tajuk: 'Kod Pengesahan', nota: 'Kod dihantar ke e-mel anda', ikon: KeyRound },
  cipta: { tajuk: 'Cipta Kata Laluan', nota: 'Digunakan untuk log masuk seterusnya', ikon: Lock },
  kata_laluan: { tajuk: 'Kata Laluan', nota: 'Masukkan kata laluan akaun anda', ikon: Lock },
}

export function Masuk() {
  const { sesi, memuat, muatSemula } = gunaAuth()
  const navigate = useNavigate()
  const lokasi = useLocation()

  const [fasa, setFasa] = useState<Fasa>('emel')
  const [tujuanOtp, setTujuanOtp] = useState<TujuanOtp>('cipta')
  const [emel, setEmel] = useState('')
  const [kod, setKod] = useState('')
  const [kataLaluan, setKataLaluan] = useState('')
  const [kataLaluan2, setKataLaluan2] = useState('')
  const [semakan, setSemakan] = useState<SemakanEmel | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)
  const [nota, setNota] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [kiraSemula, setKiraSemula] = useState(0)
  const kodRef = useRef<HTMLInputElement>(null)
  const kataRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (kiraSemula <= 0) return
    const t = setTimeout(() => setKiraSemula((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [kiraSemula])

  useEffect(() => {
    if (fasa === 'otp') kodRef.current?.focus()
    if (fasa === 'kata_laluan' || fasa === 'cipta') kataRef.current?.focus()
  }, [fasa])

  if (!memuat && sesi && fasa !== 'cipta') {
    const dari = (lokasi.state as { dari?: string } | null)?.dari ?? '/'
    return <Navigate to={dari} replace />
  }

  function semula(f: Fasa) {
    setFasa(f)
    setRalat(null)
    setNota(null)
  }

  // ── Langkah 1: e-mel menentukan laluan ──────────────────────────
  async function hantarEmel(e: React.FormEvent) {
    e.preventDefault()
    setRalat(null)
    setNota(null)
    setSibuk(true)
    try {
      const hasil = await semakEmelApi(emel)
      setSemakan(hasil)

      switch (hasil.status) {
        case 'ADA_KATA_LALUAN':
          if (hasil.sekatan?.disekat) {
            setRalat(
              `Akaun disekat sementara. Cuba lagi dalam ${Math.ceil(hasil.sekatan.saat_lagi / 60)} minit.`,
            )
          }
          semula('kata_laluan')
          break
        case 'PERLU_KATA_LALUAN':
          setNota(hasil.mesej)
          await hantarKod(!hasil.pernah_masuk, 'cipta')
          break
        case 'PADANAN_DIJUMPAI':
          semula('padanan')
          break
        default:
          setRalat(hasil.mesej)
      }
    } catch (err) {
      setRalat(err instanceof Error ? err.message : 'Ralat tidak dijangka.')
    } finally {
      setSibuk(false)
    }
  }

  async function hantarKod(ciptaPengguna: boolean, tujuan: TujuanOtp) {
    setSibuk(true)
    setRalat(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: emel.trim().toLowerCase(),
      options: { shouldCreateUser: ciptaPengguna },
    })
    setSibuk(false)
    if (error) {
      setRalat(
        error.message.toLowerCase().includes('rate')
          ? 'Terlalu kerap meminta kod. Sila tunggu seminit.'
          : error.message,
      )
      return
    }
    setTujuanOtp(tujuan)
    setKod('')
    setFasa('otp')
    setKiraSemula(60)
  }

  // ── Langkah 2: sahkan OTP ───────────────────────────────────────
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
      setRalat('Kod pengesahan tidak sepadan atau telah luput. Sila cuba lagi.')
      setKod('')
      return
    }
    setKataLaluan('')
    setKataLaluan2('')
    semula('cipta')
  }

  // ── Langkah 3: cipta kata laluan ────────────────────────────────
  async function simpanKataLaluan(e: React.FormEvent) {
    e.preventDefault()
    if (kataLaluan !== kataLaluan2) {
      setRalat('Kedua-dua kata laluan tidak sama.')
      return
    }
    setRalat(null)
    setSibuk(true)
    try {
      await tetapKataLaluan(kataLaluan)
      await muatSemula()
      navigate('/', { replace: true })
    } catch (err) {
      setRalat(err instanceof Error ? err.message : 'Gagal menyimpan kata laluan.')
    } finally {
      setSibuk(false)
    }
  }

  // ── Log masuk dengan kata laluan ────────────────────────────────
  async function masuk(e: React.FormEvent) {
    e.preventDefault()
    setRalat(null)
    setSibuk(true)
    try {
      await logMasukKataLaluan(emel, kataLaluan)
      navigate('/', { replace: true })
    } catch (err) {
      setRalat(err instanceof Error ? err.message : 'Log masuk gagal.')
      setKataLaluan('')
    } finally {
      setSibuk(false)
    }
  }

  const t = TAJUK[fasa]
  const IkonKad = t.ikon
  const kekuatan = kekuatanKataLaluan(kataLaluan)

  return (
    <RangkaAwam>
      <div className="relative overflow-hidden bg-jata-700">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:py-16">
          {/* ── Lajur maklumat ───────────────────────────────── */}
          <div className="text-white" data-animasi="kiri">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-biru-200">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              SPI KPM Bil. 9 Tahun 2023
            </p>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              Permohonan dan Kelulusan
              <br />
              <span className="text-biru-300">Lawatan Murid Sekolah</span>
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
                <li key={l.tajuk} data-animasi="zum" className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-biru-500 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <l.ikon className="h-4 w-4 text-biru-300" aria-hidden />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">{l.tajuk}</p>
                  <p className="mt-0.5 text-xs leading-snug text-jata-200">{l.nota}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* ── Kad log masuk ───────────────────────────────── */}
          <div className="w-full max-w-md justify-self-center lg:justify-self-end" data-animasi="kanan">
            <div className="overflow-hidden rounded-kad bg-white shadow-2xl">
              <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-6 py-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-jata-900 text-white">
                  <IkonKad className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-jata-900">{t.tajuk}</h2>
                  <p className="text-xs text-slate-500">{t.nota}</p>
                </div>
              </div>

              <div className="space-y-5 px-6 py-6">
                {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}
                {nota && !ralat && <Mesej jenis="maklumat">{nota}</Mesej>}

                {/* ── E-mel ─────────────────────────────────── */}
                {fasa === 'emel' && (
                  <form onSubmit={hantarEmel} className="space-y-4">
                    <div>
                      <label className="label" htmlFor="emel">E-mel rasmi</label>
                      <input
                        id="emel"
                        type="email"
                        required
                        autoFocus
                        autoComplete="username"
                        className="medan"
                        placeholder="nama@moe.gov.my"
                        value={emel}
                        onChange={(e) => setEmel(e.target.value)}
                      />
                      <p className="nota">
                        Bagi sekolah, gunakan e-mel rasmi sekolah. Pegawai menggunakan
                        e-mel yang didaftarkan oleh pejabat masing-masing.
                      </p>
                    </div>
                    <button type="submit" className="btn-utama w-full py-3" disabled={sibuk || !emel.includes('@')}>
                      {sibuk ? <Berputar /> : null}
                      Teruskan
                      {!sibuk && <ArrowRight className="h-4 w-4" aria-hidden />}
                    </button>
                  </form>
                )}

                {/* ── Padanan sekolah ───────────────────────── */}
                {fasa === 'padanan' && semakan?.sekolah && (
                  <div className="space-y-4">
                    <Mesej jenis="maklumat" tajuk="Padanan senarai JPN">
                      Maklumat ini diambil daripada senarai rasmi JPN dan tidak boleh
                      diubah oleh sekolah.
                    </Mesej>
                    <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-4">
                      {[
                        ['Nama sekolah', semakan.sekolah.nama],
                        ['Kod sekolah', semakan.sekolah.kod_sekolah],
                        ['Daerah', semakan.sekolah.nama_ppd],
                        ['Negeri', semakan.sekolah.negeri],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4 py-2.5">
                          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{k}</dt>
                          <dd className="text-right text-sm font-medium text-slate-800">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="flex gap-2">
                      <button type="button" className="btn-kedua flex-1" onClick={() => { setSemakan(null); semula('emel') }}>
                        Kembali
                      </button>
                      <button
                        type="button"
                        className="btn-utama flex-1"
                        disabled={sibuk}
                        onClick={() => hantarKod(true, 'cipta')}
                      >
                        {sibuk ? <Berputar /> : null}
                        Sahkan &amp; Hantar Kod
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Kod pengesahan ────────────────────────── */}
                {fasa === 'otp' && (
                  <form onSubmit={sahkanKod} className="space-y-4">
                    {semakan?.pegawai && (
                      <Mesej jenis="maklumat" tajuk="Akaun dijumpai">
                        {semakan.pegawai.nama} — {LABEL_PERANAN[semakan.pegawai.peranan]}
                        {semakan.pegawai.kod_skop ? ` · ${semakan.pegawai.kod_skop}` : ''}
                      </Mesej>
                    )}
                    <div>
                      <label className="label" htmlFor="kod">Kod pengesahan 6 digit</label>
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
                        onChange={(e) => setKod(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      />
                      <p className="nota">
                        Kod dihantar ke <strong>{emel}</strong>. Sah selama 10 minit.
                        {tujuanOtp === 'set-semula' && ' Selepas ini anda menetapkan kata laluan baharu.'}
                      </p>
                    </div>
                    <button type="submit" className="btn-utama w-full py-3" disabled={sibuk || kod.length !== 6}>
                      {sibuk ? <Berputar /> : null}
                      Sahkan Kod
                    </button>
                    <div className="flex items-center justify-between text-xs">
                      <button type="button" className="text-slate-500 hover:text-slate-700" onClick={() => { setKod(''); setSemakan(null); semula('emel') }}>
                        Tukar e-mel
                      </button>
                      <button
                        type="button"
                        disabled={kiraSemula > 0 || sibuk}
                        className="font-semibold text-jata-700 hover:underline disabled:text-slate-400 disabled:no-underline"
                        onClick={() => hantarKod(!semakan?.pernah_masuk && tujuanOtp === 'cipta', tujuanOtp)}
                      >
                        {kiraSemula > 0 ? `Hantar semula dalam ${kiraSemula}s` : 'Hantar semula kod'}
                      </button>
                    </div>
                  </form>
                )}

                {/* ── Cipta kata laluan ─────────────────────── */}
                {fasa === 'cipta' && (
                  <form onSubmit={simpanKataLaluan} className="space-y-4">
                    <div>
                      <label className="label" htmlFor="kata1">Kata laluan baharu</label>
                      <input
                        id="kata1"
                        ref={kataRef}
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={PANJANG_KATA_LALUAN}
                        className="medan"
                        value={kataLaluan}
                        onChange={(e) => setKataLaluan(e.target.value)}
                      />
                      <div className="mt-2 flex gap-1" aria-hidden>
                        {[1, 2, 3].map((n) => (
                          <span
                            key={n}
                            className={kelas(
                              'h-1 flex-1 rounded-full transition',
                              kekuatan.skor >= n
                                ? kekuatan.skor === 3
                                  ? 'bg-emerald-500'
                                  : kekuatan.skor === 2
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                : 'bg-slate-200',
                            )}
                          />
                        ))}
                      </div>
                      <p className="nota">
                        {kekuatan.label}. Kata laluan yang pernah bocor dalam
                        kebocoran data awam akan ditolak.
                      </p>
                    </div>
                    <div>
                      <label className="label" htmlFor="kata2">Ulang kata laluan</label>
                      <input
                        id="kata2"
                        type="password"
                        autoComplete="new-password"
                        required
                        className="medan"
                        value={kataLaluan2}
                        onChange={(e) => setKataLaluan2(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn-utama w-full py-3"
                      disabled={sibuk || kataLaluan.length < PANJANG_KATA_LALUAN || !kataLaluan2}
                    >
                      {sibuk ? <Berputar /> : null}
                      Simpan &amp; Masuk
                    </button>
                  </form>
                )}

                {/* ── Kata laluan ───────────────────────────── */}
                {fasa === 'kata_laluan' && (
                  <form onSubmit={masuk} className="space-y-4">
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-slate-500">E-mel</span>{' '}
                      <strong className="text-jata-900">{emel}</strong>
                      <button
                        type="button"
                        className="ml-2 text-xs font-semibold text-jata-700 hover:underline"
                        onClick={() => { setKataLaluan(''); setSemakan(null); semula('emel') }}
                      >
                        Tukar
                      </button>
                    </div>
                    <div>
                      <label className="label" htmlFor="kata">Kata laluan</label>
                      <input
                        id="kata"
                        ref={kataRef}
                        type="password"
                        autoComplete="current-password"
                        required
                        className="medan"
                        value={kataLaluan}
                        onChange={(e) => setKataLaluan(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn-utama w-full py-3" disabled={sibuk || !kataLaluan}>
                      {sibuk ? <Berputar /> : null}
                      Log Masuk
                    </button>
                    <button
                      type="button"
                      className="w-full text-center text-xs font-semibold text-jata-700 hover:underline"
                      disabled={sibuk}
                      onClick={() => hantarKod(false, 'set-semula')}
                    >
                      Lupa kata laluan? Dapatkan kod pengesahan
                    </button>
                  </form>
                )}
              </div>

              <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-[0.7rem] leading-relaxed text-slate-500">
                Peringkat capaian ditentukan oleh e-mel yang log masuk — pengguna
                tidak memilih peranan sendiri. Kata laluan hanya diketahui oleh
                pemiliknya; pentadbir tidak boleh melihat atau menetapkannya.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-3">
        {[
          { tajuk: 'Siapa boleh log masuk?', teks: 'E-mel rasmi sekolah dan pegawai KPM yang didaftarkan oleh pejabat masing-masing.' },
          { tajuk: 'Log masuk kali pertama', teks: `Kod pengesahan dihantar ke e-mel anda, kemudian anda mencipta kata laluan sendiri (minimum ${PANJANG_KATA_LALUAN} aksara).` },
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
