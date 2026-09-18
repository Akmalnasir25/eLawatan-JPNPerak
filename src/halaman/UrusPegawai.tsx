import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, KeyRound, MailPlus, Pencil, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { gunaAuth } from '@/lib/auth'
import {
  daftarPegawai,
  kemaskiniPegawai,
  perananBolehDaftar,
  senaraiPegawaiSkop,
  tukarStatusPegawai,
} from '@/lib/akaun'
import { LABEL_PERANAN } from '@/lib/istilah'
import { formatMasa, kelas } from '@/lib/guna'
import { Berputar, Medan, Memuat, Mesej, Modal } from '@/komponen/ui'
import { TajukHalaman } from '@/komponen/Rangka'
import { PanelPemangku } from '@/komponen/PanelPemangku'
import type { Pegawai, Peranan } from '@/lib/jenis'

export function UrusPegawai() {
  const { pegawai: saya, sekolah } = gunaAuth()
  const [senarai, setSenarai] = useState<Pegawai[] | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)
  const [berjaya, setBerjaya] = useState<{ tajuk: string; teks: string } | null>(null)
  const [buka, setBuka] = useState(false)
  const [sunting, setSunting] = useState<Pegawai | null>(null)
  const [sibuk, setSibuk] = useState(false)

  const bolehDaftar = perananBolehDaftar(saya!.peranan)
  const adalahAdmin = saya!.peranan === 'admin'

  const muat = useCallback(async () => {
    try {
      setSenarai(await senaraiPegawaiSkop())
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal memuatkan senarai.')
    }
  }, [])

  useEffect(() => {
    void muat()
  }, [muat])

  async function tukarStatus(p: Pegawai) {
    setSibuk(true)
    setRalat(null)
    setBerjaya(null)
    try {
      await tukarStatusPegawai(p.id, !p.aktif)
      await muat()
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal menukar status.')
    } finally {
      setSibuk(false)
    }
  }

  if (!senarai) return <Memuat />

  const skop =
    saya!.peranan === 'sekolah'
      ? (sekolah?.nama ?? saya!.kod_skop)
      : (saya!.kod_skop ?? 'Seluruh negeri')

  return (
    <>
      <TajukHalaman
        ikon={Users}
        jejak={[{ teks: 'Urus Pegawai' }]}
        tajuk="Urus Pegawai"
        nota={`Akaun dalam skop anda · ${skop}`}
        aksi={
          bolehDaftar.length > 0 ? (
            <button type="button" className="btn-utama" onClick={() => { setBuka(true); setBerjaya(null) }}>
              <UserPlus className="h-4 w-4" aria-hidden />
              Daftar pegawai
            </button>
          ) : null
        }
      />

      {ralat && <div className="mb-4"><Mesej jenis="ralat">{ralat}</Mesej></div>}
      {berjaya && <div className="mb-4"><Mesej jenis="berjaya" tajuk={berjaya.tajuk}>{berjaya.teks}</Mesej></div>}

      <div className="mb-5">
        <Mesej jenis="maklumat" tajuk="Bagaimana akaun baharu bermula">
          Pegawai yang didaftarkan log masuk sendiri menggunakan e-mel mereka.
          Kod pengesahan dihantar ke e-mel itu, dan mereka mencipta kata laluan
          sendiri. Anda tidak pernah melihat atau menetapkan kata laluan sesiapa —
          jika akaun perlu dihentikan, nyahaktifkannya di sini.
        </Mesej>
      </div>

      <div className="kad overflow-x-auto">
        <table className="jadual">
          <thead>
            <tr>
              <th>Nama</th>
              <th>E-mel</th>
              <th>Peranan</th>
              <th>Kata laluan</th>
              <th>Log masuk terakhir</th>
              <th className="w-[1%]" />
            </tr>
          </thead>
          <tbody>
            {senarai.map((p) => (
              <tr key={p.id} className={kelas(!p.aktif && 'opacity-60')}>
                <td>
                  <span className="font-medium text-jata-900">{p.nama}</span>
                  {p.jawatan && <span className="block text-xs text-slate-500">{p.jawatan}</span>}
                  {!p.aktif && (
                    <span className="mt-1 inline-block rounded bg-slate-200 px-1.5 py-0.5 text-[0.65rem] font-semibold text-slate-700">
                      Dinyahaktifkan
                    </span>
                  )}
                </td>
                <td className="font-mono text-xs">{p.emel}</td>
                <td className="text-xs">
                  {LABEL_PERANAN[p.peranan]}
                  {adalahAdmin && p.kod_skop && (
                    <span className="block font-mono text-[0.7rem] text-slate-400">{p.kod_skop}</span>
                  )}
                </td>
                <td className="whitespace-nowrap text-xs">
                  {p.kata_laluan_ditetapkan ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      Sudah ditetapkan
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-700">
                      <KeyRound className="h-3.5 w-3.5" aria-hidden />
                      Menunggu log masuk pertama
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap text-xs text-slate-500">
                  {p.log_masuk_terakhir ? formatMasa(p.log_masuk_terakhir) : '—'}
                </td>
                <td>
                  {/* Sama dengan semakan kemaskini_pegawai / tukar_status_pegawai */}
                  {p.id !== saya!.id && (adalahAdmin || bolehDaftar.includes(p.peranan)) && (
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn-kecil btn-kedua"
                        disabled={sibuk}
                        onClick={() => { setSunting(p); setBerjaya(null) }}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Sunting
                      </button>
                      <button
                        type="button"
                        className={kelas('btn-kecil', p.aktif ? 'btn-kedua' : 'btn-hijau')}
                        disabled={sibuk}
                        onClick={() => tukarStatus(p)}
                      >
                        {p.aktif ? 'Nyahaktif' : 'Aktifkan'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adalahAdmin && (
        <div className="mt-6">
          <PanelPemangku />
        </div>
      )}

      <BorangDaftar
        buka={buka}
        tutup={() => setBuka(false)}
        bolehDaftar={bolehDaftar}
        adalahAdmin={adalahAdmin}
        selesai={async (nama, emel) => {
          setBuka(false)
          setBerjaya({
            tajuk: 'Pegawai didaftarkan',
            teks: `${nama} (${emel}) boleh log masuk menggunakan e-mel tersebut.`,
          })
          await muat()
        }}
      />

      <BorangSunting
        pegawai={sunting}
        tutup={() => setSunting(null)}
        selesai={async (nama) => {
          setSunting(null)
          setBerjaya({ tajuk: 'Maklumat dikemas kini', teks: `Maklumat ${nama} telah disimpan.` })
          await muat()
        }}
      />
    </>
  )
}

function BorangSunting({
  pegawai,
  tutup,
  selesai,
}: {
  pegawai: Pegawai | null
  tutup: () => void
  selesai: (nama: string) => Promise<void>
}) {
  const [nama, setNama] = useState('')
  const [emel, setEmel] = useState('')
  const [jawatan, setJawatan] = useState('')
  const [ralat, setRalat] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)

  useEffect(() => {
    if (!pegawai) return
    setNama(pegawai.nama)
    setEmel(pegawai.emel)
    setJawatan(pegawai.jawatan ?? '')
    setRalat(null)
  }, [pegawai])

  // Selepas log masuk pertama, e-mel terikat pada akaun log masuk.
  const emelDikunci = !!pegawai?.user_id

  async function hantar(e: React.FormEvent) {
    e.preventDefault()
    if (!pegawai) return
    setSibuk(true)
    setRalat(null)
    try {
      await kemaskiniPegawai(pegawai.id, {
        nama,
        jawatan,
        emel: emelDikunci ? null : emel,
      })
      await selesai(nama.trim())
    } catch (err) {
      setRalat(err instanceof Error ? err.message : 'Gagal menyimpan maklumat pegawai.')
    } finally {
      setSibuk(false)
    }
  }

  return (
    <Modal tajuk="Sunting pegawai" buka={!!pegawai} tutup={tutup}>
      <form onSubmit={hantar} className="space-y-4">
        {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}

        <Medan label="Nama penuh" perlu>
          <input className="medan" value={nama} onChange={(e) => setNama(e.target.value)} required minLength={3} />
        </Medan>

        <Medan
          label="E-mel rasmi"
          perlu
          nota={
            emelDikunci
              ? 'Pegawai ini sudah log masuk, jadi e-mel tidak boleh diubah lagi. Hubungi pentadbir sistem jika perlu.'
              : 'Boleh dibetulkan kerana pegawai ini belum log masuk kali pertama.'
          }
        >
          <input
            className="medan"
            type="email"
            value={emel}
            onChange={(e) => setEmel(e.target.value)}
            disabled={emelDikunci}
            required
          />
        </Medan>

        <Medan label="Jawatan">
          <input className="medan" value={jawatan} onChange={(e) => setJawatan(e.target.value)} />
        </Medan>

        {pegawai && (
          <p className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
            <ShieldCheck className="h-4 w-4 shrink-0 text-jata-600" aria-hidden />
            Peranan: <strong>{LABEL_PERANAN[pegawai.peranan]}</strong> — tidak boleh diubah di sini
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-kedua" onClick={tutup}>Batal</button>
          <button type="submit" className="btn-utama" disabled={sibuk}>
            {sibuk ? <Berputar /> : null}
            Simpan
          </button>
        </div>
      </form>
    </Modal>
  )
}

function BorangDaftar({
  buka,
  tutup,
  bolehDaftar,
  adalahAdmin,
  selesai,
}: {
  buka: boolean
  tutup: () => void
  bolehDaftar: Peranan[]
  adalahAdmin: boolean
  selesai: (nama: string, emel: string) => Promise<void>
}) {
  const [nama, setNama] = useState('')
  const [emel, setEmel] = useState('')
  const [jawatan, setJawatan] = useState('')
  const [peranan, setPeranan] = useState<Peranan>(bolehDaftar[0] ?? 'ppd_pegawai')
  const [kodSkop, setKodSkop] = useState('')
  const [ralat, setRalat] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)

  async function hantar(e: React.FormEvent) {
    e.preventDefault()
    setSibuk(true)
    setRalat(null)
    try {
      await daftarPegawai({ nama, emel, peranan, jawatan, kod_skop: adalahAdmin ? kodSkop : null })
      setNama(''); setEmel(''); setJawatan(''); setKodSkop('')
      await selesai(nama.trim(), emel.trim().toLowerCase())
    } catch (err) {
      setRalat(err instanceof Error ? err.message : 'Gagal mendaftar pegawai.')
    } finally {
      setSibuk(false)
    }
  }

  return (
    <Modal tajuk="Daftar pegawai" buka={buka} tutup={tutup}>
      <form onSubmit={hantar} className="space-y-4">
        {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}

        <Medan label="Nama penuh" perlu>
          <input className="medan" value={nama} onChange={(e) => setNama(e.target.value)} required minLength={3} />
        </Medan>

        <Medan label="E-mel rasmi" perlu nota="Kod pengesahan akan dihantar ke e-mel ini pada log masuk pertama.">
          <input className="medan" type="email" value={emel} onChange={(e) => setEmel(e.target.value)} required />
        </Medan>

        <Medan label="Jawatan">
          <input
            className="medan"
            value={jawatan}
            onChange={(e) => setJawatan(e.target.value)}
            placeholder="Contoh: Pegawai Unit Pengurusan Sekolah"
          />
        </Medan>

        {bolehDaftar.length > 1 ? (
          <Medan label="Peranan" perlu>
            <select className="medan" value={peranan} onChange={(e) => setPeranan(e.target.value as Peranan)}>
              {bolehDaftar.map((r) => (
                <option key={r} value={r}>{LABEL_PERANAN[r]}</option>
              ))}
            </select>
          </Medan>
        ) : (
          <p className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
            <ShieldCheck className="h-4 w-4 shrink-0 text-jata-600" aria-hidden />
            Peranan: <strong>{LABEL_PERANAN[bolehDaftar[0]]}</strong> — skop mengikut akaun anda
          </p>
        )}

        {adalahAdmin && (
          <Medan label="Kod skop" nota="Kod PPD, kod JPN atau kod sekolah. Kosongkan bagi KPM dan pentadbir.">
            <input className="medan" value={kodSkop} onChange={(e) => setKodSkop(e.target.value)} />
          </Medan>
        )}

        <p className="flex gap-2 rounded-md bg-jata-50 px-3 py-2.5 text-xs leading-relaxed text-jata-900">
          <MailPlus className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Beritahu pegawai ini supaya melayari sistem dan memasukkan e-melnya.
          Sistem akan menghantar kod pengesahan dan meminta mereka mencipta kata laluan.
        </p>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-kedua" onClick={tutup}>Batal</button>
          <button type="submit" className="btn-utama" disabled={sibuk}>
            {sibuk ? <Berputar /> : null}
            Daftar
          </button>
        </div>
      </form>
    </Modal>
  )
}
