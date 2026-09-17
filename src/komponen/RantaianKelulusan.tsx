import {
  Check,
  Clock3,
  FileCheck2,
  RotateCcw,
  Send,
  X,
  type LucideIcon,
} from 'lucide-react'
import { formatTarikh, kelas } from '@/lib/guna'
import type { Kategori, Kelulusan, Permohonan, Status } from '@/lib/jenis'

// Sepadan dengan status_seterusnya(): KPPD hanya bagi lawatan dalam daerah.
const RANTAIAN: Record<Kategori, Status[]> = {
  DALAM_DAERAH: ['MENUNGGU_PPD_SEMAK', 'MENUNGGU_PPD_SAH'],
  ANTARA_DAERAH: ['MENUNGGU_PPD_SEMAK', 'MENUNGGU_JPN_SEMAK', 'MENUNGGU_JPN_SAH'],
  ANTARA_NEGERI: ['MENUNGGU_PPD_SEMAK', 'MENUNGGU_JPN_SEMAK', 'MENUNGGU_JPN_SAH'],
  LUAR_NEGARA: ['MENUNGGU_PPD_SEMAK', 'MENUNGGU_JPN_SEMAK', 'MENUNGGU_JPN_SAH', 'MENUNGGU_KPM'],
}

/** Permohonan luar daerah yang dihantar sebelum aliran baharu masih melalui KPPD. */
function rantaianBagi(p: Permohonan, kelulusan: Kelulusan[]): Status[] {
  const rantai = p.kategori ? RANTAIAN[p.kategori] : []
  const lalui =
    p.status === 'MENUNGGU_PPD_SAH' || kelulusan.some((k) => k.peringkat === 'MENUNGGU_PPD_SAH')
  if (!lalui || rantai.includes('MENUNGGU_PPD_SAH')) return rantai
  return [rantai[0], 'MENUNGGU_PPD_SAH', ...rantai.slice(1)]
}

const PERINGKAT: Partial<Record<Status, { tajuk: string; oleh: string }>> = {
  MENUNGGU_PPD_SEMAK: { tajuk: 'Semakan PPD', oleh: 'Pegawai PPD' },
  MENUNGGU_PPD_SAH: { tajuk: 'Pengesahan PPD', oleh: 'KPPD · Bahagian G' },
  MENUNGGU_JPN_SEMAK: { tajuk: 'Semakan JPN', oleh: 'Pegawai JPN' },
  MENUNGGU_JPN_SAH: { tajuk: 'Pengesahan JPN', oleh: 'Pengarah · Bahagian H' },
  MENUNGGU_KPM: { tajuk: 'Penyelaras KPM', oleh: 'Ketua Bahagian · Bahagian J' },
}

type Keadaan = 'selesai' | 'semasa' | 'menunggu' | 'dikembalikan' | 'ditolak'

type Nod = {
  tajuk: string
  oleh: string
  keadaan: Keadaan
  pelaku?: string
  tarikh?: string | null
}

const GAYA: Record<Keadaan, { bulat: string; ikon: LucideIcon; teks: string }> = {
  selesai: { bulat: 'bg-emerald-600 text-white ring-emerald-100', ikon: Check, teks: 'Selesai' },
  semasa: { bulat: 'bg-emas-400 text-jata-950 ring-emas-100 animate-[pulse_2.5s_ease-in-out_infinite]', ikon: Clock3, teks: 'Dalam tindakan' },
  menunggu: { bulat: 'bg-white text-slate-400 ring-slate-100 border-2 border-slate-300', ikon: Clock3, teks: 'Belum sampai' },
  dikembalikan: { bulat: 'bg-orange-500 text-white ring-orange-100', ikon: RotateCcw, teks: 'Dikembalikan' },
  ditolak: { bulat: 'bg-rose-600 text-white ring-rose-100', ikon: X, teks: 'Ditolak' },
}

function binaNod(p: Permohonan, kelulusan: Kelulusan[]): Nod[] {
  const rantai = rantaianBagi(p, kelulusan)
  const dihantar = p.status !== 'DRAF'
  // Hanya tindakan selepas penghantaran terkini dikira bagi status semasa
  const selepasHantar = kelulusan.filter(
    (k) => !p.dihantar_pada || k.tarikh_tindakan >= p.dihantar_pada,
  )
  const terkini = (s: Status) =>
    [...selepasHantar].reverse().find((k) => k.peringkat === s) ??
    [...kelulusan].reverse().find((k) => k.peringkat === s && k.tindakan === 'SOKONG')

  const akhirTolak = [...kelulusan].reverse().find((k) => k.tindakan !== 'SOKONG')
  const berhenti =
    p.status === 'DIKEMBALIKAN' || p.status === 'DITOLAK' ? akhirTolak?.peringkat : undefined
  const indeksSemasa = rantai.indexOf(p.status)
  const lulus = p.status === 'DILULUSKAN' || p.status === 'SELESAI'
  const indeksBerhenti = berhenti ? rantai.indexOf(berhenti) : -1

  const nod: Nod[] = [
    {
      tajuk: 'Permohonan dihantar',
      oleh: 'Sekolah',
      keadaan: dihantar ? 'selesai' : 'semasa',
      tarikh: p.dihantar_pada,
    },
  ]

  rantai.forEach((s, i) => {
    const info = PERINGKAT[s]!
    const k = terkini(s)
    let keadaan: Keadaan
    if (lulus) keadaan = 'selesai'
    else if (indeksBerhenti >= 0) {
      keadaan =
        i < indeksBerhenti ? 'selesai'
        : i === indeksBerhenti ? (p.status === 'DITOLAK' ? 'ditolak' : 'dikembalikan')
        : 'menunggu'
    } else if (indeksSemasa >= 0) {
      keadaan = i < indeksSemasa ? 'selesai' : i === indeksSemasa ? 'semasa' : 'menunggu'
    } else keadaan = 'menunggu'

    const tunjuk = keadaan !== 'menunggu' && keadaan !== 'semasa' && k
    nod.push({
      tajuk: info.tajuk,
      oleh: info.oleh,
      keadaan,
      pelaku: tunjuk ? k.nama_pegawai : undefined,
      tarikh: tunjuk ? k.tarikh_tindakan : undefined,
    })
  })

  nod.push({
    tajuk: p.status === 'SELESAI' ? 'Selesai' : 'Diluluskan',
    oleh: p.status === 'SELESAI' ? 'Laporan diterima' : 'Surat kelulusan',
    keadaan: lulus ? 'selesai' : 'menunggu',
    tarikh: lulus ? p.diluluskan_pada : undefined,
  })
  return nod
}

export function RantaianKelulusan({
  permohonan,
  kelulusan,
}: {
  permohonan: Permohonan
  kelulusan: Kelulusan[]
}) {
  if (!permohonan.kategori) return null
  const nod = binaNod(permohonan, kelulusan)

  return (
    <ol className="grid gap-0 md:flex md:items-start">
      {nod.map((n, i) => {
        const g = GAYA[n.keadaan]
        const Ikon = i === 0 ? Send : i === nod.length - 1 ? FileCheck2 : g.ikon
        const akhir = i === nod.length - 1
        const garisSiap = n.keadaan === 'selesai'
        return (
          <li key={i} className="relative flex gap-3 pb-6 md:flex-1 md:flex-col md:items-center md:gap-2 md:pb-0 md:text-center">
            {/* Garis penyambung */}
            {!akhir && (
              <>
                <span
                  aria-hidden
                  className={kelas(
                    'absolute left-[1.05rem] top-9 h-[calc(100%-2.25rem)] w-0.5 md:hidden',
                    garisSiap ? 'bg-emerald-500' : 'bg-slate-200',
                  )}
                />
                <span
                  aria-hidden
                  className={kelas(
                    'absolute left-[calc(50%+1.4rem)] right-[calc(-50%+1.4rem)] top-[1.05rem] hidden h-0.5 md:block',
                    garisSiap ? 'bg-emerald-500' : 'bg-slate-200',
                  )}
                />
              </>
            )}
            <span
              className={kelas(
                'relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full ring-4',
                g.bulat,
              )}
              title={g.teks}
            >
              <Ikon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 md:px-1">
              <p
                className={kelas(
                  'text-sm font-semibold leading-tight',
                  n.keadaan === 'menunggu' ? 'text-slate-400' : 'text-jata-900',
                )}
              >
                {n.tajuk}
              </p>
              <p className="text-[0.7rem] text-slate-500">{n.oleh}</p>
              {n.keadaan === 'semasa' && i > 0 && (
                <p className="mt-1 inline-block rounded bg-emas-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-emas-700">
                  Menunggu tindakan
                </p>
              )}
              {(n.keadaan === 'dikembalikan' || n.keadaan === 'ditolak') && (
                <p
                  className={kelas(
                    'mt-1 inline-block rounded px-1.5 py-0.5 text-[0.65rem] font-semibold',
                    n.keadaan === 'ditolak' ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-orange-700',
                  )}
                >
                  {g.teks}
                </p>
              )}
              {n.pelaku && (
                <p className="mt-1 truncate text-[0.7rem] font-medium text-slate-700 md:whitespace-normal">
                  {n.pelaku}
                </p>
              )}
              {n.tarikh && (
                <p className="text-[0.7rem] text-slate-500">{formatTarikh(n.tarikh)}</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
