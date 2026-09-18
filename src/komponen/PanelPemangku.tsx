import { useCallback, useEffect, useState } from 'react'
import { UserCheck } from 'lucide-react'
import { gunaAuth } from '@/lib/auth'
import {
  batalPemangku,
  calonPemangku,
  lantikPemangku,
  PERANAN_BOLEH_DIPANGKU,
  senaraiPemangkuan,
  type CalonPemangku,
} from '@/lib/pemangku'
import { senaraiPegawai } from '@/lib/api'
import { LABEL_PERANAN } from '@/lib/istilah'
import { formatTarikh, kelas, tarikhHariIni, tarikhTambahHari } from '@/lib/guna'
import { Berputar, Medan, Mesej, Modal } from './ui'
import type { Pegawai, Pemangkuan, StatusPemangkuan } from '@/lib/jenis'

const GAYA_STATUS: Record<StatusPemangkuan, string> = {
  AKTIF: 'bg-emerald-50 text-emerald-800 ring-emerald-300',
  AKAN_DATANG: 'bg-jata-50 text-jata-800 ring-jata-200',
  TAMAT: 'bg-slate-100 text-slate-600 ring-slate-300',
  DIBATALKAN: 'bg-slate-100 text-slate-500 ring-slate-300',
}

const LABEL_STATUS: Record<StatusPemangkuan, string> = {
  AKTIF: 'Aktif',
  AKAN_DATANG: 'Akan datang',
  TAMAT: 'Tamat',
  DIBATALKAN: 'Dibatalkan',
}

/**
 * Senarai dan lantikan pemangku. KPPD dan Pengarah melantik bagi diri
 * sendiri; pentadbir memilih pengesah mana-mana pejabat.
 */
export function PanelPemangku() {
  const { pegawai: saya, muatSemula } = gunaAuth()
  const adalahAdmin = saya!.peranan === 'admin'
  const bolehLantik = adalahAdmin || PERANAN_BOLEH_DIPANGKU.includes(saya!.peranan)

  const [senarai, setSenarai] = useState<Pemangkuan[] | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)
  const [buka, setBuka] = useState(false)
  const [sibuk, setSibuk] = useState(false)

  const muat = useCallback(async () => {
    try {
      setSenarai(await senaraiPemangkuan())
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal memuatkan pemangkuan.')
    }
  }, [])

  useEffect(() => {
    void muat()
  }, [muat])

  async function batal(m: Pemangkuan) {
    setSibuk(true)
    setRalat(null)
    try {
      await batalPemangku(m.id)
      await muat()
      await muatSemula()
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal membatalkan.')
    } finally {
      setSibuk(false)
    }
  }

  // Tiada apa untuk dipapar kepada pegawai yang tidak pernah terlibat.
  if (!bolehLantik && senarai && senarai.length === 0) return null

  return (
    <section className="kad" id="pemangku">
      <div className="kad-tajuk">
        <h2 className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-biru-500" aria-hidden />
          Pemangku semasa ketiadaan
        </h2>
        {bolehLantik && (
          <button type="button" className="btn-kedua btn-kecil" onClick={() => setBuka(true)}>
            Lantik pemangku
          </button>
        )}
      </div>
      <div className="kad-isi space-y-3">
        <p className="text-xs leading-relaxed text-slate-600">
          Pemangku ialah pegawai penyemak dalam pejabat yang sama. Dalam tempoh
          pemangkuan, pemangku boleh mengesahkan permohonan dengan tandatangannya
          sendiri, bertulis <em>b.p.</em> jawatan anda, dan cop rasmi pejabat. Pemangku
          tidak boleh mengesahkan permohonan yang disemaknya sendiri.
        </p>
        {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}
        {!senarai ? (
          <p className="text-sm text-slate-500">Memuatkan…</p>
        ) : senarai.length === 0 ? (
          <p className="rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-600">Tiada pemangkuan direkodkan.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
            {senarai.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-jata-900">
                    {m.nama_pemangku}
                    <span className="font-normal text-slate-500"> memangku </span>
                    {m.nama_asal}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatTarikh(m.tarikh_mula)} – {formatTarikh(m.tarikh_tamat)}
                    {m.sebab ? ` · ${m.sebab}` : ''}
                  </p>
                </div>
                <span className={kelas('lencana', GAYA_STATUS[m.status])}>{LABEL_STATUS[m.status]}</span>
                {(m.status === 'AKTIF' || m.status === 'AKAN_DATANG') &&
                  (adalahAdmin || m.pegawai_asal === saya!.id) && (
                    <button type="button" className="btn-kedua btn-kecil" disabled={sibuk} onClick={() => batal(m)}>
                      Batal
                    </button>
                  )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {bolehLantik && (
        <BorangLantik
          buka={buka}
          tutup={() => setBuka(false)}
          adalahAdmin={adalahAdmin}
          selesai={async () => {
            setBuka(false)
            await muat()
          }}
        />
      )}
    </section>
  )
}

function BorangLantik({
  buka,
  tutup,
  adalahAdmin,
  selesai,
}: {
  buka: boolean
  tutup: () => void
  adalahAdmin: boolean
  selesai: () => Promise<void>
}) {
  const [pengesah, setPengesah] = useState<Pegawai[]>([])
  const [asal, setAsal] = useState('')
  const [calon, setCalon] = useState<CalonPemangku[] | null>(null)
  const [pemangku, setPemangku] = useState('')
  const [mula, setMula] = useState(tarikhHariIni())
  const [tamat, setTamat] = useState(tarikhTambahHari(4))
  const [sebab, setSebab] = useState('')
  const [ralat, setRalat] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)

  useEffect(() => {
    if (!buka || !adalahAdmin) return
    senaraiPegawai()
      .then((g) => setPengesah(g.filter((x) => x.aktif && PERANAN_BOLEH_DIPANGKU.includes(x.peranan))))
      .catch(() => setPengesah([]))
  }, [buka, adalahAdmin])

  useEffect(() => {
    if (!buka) return
    if (adalahAdmin && !asal) {
      setCalon([])
      return
    }
    setCalon(null)
    setPemangku('')
    calonPemangku(adalahAdmin ? asal : null)
      .then(setCalon)
      .catch(() => setCalon([]))
  }, [buka, adalahAdmin, asal])

  async function hantar(e: React.FormEvent) {
    e.preventDefault()
    setSibuk(true)
    setRalat(null)
    try {
      await lantikPemangku({
        pemangku,
        tarikh_mula: mula,
        tarikh_tamat: tamat,
        sebab,
        pegawai_asal: adalahAdmin ? asal : null,
      })
      setSebab('')
      await selesai()
    } catch (err) {
      setRalat(err instanceof Error ? err.message : 'Gagal melantik pemangku.')
    } finally {
      setSibuk(false)
    }
  }

  return (
    <Modal tajuk="Lantik pemangku" buka={buka} tutup={tutup}>
      <form onSubmit={hantar} className="space-y-4">
        {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}

        {adalahAdmin && (
          <Medan label="Pengesah yang dipangku" perlu>
            <select className="medan" value={asal} onChange={(e) => setAsal(e.target.value)} required>
              <option value="">— Pilih KPPD atau Pengarah —</option>
              {pengesah.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nama} · {LABEL_PERANAN[g.peranan]} ({g.kod_skop})
                </option>
              ))}
            </select>
          </Medan>
        )}

        <Medan label="Pemangku" perlu nota="Hanya pegawai penyemak aktif dalam pejabat yang sama.">
          <select
            className="medan"
            value={pemangku}
            onChange={(e) => setPemangku(e.target.value)}
            required
            disabled={!calon || calon.length === 0}
          >
            <option value="">
              {calon === null ? 'Memuatkan…' : calon.length === 0 ? 'Tiada calon layak' : '— Pilih pegawai —'}
            </option>
            {calon?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama}
                {c.jawatan ? ` · ${c.jawatan}` : ''}
              </option>
            ))}
          </select>
        </Medan>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Medan label="Tarikh mula" perlu>
            <input className="medan" type="date" value={mula} min={tarikhHariIni()} onChange={(e) => setMula(e.target.value)} required />
          </Medan>
          <Medan label="Tarikh tamat" perlu>
            <input className="medan" type="date" value={tamat} min={mula} onChange={(e) => setTamat(e.target.value)} required />
          </Medan>
        </div>

        <Medan label="Sebab" nota="Contoh: Cuti rehat, kursus di luar daerah.">
          <input className="medan" value={sebab} onChange={(e) => setSebab(e.target.value)} maxLength={200} />
        </Medan>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-kedua" onClick={tutup}>Batal</button>
          <button type="submit" className="btn-utama" disabled={sibuk || !pemangku}>
            {sibuk ? <Berputar /> : null}
            Lantik
          </button>
        </div>
      </form>
    </Modal>
  )
}
