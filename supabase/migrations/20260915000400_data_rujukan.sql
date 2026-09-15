-- ════════════════════════════════════════════════════════════════════
-- eLAWATAN Perak — Data Rujukan
-- Sumber: SPI KPM Bil. 9/2023 (Lampiran C, D) dan
--         Senarai Semak Permohonan Lawatan Murid Sekolah BSS Pin.1/2023
-- ════════════════════════════════════════════════════════════════════

-- ── Lampiran C — nisbah pengiring kepada murid ──────────────────────

insert into nisbah_pengiring (kod, keterangan, bil_pengiring, bil_murid,
                              had_pengecualian, susunan) values
  ('a', 'Murid ketidakupayaan penglihatan (B1), ketidakupayaan fizikal, dan ketidakupayaan pelbagai', 1, 1, 3, 1),
  ('b', 'Murid ketidakupayaan penglihatan (rabun)', 1, 3, 4, 2),
  ('c', 'Murid ketidakupayaan pendengaran dan bermasalah pembelajaran', 1, 5, 7, 3),
  ('d', 'Murid ketidakupayaan pendengaran berbaki dan ketidakupayaan pertuturan', 1, 7, 10, 4),
  ('e', 'Murid prasekolah selain (a) hingga (d)', 1, 5, 7, 5),
  ('f', 'Murid sekolah rendah selain (a) hingga (d)', 1, 5, 7, 6),
  ('g', 'Murid sekolah menengah selain (a) hingga (d)', 1, 8, 10, 7)
on conflict (kod) do nothing;

-- ── Lampiran D — Bahagian Penyelaras lawatan antarabangsa ───────────

insert into bahagian_penyelaras (jenis_sekolah, bahagian) values
  ('Sekolah Harian / Sekolah Sukan Malaysia / Sekolah Seni Malaysia', 'Bahagian Sukan, Kokurikulum dan Kesenian'),
  ('Sekolah Berasrama Penuh', 'Bahagian Pengurusan Sekolah Berasrama Penuh'),
  ('Sekolah Menengah Agama / Sekolah Menengah Kebangsaan Agama', 'Bahagian Pendidikan Islam'),
  ('Kolej Vokasional dan Sekolah Menengah Teknik', 'Bahagian Pendidikan dan Latihan Teknikal Vokasional'),
  ('Sekolah Pendidikan Khas', 'Bahagian Pendidikan Khas'),
  ('Kolej Tingkatan Enam', 'Bahagian Pengurusan Sekolah Harian'),
  ('Kolej Genius', 'Bahagian Genius'),
  ('Kolej Matrikulasi', 'Bahagian Matrikulasi'),
  ('Institut Pendidikan Guru', 'Institut Pendidikan Guru Malaysia'),
  ('Sekolah Swasta', 'Bahagian Pendidikan Swasta');

-- ── Pejabat Pendidikan Daerah, Perak ────────────────────────────────
-- SAHKAN kod rasmi dengan JPN Perak sebelum pelancaran.

insert into ppd (kod_ppd, nama, kod_jpn) values
  ('PRK-BP',  'PPD Batang Padang',              'A'),
  ('PRK-MJ',  'PPD Manjung',                    'A'),
  ('PRK-KU',  'PPD Kinta Utara',                'A'),
  ('PRK-KS',  'PPD Kinta Selatan',              'A'),
  ('PRK-KR',  'PPD Kerian',                     'A'),
  ('PRK-KK',  'PPD Kuala Kangsar',              'A'),
  ('PRK-LMS', 'PPD Larut, Matang dan Selama',   'A'),
  ('PRK-HP',  'PPD Hilir Perak',                'A'),
  ('PRK-PT',  'PPD Perak Tengah',               'A'),
  ('PRK-HU',  'PPD Hulu Perak',                 'A'),
  ('PRK-BD',  'PPD Bagan Datuk',                'A'),
  ('PRK-MU',  'PPD Muallim',                    'A'),
  ('PRK-KP',  'PPD Kampar',                     'A')
on conflict (kod_ppd) do nothing;

-- ── Senarai Semak BSS Pin.1/2023 — jenis dokumen ────────────────────

insert into jenis_dokumen
  (kod, nama, kumpulan, bil_salinan, perlu_sah_kj, dijana_sistem, syarat, susunan) values

-- Kumpulan Permohonan
  ('SURAT_IRINGAN', 'Surat iringan permohonan lawatan daripada sekolah kepada PPD/JPN',
   'PERMOHONAN', 1, false, false, '{}', 10),
  ('LAMPIRAN_A', 'Borang Permohonan Lawatan Murid Sekolah (Lampiran A)',
   'PERMOHONAN', 4, false, true, '{}', 20),
  ('KERTAS_KERJA', 'Kertas kerja lawatan / program',
   'PERMOHONAN', 1, false, false, '{}', 30),
  ('JADUAL_TENTATIF', 'Jadual tentatif lawatan yang lengkap',
   'PERMOHONAN', 1, false, false, '{}', 40),
  ('SURAT_KEBENARAN_PROGRAM', 'Surat kebenaran program daripada PPD/JPN/KPM',
   'PERMOHONAN', 1, false, false, '{"ciri":["anjuran_pihak_luar"]}', 50),

-- Kumpulan Kenderaan — bas/van persiaran dan bas sekolah sewa
  ('KEN_PENDAFTARAN', 'Salinan pendaftaran / pemilikan kenderaan',
   'KENDERAAN', 1, true, false,
   '{"pengangkutan":["BAS_PERSIARAN","VAN_PERSIARAN","BAS_SEKOLAH_SEWA"]}', 110),
  ('KEN_PERMIT', 'Permit kenderaan / lesen bas',
   'KENDERAAN', 1, true, false,
   '{"pengangkutan":["BAS_PERSIARAN","VAN_PERSIARAN","BAS_SEKOLAH_SEWA"]}', 120),
  ('KEN_KP_PEMANDU', 'Salinan kad pengenalan pemandu',
   'KENDERAAN', 1, true, false,
   '{"pengangkutan":["BAS_PERSIARAN","VAN_PERSIARAN","BAS_SEKOLAH_SEWA"]}', 130),
  ('KEN_LESEN_LVM', 'Salinan lesen memandu dan Lesen Vokasional Malaysia (LVM)',
   'KENDERAAN', 1, true, false,
   '{"pengangkutan":["BAS_PERSIARAN","VAN_PERSIARAN","BAS_SEKOLAH_SEWA"]}', 140),
  ('KEN_INSURANS', 'Salinan perlindungan insurans kenderaan',
   'KENDERAAN', 1, true, false,
   '{"pengangkutan":["BAS_PERSIARAN","VAN_PERSIARAN","BAS_SEKOLAH_SEWA"]}', 150),
  ('KEN_CUKAI_JALAN', 'Salinan cukai jalan kenderaan',
   'KENDERAAN', 1, true, false,
   '{"pengangkutan":["BAS_PERSIARAN","VAN_PERSIARAN","BAS_SEKOLAH_SEWA"]}', 160),
  ('KEN_PUSPAKOM', 'Salinan perakuan pemeriksaan kenderaan PUSPAKOM',
   'KENDERAAN', 1, true, false,
   '{"pengangkutan":["BAS_PERSIARAN","VAN_PERSIARAN","BAS_SEKOLAH_SEWA"]}', 170),

-- Kumpulan Kenderaan — kenderaan KPM / tentera / polis
  ('KEN_SURAT_KELULUSAN_UNIT',
   'Surat kelulusan penggunaan kenderaan daripada Unit Pentadbiran PPD/JPN',
   'KENDERAAN', 1, false, false,
   '{"pengangkutan":["BAS_SEKOLAH_KPM","VAN_KPM","COASTER","KENDERAAN_TENTERA","KENDERAAN_POLIS"]}', 180),

-- Kumpulan Kenderaan — kenderaan guru
  ('KEN_GURU_BORANG', 'Borang Kebenaran Penggunaan Kenderaan Sendiri Oleh Guru',
   'KENDERAAN', 1, false, false, '{"pengangkutan":["KENDERAAN_GURU"]}', 190),
  ('KEN_GURU_INSURANS_CUKAI', 'Salinan insurans dan cukai jalan kenderaan guru',
   'KENDERAAN', 1, false, false, '{"pengangkutan":["KENDERAAN_GURU"]}', 200),

-- Kumpulan Kenderaan — kenderaan ibu bapa
  ('KEN_IBUBAPA_AKUAN', 'Surat akuan penggunaan kenderaan ibu bapa',
   'KENDERAAN', 1, false, false, '{"pengangkutan":["KENDERAAN_IBU_BAPA"]}', 210),

-- Kumpulan Peserta
  ('SENARAI_MURID',
   'Senarai murid — nama, no. sijil lahir/KP, jantina, tahun/tingkatan, alamat, telefon',
   'PESERTA', 1, false, false, '{}', 310),
  ('SENARAI_GURU_PENGIRING', 'Senarai guru pengiring',
   'PESERTA', 1, false, false, '{}', 320),
  ('SENARAI_BUKAN_MURID', 'Senarai bukan murid (ibu bapa / individu)',
   'PESERTA', 1, false, false, '{"ciri":["ada_bukan_murid"]}', 330),
  ('SENARAI_ANGGOTA_KESELAMATAN', 'Senarai pengiring anggota keselamatan',
   'PESERTA', 1, false, false, '{"ciri":["ada_anggota_keselamatan"]}', 340),
  ('LAMPIRAN_B',
   'Lampiran B — borang kebenaran ibu bapa dan pengesahan kesihatan murid',
   'PESERTA', 1, false, false, '{}', 350),

-- Kumpulan Keselamatan
  ('INSURANS_MURID', 'Perlindungan insurans murid',
   'KESELAMATAN', 1, false, false, '{}', 410),
  ('BORANG_RISIKO', 'Borang penilaian risiko',
   'KESELAMATAN', 1, false, false,
   '{"ciri":["ada_penginapan","ada_risiko_tinggi"]}', 420),
  ('TAULIAH_PENYELAMAT_AIR',
   'Tauliah penyelamat air berkelayakan (Pingat Gangsa / Bronze Medallion, RLSS)',
   'KESELAMATAN', 1, false, false, '{"ciri":["ada_aktiviti_air"]}', 430),

-- Kumpulan Luar Negara
  ('BORANG_GURU_PENGIRING_LN', 'Borang Guru Pengiring Lawatan Murid Ke Luar Negara',
   'LUAR_NEGARA', 1, false, false, '{"kategori":["LUAR_NEGARA"]}', 510),
  ('SALINAN_PASPORT', 'Salinan pasport semua anggota rombongan',
   'LUAR_NEGARA', 1, false, false, '{"kategori":["LUAR_NEGARA"]}', 520)
on conflict (kod) do nothing;

-- ── Tetapan sistem ──────────────────────────────────────────────────

insert into tetapan (kunci, nilai, nota, dikunci) values

  ('tempoh_minimum',
   '{"DALAM_DAERAH":21,"ANTARA_DAERAH":30,"ANTARA_NEGERI":30,"LUAR_NEGARA":60}',
   'Hari minimum sebelum tarikh lawatan. Lampiran E dan F, SPI Bil. 9/2023.',
   false),

  ('laluan_kelulusan',
   '{"DALAM_DAERAH":["MENUNGGU_PPD_SEMAK","MENUNGGU_PPD_SAH"],
     "ANTARA_DAERAH":["MENUNGGU_PPD_SEMAK","MENUNGGU_PPD_SAH","MENUNGGU_JPN_SEMAK","MENUNGGU_JPN_SAH"],
     "ANTARA_NEGERI":["MENUNGGU_PPD_SEMAK","MENUNGGU_PPD_SAH","MENUNGGU_JPN_SEMAK","MENUNGGU_JPN_SAH"],
     "LUAR_NEGARA":["MENUNGGU_PPD_SEMAK","MENUNGGU_PPD_SAH","MENUNGGU_JPN_SEMAK","MENUNGGU_JPN_SAH","MENUNGGU_KPM"]}',
   'Terikat SPI Bil. 9/2023 — tidak boleh diubah dari antara muka.',
   true),

  ('had_fail',
   '{"saiz_maks_mb":10,"jenis_dibenar":["application/pdf","image/jpeg","image/png","image/webp"]}',
   'Had muat naik dokumen sokongan.',
   false),

  ('maklumat_jpn',
   '{"nama":"Jabatan Pendidikan Negeri Perak",
     "sektor":"Sektor Pengurusan Sekolah",
     "alamat":"Jalan Tun Abdul Razak, 30640 Ipoh, Perak Darul Ridzuan",
     "telefon":"05-501 5000",
     "emel":"jpnperak@moe.gov.my"}',
   'Kepala surat kelulusan dan cetakan rasmi.',
   false),

  ('syarat_kelulusan',
   '["Pihak sekolah hendaklah mematuhi sepenuhnya Surat Pekeliling Ikhtisas KPM Bil. 9 Tahun 2023.",
     "Nisbah guru pengiring kepada murid hendaklah dipatuhi sepanjang tempoh lawatan.",
     "Semua murid hendaklah mempunyai surat kebenaran ibu bapa/penjaga (Lampiran B) dan perlindungan insurans yang sah.",
     "Kenderaan yang digunakan hendaklah mempunyai permit, insurans, cukai jalan dan perakuan PUSPAKOM yang sah.",
     "Laporan lawatan (Lampiran G) hendaklah dikemukakan dalam tempoh tujuh (7) hari selepas lawatan tamat."]',
   'Lima syarat pada surat kelulusan.',
   false)

on conflict (kunci) do nothing;
