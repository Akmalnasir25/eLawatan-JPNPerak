import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { gunaAuth, PERANAN_PELULUS } from '@/lib/auth'
import { senaraiPermohonan } from '@/lib/api'
import { PERANAN_BAGI_STATUS, LABEL_STATUS } from '@/lib/istilah'
import { KadPermohonan } from '@/komponen/KadPermohonan'
import { Kosong, Memuat, Mesej } from '@/komponen/ui'
import { TajukHalaman } from '@/komponen/Rangka'
import type { PermohonanRingkas, Status } from '@/lib/jenis'

export function PapanPemuka() {
  const { pegawai, sekolah } = gunaAuth()
  const [senarai, setSenarai] = useState<PermohonanRingkas[] | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)

  useEffect(() => {
    senaraiPermohonan()
      .then(setSenarai)
      .catch((e) => setRalat(e.message))
  }, [])

  const peranan = pegawai!.peranan
  const adalahPelulus = PERANAN_PELULUS.includes(peranan)

  const statusSaya = useMemo(() => {
    const masuk = Object.entries(PERANAN_BAGI_STATUS)
      .filter(([, r]) => r === peranan)
      .map(([s]) => s as Status)
    return masuk
  }, [peranan])

  if (ralat) return <Mesej jenis="ralat">{ralat}</Mesej>
  if (!senarai) return <Memuat />

  const petiTindakan = senarai.filter((p) => statusSaya.includes(p.status))
  const draf = senarai.filter(
    (p) => p.status === 'DRAF' || p.status === 'DIKEMBALIKAN',
  )
  const dalamProses = senarai.filter((p) => p.status.startsWith('MENUNGGU'))
  const diluluskan = senarai.filter(
    (p) => p.status === 'DILULUSKAN' || p.status === 'SELESAI',
  )

  return (
    <>
      <TajukHalaman
        tajuk={
          peranan === 'sekolah'
            ? (sekolah?.nama ?? 'Papan Pemuka')
            : adalahPelulus
              ? 'Peti Tindakan'
              : 'Papan Pemuka'
        }
        nota={
          peranan === 'sekolah'
            ? `Kod sekolah ${sekolah?.kod_sekolah ?? '—'} · ${sekolah?.negeri ?? ''}`
            : adalahPelulus
              ? `Permohonan yang menunggu tindakan ${LABEL_STATUS[statusSaya[0]] ?? 'anda'}`
              : 'Pandangan seluruh negeri'
        }
        aksi={
          peranan === 'sekolah' || peranan === 'admin' ? (
            <Link to="/permohonan/baharu" className="btn-utama">
              Permohonan Baharu
            </Link>
          ) : null
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Statistik
          label={adalahPelulus ? 'Menunggu anda' : 'Draf & pindaan'}
          nilai={adalahPelulus ? petiTindakan.length : draf.length}
          warna={
            (adalahPelulus ? petiTindakan.length : draf.length) > 0
              ? 'text-amber-600'
              : 'text-slate-400'
          }
        />
        <Statistik label="Dalam proses" nilai={dalamProses.length} />
        <Statistik
          label="Diluluskan"
          nilai={diluluskan.length}
          warna="text-emerald-600"
        />
        <Statistik label="Jumlah rekod" nilai={senarai.length} />
      </div>

      {/* Peti tindakan pelulus */}
      {adalahPelulus && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Menunggu tindakan anda
          </h2>
          {petiTindakan.length === 0 ? (
            <Kosong
              tajuk="Tiada permohonan menunggu"
              nota="Semua permohonan pada peringkat anda telah diambil tindakan."
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {petiTindakan.map((p) => (
                <KadPermohonan key={p.id} p={p} tunjukSekolah />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Draf dan pindaan sekolah */}
      {peranan === 'sekolah' && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Perlu tindakan anda
          </h2>
          {draf.length === 0 ? (
            <Kosong
              tajuk="Tiada draf tertunggak"
              nota="Mulakan permohonan baharu apabila lawatan seterusnya dirancang."
              aksi={
                <Link to="/permohonan/baharu" className="btn-utama">
                  Permohonan Baharu
                </Link>
              }
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {draf.map((p) => (
                <KadPermohonan key={p.id} p={p} />
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {adalahPelulus ? 'Rekod terkini dalam skop anda' : 'Semua permohonan'}
        </h2>
        {senarai.length === 0 ? (
          <Kosong tajuk="Belum ada rekod" />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {senarai.slice(0, 12).map((p) => (
              <KadPermohonan
                key={p.id}
                p={p}
                tunjukSekolah={peranan !== 'sekolah'}
              />
            ))}
          </div>
        )}
        {senarai.length > 12 && (
          <div className="mt-4 text-center">
            <Link to="/senarai" className="btn-kedua">
              Lihat semua {senarai.length} rekod
            </Link>
          </div>
        )}
      </section>
    </>
  )
}

function Statistik({
  label,
  nilai,
  warna = 'text-slate-900',
}: {
  label: string
  nilai: number
  warna?: string
}) {
  return (
    <div className="kad px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${warna}`}>
        {nilai}
      </p>
    </div>
  )
}
