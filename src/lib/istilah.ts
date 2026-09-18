// Istilah paparan. Semua perkataan diambil daripada Lampiran A dan
// Senarai Semak BSS Pin.1/2023 supaya skrin sepadan dengan borang kertas.

import type {
  Kategori,
  Peranan,
  PesertaKategori,
  Pengangkutan,
  Status,
  Tindakan,
} from './jenis'

export const LABEL_PERANAN: Record<Peranan, string> = {
  sekolah: 'Akaun Sekolah',
  ppd_pegawai: 'Pegawai PPD (Penyemak)',
  ppd_ketua: 'Pegawai Pendidikan Daerah (Pengesah)',
  jpn_pegawai: 'Pegawai JPN (Penyemak)',
  jpn_pengarah: 'Pengarah JPN (Pengesah)',
  kpm: 'Bahagian Penyelaras KPM',
  admin: 'Pentadbir Sistem',
}

export const LABEL_KATEGORI: Record<Kategori, string> = {
  DALAM_DAERAH: 'Dalam Daerah',
  ANTARA_DAERAH: 'Antara Daerah',
  ANTARA_NEGERI: 'Antara Negeri',
  LUAR_NEGARA: 'Luar Negara',
}

export const BAHAGIAN_PELULUS: Record<Kategori, string> = {
  DALAM_DAERAH: 'Bahagian G — Penolong Pendaftar (PPD)',
  ANTARA_DAERAH: 'Bahagian H — Pendaftar (Pengarah JPN)',
  ANTARA_NEGERI: 'Bahagian H — Pendaftar (Pengarah JPN)',
  LUAR_NEGARA: 'Bahagian J — Ketua Bahagian (KPM)',
}

export const LABEL_STATUS: Record<Status, string> = {
  DRAF: 'Draf',
  MENUNGGU_PPD_SEMAK: 'Menunggu Semakan PPD',
  MENUNGGU_PPD_SAH: 'Menunggu Pengesahan PPD',
  MENUNGGU_JPN_SEMAK: 'Menunggu Semakan JPN',
  MENUNGGU_JPN_SAH: 'Menunggu Pengesahan Pengarah',
  MENUNGGU_KPM: 'Menunggu Bahagian Penyelaras KPM',
  DIKEMBALIKAN: 'Dikembalikan untuk Pindaan',
  DITOLAK: 'Ditolak',
  DILULUSKAN: 'Diluluskan',
  SELESAI: 'Selesai',
  BATAL: 'Dibatalkan',
}

export const WARNA_STATUS: Record<Status, string> = {
  DRAF: 'bg-slate-100 text-slate-700 ring-slate-300',
  MENUNGGU_PPD_SEMAK: 'bg-amber-50 text-amber-800 ring-amber-300',
  MENUNGGU_PPD_SAH: 'bg-amber-50 text-amber-800 ring-amber-300',
  MENUNGGU_JPN_SEMAK: 'bg-jata-50 text-jata-800 ring-jata-200',
  MENUNGGU_JPN_SAH: 'bg-jata-50 text-jata-800 ring-jata-200',
  MENUNGGU_KPM: 'bg-violet-50 text-violet-800 ring-violet-200',
  DIKEMBALIKAN: 'bg-orange-50 text-orange-800 ring-orange-300',
  DITOLAK: 'bg-rose-50 text-rose-800 ring-rose-300',
  DILULUSKAN: 'bg-emerald-50 text-emerald-800 ring-emerald-300',
  SELESAI: 'bg-teal-50 text-teal-800 ring-teal-300',
  BATAL: 'bg-slate-100 text-slate-500 ring-slate-300',
}

/** Peranan yang perlu bertindak pada setiap status menunggu. */
export const PERANAN_BAGI_STATUS: Partial<Record<Status, Peranan>> = {
  MENUNGGU_PPD_SEMAK: 'ppd_pegawai',
  MENUNGGU_PPD_SAH: 'ppd_ketua',
  MENUNGGU_JPN_SEMAK: 'jpn_pegawai',
  MENUNGGU_JPN_SAH: 'jpn_pengarah',
  MENUNGGU_KPM: 'kpm',
}

/** Peringkat penyemak: setiap perkara mesti ditanda sebelum diperakukan. */
export const PERINGKAT_SEMAK: Status[] = ['MENUNGGU_PPD_SEMAK', 'MENUNGGU_JPN_SEMAK']

/** Peringkat pengesah (KPPD, Pengarah) dan peringkat semakan yang mendahuluinya. */
export const SEMAKAN_BAGI_PENGESAH: Partial<Record<Status, Status>> = {
  MENUNGGU_PPD_SAH: 'MENUNGGU_PPD_SEMAK',
  MENUNGGU_JPN_SAH: 'MENUNGGU_JPN_SEMAK',
}

/** Label butang Sokong mengikut peringkat — sepadan dengan status_seterusnya(). */
export function labelSokong(status: Status, kategori: Kategori | null): string {
  if (status === 'MENUNGGU_PPD_SEMAK') {
    return kategori === 'DALAM_DAERAH' ? 'Perakukan & Kemukakan ke KPPD' : 'Perakukan & Kemukakan ke JPN'
  }
  if (status === 'MENUNGGU_JPN_SEMAK') return 'Perakukan & Kemukakan ke Pengarah'
  if (status === 'MENUNGGU_PPD_SAH') {
    return kategori === 'DALAM_DAERAH' ? 'Sahkan & Luluskan' : 'Sahkan & Kemukakan ke JPN'
  }
  if (status === 'MENUNGGU_JPN_SAH') {
    return kategori === 'LUAR_NEGARA' ? 'Sahkan & Kemukakan ke KPM' : 'Sahkan & Luluskan'
  }
  return LABEL_TINDAKAN.SOKONG
}

export const LABEL_PENGANGKUTAN: Record<Pengangkutan, string> = {
  BAS_PERSIARAN: 'Bas Persiaran',
  VAN_PERSIARAN: 'Van Persiaran',
  BAS_SEKOLAH_SEWA: 'Bas Sekolah (sewa)',
  BAS_SEKOLAH_KPM: 'Bas Sekolah KPM',
  VAN_KPM: 'Van KPM',
  COASTER: 'Coaster',
  KENDERAAN_TENTERA: 'Kenderaan Tentera',
  KENDERAAN_POLIS: 'Kenderaan Polis',
  KENDERAAN_GURU: 'Kenderaan Guru',
  KENDERAAN_IBU_BAPA: 'Kenderaan Ibu Bapa',
}

export const LABEL_PESERTA: Record<PesertaKategori, string> = {
  KETUA_ROMBONGAN: 'Ketua Rombongan',
  MURID: 'Murid',
  GURU_PENGIRING: 'Guru Pengiring',
  BUKAN_MURID: 'Bukan Murid (ibu bapa / individu)',
  ANGGOTA_KESELAMATAN: 'Pengiring Anggota Keselamatan',
  PEMUNGUT_BAYARAN: 'Guru Pemungut Bayaran',
}

export const LABEL_TINDAKAN: Record<Tindakan, string> = {
  SOKONG: 'Sokong / Luluskan',
  KEMBALI: 'Kembalikan untuk Pindaan',
  TOLAK: 'Tolak',
}

export const LABEL_KUMPULAN_DOKUMEN: Record<string, string> = {
  PERMOHONAN: 'Kumpulan Permohonan',
  KENDERAAN: 'Kumpulan Kenderaan',
  PESERTA: 'Kumpulan Peserta',
  KESELAMATAN: 'Kumpulan Keselamatan',
  LUAR_NEGARA: 'Kumpulan Luar Negara',
}

export const LABEL_JENIS_SEKOLAH: Record<string, string> = {
  RENDAH: 'Sekolah Rendah',
  MENENGAH: 'Sekolah Menengah',
  PRASEKOLAH: 'Prasekolah',
  KHAS: 'Sekolah Pendidikan Khas',
  TEKNIK: 'Sekolah Menengah Teknik / Kolej Vokasional',
  SBP: 'Sekolah Berasrama Penuh',
  AGAMA: 'Sekolah Menengah Agama',
}

export const LABEL_PERISTIWA_AUDIT: Record<string, string> = {
  PERMOHONAN_DIHANTAR: 'Permohonan dihantar',
  TINDAKAN_KELULUSAN: 'Tindakan kelulusan',
  KELULUSAN_PINTASAN_PENTADBIR: 'Kelulusan (pintasan pentadbir)',
  STATUS_DITUKAR_PENTADBIR: 'Status ditukar oleh pentadbir',
  AKAUN_SEKOLAH_DIDAFTARKAN: 'Akaun sekolah didaftarkan',
  DOKUMEN_DILIHAT: 'Dokumen dilihat',
  DOKUMEN_DIPADAM: 'Dokumen dipadam',
  DOKUMEN_DIMUAT_NAIK: 'Dokumen dimuat naik',
  PEGAWAI_DIDAFTARKAN: 'Pegawai didaftarkan',
  PEGAWAI_DIKEMASKINI: 'Pegawai dikemas kini',
  PEGAWAI_DIPADAM: 'Pegawai dipadam',
  IMPORT_PUKAL: 'Import pukal',
  TETAPAN_DIUBAH: 'Tetapan diubah',
  LAPORAN_PASCA_DIHANTAR: 'Laporan pasca-lawatan dihantar',
  PROFIL_DIKEMASKINI: 'Profil dikemas kini',
  IMEJ_PROFIL_DITUKAR: 'Tandatangan / cop ditukar',
  PEMANGKU_DILANTIK: 'Pemangku dilantik',
  PEMANGKU_DIBATALKAN: 'Pemangkuan dibatalkan',
  PRIVASI_DIPERSETUJUI: 'Notis privasi dipersetujui',
  DATA_PERIBADI_DIANONIMKAN: 'Data peribadi dianonimkan',
  PEGAWAI_DIAKTIFKAN: 'Pegawai diaktifkan',
  PEGAWAI_DINYAHAKTIFKAN: 'Pegawai dinyahaktifkan',
}

/** Kategori nisbah Lampiran C — label ringkas untuk pemilih borang. */
export const LABEL_NISBAH: Record<string, string> = {
  a: '(a) Ketidakupayaan penglihatan (B1) / fizikal / pelbagai — 1:1',
  b: '(b) Ketidakupayaan penglihatan (rabun) — 1:3',
  c: '(c) Ketidakupayaan pendengaran / bermasalah pembelajaran — 1:5',
  d: '(d) Pendengaran berbaki / ketidakupayaan pertuturan — 1:7',
  e: '(e) Murid prasekolah — 1:5',
  f: '(f) Murid sekolah rendah — 1:5',
  g: '(g) Murid sekolah menengah — 1:8',
}

/** Cadangan kategori nisbah berdasarkan jenis sekolah. */
export function nisbahCadangan(jenisSekolah: string): string {
  switch (jenisSekolah) {
    case 'PRASEKOLAH':
      return 'e'
    case 'KHAS':
      return 'c'
    case 'MENENGAH':
    case 'TEKNIK':
    case 'SBP':
    case 'AGAMA':
      return 'g'
    default:
      return 'f'
  }
}

/**
 * Label profil mengikut peranan. `nama` ialah pemegang jawatan yang
 * menandatangani pada peringkat itu.
 */
export const LABEL_PROFIL: Record<
  Peranan,
  { nama: string; jawatan: string; tandatangan: string; cop: string }
> = {
  sekolah: {
    nama: 'Nama Guru Besar / Pengetua',
    jawatan: 'Guru Besar / Pengetua',
    tandatangan: 'Tandatangan Guru Besar / Pengetua',
    cop: 'Cop rasmi sekolah',
  },
  ppd_pegawai: {
    nama: 'Nama Pegawai PPD',
    jawatan: 'Jawatan',
    tandatangan: 'Tandatangan pegawai penyemak',
    cop: 'Cop rasmi unit (pilihan)',
  },
  ppd_ketua: {
    nama: 'Nama Pegawai Pendidikan Daerah (KPPD)',
    jawatan: 'Jawatan',
    tandatangan: 'Tandatangan KPPD',
    cop: 'Cop rasmi PPD',
  },
  jpn_pegawai: {
    nama: 'Nama Pegawai JPN',
    jawatan: 'Jawatan',
    tandatangan: 'Tandatangan pegawai penyemak',
    cop: 'Cop rasmi sektor (pilihan)',
  },
  jpn_pengarah: {
    nama: 'Nama Pengarah Pendidikan Negeri',
    jawatan: 'Jawatan',
    tandatangan: 'Tandatangan Pengarah',
    cop: 'Cop rasmi JPN',
  },
  kpm: {
    nama: 'Nama Ketua Bahagian',
    jawatan: 'Jawatan',
    tandatangan: 'Tandatangan Ketua Bahagian',
    cop: 'Cop rasmi Bahagian',
  },
  admin: {
    nama: 'Nama',
    jawatan: 'Jawatan',
    tandatangan: 'Tandatangan',
    cop: 'Cop rasmi',
  },
}
