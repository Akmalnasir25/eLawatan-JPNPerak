-- ════════════════════════════════════════════════════════════════════
-- Data ujian untuk pembangunan setempat sahaja.
-- Dijalankan automatik oleh `supabase db reset`.
-- JANGAN jalankan pada projek pengeluaran.
-- ════════════════════════════════════════════════════════════════════

insert into sekolah (kod_sekolah, nama, jenis, emel, kod_ppd, nama_guru_besar,
                     alamat, poskod, bandar, telefon) values
  ('ABA1234', 'SK Seri Kinta', 'RENDAH', 'aba1234@moe-dl.edu.my', 'PRK-KU',
   'Tuan Haji Zulkifli bin Ahmad', 'Jalan Sultan Idris Shah', '30000', 'Ipoh', '05-2551234'),
  ('ABB5678', 'SK Taman Cempaka', 'RENDAH', 'abb5678@moe-dl.edu.my', 'PRK-KU',
   'Puan Norhayati binti Ismail', 'Jalan Cempaka 3', '31400', 'Ipoh', '05-5471234'),
  ('AEA9012', 'SMK Raja Perempuan Taayah', 'MENENGAH', 'aea9012@moe-dl.edu.my', 'PRK-KS',
   'Tuan Ramlan bin Hussin', 'Jalan Raja Musa Aziz', '30300', 'Ipoh', '05-2411234'),
  ('ABC3456', 'SK Sungai Siput', 'RENDAH', 'abc3456@moe-dl.edu.my', 'PRK-KK',
   'Puan Siti Aminah binti Othman', 'Jalan Besar', '31100', 'Sungai Siput', '05-5981234')
on conflict (kod_sekolah) do nothing;

-- Pegawai didaftarkan terlebih dahulu oleh pentadbir.
-- Baris dipautkan kepada auth.users secara automatik pada log masuk pertama.
insert into pegawai (emel, nama, peranan, kod_skop, jawatan) values
  ('admin.elawatan@moe.gov.my', 'Pentadbir Sistem eLAWATAN', 'admin', null,
   'Penyelaras ICT, Sektor Pengurusan Sekolah'),

  ('ppd.ku.pegawai@moe.gov.my', 'Encik Hafiz bin Sulaiman', 'ppd_pegawai', 'PRK-KU',
   'Pegawai Unit Pengurusan Sekolah'),
  ('ppd.ku.ketua@moe.gov.my', 'Tuan Haji Mohd Razali bin Yusof', 'ppd_ketua', 'PRK-KU',
   'Pegawai Pendidikan Daerah Kinta Utara'),

  ('ppd.ks.pegawai@moe.gov.my', 'Puan Farah binti Kamarudin', 'ppd_pegawai', 'PRK-KS',
   'Pegawai Unit Pengurusan Sekolah'),
  ('ppd.ks.ketua@moe.gov.my', 'Tuan Azman bin Daud', 'ppd_ketua', 'PRK-KS',
   'Pegawai Pendidikan Daerah Kinta Selatan'),

  ('jpn.pegawai@moe.gov.my', 'Puan Rohana binti Abdullah', 'jpn_pegawai', 'A',
   'Penolong Pengarah, Sektor Pengurusan Sekolah'),
  ('jpn.pengarah@moe.gov.my', 'Dato Haji Ismail bin Mat Zin', 'jpn_pengarah', 'A',
   'Pengarah Pendidikan Negeri Perak'),

  ('kpm.penyelaras@moe.gov.my', 'Encik Shahrul bin Nizam', 'kpm', null,
   'Ketua Penolong Pengarah, Bahagian Sukan, Kokurikulum dan Kesenian')
on conflict (emel) do nothing;
