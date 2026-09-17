# Semakan Dokumen Sokongan

## Kemas kini log bersama

- Keputusan kekal mengikut giliran semakan (dipersetujui CikguIK). Pilihan
  keputusan tidak dipaparkan jika bukan giliran; status permohonan dan sebab
  kini dijelaskan pada senarai dokumen serta panel.
- Senarai menunjukkan jumlah pengguna yang pernah membuka versi fail itu,
  nama/peranan dan masa pembukaan terakhir, berasingan daripada status sendiri.
- Log bersama mengandungi pembukaan, keputusan dan catatan semua pengguna
  dalam skop. Dibaca semula apabila log dibuka; butang Muat semula log disediakan.
  Tiada langganan masa nyata. Pembacaan berhalaman mengelakkan sejarah terpotong
  pada had respons lalai. Respons bacaan tidak memadam rekod baharu dalam panel.
- 12 ujian semakan dokumen lulus, termasuk perkongsian rekod antara PPD/JPN
  dan sekatan di luar skop. Build lulus; UI pelayar belum disahkan bagi kemas kini ini.
- Tiada perubahan permission atau migrasi baharu. Dalam mod demo, perkongsian
  ini antara akaun demo dalam pangkalan pelayar yang sama; ia tidak menyegerak
  data antara komputer. Supabase sebenar berkongsi rekod melalui pangkalan server.

## Apa yang berubah

Sebelum ini butang Lihat membuka fail dalam tab baharu tanpa keputusan semakan
pada senarai dokumen. Kini butang Semak membuka panel dalam halaman yang sama:
catatan dan keputusan di atas, dokumen boleh ditatal di bawah, dan butang
Sebelumnya/Seterusnya untuk beralih fail. Butang Lihat digunakan bagi pengguna
yang tidak mempunyai giliran menyemak.

Skop dipersetujui: panel dalam halaman dengan pratonton boleh ditatal, catatan,
keputusan dan log versi dokumen. Putih = belum dibuka oleh pegawai semasa;
biru = dibuka; hijau = jelas dan patuh; jingga = perlu pembetulan.

- Keputusan hanya oleh penyemak PPD/JPN pada giliran semasa atau pentadbir.
- Catatan pembetulan wajib; catatan patuh pilihan (maksimum 2000 aksara).
- Identiti dan masa daripada pelayan; sejarah hanya baca dalam skop permohonan.
- Rekod ikut ID dan cincangan fail. Fail gantian tidak mewarisi keputusan lama.
- Rekod dibuka bermaksud fail berjaya diambil untuk panel, bukan bukti telah dibaca.
- Kegagalan muat fail tidak merekod pembukaan. Ralat simpan mengekalkan input.
- Fail PDF/imej boleh dipratonton; format lain disediakan untuk muat turun.
- Tindakan memperakukan/mengembalikan keseluruhan permohonan kekal berasingan.

## Cara rakan mencuba

1. Selepas pull, jalankan `npm install` jika dependency belum dikemas kini.
2. Jalankan `npm run demo -- --host 127.0.0.1 --port 5500 --strictPort`.
   Dalam PowerShell yang menyekat npm.ps1, gunakan `npm.cmd`.
3. Buka `http://127.0.0.1:5500/`. Jika demo sudah terbuka, muat semula halaman
   supaya migrasi baharu dijalankan; tidak perlu Set semula data.
4. Pilih Pegawai PPD Kinta Utara (penyemak) melalui baner demo dan buka
   permohonan yang menunggu semakan PPD.
5. Pada Dokumen Sokongan, tekan Semak. Isi catatan jika perlu dan pilih
   Jelas dan patuh atau Perlu pembetulan, kemudian tekan Simpan semakan.
6. Tutup panel untuk melihat warna baharu. Buka semula untuk melihat catatan
   tersimpan dan Log semakan; muat semula halaman untuk menyemak persistence.

Catatan tidak disimpan secara automatik. Panel meminta pengesahan sebelum
menutup/bertukar dokumen apabila ada perubahan belum disimpan. Memilih Perlu
pembetulan sahaja tidak mengembalikan keseluruhan permohonan kepada sekolah.

## Integrasi dan deployment

Migrasi `20260917001000_semakan_dokumen.sql` menambah jadual sejarah dan RPC.
Demo menjalankan migrasi pada muat semula; Supabase sebenar memerlukan migrasi
ini sebelum feature digunakan. Tiada migrasi cloud/production dijalankan.
Pemulihan UI: kembali ke versi kod sebelumnya; jadual baharu boleh dikekalkan
tanpa menjejaskan aliran lama. Jangan padam sejarah untuk rollback.

Pengesahan: build TypeScript/Vite, ujian DB bagi identiti/skop/giliran, catatan,
versi fail, retry dan log baca sahaja; pemeriksaan demo jika pelayar tersedia.

## Bukti pelaksanaan — 17 September 2026

- **Kandungan commit yang dihantar:** 72/72 ujian DB lulus pada salinan Git index
  yang berasingan daripada tetapan Supabase setempat. Termasuk 10 ujian feature ini.
- Build biasa dan build demo lulus; semakan TypeScript selepas pembetulan akhir lulus.
- 10/10 ujian semakan dokumen baharu lulus.
- **Working copy setempat berbeza:** 63/72 lulus; 9 kegagalan
  `gen_random_bytes(integer)` berlaku dengan fixture pgcrypto dalam schema
  `extensions`. Fixture dan migrasi local tersebut telah wujud sebelum feature
  ini dan tidak disertakan dalam commit. Ini bukan bukti bahawa konfigurasi
  Supabase sebenar lulus; aliran kelulusan di sana masih perlu diperiksa.
- Pemeriksaan kod bebas menemui race pemuatan rekod. Dibaiki dengan menunggu
  rekod siap dimuatkan sebelum memasang panel; kegagalan membaca sejarah
  menghalang simpan keputusan supaya catatan terdahulu tidak ditimpa.
- Vite port 5500 memberi HTTP 200 untuk modul panel baharu.
- Pemeriksaan visual/klik desktop dan telefon belum dapat dilakukan: tiada
  pelayar yang tersedia melalui alat kawalan sesi ini. Sokongan PDF terbina
  dalam bergantung pada pelayar; pilihan muat turun sentiasa disediakan.
- Muat semula demo untuk menjalankan migrasi baharu tanpa menetapkan semula data.
- Log baharu bermula apabila panel ini digunakan; log pautan lama tidak dianggap
  bukti semakan. Catatan semakan boleh dibaca oleh akaun dalam skop permohonan,
  termasuk sekolah berkenaan.
- CikguIK telah mencuba hasil pada demo dan menerima paparan sebelum push.

Fail utama: `src/komponen/SemakanDokumen.tsx` (panel/status),
`src/lib/semakan-dokumen.ts` (capaian data), migrasi `20260917001000` (log/RPC/RLS),
dan `ujian/semakan-dokumen.test.mjs` (ujian tingkah laku dan keizinan).
Semakan dokumen menggunakan jadual baharu; peristiwa pautan lama
`DOKUMEN_DILIHAT` dalam `log_audit` tidak diubah atau ditafsir semula.
