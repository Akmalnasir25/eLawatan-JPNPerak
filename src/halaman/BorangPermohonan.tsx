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

const LANGKAH = [
  { no: 1, tajuk: 'Maklumat Lawatan', bahagian: 'A · B1' },
  { no: 2, tajuk: 'Tempat & Tarikh', bahagian: 'B1.4 · B2' },
  { no: 3, tajuk: 'Kewangan', bahagian: 'C1 · C2' },
  { no: 4, tajuk: 'Anggota Rombongan', bahagian: 'D · E' },
  { no: 5, tajuk: 'Nisbah Pengiring', bahagian: 'I' },
  { no: 6, tajuk: 'Dokumen & Hantar', bahagian: 'Hantar' },
]

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

  // Cipta draf baharu apabila tiada id
  useEffect(() => {
    if (id || !sekolah) return
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

  return (
    <>
      <TajukHalaman
        tajuk={
          bundel.permohonan.no_rujukan
            ? `Pindaan — ${bundel.permohonan.no_rujukan}`
            : 'Permohonan Lawatan Murid Sekolah'
        }
        nota={`${bundel.sekolah.nama} · ${bundel.sekolah.kod_sekolah}`}
        aksi={
          <span className="text-xs text-slate-500">
            {menyimpan
              ? 'Menyimpan…'
              : disimpanPada
                ? `Disimpan ${disimpanPada.toLocaleTimeString('ms-MY')}`
                : 'Draf disimpan automatik'}
          </span>
        }
      />

      {bundel.permohonan.status === 'DIKEMBALIKAN' &&
        bundel.permohonan.catatan_kembali && (
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

      {/* Penanda langkah */}
      <nav className="mb-6 overflow-x-auto">
        <ol className="flex min-w-max gap-1">
          {LANGKAH.map((l) => {
            const aktif = l.no === langkah
            const lepas = l.no < langkah
            return (
              <li key={l.no}>
                <button
                  type="button"
                  onClick={() => keLangkah(l.no)}
                  className={kelas(
                    'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition',
                    aktif
                      ? 'border-jata-300 bg-jata-50'
                      : 'border-transparent hover:bg-slate-100',
                  )}
                >
                  <span
                    className={kelas(
                      'grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold',
                      aktif
                        ? 'bg-jata-600 text-white'
                        : lepas
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600',
                    )}
                  >
                    {l.no}
                  </span>
                  <span className="hidden sm:block">
                    <span
                      className={kelas(
                        'block text-xs font-medium',
                        aktif ? 'text-jata-800' : 'text-slate-700',
                      )}
                    >
                      {l.tajuk}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wide text-slate-400">
                      Bhg. {l.bahagian}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="space-y-6">
        {langkah === 1 && <Langkah1 {...prop} />}
        {langkah === 2 && <Langkah2 {...prop} />}
        {langkah === 3 && <Langkah3 {...prop} />}
        {langkah === 4 && <Langkah4 {...prop} />}
        {langkah === 5 && <Langkah5 {...prop} />}
        {langkah === 6 && <Langkah6 {...prop} />}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
        <button
          type="button"
          className="btn-kedua"
          disabled={langkah === 1}
          onClick={() => keLangkah(langkah - 1)}
        >
          Langkah sebelum
        </button>
        <span className="text-xs text-slate-400">
          Langkah {langkah} daripada 6
        </span>
        <button
          type="button"
          className="btn-utama"
          disabled={langkah === 6}
          onClick={() => keLangkah(langkah + 1)}
        >
          Langkah seterusnya
        </button>
      </div>
    </>
  )
}
