import { useCallback, useEffect, useState } from 'react'
import { gunaAuth } from '@/lib/auth'
import {
  buangImejProfil,
  imejProfilSendiri,
  kemasProfil,
  muatNaikImejProfil,
  type JenisImej,
} from '@/lib/profil'
import { LABEL_PERANAN, LABEL_PROFIL } from '@/lib/istilah'
import { formatMasa, formatTarikh, kelas } from '@/lib/guna'
import { Baris, Berputar, Medan, Mesej } from '@/komponen/ui'
import { TajukHalaman } from '@/komponen/Rangka'
import { ImejTandatangan } from '@/cetak/rangka'

export function Profil() {
  const { pegawai, sekolah, muatSemula } = gunaAuth()
  const g = pegawai!
  const adalahSekolah = g.peranan === 'sekolah'
  const label = LABEL_PROFIL[g.peranan]

  const [nama, setNama] = useState(g.nama)
  const [jawatan, setJawatan] = useState(g.jawatan ?? '')
  const [telefon, setTelefon] = useState(g.telefon ?? '')
  const [namaGb, setNamaGb] = useState(sekolah?.nama_guru_besar ?? '')
  const [namaPemohon, setNamaPemohon] = useState(g.nama_pemohon ?? '')
  const [sibuk, setSibuk] = useState(false)
  const [mesej, setMesej] = useState<{ jenis: 'berjaya' | 'ralat'; teks: string } | null>(null)

  const [imej, setImej] = useState<Record<string, string>>({})

  const muatImej = useCallback(async () => {
    try {
      setImej(await imejProfilSendiri())
    } catch {
      setImej({})
    }
  }, [])

  useEffect(() => {
    void muatImej()
  }, [muatImej, g.kunci_tandatangan, g.kunci_cop])

  async function simpan(e: React.FormEvent) {
    e.preventDefault()
    setSibuk(true)
    setMesej(null)
    try {
      await kemasProfil({
        nama,
        jawatan,
        telefon,
        nama_pemohon: namaPemohon,
        nama_guru_besar: namaGb,
      })
      await muatSemula()
      setMesej({ jenis: 'berjaya', teks: 'Profil disimpan.' })
    } catch (err) {
      setMesej({ jenis: 'ralat', teks: err instanceof Error ? err.message : 'Gagal menyimpan.' })
    } finally {
      setSibuk(false)
    }
  }

  const urlTtd = g.kunci_tandatangan ? imej[g.kunci_tandatangan] : undefined
  const urlCop = g.kunci_cop ? imej[g.kunci_cop] : undefined
  const namaPenandatangan = adalahSekolah ? namaGb : nama
  const jawatanPenandatangan = adalahSekolah
    ? `Guru Besar / Pengetua, ${sekolah?.nama ?? ''}`
    : jawatan

  return (
    <>
      <TajukHalaman
        tajuk="Profil"
        nota="Maklumat ini dicetak pada borang rasmi apabila anda menyokong atau meluluskan permohonan."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {/* ── Akaun ───────────────────────────────────────────── */}
          <section className="kad">
            <div className="kad-tajuk">
              <h2 className="text-sm font-semibold text-slate-900">Akaun</h2>
            </div>
            <div className="kad-isi">
              <dl>
                <Baris label="E-mel">{g.emel}</Baris>
                <Baris label="Peranan">{LABEL_PERANAN[g.peranan]}</Baris>
                <Baris label="Skop">
                  {adalahSekolah
                    ? `${sekolah?.nama ?? ''} (${g.kod_skop})`
                    : (g.kod_skop ?? 'Seluruh negeri')}
                </Baris>
                {g.profil_dikemaskini_pada && (
                  <Baris label="Dikemas kini">{formatMasa(g.profil_dikemaskini_pada)}</Baris>
                )}
              </dl>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                E-mel, peranan dan skop ditetapkan oleh pentadbir sistem.
                {adalahSekolah && ' Nama dan kod sekolah datang daripada senarai rasmi JPN.'}
              </p>
            </div>
          </section>

          {/* ── Maklumat penandatangan ─────────────────────────── */}
          <form onSubmit={simpan} className="kad">
            <div className="kad-tajuk">
              <h2 className="text-sm font-semibold text-slate-900">
                {adalahSekolah ? 'Maklumat Sekolah' : 'Maklumat Pegawai'}
              </h2>
            </div>
            <div className="kad-isi space-y-4">
              {mesej && <Mesej jenis={mesej.jenis}>{mesej.teks}</Mesej>}

              {adalahSekolah ? (
                <>
                  <Medan
                    label={label.nama}
                    perlu
                    nota="Dicetak pada Bahagian F Lampiran A dan pengesahan Lampiran G."
                  >
                    <input
                      className="medan"
                      value={namaGb}
                      onChange={(e) => setNamaGb(e.target.value)}
                      required
                      minLength={3}
                    />
                  </Medan>
                  <Medan
                    label="Nama pemohon"
                    nota="Guru yang menguruskan permohonan lawatan bagi pihak sekolah. Dicetak sebagai pemohon pada Lampiran A dan Senarai Semak."
                  >
                    <input
                      className="medan"
                      value={namaPemohon}
                      onChange={(e) => setNamaPemohon(e.target.value)}
                      placeholder="Contoh: Cikgu Nurul Aini binti Hassan"
                    />
                  </Medan>
                </>
              ) : (
                <>
                  <Medan label={label.nama} perlu>
                    <input
                      className="medan"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      required
                      minLength={3}
                    />
                  </Medan>
                  <Medan
                    label={label.jawatan}
                    nota="Dicetak di bawah tandatangan. Contoh: Pegawai Pendidikan Daerah Kinta Utara"
                  >
                    <input
                      className="medan"
                      value={jawatan}
                      onChange={(e) => setJawatan(e.target.value)}
                    />
                  </Medan>
                </>
              )}

              <Medan label="No. telefon">
                <input
                  className="medan"
                  value={telefon}
                  onChange={(e) => setTelefon(e.target.value)}
                />
              </Medan>

              {!adalahSekolah && (
                <p className="rounded-lg bg-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600">
                  Peranan diberikan kepada jawatan. Jika pemegang jawatan bertukar,
                  pemegang baharu mengemas kini nama dan tandatangan di sini —
                  dokumen yang telah ditandatangani pemegang lama tidak berubah.
                </p>
              )}

              <div className="flex justify-end">
                <button type="submit" className="btn-utama" disabled={sibuk}>
                  {sibuk ? <Berputar /> : null}
                  Simpan profil
                </button>
              </div>
            </div>
          </form>

          {/* ── Tandatangan & cop ──────────────────────────────── */}
          <section className="kad">
            <div className="kad-tajuk">
              <h2 className="text-sm font-semibold text-slate-900">
                Tandatangan Digital &amp; Cop Rasmi
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                PNG berlatar lutsinar paling sesuai. Maksimum 1 MB setiap imej.
              </p>
            </div>
            <div className="kad-isi grid gap-4 sm:grid-cols-2">
              <PetakImej
                jenis="tandatangan"
                tajuk={label.tandatangan}
                url={urlTtd}
                ada={!!g.kunci_tandatangan}
                selesai={muatSemula}
              />
              <PetakImej
                jenis="cop"
                tajuk={label.cop}
                url={urlCop}
                ada={!!g.kunci_cop}
                selesai={muatSemula}
              />
            </div>
          </section>
        </div>

        {/* ── Pratonton ─────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <section className="kad lg:sticky lg:top-24">
            <div className="kad-tajuk">
              <h2 className="text-sm font-semibold text-slate-900">
                Pratonton pada borang
              </h2>
            </div>
            <div className="kad-isi">
              <div className="rounded-lg border border-slate-300 bg-white p-5">
                <div className="borang-rasmi">
                  <div style={{ fontSize: '9.5pt', marginBottom: 4 }}>
                    <span className="kotak-pangkah">✓</span>
                    {adalahSekolah ? 'Disokong' : 'Disokong / Diluluskan'}
                  </div>
                  <ImejTandatangan tandatangan={urlTtd} cop={urlCop} />
                  <div className="garis-tandatangan">
                    Tandatangan{namaPenandatangan ? `: ${namaPenandatangan}` : ''}
                  </div>
                  {jawatanPenandatangan && (
                    <div style={{ fontSize: '9.5pt' }}>{jawatanPenandatangan}</div>
                  )}
                  <div style={{ fontSize: '9.5pt' }}>
                    Tarikh: {formatTarikh(new Date().toISOString())}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                Tandatangan dan cop dibekukan pada saat anda bertindak. Menukar
                imej di sini hanya memberi kesan kepada tindakan seterusnya.
              </p>
              {!adalahSekolah && (
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Tandatangan dicetak hanya apabila anda <strong>menyokong</strong>{' '}
                  atau <strong>meluluskan</strong>. Tindakan kembalikan dan tolak
                  tidak ditandatangani.
                </p>
              )}
              {adalahSekolah && (
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Tandatangan Guru Besar dicetak pada Bahagian F apabila
                  permohonan dihantar.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

function PetakImej({
  jenis,
  tajuk,
  url,
  ada,
  selesai,
}: {
  jenis: JenisImej
  tajuk: string
  url: string | undefined
  ada: boolean
  selesai: () => Promise<void>
}) {
  const [sibuk, setSibuk] = useState(false)
  const [ralat, setRalat] = useState<string | null>(null)

  async function pilih(e: React.ChangeEvent<HTMLInputElement>) {
    const fail = e.target.files?.[0]
    e.target.value = ''
    if (!fail) return
    setSibuk(true)
    setRalat(null)
    try {
      await muatNaikImejProfil(jenis, fail)
      await selesai()
    } catch (err) {
      setRalat(err instanceof Error ? err.message : 'Muat naik gagal.')
    } finally {
      setSibuk(false)
    }
  }

  async function buang() {
    setSibuk(true)
    setRalat(null)
    try {
      await buangImejProfil(jenis)
      await selesai()
    } catch (err) {
      setRalat(err instanceof Error ? err.message : 'Gagal membuang.')
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">{tajuk}</p>
      <div
        className={kelas(
          'grid h-36 place-items-center rounded-lg border',
          ada ? 'border-slate-200' : 'border-dashed border-slate-300',
        )}
        style={{
          // Corak papan dam menunjukkan sama ada latar imej lutsinar
          backgroundImage:
            'linear-gradient(45deg,#f1f5f9 25%,transparent 25%),linear-gradient(-45deg,#f1f5f9 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#f1f5f9 75%),linear-gradient(-45deg,transparent 75%,#f1f5f9 75%)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
        }}
      >
        {sibuk ? (
          <Berputar saiz={20} />
        ) : url ? (
          <img
            src={url}
            alt={tajuk}
            className="max-h-32 max-w-[90%] object-contain"
          />
        ) : ada ? (
          <span className="text-xs text-slate-400">Memuatkan…</span>
        ) : (
          <span className="text-xs text-slate-400">Belum dimuat naik</span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <label
          className={kelas(
            'btn-kedua cursor-pointer px-3 py-1.5 text-xs',
            sibuk && 'pointer-events-none opacity-50',
          )}
        >
          {ada ? 'Tukar' : 'Muat naik'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={pilih}
            data-imej={jenis}
          />
        </label>
        {ada && (
          <button
            type="button"
            className="px-2 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700"
            onClick={buang}
            disabled={sibuk}
          >
            Buang
          </button>
        )}
      </div>
      {ralat && <p className="mt-1.5 text-xs text-rose-600">{ralat}</p>}
    </div>
  )
}
