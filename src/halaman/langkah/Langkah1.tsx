import { useEffect, useRef, useState } from 'react'
import { formatTujuanLawatan } from '@/lib/format-teks'
import { dapatTetapan } from '@/lib/api'
import {
  BAHAGIAN_PELULUS,
  LABEL_JENIS_SEKOLAH,
  LABEL_KATEGORI,
  LABEL_PENGANGKUTAN,
} from '@/lib/istilah'
import { Baris, Medan, Mesej, Petak } from '@/komponen/ui'
import { kelas } from '@/lib/guna'
import type { Kategori, Pengangkutan } from '@/lib/jenis'
import type { PropLangkah } from '../BorangPermohonan'

const KATEGORI: Kategori[] = [
  'DALAM_DAERAH',
  'ANTARA_DAERAH',
  'ANTARA_NEGERI',
  'LUAR_NEGARA',
]

const PENGANGKUTAN_SEWA: Pengangkutan[] = [
  'BAS_PERSIARAN',
  'VAN_PERSIARAN',
  'BAS_SEKOLAH_SEWA',
]
const PENGANGKUTAN_KPM: Pengangkutan[] = [
  'BAS_SEKOLAH_KPM',
  'VAN_KPM',
  'COASTER',
  'KENDERAAN_TENTERA',
  'KENDERAAN_POLIS',
]
const PENGANGKUTAN_LAIN: Pengangkutan[] = ['KENDERAAN_GURU', 'KENDERAAN_IBU_BAPA']

export function Langkah1({ bundel, simpan }: PropLangkah) {
  const { permohonan: p, sekolah, ppd } = bundel
  const tujuanDisunting = useRef(false)
  const [tujuanAsal, setTujuanAsal] = useState<string | null>(null)
  const [tempoh, setTempoh] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    dapatTetapan<Record<string, number>>('tempoh_minimum').then(setTempoh)
  }, [])

  function togolPengangkutan(jenis: Pengangkutan) {
    const ada = p.pengangkutan.includes(jenis)
    simpan({
      pengangkutan: ada
        ? p.pengangkutan.filter((x) => x !== jenis)
        : [...p.pengangkutan, jenis],
    })
  }

  return (
    <>
      {/* ── Bahagian A ─────────────────────────────────────────── */}
      <section className="kad">
        <div className="kad-tajuk">
          <h2>
            Bahagian A — Maklumat Sekolah
          </h2>
          <span className="text-xs text-slate-400">Diisi automatik</span>
        </div>
        <div className="kad-isi">
          <dl>
            <Baris label="Nama sekolah">{sekolah.nama}</Baris>
            <Baris label="Kod sekolah">
              <span className="font-mono">{sekolah.kod_sekolah}</span>
            </Baris>
            <Baris label="Jenis">
              {LABEL_JENIS_SEKOLAH[sekolah.jenis] ?? sekolah.jenis}
            </Baris>
            <Baris label="Pengetua / Guru Besar">
              {sekolah.nama_guru_besar ?? '— belum direkod —'}
            </Baris>
            <Baris label="Alamat">
              {[sekolah.alamat, sekolah.poskod, sekolah.bandar, sekolah.negeri]
                .filter(Boolean)
                .join(', ') || '—'}
            </Baris>
            <Baris label="Telefon / Faks">
              {sekolah.telefon ?? '—'}
              {sekolah.faks ? ` / ${sekolah.faks}` : ''}
            </Baris>
            <Baris label="E-mel">{sekolah.emel}</Baris>
            <Baris label="PPD">{ppd?.nama ?? sekolah.kod_ppd}</Baris>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Maklumat ini datang daripada senarai rasmi JPN. Jika ada kesilapan,
            hubungi pentadbir sistem — sekolah tidak boleh mengubahnya sendiri.
          </p>
        </div>
      </section>

      {/* ── Bahagian B1 ────────────────────────────────────────── */}
      <section className="kad">
        <div className="kad-tajuk">
          <h2>
            Bahagian B1 — Maklumat Lawatan
          </h2>
        </div>
        <div className="kad-isi space-y-6">
          <Medan
            label="Kategori lawatan"
            perlu
            nota="Kategori menentukan rantaian kelulusan dan tempoh minimum permohonan."
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {KATEGORI.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => simpan({ kategori: k })}
                  className={kelas(
                    'rounded-lg border p-3 text-left transition',
                    p.kategori === k
                      ? 'border-jata-400 bg-jata-50 ring-1 ring-jata-300'
                      : 'border-slate-200 bg-white hover:bg-slate-50',
                  )}
                >
                  <span className="block text-sm font-medium text-slate-800">
                    {LABEL_KATEGORI[k]}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {BAHAGIAN_PELULUS[k]}
                  </span>
                  {tempoh && (
                    <span className="mt-1 block text-xs font-medium text-jata-600">
                      Minimum {tempoh[k]} hari sebelum lawatan
                    </span>
                  )}
                </button>
              ))}
            </div>
          </Medan>

          <Medan
            label="Tujuan lawatan"
            perlu
            nota="Sekurang-kurangnya 10 aksara. Nyatakan objektif pendidikan lawatan ini."
          >
            <textarea
              className="medan min-h-[92px]"
              value={p.tujuan ?? ''}
              onChange={(e) => { tujuanDisunting.current = true; setTujuanAsal(null); simpan({ tujuan: e.target.value }) }}
              onBlur={(e) => {
                if (!tujuanDisunting.current) return
                tujuanDisunting.current = false
                const asal = e.target.value
                const tersusun = formatTujuanLawatan(asal)
                if (tersusun !== asal) { setTujuanAsal(asal); simpan({ tujuan: tersusun }) }
              }}
              placeholder="Contoh: Lawatan sambil belajar ke Muzium Darul Ridzuan bagi menyokong tajuk Sejarah Tingkatan 2…"
            />
          </Medan>

          {tujuanAsal !== null && <div className="-mt-2 text-xs text-slate-600" aria-live="polite">
            Format huruf diselaraskan secara automatik. Sila semak ejaan nama khas dan singkatan.
            <button type="button" className="ml-2 font-semibold underline" onClick={() => {
              simpan({ tujuan: tujuanAsal }); setTujuanAsal(null); tujuanDisunting.current = false
            }}>Kekalkan format asal</button>
          </div>}

          <Medan
            label="Jenis pengangkutan"
            perlu
            nota="Pilihan di sini menentukan dokumen kenderaan yang wajib dimuat naik."
          >
            <div className="space-y-4">
              <KumpulanPengangkutan
                tajuk="Kenderaan sewa — tujuh dokumen disahkan Ketua Jabatan"
                senarai={PENGANGKUTAN_SEWA}
                dipilih={p.pengangkutan}
                togol={togolPengangkutan}
              />
              <KumpulanPengangkutan
                tajuk="Kenderaan KPM / tentera / polis — perlu surat kelulusan unit"
                senarai={PENGANGKUTAN_KPM}
                dipilih={p.pengangkutan}
                togol={togolPengangkutan}
              />
              <KumpulanPengangkutan
                tajuk="Kenderaan persendirian"
                senarai={PENGANGKUTAN_LAIN}
                dipilih={p.pengangkutan}
                togol={togolPengangkutan}
              />
            </div>
          </Medan>

          <Medan
            label="Ciri tambahan lawatan"
            nota="Setiap ciri yang ditanda akan menambah dokumen wajib pada Langkah 6."
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Petak
                label="Melibatkan penginapan"
                nota="Mencetuskan borang penilaian risiko"
                checked={p.ada_penginapan}
                onChange={(n) => simpan({ ada_penginapan: n })}
              />
              <Petak
                label="Aktiviti berisiko tinggi"
                nota="Mencetuskan borang penilaian risiko"
                checked={p.ada_risiko_tinggi}
                onChange={(n) => simpan({ ada_risiko_tinggi: n })}
              />
              <Petak
                label="Melibatkan aktiviti air"
                nota="Pusat Kokurikulum Negeri atau Program Terapi PPKI — perlu tauliah penyelamat air"
                checked={p.ada_aktiviti_air}
                onChange={(n) => simpan({ ada_aktiviti_air: n })}
              />
              <Petak
                label="Disertai pengiring anggota keselamatan"
                checked={p.ada_anggota_keselamatan}
                onChange={(n) => simpan({ ada_anggota_keselamatan: n })}
              />
              <Petak
                label="Anjuran pihak luar selain agensi KPM"
                nota="SPI Bil. 10/2011 — perlu surat kebenaran program"
                checked={p.anjuran_pihak_luar}
                onChange={(n) => simpan({ anjuran_pihak_luar: n })}
              />
              <Petak
                label="Lawatan berperingkat"
                nota="Membuka Bahagian B2 pada Langkah 2"
                checked={p.lawatan_berperingkat}
                onChange={(n) => simpan({ lawatan_berperingkat: n })}
              />
            </div>
          </Medan>

          {p.anjuran_pihak_luar && (
            <Medan label="Nama penganjur luar" perlu>
              <input
                className="medan"
                value={p.nama_penganjur_luar ?? ''}
                onChange={(e) => simpan({ nama_penganjur_luar: e.target.value })}
                placeholder="Nama penuh agensi atau syarikat penganjur"
              />
            </Medan>
          )}

          {p.kategori === 'LUAR_NEGARA' && (
            <Mesej jenis="maklumat" tajuk="Lawatan luar negara">
              Permohonan akan melalui PPD, JPN dan seterusnya Bahagian Penyelaras
              KPM (Bahagian J) sebelum diangkat kepada Ketua Pendaftar. Pasport
              ketua rombongan dan semua anggota rombongan diperlukan.
            </Mesej>
          )}
        </div>
      </section>
    </>
  )
}

function KumpulanPengangkutan({
  tajuk,
  senarai,
  dipilih,
  togol,
}: {
  tajuk: string
  senarai: Pengangkutan[]
  dipilih: Pengangkutan[]
  togol: (j: Pengangkutan) => void
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {tajuk}
      </p>
      <div className="flex flex-wrap gap-2">
        {senarai.map((j) => (
          <button
            key={j}
            type="button"
            onClick={() => togol(j)}
            className={kelas(
              'rounded-full border px-3.5 py-1.5 text-sm transition',
              dipilih.includes(j)
                ? 'border-jata-500 bg-jata-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
            )}
          >
            {LABEL_PENGANGKUTAN[j]}
          </button>
        ))}
      </div>
    </div>
  )
}
