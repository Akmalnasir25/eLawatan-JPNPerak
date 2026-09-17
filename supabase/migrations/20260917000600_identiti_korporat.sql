-- ════════════════════════════════════════════════════════════════════
-- eLAWATAN Perak — Identiti Korporat dan Format Surat Rasmi
-- ════════════════════════════════════════════════════════════════════

-- Maklumat jabatan: medan tambahan untuk kepala surat dan kaki laman.
-- Nilai alamat, telefon dan e-mel dalam migrasi 4 adalah SEMENTARA —
-- sahkan dengan JPN Perak dan kemas kini melalui Panel Pentadbir.
update tetapan
   set nilai = jsonb_build_object(
         'nama',        coalesce(nilai ->> 'nama', 'Jabatan Pendidikan Negeri Perak'),
         'nama_ringkas', 'JPN Perak',
         'kementerian', 'Kementerian Pendidikan Malaysia',
         'sektor',      coalesce(nilai ->> 'sektor', 'Sektor Pengurusan Sekolah'),
         'alamat',      coalesce(nilai ->> 'alamat', ''),
         'telefon',     coalesce(nilai ->> 'telefon', ''),
         'faks',        '',
         'emel',        coalesce(nilai ->> 'emel', ''),
         'laman_web',   'https://jpnperak.moe.gov.my'
       ),
       nota = 'Kepala surat, kaki laman dan halaman awam. Sahkan setiap medan dengan JPN Perak.'
 where kunci = 'maklumat_jpn';

insert into tetapan (kunci, nilai, nota, dikunci) values
  ('slogan_surat',
   '["MALAYSIA MADANI", "BERKHIDMAT UNTUK NEGARA"]',
   'Slogan di hujung surat rasmi, sebelum "Saya yang menjalankan amanah". Ikut pekeliling semasa.',
   false)
on conflict (kunci) do nothing;

-- Halaman log masuk dan pengesahan QR dibuka sebelum log masuk;
-- hanya maklumat awam jabatan didedahkan.
create policy tetapan_baca_awam on tetapan
  for select to anon
  using (kunci in ('maklumat_jpn', 'slogan_surat'));

grant select on tetapan to anon;
