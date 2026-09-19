/** Salinan rujukan Perak sahaja. Jangan menjana tahun baharu daripada pola tahun lama. */
export const TAHUN_CUTI = [2026] as const
export const TARIKH_SEMAKAN_CUTI = '2026-09-19'
export const SUMBER_CUTI = {
  api: { nama: 'Malaysia Calendar API — rekod diterima admin', url: 'https://github.com/Junhui20/malaysia-calendar-api' },
  umum: { nama: 'Hari Kelepasan Am 2026 — BKPP JPM', url: 'https://www.kabinet.gov.my/storage/2025/08/HKA-2026.pdf' },
  sekolah: { nama: 'Kalendar Akademik 2026 — KPM (Kumpulan B)', url: 'https://www.moe.gov.my/storage/files/shares/Takwim/Takwim%20Persekolahan/Kalendar%20Akademik%202026.pdf' },
  sekolahLama: { nama: 'Kalendar Akademik 2025/2026 (Pindaan) — KPM', url: 'https://www.moe.gov.my/storage/files/shares/Takwim/Takwim%20Persekolahan/Kalendar%20Akademik%202025_2026%20%28Pindaan%29.pdf' },
  tambahanSekolah: { nama: 'Cuti tambahan sekolah 18 Mac 2026 — KPM', url: 'https://www.moe.gov.my/storage/files/shares/Kenyataan%20Media/KM2026/KM%20KPM%20Berhubung%20Cuti%20Tambahan%20Bersempena%20Hari%20Raya%20Aidilfitri.pdf' },
  tambahanUmum: { nama: 'Warta cuti tambahan Hari Raya 2026 — JPM', url: 'https://www.kabinet.gov.my/storage/2026/03/PUB-111_2026.pdf' },
  gantian: { nama: 'Makluman cuti gantian — BKPP JPM', url: 'https://www.kabinet.gov.my/' },
} as const

export type CutiKalendar = {
  nama: string
  mula: string
  tamat: string
  jenis: 'umum' | 'sekolah'
  sumber: keyof typeof SUMBER_CUTI
}

const cutiUmum: [string, string, CutiKalendar['sumber']?][] = [
  ['2026-01-01', 'Tahun Baharu'],
  ['2026-02-01', 'Hari Thaipusam'],
  ['2026-02-02', 'Cuti gantian Hari Thaipusam'],
  ['2026-02-17', 'Tahun Baharu Cina'],
  ['2026-02-18', 'Tahun Baharu Cina (Hari Kedua)'],
  ['2026-03-07', 'Nuzul Al-Quran'],
  ['2026-03-20', 'Cuti tambahan Hari Raya Aidilfitri', 'tambahanUmum'],
  ['2026-03-21', 'Hari Raya Aidilfitri'],
  ['2026-03-22', 'Hari Raya Aidilfitri (Hari Kedua)'],
  ['2026-03-23', 'Cuti gantian Hari Raya Aidilfitri'],
  ['2026-05-01', 'Hari Pekerja'],
  ['2026-05-27', 'Hari Raya Qurban'],
  ['2026-05-31', 'Hari Wesak'],
  ['2026-06-01', 'Hari Keputeraan Yang di-Pertuan Agong'],
  ['2026-06-02', 'Cuti gantian Hari Wesak', 'gantian'],
  ['2026-06-17', 'Awal Muharam'],
  ['2026-08-25', 'Maulidur Rasul'],
  ['2026-08-31', 'Hari Kebangsaan'],
  ['2026-09-16', 'Hari Malaysia'],
  ['2026-11-06', 'Hari Keputeraan Sultan Perak'],
  ['2026-11-08', 'Hari Deepavali'],
  ['2026-11-09', 'Cuti gantian Hari Deepavali'],
  ['2026-12-25', 'Hari Krismas'],
]

const cutiSekolah: [string, string, string, CutiKalendar['sumber']?][] = [
  ['2026-01-01', '2026-01-11', 'Cuti akhir persekolahan sesi 2025/2026', 'sekolahLama'],
  ['2026-02-16', '2026-02-16', 'Cuti perayaan Tahun Baharu Cina'],
  ['2026-02-19', '2026-02-20', 'Cuti perayaan Tahun Baharu Cina'],
  ['2026-03-18', '2026-03-18', 'Cuti tambahan sekolah Hari Raya Aidilfitri', 'tambahanSekolah'],
  ['2026-03-19', '2026-03-20', 'Cuti perayaan Hari Raya Aidilfitri'],
  ['2026-03-21', '2026-03-29', 'Cuti Penggal 1'],
  ['2026-05-23', '2026-06-07', 'Cuti Pertengahan Tahun'],
  ['2026-08-29', '2026-09-06', 'Cuti Penggal 2'],
  ['2026-11-10', '2026-11-10', 'Cuti perayaan Deepavali'],
  ['2026-12-05', '2026-12-31', 'Cuti Akhir Persekolahan'],
]

export const CUTI_PERAK: CutiKalendar[] = [
  ...cutiUmum.map(([tarikh, nama, sumber = 'umum']) => ({ nama, mula: tarikh, tamat: tarikh, jenis: 'umum' as const, sumber })),
  ...cutiSekolah.map(([mula, tamat, nama, sumber = 'sekolah']) => ({ nama, mula, tamat, jenis: 'sekolah' as const, sumber })),
]

export const adaDataCuti = (tahun: number) => TAHUN_CUTI.some((t) => t === tahun)

/** Julat inklusif; tarikh ISO tempatan mengelakkan peralihan hari akibat zon masa. */
export function cutiPadaTarikh(tarikh: string): CutiKalendar[] {
  return CUTI_PERAK.filter((c) => c.mula <= tarikh && tarikh <= c.tamat)
}
