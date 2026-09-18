import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, CircleHelp, Mail, Phone, Search } from 'lucide-react'
import { gunaAuth } from '@/lib/auth'
import { gunaJabatan } from '@/lib/jabatan'
import { kelas } from '@/lib/guna'
import { RangkaAwam, TajukHalaman } from '@/komponen/Rangka'
import type { Peranan } from '@/lib/jenis'

type Kumpulan = 'semua' | 'sekolah' | 'pegawai' | 'pentadbir'

type Soalan = {
  id: string
  topik: string
  untuk: Kumpulan[]
  soalan: string
  jawapan: ReactNode
  /** Teks tambahan untuk carian. */
  kata?: string
}

const TOPIK = ['Akaun & log masuk', 'Permohonan sekolah', 'Semakan & kelulusan', 'Notifikasi & kalendar', 'Privasi & keselamatan', 'Pentadbiran']

const SOALAN: Soalan[] = [
  // ── Akaun ──
  {
    id: 'log-masuk-pertama',
    topik: 'Akaun & log masuk',
    untuk: ['semua'],
    soalan: 'Bagaimana log masuk kali pertama?',
    jawapan: (
      <ol className="ml-5 list-decimal space-y-1">
        <li>Masukkan e-mel rasmi anda (domain moe-dl.edu.my atau moe.gov.my).</li>
        <li>Sistem menghantar kod pengesahan enam digit ke e-mel itu.</li>
        <li>Masukkan kod, kemudian cipta kata laluan sekurang-kurangnya 12 aksara.</li>
        <li>Log masuk seterusnya hanya menggunakan e-mel dan kata laluan.</li>
      </ol>
    ),
    kata: 'otp kod pengesahan daftar',
  },
  {
    id: 'lupa-kata-laluan',
    topik: 'Akaun & log masuk',
    untuk: ['semua'],
    soalan: 'Saya lupa kata laluan.',
    jawapan: 'Pada skrin kata laluan, pilih "Lupa kata laluan? Dapatkan kod pengesahan". Kod pengesahan dihantar ke e-mel anda dan anda boleh menetapkan kata laluan baharu. Pentadbir tidak boleh melihat atau menetapkan kata laluan sesiapa.',
  },
  {
    id: 'disekat',
    topik: 'Akaun & log masuk',
    untuk: ['semua'],
    soalan: 'Akaun saya disekat sementara.',
    jawapan: 'Selepas 5 percubaan kata laluan yang salah dalam 15 minit, e-mel itu disekat selama 15 minit untuk melindungi akaun. Tunggu sehingga tempoh tamat, atau gunakan "Lupa kata laluan".',
    kata: 'sekatan kunci',
  },
  {
    id: 'e-mel-ditolak',
    topik: 'Akaun & log masuk',
    untuk: ['semua'],
    soalan: 'E-mel saya ditolak atau "tiada dalam senarai".',
    jawapan: 'Akaun sekolah mesti menggunakan e-mel sekolah yang terdapat dalam senarai rasmi JPN. Pegawai PPD dan JPN mesti didaftarkan terlebih dahulu oleh pendaftar di pejabat masing-masing melalui Urus Pegawai. Hubungi pentadbir jika maklumat tidak tepat.',
  },
  {
    id: 'pengguna-tambahan',
    topik: 'Akaun & log masuk',
    untuk: ['sekolah', 'pegawai'],
    soalan: 'Bagaimana menambah pengguna lain?',
    jawapan: 'Buka Urus Pegawai dan pilih "Daftar pegawai". Sekolah boleh menambah guru bagi sekolahnya; KPPD dan penyemak PPD menambah penyemak daerah; Pengarah dan penyemak JPN menambah penyemak JPN. Pengguna baharu log masuk sendiri dan mencipta kata laluan mereka.',
  },

  // ── Sekolah ──
  {
    id: 'permohonan-baharu',
    topik: 'Permohonan sekolah',
    untuk: ['sekolah'],
    soalan: 'Bagaimana membuat permohonan lawatan?',
    jawapan: (
      <>
        <p>Pilih "Permohonan Baharu". Borang mempunyai enam langkah dan draf disimpan secara automatik:</p>
        <ol className="ml-5 mt-1 list-decimal space-y-0.5">
          <li>Maklumat Lawatan — kategori, tujuan, pengangkutan</li>
          <li>Tempat &amp; Tarikh</li>
          <li>Kewangan — kutipan dan penaja</li>
          <li>Anggota Rombongan — ketua, guru dan murid</li>
          <li>Nisbah Pengiring</li>
          <li>Dokumen &amp; Hantar</li>
        </ol>
        <p className="mt-1">Butang Hantar hanya aktif apabila semua perkara wajib lengkap.</p>
      </>
    ),
    kata: 'mohon borang lampiran a draf',
  },
  {
    id: 'tempoh-minimum',
    topik: 'Permohonan sekolah',
    untuk: ['sekolah'],
    soalan: 'Bilakah permohonan mesti dihantar?',
    jawapan: 'Setiap kategori lawatan mempunyai tempoh minimum sebelum tarikh lawatan, seperti yang dipaparkan pada Papan Pemuka. Sistem menghantar peringatan tiga hari sebelum tarikh akhir menghantar bagi draf yang belum dihantar.',
    kata: 'tarikh tutup lewat hari',
  },
  {
    id: 'dokumen-wajib',
    topik: 'Permohonan sekolah',
    untuk: ['sekolah'],
    soalan: 'Dokumen apa yang perlu dimuat naik?',
    jawapan: 'Senarai dokumen bergantung pada pengangkutan, kategori dan ciri lawatan (penginapan, aktiviti air, risiko tinggi dan lain-lain), mengikut Senarai Semak BSS Pin.1/2023. Langkah 6 borang memaparkan hanya dokumen yang diperlukan bagi permohonan anda.',
  },
  {
    id: 'dikembalikan',
    topik: 'Permohonan sekolah',
    untuk: ['sekolah'],
    soalan: 'Permohonan saya dikembalikan. Apa perlu dibuat?',
    jawapan: 'Buka permohonan tersebut, baca catatan pegawai, buat pindaan dan hantar semula. Nombor rujukan kekal sama. Permohonan yang ditolak tidak boleh dihantar semula; buat permohonan baharu.',
    kata: 'pindaan tolak',
  },
  {
    id: 'surat-kelulusan',
    topik: 'Permohonan sekolah',
    untuk: ['sekolah'],
    soalan: 'Di mana surat kelulusan?',
    jawapan: 'Selepas diluluskan, buka permohonan dan pilih butang "Surat Kelulusan". Surat mengandungi kod QR; sesiapa boleh mengesahkan kesahihannya di halaman Semak kesahihan surat kelulusan.',
    kata: 'qr cetak',
  },
  {
    id: 'laporan-pasca',
    topik: 'Permohonan sekolah',
    untuk: ['sekolah'],
    soalan: 'Bilakah laporan pasca-lawatan perlu dihantar?',
    jawapan: 'Dalam tempoh 7 hari selepas lawatan tamat, melalui butang "Isi laporan" pada permohonan. Rekod ditutup (Selesai) selepas laporan dihantar. Sistem menghantar peringatan jika laporan belum diterima.',
    kata: 'lampiran g selesai',
  },

  // ── Pegawai ──
  {
    id: 'senarai-semak',
    topik: 'Semakan & kelulusan',
    untuk: ['pegawai'],
    soalan: 'Bagaimana menyemak permohonan?',
    jawapan: 'Penyemak PPD dan JPN menanda setiap perkara dalam senarai semak dan menyemak setiap dokumen sebelum memperakukan. Pengesah (KPPD dan Pengarah) melihat ringkasan perakuan penyemak dan boleh membuka paparan penuh jika perlu.',
  },
  {
    id: 'had-masa',
    topik: 'Semakan & kelulusan',
    untuk: ['pegawai', 'pentadbir'],
    soalan: 'Apakah maksud label "Hari ke-2 / 5" dan "Lewat"?',
    jawapan: 'Setiap peringkat mempunyai had hari bekerja (tidak termasuk hujung minggu dan cuti umum). Label kelabu menunjukkan kemajuan, kuning apabila tinggal sehari, dan merah apabila had telah dilepasi. Permohonan lewat dimaklumkan setiap hari kepada pegawai berkenaan; selepas tempoh eskalasi, KPPD, Pengarah atau pentadbir turut dimaklumkan.',
    kata: 'sla eskalasi lewat tertangguh',
  },
  {
    id: 'pemangku',
    topik: 'Semakan & kelulusan',
    untuk: ['pegawai', 'pentadbir'],
    soalan: 'Saya akan bercuti. Siapa meluluskan permohonan?',
    jawapan: 'KPPD dan Pengarah JPN boleh melantik pemangku di halaman Profil → "Pemangku semasa ketiadaan". Pemangku mesti penyemak dalam pejabat yang sama. Dalam tempoh itu, pemangku mengesahkan dengan tandatangannya sendiri bertulis "b.p." jawatan anda, tetapi tidak boleh mengesahkan permohonan yang disemaknya sendiri. Pentadbir boleh melantik pemangku bagi pihak anda.',
    kata: 'cuti bp bagi pihak ganti',
  },
  {
    id: 'kembali-tolak',
    topik: 'Semakan & kelulusan',
    untuk: ['pegawai'],
    soalan: 'Bila perlu "Kembalikan" dan bila "Tolak"?',
    jawapan: 'Kembalikan jika permohonan boleh dibaiki oleh sekolah (dokumen tidak lengkap, maklumat salah). Tolak jika lawatan tidak boleh diluluskan langsung. Kedua-duanya memerlukan catatan sekurang-kurangnya 10 aksara, yang dihantar kepada sekolah.',
  },

  // ── Notifikasi & kalendar ──
  {
    id: 'notifikasi',
    topik: 'Notifikasi & kalendar',
    untuk: ['semua'],
    soalan: 'Bagaimana saya tahu ada permohonan baharu atau keputusan?',
    jawapan: 'Ikon loceng di kepala halaman memaparkan notifikasi terkini dan bilangan yang belum dibaca. Salinan juga dihantar ke e-mel rasmi anda apabila e-mel diaktifkan oleh pentadbir. Klik notifikasi untuk terus ke permohonan.',
    kata: 'loceng e-mel makluman',
  },
  {
    id: 'kalendar',
    topik: 'Notifikasi & kalendar',
    untuk: ['semua'],
    soalan: 'Apakah yang dipapar dalam Kalendar?',
    jawapan: 'Kalendar memaparkan lawatan yang telah dihantar atau diluluskan mengikut tarikh, dalam skop capaian anda: sekolah melihat lawatannya, PPD daerahnya, JPN seluruh negeri. Klik sesuatu hari untuk melihat destinasi, bilangan peserta dan nombor telefon ketua rombongan — berguna ketika kecemasan seperti banjir atau jerebu.',
    kata: 'kecemasan banjir hari ini',
  },

  // ── Privasi ──
  {
    id: 'privasi',
    topik: 'Privasi & keselamatan',
    untuk: ['semua'],
    soalan: 'Siapa boleh melihat data murid?',
    jawapan: (
      <>
        Hanya pegawai dalam rantaian kelulusan permohonan itu. Pautan dokumen tamat dalam lima minit dan
        setiap kali dokumen dibuka direkodkan dalam log audit. Baca <Link to="/privasi" className="font-semibold text-biru-600 hover:underline">Notis Privasi</Link> untuk butiran penuh.
      </>
    ),
    kata: 'pdpa data peribadi',
  },

  // ── Pentadbir ──
  {
    id: 'tetapan-had-masa',
    topik: 'Pentadbiran',
    untuk: ['pentadbir'],
    soalan: 'Bagaimana menukar had masa atau menambah cuti umum?',
    jawapan: 'Pentadbiran → Tetapan & Surat → "Had Masa Tindakan & Cuti Umum". Had dikira dalam hari bekerja. Masukkan cuti umum negeri dan persekutuan supaya tidak dikira.',
  },
  {
    id: 'rekod-luput',
    topik: 'Pentadbiran',
    untuk: ['pentadbir'],
    soalan: 'Bagaimana mengurus rekod lama (tempoh simpanan)?',
    jawapan: 'Pentadbiran → Sistem → "Tempoh Simpanan & Rekod Luput" menyenaraikan rekod ditutup yang melepasi tempoh simpanan. "Anonimkan" memadam data peribadi peserta dan dokumen sokongan; rekod lawatan dan log audit kekal.',
  },
]

function kumpulanBagi(p: Peranan | undefined): Kumpulan | null {
  if (!p) return null
  if (p === 'sekolah') return 'sekolah'
  if (p === 'admin') return 'pentadbir'
  return 'pegawai'
}

const LABEL_KUMPULAN: Record<Kumpulan, string> = {
  semua: 'Semua',
  sekolah: 'Sekolah',
  pegawai: 'PPD / JPN / KPM',
  pentadbir: 'Pentadbir',
}

export function Bantuan() {
  const { pegawai } = gunaAuth()
  const { jabatan } = gunaJabatan()
  const lokasi = useLocation()
  const [carian, setCarian] = useState('')
  const [kumpulan, setKumpulan] = useState<Kumpulan>(kumpulanBagi(pegawai?.peranan) ?? 'semua')
  const [buka, setBuka] = useState<string | null>(lokasi.hash.slice(1) || null)

  useEffect(() => {
    if (!buka) return
    document.getElementById(buka)?.scrollIntoView({ block: 'center' })
    // Hanya semasa halaman dibuka melalui pautan #topik.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tapis = useMemo(() => {
    const c = carian.trim().toLowerCase()
    return SOALAN.filter(
      (s) =>
        (kumpulan === 'semua' || s.untuk.includes('semua') || s.untuk.includes(kumpulan)) &&
        (!c ||
          `${s.soalan} ${typeof s.jawapan === 'string' ? s.jawapan : ''} ${s.kata ?? ''} ${s.topik}`
            .toLowerCase()
            .includes(c)),
    )
  }, [carian, kumpulan])

  const isi = (
    <>
      <TajukHalaman
        ikon={CircleHelp}
        jejak={pegawai ? [{ teks: 'Bantuan' }] : []}
        tajuk="Pusat Bantuan"
        nota="Soalan lazim tentang penggunaan eLAWATAN."
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Cari soalan</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            className="medan pl-9"
            placeholder="Cari, contohnya: kata laluan, pemangku, laporan"
            value={carian}
            onChange={(e) => setCarian(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tapis mengikut pengguna">
          {(Object.keys(LABEL_KUMPULAN) as Kumpulan[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kumpulan === k}
              onClick={() => setKumpulan(k)}
              className={kelas(
                'rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition',
                kumpulan === k ? 'bg-jata-900 text-white ring-jata-900' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50',
              )}
            >
              {LABEL_KUMPULAN[k]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          {tapis.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
              Tiada soalan sepadan. Cuba perkataan lain atau hubungi pentadbir.
            </p>
          )}
          {TOPIK.map((t) => {
            const dalam = tapis.filter((s) => s.topik === t)
            if (dalam.length === 0) return null
            return (
              <section key={t}>
                <h2 className="tajuk-seksyen">
                  <span className="h-4 w-1 rounded bg-biru-500" aria-hidden />
                  {t}
                </h2>
                <div className="kad divide-y divide-slate-100">
                  {dalam.map((s) => {
                    const terbuka = buka === s.id || !!carian.trim()
                    return (
                      <div key={s.id} id={s.id} className="scroll-mt-24">
                        <button
                          type="button"
                          aria-expanded={terbuka}
                          onClick={() => setBuka(buka === s.id ? null : s.id)}
                          className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left text-sm font-semibold text-jata-900 hover:bg-slate-50"
                        >
                          {s.soalan}
                          <ChevronDown
                            className={kelas('h-4 w-4 shrink-0 text-slate-400 transition', terbuka && 'rotate-180')}
                            aria-hidden
                          />
                        </button>
                        {terbuka && (
                          <div className="px-5 pb-4 text-sm leading-relaxed text-slate-700">{s.jawapan}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>

        <aside className="space-y-4">
          <div className="kad">
            <div className="kad-tajuk">
              <h2>Masih perlukan bantuan?</h2>
            </div>
            <div className="kad-isi space-y-2.5 text-sm text-slate-700">
              <p>
                Sekolah: hubungi penyemak di PPD anda dahulu. Pegawai PPD dan JPN: hubungi pentadbir sistem di{' '}
                {jabatan.nama_ringkas || jabatan.nama}.
              </p>
              {jabatan.telefon && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-biru-500" aria-hidden />
                  {jabatan.telefon}
                </p>
              )}
              {jabatan.emel && (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-biru-500" aria-hidden />
                  <a href={`mailto:${jabatan.emel}`} className="text-biru-600 hover:underline">{jabatan.emel}</a>
                </p>
              )}
            </div>
          </div>
          <div className="kad">
            <div className="kad-isi text-xs leading-relaxed text-slate-600">
              Rujukan dasar: Surat Pekeliling Ikhtisas KPM Bil. 9 Tahun 2023, Peraturan Lawatan Sekolah 1957
              dan Senarai Semak BSS Pin.1/2023.
            </div>
          </div>
        </aside>
      </div>
    </>
  )

  if (pegawai) return isi
  return (
    <RangkaAwam>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">{isi}</div>
    </RangkaAwam>
  )
}
