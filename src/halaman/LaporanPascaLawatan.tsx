import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { dapatPermohonan, hantarLaporanPasca, type BundelPermohonan } from '@/lib/api'
import { formatTarikh, hariLagi } from '@/lib/guna'
import { Berputar, Medan, Memuat, Mesej, Petak } from '@/komponen/ui'
import { TajukHalaman } from '@/komponen/Rangka'

export function LaporanPascaLawatan() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [b, setB] = useState<BundelPermohonan | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)

  const [ringkasan, setRingkasan] = useState('')
  const [hadirMurid, setHadirMurid] = useState(0)
  const [hadirGuru, setHadirGuru] = useState(0)
  const [adaInsiden, setAdaInsiden] = useState(false)
  const [butiranInsiden, setButiranInsiden] = useState('')
  const [cadangan, setCadangan] = useState('')

  useEffect(() => {
    if (!id) return
    dapatPermohonan(id)
      .then((bundel) => {
        setB(bundel)
        setHadirMurid(bundel.laporan?.bil_hadir_murid ?? bundel.permohonan.bil_murid)
        setHadirGuru(bundel.laporan?.bil_hadir_guru ?? bundel.permohonan.bil_guru)
        setRingkasan(bundel.laporan?.ringkasan ?? '')
        setAdaInsiden(bundel.laporan?.ada_insiden ?? false)
        setButiranInsiden(bundel.laporan?.butiran_insiden ?? '')
        setCadangan(bundel.laporan?.cadangan ?? '')
      })
      .catch((e) => setRalat(e.message))
  }, [id])

  if (ralat && !b) return <Mesej jenis="ralat">{ralat}</Mesej>
  if (!b) return <Memuat />

  const p = b.permohonan
  const bolehHantar =
    (p.status === 'DILULUSKAN' || p.status === 'SELESAI') &&
    ringkasan.trim().length >= 20 &&
    (!adaInsiden || butiranInsiden.trim().length >= 10)

  const hariSelepas = p.tarikh_tamat
    ? -(hariLagi(p.tarikh_tamat) ?? 0)
    : null

  async function hantar() {
    if (!id) return
    setSibuk(true)
    setRalat(null)
    try {
      await hantarLaporanPasca({
        permohonan_id: id,
        ringkasan: ringkasan.trim(),
        bil_hadir_murid: hadirMurid,
        bil_hadir_guru: hadirGuru,
        ada_insiden: adaInsiden,
        butiran_insiden: adaInsiden ? butiranInsiden.trim() : null,
        cadangan: cadangan.trim() || null,
      })
      navigate(`/permohonan/${id}`, { replace: true })
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal menghantar laporan.')
    } finally {
      setSibuk(false)
    }
  }

  return (
    <>
      <TajukHalaman
        tajuk="Lampiran G — Laporan Lawatan Murid Sekolah"
        nota={`${p.no_rujukan ?? 'Tanpa rujukan'} · ${b.sekolah.nama}`}
        aksi={
          b.laporan && (
            <a
              href={`/cetak/lampiran-g/${p.id}`}
              target="_blank"
              rel="noreferrer"
              className="btn-kedua"
            >
              Cetak laporan
            </a>
          )
        }
      />

      {ralat && (
        <div className="mb-5">
          <Mesej jenis="ralat">{ralat}</Mesej>
        </div>
      )}

      {hariSelepas !== null && hariSelepas > 7 && !b.laporan && (
        <div className="mb-5">
          <Mesej jenis="amaran" tajuk="Laporan lewat">
            Lawatan tamat {formatTarikh(p.tarikh_tamat)} — {hariSelepas} hari
            lalu. Laporan sepatutnya dikemukakan dalam tempoh tujuh hari.
          </Mesej>
        </div>
      )}

      {b.laporan && (
        <div className="mb-5">
          <Mesej jenis="berjaya" tajuk="Laporan telah dihantar">
            Dihantar pada {formatTarikh(b.laporan.dihantar_pada)}. Anda masih
            boleh mengemas kininya.
          </Mesej>
        </div>
      )}

      <div className="space-y-6">
        <section className="kad">
          <div className="kad-tajuk">
            <h2 className="text-sm font-semibold text-slate-900">
              Kehadiran Sebenar
            </h2>
          </div>
          <div className="kad-isi grid gap-4 sm:grid-cols-2">
            <Medan
              label="Bilangan murid hadir"
              nota={`Dipohon: ${p.bil_murid} murid`}
            >
              <input
                type="number"
                min={0}
                className="medan"
                value={hadirMurid}
                onChange={(e) => setHadirMurid(Number(e.target.value) || 0)}
              />
            </Medan>
            <Medan
              label="Bilangan guru pengiring hadir"
              nota={`Dipohon: ${p.bil_guru} guru`}
            >
              <input
                type="number"
                min={0}
                className="medan"
                value={hadirGuru}
                onChange={(e) => setHadirGuru(Number(e.target.value) || 0)}
              />
            </Medan>
          </div>
        </section>

        <section className="kad">
          <div className="kad-tajuk">
            <h2 className="text-sm font-semibold text-slate-900">
              Ringkasan Pelaksanaan
            </h2>
          </div>
          <div className="kad-isi space-y-4">
            <Medan
              label="Ringkasan lawatan"
              perlu
              nota="Sekurang-kurangnya 20 aksara. Nyatakan aktiviti yang dijalankan dan sejauh mana objektif tercapai."
            >
              <textarea
                className="medan min-h-[140px]"
                value={ringkasan}
                onChange={(e) => setRingkasan(e.target.value)}
              />
            </Medan>

            <Petak
              label="Terdapat insiden semasa lawatan"
              nota="Kemalangan, kecederaan, kehilangan atau sebarang kejadian yang perlu dilaporkan."
              checked={adaInsiden}
              onChange={setAdaInsiden}
            />

            {adaInsiden && (
              <Medan label="Butiran insiden" perlu>
                <textarea
                  className="medan min-h-[110px]"
                  value={butiranInsiden}
                  onChange={(e) => setButiranInsiden(e.target.value)}
                  placeholder="Nyatakan tarikh, masa, tempat, pihak terlibat dan tindakan yang diambil."
                />
              </Medan>
            )}

            <Medan label="Cadangan penambahbaikan">
              <textarea
                className="medan min-h-[92px]"
                value={cadangan}
                onChange={(e) => setCadangan(e.target.value)}
              />
            </Medan>
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn-kedua"
            onClick={() => navigate(`/permohonan/${id}`)}
          >
            Kembali
          </button>
          <button
            type="button"
            className="btn-utama"
            disabled={!bolehHantar || sibuk}
            onClick={hantar}
          >
            {sibuk ? <Berputar /> : null}
            {b.laporan ? 'Kemas kini laporan' : 'Hantar laporan'}
          </button>
        </div>
      </div>
    </>
  )
}
