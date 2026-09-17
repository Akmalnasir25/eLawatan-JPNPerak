-- ════════════════════════════════════════════════════════════════════
-- eLAWATAN Perak — Maklumat Hubungan JPN Perak Terkini
-- ════════════════════════════════════════════════════════════════════

-- Menggantikan nilai sementara dalam migrasi 4. Medan lain dikekalkan.
update tetapan
   set nilai = nilai || jsonb_build_object(
         'alamat',    'Persiaran Meru Utama, Bandar Meru Raya, 30020 Ipoh, Perak Darul Ridzuan',
         'telefon',   '05-525 6000',
         'emel',      'jpn.perak@moe.gov.my',
         'laman_web', 'https://jpnperak.moe.gov.my'
       )
 where kunci = 'maklumat_jpn';
