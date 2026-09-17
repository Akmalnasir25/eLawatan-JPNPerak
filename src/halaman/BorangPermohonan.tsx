import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { gunaAuth } from '@/lib/auth'
import {
  ciptaPermohonan,
  dapatPermohonan,
  semakKelengkapan,
  simpanPermohonan,
  type BundelPermohonan,
} from '@/lib/api'
import { nisbahCadangan } from '@/lib/istilah'
import { kelas } from '@/lib/guna'
import { Memuat, Mesej } from '@/komponen/ui'
import { TajukHalaman } from '@/komponen/Rangka'
import {
  Banknote,
  Check,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  FileUp,
  MapPinned,
  Scale,
  School,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Kelengkapan, Permohonan } from '@/lib/jenis'

import { Langkah1 } from './langkah/Langkah1'
import { Langkah2 } from './langkah/Langkah2'
import { Langkah3 } from './langkah/Langkah3'
import { Langkah4 } from './langkah/Langkah4'
import { Langkah5 } from './langkah/Langkah5'
import { Langkah6 } from './langkah/Langkah6'

export type PropLangkah = {
  bundel: BundelPermohonan
  simpan: (ubah: Partial<Permohonan>) => void
  muatSemula: () => Promise<void>
  kelengkapan: Kelengkapan | null
}

const LANGKAH: { no: number; tajuk: string; bahagian: string; ikon: LucideIcon }[] = [
  { no: 1, tajuk: 'Maklumat Lawatan', bahagian: 'Bhg. A · B1', ikon: School },
  { no: 2, tajuk: 'Tempat & Tarikh', bahagian: 'Bhg. B1.4 · B2', ikon: MapPinned },
  { no: 3, tajuk: 'Kewangan', bahagian: 'Bhg. C1 · C2', ikon: Banknote },
  { no: 4, tajuk: 'Anggota Rombongan', bahagian: 'Bhg. D · E', ikon: Users },
  { no: 5, tajuk: 'Nisbah Pengiring', bahagian: 'Bhg. I', ikon: Scale },
  { no: 6, tajuk: 'Dokumen & Hantar', bahagian: 'Semakan akhir', ikon: FileUp },
]

/** Anggaran kelengkapan setiap langkah untuk penanda — pengesahan
 *  sebenar tetap dibuat oleh semak_kelengkapan() di pangkalan data. */
function lengkapLangkah(b: BundelPermohonan, k: Kelengkapan | null): boolean[] {
  const p = b.permohonan
  const ketua = b.peserta.find((x) => x.kategori === 'KETUA_ROMBONGAN')
  const n = k?.nisbah
  return [
    !!p.kategori &&
      (p.tujuan?.trim().length ?? 0) >= 10 &&
      p.pengangkutan.length > 0 &&
      (!p.anjuran_pihak_luar || !!p.nama_penganjur_luar?.trim()),
    b.tempat.length > 0 && b.tempat.every((t) => t.tempat.trim().length > 0),
    Number(p.kutipan_murid) + Number(p.kutipan_guru) + Number(p.sumber_lain) > 0 ||
      b.penaja.length > 0,
    !!ketua?.nama?.trim() &&
      !!ketua.kp?.trim() &&
      !!ketua.telefon?.trim() &&
      (p.kategori !== 'LUAR_NEGARA' || !!ketua.pasport?.trim()) &&
      p.bil_murid > 0 &&
      p.bil_guru > 0,
    !!n && p.bil_murid > 0 &&
      (n.sah || (n.perlu_justifikasi && (p.justifikasi_nisbah?.trim().length ?? 0) >= 20)),
    !!k?.boleh_hantar,
  ]
}

export function BorangPermohonan() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { pegawai, sekolah } = gunaAuth()
  const [params, setParams] = useSearchParams()

  const [bundel, setBundel] = useState<BundelPermohonan | null>(null)
  const [kelengkapan, setKelengkapan] = useState<Kelengkapan | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)
  const [menyimpan, setMenyimpan] = useState(false)
  const [disimpanPada, setDisimpanPada] = useState<Date | null>(null)

  const langkah = Math.min(6, Math.max(1, Number(params.get('langkah') ?? 1)))
  const tertunda = useRef<Partial<Permohonan>>({})
  const pemasa = useRef<number | null>(null)
  const sudahCipta = useRef(false)

  // Cipta draf baharu apabila tiada id. Pengawal ref menghalang draf
  // berganda apabila kesan dijalankan semula (StrictMode, profil dimuat semula).
  useEffect(() => {
    if (id || !sekolah || sudahCipta.current) return
    sudahCipta.current = true
    ciptaPermohonan(sekolah, pegawai?.id ?? null, nisbahCadangan(sekolah.jenis))
      .then((p) => navigate(`/permohonan/${p.id}/sunting?langkah=1`, { replace: true }))
      .catch((e) => setRalat(e.message))
  }, [id, sekolah, pegawai, navigate])

  const muatSemula = useCallback(async () => {
    if (!id) return
    try {
      const b = await dapatPermohonan(id)
      setBundel(b)
      setKelengkapan(await semakKelengkapan(id))
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal memuatkan permohonan.')
    }
  }, [id])

  useEffect(() => {
    void muatSemula()
  }, [muatSemula])

  // Simpan automatik — kumpul perubahan, tulis selepas 800 ms senyap
  const simpan = useCallback(
    (ubah: Partial<Permohonan>) => {
      if (!id) return
      setBundel((b) =>
        b ? { ...b, permohonan: { ...b.permohonan, ...ubah } } : b,
      )
      tertunda.current = { ...tertunda.current, ...ubah }

      if (pemasa.current) window.clearTimeout(pemasa.current)
      pemasa.current = window.setTimeout(async () => {
        const kumpulan = tertunda.current
        tertunda.current = {}
        if (Object.keys(kumpulan).length === 0) return
        setMenyimpan(true)
        try {
          await simpanPermohonan(id, kumpulan)
          setDisimpanPada(new Date())
          setKelengkapan(await semakKelengkapan(id))
          setRalat(null)
        } catch (e) {
          setRalat(e instanceof Error ? e.message : 'Gagal menyimpan.')
        } finally {
          setMenyimpan(false)
        }
      }, 800)
    },
    [id],
  )

  useEffect(() => () => {
    if (pemasa.current) window.clearTimeout(pemasa.current)
  }, [])

  if (ralat && !bundel) return <Mesej jenis="ralat">{ralat}</Mesej>
  if (!bundel) return <Memuat teks="Menyediakan borang…" />

  const bolehSunting =
    bundel.permohonan.status === 'DRAF' ||
    bundel.permohonan.status === 'DIKEMBALIKAN'

  if (!bolehSunting) {
    return (
      <>
        <TajukHalaman tajuk="Permohonan dikunci" />
        <Mesej jenis="amaran" tajuk="Tidak boleh disunting">
          Permohonan yang telah dihantar dikunci daripada suntingan. Buka rekod
          untuk melihat status dan catatan pelulus.
        </Mesej>
        <button
          className="btn-utama mt-4"
          onClick={() => navigate(`/permohonan/${id}`)}
        >
          Buka rekod
        </button>
      </>
    )
  }

  const prop: PropLangkah = { bundel, simpan, muatSemula, kelengkapan }

  function keLangkah(n: number) {
    setParams({ langkah: String(n) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const lengkap = lengkapLangkah(bundel, kelengkapan)
  const bilLengkap = lengkap.filter(Boolean).length
  const semasa = LANGKAH[langkah - 1]

  return (
    <>
      <TajukHalaman
        ikon={FilePlus2}
        jejak={[
          { teks: 'Permohonan', ke: '/senarai' },
          { teks: bundel.permohonan.no_rujukan ? 'Pindaan' : 'Permohonan baharu' },
        ]}
        tajuk={
          bundel.permohonan.no_rujukan
            ? `Pindaan — ${bundel.permohonan.no_rujukan}`
            : 'Borang Permohonan Lawatan Murid Sekolah'
        }
        nota={`Lampiran A · ${bundel.sekolah.nama} (${bundel.sekolah.kod_sekolah})`}
        aksi={
          <span
            className={kelas(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
              menyimpan ? 'bg-emas-50 text-emas-700' : 'bg-emerald-50 text-emerald-700',
            )}
          >
            {menyimpan ? (
              'Menyimpan…'
            ) : (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden />
                {disimpanPada
                  ? `Disimpan ${disimpanPada.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Draf disimpan automatik'}
              </>
            )}
          </span>
        }
      />

      {bundel.permohonan.status === 'DIKEMBALIKAN' && bundel.permohonan.catatan_kembali && (
        <div className="mb-5">
          <Mesej jenis="amaran" tajuk="Dikembalikan untuk pindaan">
            {bundel.permohonan.catatan_kembali}
          </Mesej>
        </div>
      )}

      {ralat && (
        <div className="mb-5">
          <Mesej jenis="ralat">{ralat}</Mesej>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* ── Penanda langkah ─────────────────────────────────── */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="kad overflow-hidden">
            <div className="border-b border-slate-200 bg-jata-800 px-4 py-3 text-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-jata-200">Kemajuan borang</p>
              <p className="mt-0.5 text-sm font-semibold">
                {bilLengkap} daripada {LANGKAH.length} langkah lengkap
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-emas-400 transition-all"
                  style={{ width: `${(bilLengkap / LANGKAH.length) * 100}%` }}
                />
              </div>
            </div>
            <ol className="flex gap-1 overflow-x-auto p-2 lg:block lg:space-y-0.5">
              {LANGKAH.map((l, i) => {
                const aktif = l.no === langkah
                const siap = lengkap[i]
                return (
                  <li key={l.no} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => keLangkah(l.no)}
                      aria-current={aktif ? 'step' : undefined}
                      className={kelas(
                        'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition',
                        aktif ? 'bg-jata-50 ring-1 ring-inset ring-jata-200' : 'hover:bg-slate-50',
                      )}
                    >
                      <span
                        className={kelas(
                          'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold',
                          aktif
                            ? 'bg-jata-700 text-white'
                            : siap
                              ? 'bg-emerald-600 text-white'
                              : 'border-2 border-slate-300 bg-white text-slate-500',
                        )}
                      >
                        {siap && !aktif ? <Check className="h-3.5 w-3.5" aria-hidden /> : l.no}
                      </span>
                      <span className="min-w-0">
                        <span className={kelas('block whitespace-nowrap text-sm font-medium', aktif ? 'text-jata-900' : 'text-slate-700')}>
                          {l.tajuk}
                        </span>
                        <span className="hidden text-[0.65rem] uppercase tracking-wider text-slate-400 lg:block">
                          {l.bahagian}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
          <p className="mt-3 hidden text-xs leading-relaxed text-slate-500 lg:block">
            Tanda hijau ialah anggaran. Semakan muktamad dibuat pada Langkah 6
            sebelum permohonan boleh dihantar.
          </p>
        </aside>

        {/* ── Kandungan langkah ───────────────────────────────── */}
        <div className="min-w-0">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-emas-100 text-emas-700">
              <semasa.ikon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Langkah {langkah} daripada {LANGKAH.length}
              </p>
              <h2 className="text-lg font-bold text-jata-900">{semasa.tajuk}</h2>
            </div>
          </div>

          <div className="space-y-6">
            {langkah === 1 && <Langkah1 {...prop} />}
            {langkah === 2 && <Langkah2 {...prop} />}
            {langkah === 3 && <Langkah3 {...prop} />}
            {langkah === 4 && <Langkah4 {...prop} />}
            {langkah === 5 && <Langkah5 {...prop} />}
            {langkah === 6 && <Langkah6 {...prop} />}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-kad">
            <button
              type="button"
              className="btn-kedua"
              disabled={langkah === 1}
              onClick={() => keLangkah(langkah - 1)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Sebelum
            </button>
            <span className="hidden text-xs text-slate-500 sm:block">
              {langkah < LANGKAH.length ? `Seterusnya: ${LANGKAH[langkah].tajuk}` : 'Langkah terakhir'}
            </span>
            <button
              type="button"
              className="btn-utama"
              disabled={langkah === LANGKAH.length}
              onClick={() => keLangkah(langkah + 1)}
            >
              Seterusnya
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
