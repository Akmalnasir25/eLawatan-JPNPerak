import { useRef, useState } from 'react'
import { NamaKetua } from './NamaKetua'
import { kemasBaris, padamBaris, tambahBaris } from '@/lib/api'
import { LABEL_PESERTA } from '@/lib/istilah'
import { Medan, Mesej } from '@/komponen/ui'
import type { Peserta, PesertaKategori } from '@/lib/jenis'
import type { PropLangkah } from '../BorangPermohonan'
import { SenaraiMurid } from './SenaraiMurid'

export function Langkah4({ bundel, simpan, muatSemula }: PropLangkah) {
  const { permohonan: p, peserta } = bundel
  const [sibuk, setSibuk] = useState(false)
  const [ralat, setRalat] = useState<string | null>(null)

  async function jalankan(kerja: () => Promise<unknown>) {
    setSibuk(true)
    setRalat(null)
    try {
      await kerja()
      await muatSemula()
      return true
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Gagal menyimpan baris.')
      return false
    } finally {
      setSibuk(false)
    }
  }

  const ketua = peserta.find((x) => x.kategori === 'KETUA_ROMBONGAN') ?? null
  const ketuaBaharu = useRef<Promise<Peserta> | null>(null)

  async function pastikanKetua(): Promise<Peserta> {
    if (ketua) return ketua
    ketuaBaharu.current ??= tambahBaris<Peserta>('peserta', {
      permohonan_id: p.id,
      kategori: 'KETUA_ROMBONGAN',
      susunan: 0,
      nama: '',
    }).catch(e => { ketuaBaharu.current = null; throw e })
    return ketuaBaharu.current
  }

  async function kemasKetua(medan: Partial<Peserta>) {
    return jalankan(async () => {
      const k = await pastikanKetua()
      await kemasBaris('peserta', k.id, medan)
    })
  }

  return (
    <>
      {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}

      {/* ── Bilangan peserta ─────────────────────────────────────── */}
      <section className="kad">
        <div className="kad-tajuk">
          <h2>
            Bilangan Peserta
          </h2>
        </div>
        <div className="kad-isi">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Medan
              label="Bilangan murid"
              perlu
              nota="Digunakan untuk kiraan nisbah pengiring (Lampiran C)."
            >
              <input
                type="number"
                min={0}
                className="medan"
                value={p.bil_murid}
                onChange={(e) =>
                  simpan({ bil_murid: Number(e.target.value) || 0 })
                }
              />
            </Medan>
            <Medan
              label="Bilangan guru pengiring"
              perlu
              nota="Guru yang mengiringi murid sepanjang lawatan."
            >
              <input
                type="number"
                min={0}
                className="medan"
                value={p.bil_guru}
                onChange={(e) =>
                  simpan({ bil_guru: Number(e.target.value) || 0 })
                }
              />
            </Medan>
            <Medan
              label="Bilangan bukan guru"
              nota="Ibu bapa atau individu lain. Mencetuskan dokumen senarai bukan murid."
            >
              <input
                type="number"
                min={0}
                className="medan"
                value={p.bil_bukan_guru}
                onChange={(e) =>
                  simpan({ bil_bukan_guru: Number(e.target.value) || 0 })
                }
              />
            </Medan>
          </div>
          <p className="mt-3 rounded-lg bg-slate-100 px-4 py-2.5 text-sm text-slate-700">
            Jumlah anggota rombongan:{' '}
            <strong className="tabular-nums">
              {p.bil_murid + p.bil_guru + p.bil_bukan_guru}
            </strong>{' '}
            orang
          </p>
        </div>
      </section>

      {/* ── Bahagian D1 ──────────────────────────────────────────── */}
      <section className="kad">
        <div className="kad-tajuk">
          <h2>
            Bahagian D1 — Ketua Rombongan
          </h2>
        </div>
        <div className="kad-isi grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <NamaKetua key={p.id} nama={ketua?.nama ?? ''} simpan={nama => kemasKetua({ nama })} />
          </div>
          <Medan label="No. kad pengenalan" perlu>
            <input
              className="medan"
              placeholder="000000-00-0000"
              defaultValue={ketua?.kp ?? ''}
              key={`kp-${ketua?.id ?? 'baharu'}`}
              onBlur={(e) =>
                e.target.value !== (ketua?.kp ?? '') &&
                kemasKetua({ kp: e.target.value })
              }
            />
          </Medan>
          <Medan
            label="No. pasport"
            perlu={p.kategori === 'LUAR_NEGARA'}
            nota={
              p.kategori === 'LUAR_NEGARA'
                ? 'Wajib bagi lawatan luar negara.'
                : 'Isi jika berkaitan.'
            }
          >
            <input
              className="medan"
              defaultValue={ketua?.pasport ?? ''}
              key={`pp-${ketua?.id ?? 'baharu'}`}
              onBlur={(e) =>
                e.target.value !== (ketua?.pasport ?? '') &&
                kemasKetua({ pasport: e.target.value })
              }
            />
          </Medan>
          <Medan label="Jawatan">
            <input
              className="medan"
              placeholder="Contoh: Guru Penolong Kanan Kokurikulum"
              defaultValue={ketua?.jawatan ?? ''}
              key={`jw-${ketua?.id ?? 'baharu'}`}
              onBlur={(e) =>
                e.target.value !== (ketua?.jawatan ?? '') &&
                kemasKetua({ jawatan: e.target.value })
              }
            />
          </Medan>
          <Medan label="No. telefon bimbit" perlu>
            <input
              className="medan"
              placeholder="01X-XXX XXXX"
              defaultValue={ketua?.telefon ?? ''}
              key={`tel-${ketua?.id ?? 'baharu'}`}
              onBlur={(e) =>
                e.target.value !== (ketua?.telefon ?? '') &&
                kemasKetua({ telefon: e.target.value })
              }
            />
          </Medan>
          <div className="sm:col-span-2">
            <Medan label="Alamat">
              <textarea
                className="medan min-h-[72px]"
                defaultValue={ketua?.alamat ?? ''}
                key={`al-${ketua?.id ?? 'baharu'}`}
                onBlur={(e) =>
                  e.target.value !== (ketua?.alamat ?? '') &&
                  kemasKetua({ alamat: e.target.value })
                }
              />
            </Medan>
          </div>
        </div>
      </section>

      {/* ── Bahagian D2 ──────────────────────────────────────────── */}
      <SenaraiMurid
        permohonanId={p.id}
        peserta={peserta}
        bilMurid={p.bil_murid}
        jalankan={async kerja => { await jalankan(kerja) }}
        simpanBilangan={(n) => simpan({ bil_murid: n })}
        sibuk={sibuk}
      />

      <SenaraiAnggota
        kategori="GURU_PENGIRING"
        tajuk="Bahagian D2 — Senarai Guru Pengiring"
        nota="Senarai penuh boleh dilampirkan sebagai dokumen pada Langkah 6. Baris di sini dicetak pada Lampiran A."
        peserta={peserta}
        permohonanId={p.id}
        jalankan={async kerja => { await jalankan(kerja) }}
        sibuk={sibuk}
      />

      {p.bil_bukan_guru > 0 && (
        <SenaraiAnggota
          kategori="BUKAN_MURID"
          tajuk="Bahagian D2 — Senarai Bukan Murid (Ibu Bapa / Individu)"
          peserta={peserta}
          permohonanId={p.id}
          jalankan={async kerja => { await jalankan(kerja) }}
          sibuk={sibuk}
        />
      )}

      {p.ada_anggota_keselamatan && (
        <SenaraiAnggota
          kategori="ANGGOTA_KESELAMATAN"
          tajuk="Bahagian D2 — Senarai Pengiring Anggota Keselamatan"
          peserta={peserta}
          permohonanId={p.id}
          jalankan={async kerja => { await jalankan(kerja) }}
          sibuk={sibuk}
        />
      )}

      {/* ── Bahagian E ───────────────────────────────────────────── */}
      <SenaraiAnggota
        kategori="PEMUNGUT_BAYARAN"
        tajuk="Bahagian E — Guru Yang Dilantik Mengutip Bayaran"
        nota="Guru yang dibenarkan memungut dan menggunakan wang bagi lawatan ini."
        peserta={peserta}
        permohonanId={p.id}
        jalankan={async kerja => { await jalankan(kerja) }}
        sibuk={sibuk}
      />
    </>
  )
}

function SenaraiAnggota({
  kategori,
  tajuk,
  nota,
  peserta,
  permohonanId,
  jalankan,
  sibuk,
}: {
  kategori: PesertaKategori
  tajuk: string
  nota?: string
  peserta: Peserta[]
  permohonanId: string
  jalankan: (k: () => Promise<unknown>) => Promise<void>
  sibuk: boolean
}) {
  const senarai = peserta.filter((x) => x.kategori === kategori)
  const perluPasport = kategori === 'BUKAN_MURID'

  return (
    <section className="kad">
      <div className="kad-tajuk">
        <div>
          <h2>{tajuk}</h2>
          {nota && <p className="-mt-1 basis-full text-xs text-slate-500">{nota}</p>}
        </div>
        <button
          type="button"
          className="btn-kedua px-3 py-1.5 text-xs"
          disabled={sibuk}
          onClick={() =>
            jalankan(() =>
              tambahBaris<Peserta>('peserta', {
                permohonan_id: permohonanId,
                kategori,
                susunan: senarai.length,
                nama: '',
              }),
            )
          }
        >
          + Tambah {LABEL_PESERTA[kategori].toLowerCase()}
        </button>
      </div>
      <div className="kad-isi">
        {senarai.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            Belum ada nama direkodkan.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="jadual">
              <thead>
                <tr>
                  <th className="w-10">#</th>
                  <th>Nama</th>
                  <th className="w-40">No. KP</th>
                  {perluPasport && <th className="w-36">Pasport</th>}
                  <th className="w-40">Telefon</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {senarai.map((x, i) => (
                  <tr key={x.id}>
                    <td className="text-slate-400">{i + 1}</td>
                    <td>
                      <input
                        className="medan py-1.5"
                        defaultValue={x.nama}
                        onBlur={(e) =>
                          e.target.value !== x.nama &&
                          jalankan(() =>
                            kemasBaris('peserta', x.id, { nama: e.target.value }),
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="medan py-1.5"
                        defaultValue={x.kp ?? ''}
                        onBlur={(e) =>
                          e.target.value !== (x.kp ?? '') &&
                          jalankan(() =>
                            kemasBaris('peserta', x.id, { kp: e.target.value }),
                          )
                        }
                      />
                    </td>
                    {perluPasport && (
                      <td>
                        <input
                          className="medan py-1.5"
                          defaultValue={x.pasport ?? ''}
                          onBlur={(e) =>
                            e.target.value !== (x.pasport ?? '') &&
                            jalankan(() =>
                              kemasBaris('peserta', x.id, {
                                pasport: e.target.value,
                              }),
                            )
                          }
                        />
                      </td>
                    )}
                    <td>
                      <input
                        className="medan py-1.5"
                        defaultValue={x.telefon ?? ''}
                        onBlur={(e) =>
                          e.target.value !== (x.telefon ?? '') &&
                          jalankan(() =>
                            kemasBaris('peserta', x.id, {
                              telefon: e.target.value,
                            }),
                          )
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="text-xs font-medium text-rose-600 hover:text-rose-700"
                        disabled={sibuk}
                        onClick={() => jalankan(() => padamBaris('peserta', x.id))}
                      >
                        Buang
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
