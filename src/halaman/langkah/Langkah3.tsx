import { useState } from 'react'
import { kemasBaris, padamBaris, tambahBaris } from '@/lib/api'
import { formatWang } from '@/lib/guna'
import { Medan, Mesej } from '@/komponen/ui'
import type { Penaja } from '@/lib/jenis'
import type { PropLangkah } from '../BorangPermohonan'

export function Langkah3({ bundel, simpan, muatSemula }: PropLangkah) {
  const { permohonan: p, penaja } = bundel
  const [sibuk, setSibuk] = useState(false)
  const [ralat, setRalat] = useState<string | null>(null)

  async function jalankan(kerja: () => Promise<unknown>) {
    setSibuk(true)
    setRalat(null)
    try {
      await kerja()
      await muatSemula()
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal menyimpan baris.')
    } finally {
      setSibuk(false)
    }
  }

  const jumlahA =
    Number(p.kutipan_murid) + Number(p.kutipan_guru) + Number(p.sumber_lain)
  const jumlahB = penaja.reduce((n, x) => n + Number(x.jumlah), 0)
  const perMurid = p.bil_murid > 0 ? Number(p.kutipan_murid) / p.bil_murid : 0

  return (
    <>
      {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}

      <section className="kad">
        <div className="kad-tajuk">
          <h2 className="text-sm font-semibold text-slate-900">
            Bahagian C1 — Maklumat Sumber Kewangan
          </h2>
        </div>
        <div className="kad-isi space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Medan
              label="Kutipan daripada murid"
              nota={
                p.bil_murid > 0
                  ? `${formatWang(perMurid)} setiap murid (${p.bil_murid} murid)`
                  : 'Isi bilangan murid pada Langkah 4 untuk melihat kadar seorang.'
              }
            >
              <MedanWang
                nilai={Number(p.kutipan_murid)}
                onSimpan={(n) => simpan({ kutipan_murid: n })}
              />
            </Medan>
            <Medan label="Kutipan daripada guru / anggota rombongan">
              <MedanWang
                nilai={Number(p.kutipan_guru)}
                onSimpan={(n) => simpan({ kutipan_guru: n })}
              />
            </Medan>
            <Medan label="Sumber kewangan lain">
              <MedanWang
                nilai={Number(p.sumber_lain)}
                onSimpan={(n) => simpan({ sumber_lain: n })}
              />
            </Medan>
          </div>

          {Number(p.sumber_lain) > 0 && (
            <Medan label="Nyatakan sumber kewangan lain" perlu>
              <input
                className="medan"
                value={p.sumber_lain_nota ?? ''}
                onChange={(e) => simpan({ sumber_lain_nota: e.target.value })}
                placeholder="Contoh: Peruntukan PIBG, tabung kokurikulum sekolah"
              />
            </Medan>
          )}

          <div className="flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3">
            <span className="text-sm font-medium text-slate-700">JUMLAH A</span>
            <span className="text-lg font-semibold tabular-nums text-slate-900">
              {formatWang(jumlahA)}
            </span>
          </div>
        </div>
      </section>

      <section className="kad">
        <div className="kad-tajuk flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Bahagian C2 — Penaja Lawatan
          </h2>
          <button
            type="button"
            className="btn-kedua px-3 py-1.5 text-xs"
            disabled={sibuk}
            onClick={() =>
              jalankan(() =>
                tambahBaris<Penaja>('permohonan_penaja', {
                  permohonan_id: p.id,
                  susunan: penaja.length,
                  nama_penaja: '',
                  jenis_tajaan: '',
                  jumlah: 0,
                }),
              )
            }
          >
            + Tambah penaja
          </button>
        </div>
        <div className="kad-isi space-y-3">
          {penaja.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
              Tiada penaja. Biarkan kosong jika lawatan dibiayai sepenuhnya oleh
              kutipan.
            </p>
          )}
          {penaja.map((x, i) => (
            <div
              key={x.id}
              className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-[2fr_1.5fr_1fr_auto]"
            >
              <Medan label={`Penaja ${i + 1}`}>
                <input
                  className="medan"
                  defaultValue={x.nama_penaja}
                  placeholder="Nama penaja"
                  onBlur={(e) =>
                    e.target.value !== x.nama_penaja &&
                    jalankan(() =>
                      kemasBaris('permohonan_penaja', x.id, {
                        nama_penaja: e.target.value,
                      }),
                    )
                  }
                />
              </Medan>
              <Medan label="Jenis tajaan">
                <input
                  className="medan"
                  defaultValue={x.jenis_tajaan ?? ''}
                  placeholder="Contoh: Tunai, pengangkutan, makanan"
                  onBlur={(e) =>
                    e.target.value !== (x.jenis_tajaan ?? '') &&
                    jalankan(() =>
                      kemasBaris('permohonan_penaja', x.id, {
                        jenis_tajaan: e.target.value,
                      }),
                    )
                  }
                />
              </Medan>
              <Medan label="Jumlah (RM)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="medan text-right"
                  defaultValue={Number(x.jumlah)}
                  onBlur={(e) =>
                    jalankan(() =>
                      kemasBaris('permohonan_penaja', x.id, {
                        jumlah: Number(e.target.value) || 0,
                      }),
                    )
                  }
                />
              </Medan>
              <div className="flex items-end pb-1">
                <button
                  type="button"
                  className="text-xs font-medium text-rose-600 hover:text-rose-700"
                  disabled={sibuk}
                  onClick={() =>
                    jalankan(() => padamBaris('permohonan_penaja', x.id))
                  }
                >
                  Buang
                </button>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3">
            <span className="text-sm font-medium text-slate-700">JUMLAH B</span>
            <span className="text-lg font-semibold tabular-nums text-slate-900">
              {formatWang(jumlahB)}
            </span>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between rounded-xl bg-jata-600 px-5 py-4 text-white">
        <div>
          <p className="text-sm font-medium">JUMLAH KESELURUHAN (A + B)</p>
          <p className="mt-0.5 text-xs text-jata-100">
            Anggaran kos penuh lawatan seperti Bahagian C, Lampiran A
          </p>
        </div>
        <span className="text-2xl font-semibold tabular-nums">
          {formatWang(jumlahA + jumlahB)}
        </span>
      </div>
    </>
  )
}

function MedanWang({
  nilai,
  onSimpan,
}: {
  nilai: number
  onSimpan: (n: number) => void
}) {
  const [teks, setTeks] = useState(String(nilai))
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
        RM
      </span>
      <input
        type="number"
        min={0}
        step="0.01"
        className="medan pl-10 text-right"
        value={teks}
        onChange={(e) => setTeks(e.target.value)}
        onBlur={() => onSimpan(Number(teks) || 0)}
      />
    </div>
  )
}
