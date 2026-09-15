import { LABEL_NISBAH } from '@/lib/istilah'
import { kelas } from '@/lib/guna'
import { Medan, Mesej } from '@/komponen/ui'
import type { NisbahKategori } from '@/lib/jenis'
import type { PropLangkah } from '../BorangPermohonan'

const KOD: NisbahKategori[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g']

export function Langkah5({ bundel, simpan, kelengkapan }: PropLangkah) {
  const { permohonan: p } = bundel
  const n = kelengkapan?.nisbah

  return (
    <>
      <section className="kad">
        <div className="kad-tajuk">
          <h2 className="text-sm font-semibold text-slate-900">
            Lampiran C — Nisbah Pengiring Murid Kepada Murid
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Nisbah ini terikat SPI Bil. 9/2023 dan tidak boleh diubah dalam
            sistem. Pilih kategori murid yang menyertai lawatan ini.
          </p>
        </div>
        <div className="kad-isi space-y-2">
          {KOD.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => simpan({ nisbah_kategori: k })}
              className={kelas(
                'block w-full rounded-lg border p-3 text-left text-sm transition',
                p.nisbah_kategori === k
                  ? 'border-jata-400 bg-jata-50 ring-1 ring-jata-300'
                  : 'border-slate-200 bg-white hover:bg-slate-50',
              )}
            >
              {LABEL_NISBAH[k]}
            </button>
          ))}
        </div>
      </section>

      {n && (
        <section
          className={kelas(
            'kad border-2',
            n.disekat
              ? 'border-rose-300'
              : n.perlu_justifikasi
                ? 'border-amber-300'
                : 'border-emerald-300',
          )}
        >
          <div className="kad-tajuk">
            <h2 className="text-sm font-semibold text-slate-900">
              Kiraan Nisbah
            </h2>
          </div>
          <div className="kad-isi">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Kiraan label="Bilangan murid" nilai={p.bil_murid} />
              <Kiraan label="Nisbah dikehendaki" nilai={n.nisbah} />
              <Kiraan label="Pengiring diperlukan" nilai={n.perlu} />
              <Kiraan
                label="Pengiring disediakan"
                nilai={n.ada}
                warna={
                  n.sah
                    ? 'text-emerald-600'
                    : n.disekat
                      ? 'text-rose-600'
                      : 'text-amber-600'
                }
              />
            </div>

            <div className="mt-5">
              {n.sah && (
                <Mesej jenis="berjaya" tajuk="Nisbah dipatuhi">
                  Bilangan pengiring memenuhi nisbah {n.nisbah} bagi kategori
                  murid yang dipilih.
                </Mesej>
              )}
              {n.perlu_justifikasi && (
                <Mesej jenis="amaran" tajuk="Dalam had pengecualian">
                  Pengiring kurang daripada {n.perlu} orang, tetapi masih dalam
                  had pengecualian {n.had_pengecualian} (minimum{' '}
                  {n.had_terendah} orang). Justifikasi Bahagian I wajib diisi
                  sebelum permohonan boleh dihantar.
                </Mesej>
              )}
              {n.disekat && (
                <Mesej jenis="ralat" tajuk="Penghantaran disekat">
                  Dengan {p.bil_murid} murid, sekurang-kurangnya{' '}
                  {n.had_terendah} pengiring diperlukan walaupun di bawah had
                  pengecualian {n.had_pengecualian}. Tambah pengiring pada
                  Langkah 4 sebelum meneruskan.
                </Mesej>
              )}
            </div>
          </div>
        </section>
      )}

      {n?.perlu_justifikasi && (
        <section className="kad">
          <div className="kad-tajuk">
            <h2 className="text-sm font-semibold text-slate-900">
              Bahagian I — Pengecualian Pelulus Berkaitan Nisbah
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              &ldquo;Pelulus boleh menentukan had pengecualian nisbah pengiring
              murid kepada murid berdasarkan Jadual Keempat sekiranya difikirkan
              wajar dan suai manfaat.&rdquo; — Lampiran C, SPI Bil. 9/2023
            </p>
          </div>
          <div className="kad-isi">
            <Medan
              label="Justifikasi permohonan pengecualian"
              perlu
              nota="Sekurang-kurangnya 20 aksara. Nyatakan sebab kekurangan pengiring dan langkah keselamatan tambahan yang diambil."
            >
              <textarea
                className="medan min-h-[120px]"
                value={p.justifikasi_nisbah ?? ''}
                onChange={(e) => simpan({ justifikasi_nisbah: e.target.value })}
                placeholder="Contoh: Dua orang guru pengiring berkursus pada tarikh tersebut. Sebagai langkah gantian, dua orang ibu bapa berdaftar dan seorang anggota PIBG akan menyertai rombongan sebagai pemantau tambahan…"
              />
            </Medan>
            <p className="mt-2 text-xs text-slate-500">
              {(p.justifikasi_nisbah ?? '').trim().length} / 20 aksara minimum
            </p>
          </div>
        </section>
      )}
    </>
  )
}

function Kiraan({
  label,
  nilai,
  warna = 'text-slate-900',
}: {
  label: string
  nilai: string | number
  warna?: string
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={kelas('mt-1 text-xl font-semibold tabular-nums', warna)}>
        {nilai}
      </p>
    </div>
  )
}
