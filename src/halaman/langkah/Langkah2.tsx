import { useState } from 'react'
import { kemasBaris, padamBaris, tambahBaris } from '@/lib/api'
import { formatTarikh, hariLagi, tarikhTambahHari } from '@/lib/guna'
import { Medan, Mesej } from '@/komponen/ui'
import type { Peringkat, Tempat } from '@/lib/jenis'
import type { PropLangkah } from '../BorangPermohonan'

export function Langkah2({ bundel, muatSemula }: PropLangkah) {
  const { permohonan: p, tempat, peringkat, sekolah } = bundel
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

  const tambahTempat = () =>
    jalankan(() =>
      tambahBaris<Tempat>('permohonan_tempat', {
        permohonan_id: p.id,
        susunan: tempat.length,
        tempat: '',
        negeri: sekolah.negeri,
        negara: 'Malaysia',
        tarikh_dari: tarikhTambahHari(30),
        tarikh_hingga: tarikhTambahHari(30),
      }),
    )

  const tambahPeringkat = () =>
    jalankan(() =>
      tambahBaris<Peringkat>('permohonan_peringkat', {
        permohonan_id: p.id,
        susunan: peringkat.length,
        keterangan: '',
        tarikh_dari: tarikhTambahHari(30),
        tarikh_hingga: tarikhTambahHari(30),
        bil_murid: 0,
      }),
    )

  // Semakan kategori berbanding destinasi sebenar
  const adaLuarNegara = tempat.some(
    (t) => (t.negara ?? 'Malaysia').trim().toLowerCase() !== 'malaysia',
  )
  const adaLuarNegeri = tempat.some(
    (t) =>
      (t.negara ?? 'Malaysia').trim().toLowerCase() === 'malaysia' &&
      t.negeri &&
      t.negeri.trim().toLowerCase() !== sekolah.negeri.trim().toLowerCase(),
  )

  const percanggahan =
    adaLuarNegara && p.kategori !== 'LUAR_NEGARA'
      ? 'Terdapat destinasi di luar Malaysia tetapi kategori bukan Luar Negara.'
      : adaLuarNegeri &&
          p.kategori !== 'ANTARA_NEGERI' &&
          p.kategori !== 'LUAR_NEGARA'
        ? 'Terdapat destinasi di luar negeri sekolah tetapi kategori bukan Antara Negeri.'
        : null

  const hari = hariLagi(p.tarikh_mula)

  return (
    <>
      {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}
      {percanggahan && (
        <Mesej jenis="amaran" tajuk="Semak kategori lawatan">
          {percanggahan} Kembali ke Langkah 1 untuk membetulkannya — kategori
          menentukan siapa pelulus akhir dan tempoh minimum permohonan.
        </Mesej>
      )}

      <section className="kad">
        <div className="kad-tajuk">
          <h2>
            Bahagian B1.4 — Tempat Dilawati dan Penginapan
          </h2>
          <button
            type="button"
            className="btn-kedua px-3 py-1.5 text-xs"
            onClick={tambahTempat}
            disabled={sibuk}
          >
            + Tambah tempat
          </button>
        </div>
        <div className="kad-isi space-y-4">
          {tempat.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              Belum ada tempat. Sekurang-kurangnya satu tempat dengan tarikh sah
              diperlukan sebelum permohonan boleh dihantar.
            </p>
          )}

          {tempat.map((t, i) => (
            <div
              key={t.id}
              className="rounded-lg border border-slate-200 bg-slate-50/60 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tempat {i + 1}
                </span>
                <button
                  type="button"
                  className="text-xs font-medium text-rose-600 hover:text-rose-700"
                  onClick={() =>
                    jalankan(() => padamBaris('permohonan_tempat', t.id))
                  }
                  disabled={sibuk}
                >
                  Buang
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Medan label="Tempat dilawati" perlu>
                    <input
                      className="medan"
                      defaultValue={t.tempat}
                      placeholder="Contoh: Muzium Darul Ridzuan, Ipoh"
                      onBlur={(e) =>
                        e.target.value !== t.tempat &&
                        jalankan(() =>
                          kemasBaris('permohonan_tempat', t.id, {
                            tempat: e.target.value,
                          }),
                        )
                      }
                    />
                  </Medan>
                </div>
                <Medan label="Negeri">
                  <input
                    className="medan"
                    defaultValue={t.negeri ?? ''}
                    onBlur={(e) =>
                      e.target.value !== (t.negeri ?? '') &&
                      jalankan(() =>
                        kemasBaris('permohonan_tempat', t.id, {
                          negeri: e.target.value,
                        }),
                      )
                    }
                  />
                </Medan>
                <Medan label="Negara">
                  <input
                    className="medan"
                    defaultValue={t.negara}
                    onBlur={(e) =>
                      e.target.value !== t.negara &&
                      jalankan(() =>
                        kemasBaris('permohonan_tempat', t.id, {
                          negara: e.target.value || 'Malaysia',
                        }),
                      )
                    }
                  />
                </Medan>
                <Medan label="Tarikh dari" perlu>
                  <input
                    type="date"
                    className="medan"
                    defaultValue={t.tarikh_dari}
                    onChange={(e) =>
                      jalankan(() =>
                        // Tarikh tamat ditolak ke hadapan sekali supaya
                        // kekangan tarikh_hingga >= tarikh_dari tidak pecah.
                        kemasBaris('permohonan_tempat', t.id, {
                          tarikh_dari: e.target.value,
                          ...(e.target.value > t.tarikh_hingga
                            ? { tarikh_hingga: e.target.value }
                            : {}),
                        }),
                      )
                    }
                  />
                </Medan>
                <Medan label="Tarikh hingga" perlu>
                  <input
                    type="date"
                    className="medan"
                    min={t.tarikh_dari}
                    defaultValue={t.tarikh_hingga}
                    onChange={(e) =>
                      jalankan(() =>
                        kemasBaris('permohonan_tempat', t.id, {
                          tarikh_hingga: e.target.value,
                        }),
                      )
                    }
                  />
                </Medan>
                {p.ada_penginapan && (
                  <div className="sm:col-span-2">
                    <Medan
                      label="Tempat penginapan"
                      nota="Nama dan alamat penuh penginapan."
                    >
                      <input
                        className="medan"
                        defaultValue={t.penginapan ?? ''}
                        onBlur={(e) =>
                          e.target.value !== (t.penginapan ?? '') &&
                          jalankan(() =>
                            kemasBaris('permohonan_tempat', t.id, {
                              penginapan: e.target.value,
                            }),
                          )
                        }
                      />
                    </Medan>
                  </div>
                )}
              </div>
            </div>
          ))}

          {tempat.length > 0 && (
            <div className="rounded-lg bg-jata-50 px-4 py-3 text-sm">
              <p className="text-slate-700">
                <span className="font-medium">Julat tarikh keseluruhan:</span>{' '}
                {formatTarikh(p.tarikh_mula)} – {formatTarikh(p.tarikh_tamat)}
              </p>
              {hari !== null && (
                <p className="mt-0.5 text-xs text-slate-600">
                  {hari >= 0
                    ? `${hari} hari dari hari ini hingga tarikh mula lawatan.`
                    : 'Tarikh mula lawatan sudah berlalu.'}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {p.lawatan_berperingkat && (
        <section className="kad">
          <div className="kad-tajuk">
            <h2>
              Bahagian B2 — Maklumat Lawatan Berperingkat
            </h2>
            <button
              type="button"
              className="btn-kedua px-3 py-1.5 text-xs"
              onClick={tambahPeringkat}
              disabled={sibuk}
            >
              + Tambah peringkat
            </button>
          </div>
          <div className="kad-isi space-y-3">
            {peringkat.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                Perincikan setiap peringkat lawatan dan tarikhnya.
              </p>
            )}
            {peringkat.map((r, i) => (
              <div
                key={r.id}
                className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-[2fr_1fr_1fr_100px_auto]"
              >
                <Medan label={`Peringkat ${i + 1}`}>
                  <input
                    className="medan"
                    defaultValue={r.keterangan}
                    placeholder="Keterangan peringkat"
                    onBlur={(e) =>
                      e.target.value !== r.keterangan &&
                      jalankan(() =>
                        kemasBaris('permohonan_peringkat', r.id, {
                          keterangan: e.target.value,
                        }),
                      )
                    }
                  />
                </Medan>
                <Medan label="Dari">
                  <input
                    type="date"
                    className="medan"
                    defaultValue={r.tarikh_dari}
                    onChange={(e) =>
                      jalankan(() =>
                        kemasBaris('permohonan_peringkat', r.id, {
                          tarikh_dari: e.target.value,
                          ...(e.target.value > r.tarikh_hingga
                            ? { tarikh_hingga: e.target.value }
                            : {}),
                        }),
                      )
                    }
                  />
                </Medan>
                <Medan label="Hingga">
                  <input
                    type="date"
                    className="medan"
                    defaultValue={r.tarikh_hingga}
                    onChange={(e) =>
                      jalankan(() =>
                        kemasBaris('permohonan_peringkat', r.id, {
                          tarikh_hingga: e.target.value,
                        }),
                      )
                    }
                  />
                </Medan>
                <Medan label="Bil. murid">
                  <input
                    type="number"
                    min={0}
                    className="medan"
                    defaultValue={r.bil_murid}
                    onBlur={(e) =>
                      jalankan(() =>
                        kemasBaris('permohonan_peringkat', r.id, {
                          bil_murid: Number(e.target.value) || 0,
                        }),
                      )
                    }
                  />
                </Medan>
                <div className="flex items-end pb-1">
                  <button
                    type="button"
                    className="text-xs font-medium text-rose-600 hover:text-rose-700"
                    onClick={() =>
                      jalankan(() => padamBaris('permohonan_peringkat', r.id))
                    }
                    disabled={sibuk}
                  >
                    Buang
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
