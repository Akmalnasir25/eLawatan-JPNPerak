// Jenis TypeScript yang mencerminkan skema Postgres.
// Jana semula dengan `npm run db:jenis` selepas migrasi berubah.

export type Peranan =
  | 'sekolah'
  | 'ppd_pegawai'
  | 'ppd_ketua'
  | 'jpn_pegawai'
  | 'jpn_pengarah'
  | 'kpm'
  | 'admin'

export type Kategori =
  | 'DALAM_DAERAH'
  | 'ANTARA_DAERAH'
  | 'ANTARA_NEGERI'
  | 'LUAR_NEGARA'

export type Status =
  | 'DRAF'
  | 'MENUNGGU_PPD_SEMAK'
  | 'MENUNGGU_PPD_SAH'
  | 'MENUNGGU_JPN_SEMAK'
  | 'MENUNGGU_JPN_SAH'
  | 'MENUNGGU_KPM'
  | 'DIKEMBALIKAN'
  | 'DITOLAK'
  | 'DILULUSKAN'
  | 'SELESAI'
  | 'BATAL'

export type Tindakan = 'SOKONG' | 'KEMBALI' | 'TOLAK'

export type PesertaKategori =
  | 'KETUA_ROMBONGAN'
  | 'MURID'
  | 'GURU_PENGIRING'
  | 'BUKAN_MURID'
  | 'ANGGOTA_KESELAMATAN'
  | 'PEMUNGUT_BAYARAN'

export type Pengangkutan =
  | 'BAS_PERSIARAN'
  | 'VAN_PERSIARAN'
  | 'BAS_SEKOLAH_SEWA'
  | 'BAS_SEKOLAH_KPM'
  | 'VAN_KPM'
  | 'COASTER'
  | 'KENDERAAN_TENTERA'
  | 'KENDERAAN_POLIS'
  | 'KENDERAAN_GURU'
  | 'KENDERAAN_IBU_BAPA'

export type NisbahKategori = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g'

export type Ppd = {
  kod_ppd: string
  nama: string
  kod_jpn: string
  emel: string | null
  telefon: string | null
  aktif: boolean
}

export type Sekolah = {
  kod_sekolah: string
  nama: string
  jenis: string
  emel: string
  kod_ppd: string
  kod_jpn: string
  nama_guru_besar: string | null
  alamat: string | null
  poskod: string | null
  bandar: string | null
  negeri: string
  telefon: string | null
  faks: string | null
  aktif: boolean
  // Tandatangan Guru Besar dan cop milik sekolah, bukan akaun individu
  kunci_tandatangan_gb: string | null
  kunci_cop: string | null
}

export type Pegawai = {
  id: string
  user_id: string | null
  emel: string
  nama: string
  peranan: Peranan
  kod_skop: string | null
  jawatan: string | null
  telefon: string | null
  aktif: boolean
  dicipta_pada: string
  nama_pemohon: string | null
  kunci_tandatangan: string | null
  kunci_cop: string | null
  profil_dikemaskini_pada: string | null
  kata_laluan_ditetapkan: boolean
  didaftar_oleh: string | null
  didaftar_pada: string | null
  log_masuk_terakhir: string | null
  privasi_versi: string | null
  privasi_dipersetujui_pada: string | null
}

export type Permohonan = {
  id: string
  no_rujukan: string | null
  kod_sekolah: string
  kod_ppd: string
  kod_jpn: string
  status: Status
  kategori: Kategori | null
  tujuan: string | null
  pengangkutan: Pengangkutan[]
  nisbah_kategori: NisbahKategori
  ada_penginapan: boolean
  ada_risiko_tinggi: boolean
  ada_aktiviti_air: boolean
  anjuran_pihak_luar: boolean
  ada_anggota_keselamatan: boolean
  nama_penganjur_luar: string | null
  lawatan_berperingkat: boolean
  tarikh_mula: string | null
  tarikh_tamat: string | null
  masa_bertolak?: string | null
  tarikh_pulang?: string | null
  masa_pulang?: string | null
  tarikh_tiba?: string | null
  masa_tiba?: string | null
  kutipan_murid: number
  kutipan_guru: number
  sumber_lain: number
  sumber_lain_nota: string | null
  bil_murid: number
  bil_guru: number
  bil_bukan_guru: number
  justifikasi_nisbah: string | null
  dicipta_oleh: string | null
  dicipta_pada: string
  dihantar_pada: string | null
  diluluskan_pada: string | null
  dikemaskini_pada: string
  catatan_kembali: string | null
  sebab_batal: string | null
  dibatalkan_pada: string | null
  // Bahagian F — dibekukan semasa dihantar
  nama_guru_besar: string | null
  nama_pemohon: string | null
  kunci_tandatangan_gb: string | null
  kunci_cop_sekolah: string | null
}

export type Tempat = {
  id: string
  permohonan_id: string
  susunan: number
  tempat: string
  negeri: string | null
  negara: string
  tarikh_dari: string
  tarikh_hingga: string
  penginapan: string | null
}

export type Peringkat = {
  id: string
  permohonan_id: string
  susunan: number
  keterangan: string
  tarikh_dari: string
  tarikh_hingga: string
  bil_murid: number
}

export type Penaja = {
  id: string
  permohonan_id: string
  susunan: number
  nama_penaja: string
  jenis_tajaan: string | null
  jumlah: number
}

export type Peserta = {
  id: string
  permohonan_id: string
  kategori: PesertaKategori
  susunan: number
  nama: string
  kp: string | null
  no_sijil_lahir: string | null
  pasport: string | null
  jantina: string | null
  tahun_tingkatan: string | null
  jawatan: string | null
  alamat: string | null
  telefon: string | null
  catatan: string | null
}

export type JenisDokumen = {
  kod: string
  nama: string
  kumpulan: string
  bil_salinan: number
  perlu_sah_kj: boolean
  dijana_sistem: boolean
  syarat: Record<string, string[]>
  susunan: number
  aktif: boolean
}

export type Dokumen = {
  id: string
  permohonan_id: string
  jenis_dokumen: string
  nama_fail: string
  kunci_r2: string
  saiz: number
  jenis_mime: string | null
  cincangan_sha256: string
  dimuat_naik_oleh: string | null
  dimuat_naik_pada: string
}

export type Kelulusan = {
  id: string
  permohonan_id: string
  peringkat: Status
  bahagian: string | null
  pegawai_id: string | null
  nama_pegawai: string
  jawatan_pegawai: string | null
  peranan: Peranan
  tindakan: Tindakan
  catatan: string | null
  pintasan_admin: boolean
  tarikh_tindakan: string
  kunci_tandatangan: string | null
  kunci_cop: string | null
  /** Perkara yang ditanda penyemak; null di luar peringkat semakan. */
  semakan: ItemSemakan[] | null
  /** Pegawai asal yang dipangku ketika tindakan diambil. */
  pemangku_bagi: string | null
}

export type ItemSemakan = { kod: string; label: string }

export type LaporanPasca = {
  permohonan_id: string
  ringkasan: string
  bil_hadir_murid: number
  bil_hadir_guru: number
  ada_insiden: boolean
  butiran_insiden: string | null
  cadangan: string | null
  dihantar_oleh: string | null
  dihantar_pada: string
  nama_guru_besar: string | null
  kunci_tandatangan_gb: string | null
  kunci_cop_sekolah: string | null
}

export type LogAudit = {
  id: number
  permohonan_id: string | null
  no_rujukan: string | null
  pegawai_id: string | null
  emel_pegawai: string | null
  peristiwa: string
  nilai_lama: Record<string, unknown> | null
  nilai_baharu: Record<string, unknown> | null
  masa: string
}

export type NisbahKiraan = {
  kategori: string
  nisbah: string
  had_pengecualian: string
  perlu: number
  had_terendah: number
  ada: number
  sah: boolean
  perlu_justifikasi: boolean
  disekat: boolean
}

export type Kelengkapan = {
  boleh_hantar: boolean
  ralat: string[]
  amaran: string[]
  nisbah: NisbahKiraan
}

export type PermohonanRingkas = {
  /** Diperoleh daripada rekod laporan sebenar dalam skop RLS. */
  laporan_dihantar?: boolean
  id: string
  no_rujukan: string | null
  status: Status
  kategori: Kategori | null
  tujuan: string | null
  tarikh_mula: string | null
  tarikh_tamat: string | null
  bil_murid: number
  bil_guru: number
  bil_bukan_guru: number
  jumlah_a: number
  jumlah_b: number
  kod_sekolah: string
  nama_sekolah: string
  kod_ppd: string
  nama_ppd: string | null
  dihantar_pada: string | null
  diluluskan_pada: string | null
  dicipta_pada: string
  dikemaskini_pada: string
  catatan_kembali: string | null
  kod_qr: string | null
  status_sejak: string
  /** Hari bekerja di peringkat semasa; null jika tidak menunggu tindakan. */
  hari_menunggu: number | null
  had_hari: number | null
}

export type Notifikasi = {
  id: number
  pegawai_id: string
  permohonan_id: string | null
  jenis: string
  tajuk: string
  mesej: string
  pautan: string | null
  dicipta_pada: string
  dibaca_pada: string | null
}

export type StatusPemangkuan = 'AKTIF' | 'AKAN_DATANG' | 'TAMAT' | 'DIBATALKAN'

export type Pemangkuan = {
  id: string
  pegawai_asal: string
  nama_asal: string
  jawatan_asal: string | null
  peranan_asal: Peranan
  pemangku: string
  nama_pemangku: string
  jawatan_pemangku: string | null
  tarikh_mula: string
  tarikh_tamat: string
  sebab: string | null
  status: StatusPemangkuan
}

/** Pengesah yang sedang dipangku oleh pengguna semasa. */
export type PemangkuanAktif = {
  pegawai_asal: string
  nama: string
  jawatan: string | null
  peranan: Peranan
  kod_skop: string | null
  tarikh_tamat: string
}

export type LawatanKalendar = {
  id: string
  no_rujukan: string | null
  status: Status
  kategori: Kategori | null
  tujuan: string | null
  tarikh_mula: string
  tarikh_tamat: string | null
  kod_sekolah: string
  nama_sekolah: string
  kod_ppd: string
  nama_ppd: string | null
  bil_murid: number
  bil_guru: number
  bil_bukan_guru: number
  tempat: { tempat: string; negeri: string | null; negara: string; tarikh_dari: string; tarikh_hingga: string }[]
  ketua: { nama: string; telefon: string | null } | null
}
