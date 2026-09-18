import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { gunaAuth } from '@/lib/auth'
import { Rangka } from '@/komponen/Rangka'
import { Memuat } from '@/komponen/ui'
import type { Peranan } from '@/lib/jenis'

import { Masuk } from '@/halaman/Masuk'
import { Daftar } from '@/halaman/Daftar'
import { TiadaAkses } from '@/halaman/TiadaAkses'
import { PapanPemuka } from '@/halaman/PapanPemuka'
import { SenaraiPermohonan } from '@/halaman/SenaraiPermohonan'
import { BorangPermohonan } from '@/halaman/BorangPermohonan'
import { PaparPermohonan } from '@/halaman/PaparPermohonan'
import { LaporanPascaLawatan } from '@/halaman/LaporanPascaLawatan'
import { Laporan } from '@/halaman/Laporan'
import { Pentadbir } from '@/halaman/Pentadbir'
import { SahQr } from '@/halaman/SahQr'
import { Profil } from '@/halaman/Profil'
import { UrusPegawai } from '@/halaman/UrusPegawai'
import { Kalendar } from '@/halaman/Kalendar'
import { Bantuan } from '@/halaman/Bantuan'
import { PersetujuanPrivasi, Privasi } from '@/halaman/Privasi'
import { VERSI_PRIVASI } from '@/lib/privasi'
import { CetakLampiranA } from '@/cetak/LampiranA'
import { CetakSenaraiSemak } from '@/cetak/SenaraiSemak'
import { CetakSuratKelulusan } from '@/cetak/SuratKelulusan'
import { CetakLampiranG } from '@/cetak/LampiranG'

function Lindung({
  children,
  peranan,
}: {
  children: JSX.Element
  peranan?: Peranan[]
}) {
  const { sesi, pegawai, memuat, tanpaCapaian } = gunaAuth()
  const lokasi = useLocation()

  if (memuat) return <Memuat teks="Menyemak capaian…" />
  if (!sesi) return <Navigate to="/masuk" state={{ dari: lokasi.pathname }} replace />
  if (tanpaCapaian) return <TiadaAkses />
  if (!pegawai) return <Memuat />
  if (pegawai.privasi_versi !== VERSI_PRIVASI) return <PersetujuanPrivasi />
  if (peranan && !peranan.includes(pegawai.peranan)) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-lg font-semibold text-slate-900">
          Halaman ini di luar peranan anda
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Peringkat capaian ditentukan oleh e-mel yang log masuk, bukan dipilih
          sendiri. Hubungi pentadbir sistem jika ini tidak betul.
        </p>
      </div>
    )
  }
  return children
}

export function App() {
  return (
    <Routes>
      {/* Awam */}
      <Route path="/masuk" element={<Masuk />} />
      <Route path="/daftar" element={<Daftar />} />
      <Route path="/sah/:kod" element={<SahQr />} />
      <Route path="/sah" element={<SahQr />} />
      {/* Boleh dibaca sebelum log masuk; rangka penuh apabila log masuk. */}
      <Route path="/bantuan" element={<Rangka><Bantuan /></Rangka>} />
      <Route path="/privasi" element={<Rangka><Privasi /></Rangka>} />

      {/* Cetakan — tanpa rangka sistem */}
      <Route
        path="/cetak/lampiran-a/:id"
        element={<Lindung><CetakLampiranA /></Lindung>}
      />
      <Route
        path="/cetak/senarai-semak/:id"
        element={<Lindung><CetakSenaraiSemak /></Lindung>}
      />
      <Route
        path="/cetak/surat-kelulusan/:id"
        element={<Lindung><CetakSuratKelulusan /></Lindung>}
      />
      <Route
        path="/cetak/lampiran-g/:id"
        element={<Lindung><CetakLampiranG /></Lindung>}
      />

      {/* Dalam sistem */}
      <Route
        path="/"
        element={<Lindung><Rangka><PapanPemuka /></Rangka></Lindung>}
      />
      <Route
        path="/senarai"
        element={<Lindung><Rangka><SenaraiPermohonan /></Rangka></Lindung>}
      />
      <Route
        path="/permohonan/baharu"
        element={
          <Lindung peranan={['sekolah']}>
            <Rangka><BorangPermohonan /></Rangka>
          </Lindung>
        }
      />
      <Route
        path="/permohonan/:id/sunting"
        element={
          <Lindung peranan={['sekolah', 'admin']}>
            <Rangka><BorangPermohonan /></Rangka>
          </Lindung>
        }
      />
      <Route
        path="/permohonan/:id"
        element={<Lindung><Rangka><PaparPermohonan /></Rangka></Lindung>}
      />
      <Route
        path="/permohonan/:id/laporan"
        element={
          <Lindung peranan={['sekolah', 'admin']}>
            <Rangka><LaporanPascaLawatan /></Rangka>
          </Lindung>
        }
      />
      <Route
        path="/laporan"
        element={<Lindung><Rangka><Laporan /></Rangka></Lindung>}
      />
      <Route
        path="/kalendar"
        element={<Lindung><Rangka><Kalendar /></Rangka></Lindung>}
      />
      <Route
        path="/profil"
        element={<Lindung><Rangka><Profil /></Rangka></Lindung>}
      />
      <Route
        path="/pegawai"
        element={
          <Lindung peranan={['sekolah', 'ppd_pegawai', 'ppd_ketua', 'jpn_pegawai', 'jpn_pengarah', 'admin']}>
            <Rangka><UrusPegawai /></Rangka>
          </Lindung>
        }
      />
      <Route
        path="/pentadbir"
        element={
          <Lindung peranan={['admin']}>
            <Rangka><Pentadbir /></Rangka>
          </Lindung>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
