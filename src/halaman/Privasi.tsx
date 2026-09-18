import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { gunaAuth } from '@/lib/auth'
import { gunaJabatan } from '@/lib/jabatan'
import { setujuPrivasi, VERSI_PRIVASI } from '@/lib/privasi'
import { formatTarikh } from '@/lib/guna'
import { Berputar, Mesej } from '@/komponen/ui'
import { RangkaAwam, TajukHalaman } from '@/komponen/Rangka'

/**
 * Kandungan notis privasi. Draf ini perlu disemak oleh pegawai undang-undang
 * dan keselamatan ICT JPN sebelum pelancaran; tukar VERSI_PRIVASI selepas
 * sebarang pindaan supaya pengguna bersetuju semula.
 */
export function KandunganPrivasi() {
  const { jabatan } = gunaJabatan()
  return (
    <div className="space-y-5 text-sm leading-relaxed text-slate-700 [&_h2]:mb-1.5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-jata-900 [&_li]:ml-5 [&_li]:list-disc">
      <p>
        {jabatan.nama} ({jabatan.nama_ringkas}) mengumpul dan memproses data peribadi dalam
        sistem eLAWATAN untuk menguruskan permohonan dan kelulusan lawatan murid sekolah.
        Notis ini disediakan selaras dengan prinsip Akta Perlindungan Data Peribadi 2010
        (Akta 709) dan dasar keselamatan maklumat sektor awam.
      </p>

      <section>
        <h2>1. Data yang dikumpul</h2>
        <ul>
          <li>Akaun pengguna: nama, e-mel rasmi, jawatan, nombor telefon, tandatangan dan cop rasmi.</li>
          <li>
            Peserta lawatan: nama, nombor kad pengenalan atau sijil lahir, pasport (lawatan luar
            negara), jantina, tahun atau tingkatan, alamat dan nombor telefon.
          </li>
          <li>Dokumen sokongan yang dimuat naik oleh sekolah, termasuk senarai murid dan surat kebenaran.</li>
          <li>Rekod aktiviti: log masuk, tindakan kelulusan dan setiap kali dokumen dibuka.</li>
        </ul>
      </section>

      <section>
        <h2>2. Tujuan</h2>
        <p>
          Data digunakan hanya untuk menilai, meluluskan dan memantau lawatan; menghubungi
          ketua rombongan semasa kecemasan; menjana surat kelulusan dan laporan; serta
          memenuhi keperluan audit. Data tidak dijual atau dikongsi untuk tujuan pemasaran.
        </p>
      </section>

      <section>
        <h2>3. Siapa boleh melihat</h2>
        <p>
          Capaian ditentukan oleh peranan dan dikuatkuasakan dalam pangkalan data: sekolah
          melihat permohonannya sendiri, PPD melihat daerahnya, JPN melihat negerinya, dan
          Bahagian KPM hanya lawatan luar negara. Pautan dokumen tamat dalam lima minit dan
          setiap capaian direkodkan dalam log audit yang tidak boleh dipadam.
        </p>
      </section>

      <section>
        <h2>4. Tempoh simpanan</h2>
        <p>
          Rekod disimpan sepanjang tempoh yang ditetapkan JPN (lalai 7 tahun selepas rekod
          ditutup). Selepas itu data peribadi peserta dianonimkan dan dokumen sokongan
          dipadam; maklumat statistik lawatan dikekalkan.
        </p>
      </section>

      <section>
        <h2>5. Hak anda</h2>
        <p>
          Anda boleh menyemak dan membetulkan maklumat akaun anda di halaman Profil. Untuk
          permintaan lain berkaitan data peribadi, termasuk data murid, hubungi pentadbir sistem
          {jabatan.emel ? ` di ${jabatan.emel}` : ''}
          {jabatan.telefon ? ` atau ${jabatan.telefon}` : ''}.
        </p>
      </section>

      <section>
        <h2>6. Tanggungjawab pengguna</h2>
        <p>
          Sekolah mesti memperoleh kebenaran ibu bapa atau penjaga sebelum memasukkan data murid.
          Pegawai hanya boleh menggunakan data untuk tujuan kelulusan lawatan dan tidak boleh
          memuat turun atau mengedarkannya di luar sistem tanpa kebenaran.
        </p>
      </section>

      <p className="text-xs text-slate-500">Versi {formatTarikh(VERSI_PRIVASI)}</p>
    </div>
  )
}

/** Halaman awam — boleh dibaca sebelum log masuk. */
export function Privasi() {
  const { pegawai } = gunaAuth()
  const isi = (
    <>
      <TajukHalaman ikon={ShieldCheck} jejak={pegawai ? [{ teks: 'Notis Privasi' }] : []} tajuk="Notis Privasi" />
      <div className="kad">
        <div className="kad-isi">
          <KandunganPrivasi />
        </div>
      </div>
    </>
  )
  if (pegawai) return isi
  return (
    <RangkaAwam>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">{isi}</div>
    </RangkaAwam>
  )
}

/**
 * Pintu persetujuan: dipapar sebelum sistem digunakan apabila pengguna
 * belum bersetuju dengan versi notis semasa.
 */
export function PersetujuanPrivasi() {
  const { muatSemula, keluar } = gunaAuth()
  const [setuju, setSetuju] = useState(false)
  const [sibuk, setSibuk] = useState(false)
  const [ralat, setRalat] = useState<string | null>(null)

  async function hantar() {
    setSibuk(true)
    setRalat(null)
    try {
      await setujuPrivasi()
      await muatSemula()
    } catch (e) {
      setRalat(e instanceof Error ? e.message : 'Persetujuan tidak dapat disimpan.')
      setSibuk(false)
    }
  }

  return (
    <RangkaAwam>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <TajukHalaman
          ikon={ShieldCheck}
          tajuk="Notis Privasi"
          nota="Sila baca dan sahkan sebelum menggunakan sistem."
        />
        <div className="kad">
          <div className="kad-isi max-h-[55vh] overflow-y-auto">
            <KandunganPrivasi />
          </div>
          <div className="space-y-3 border-t border-slate-200 px-5 py-4">
            {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}
            <label className="flex items-start gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
                checked={setuju}
                onChange={(e) => setSetuju(e.target.checked)}
              />
              Saya telah membaca notis privasi ini dan akan mengendalikan data peribadi dalam sistem
              mengikut tujuan yang dinyatakan.
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="btn-kedua" onClick={() => void keluar()}>
                Log keluar
              </button>
              <button type="button" className="btn-utama" disabled={!setuju || sibuk} onClick={hantar}>
                {sibuk ? <Berputar /> : null}
                Setuju dan teruskan
              </button>
            </div>
          </div>
        </div>
      </div>
    </RangkaAwam>
  )
}
