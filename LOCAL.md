# Ujian local eLAWATAN

Checkpoint: 17 September 2026, selepas restart dan ujian Supabase local.

## Semakan sebelum commit — 19 September 2026

- Sintaks skrip PowerShell dan `ujian/local-smoke.mjs` lulus.
- Ujian R2: 4/4 lulus; semakan jenis semua Edge Functions lulus.
- Suite pangkalan data terkini: 192/209 lulus, 17 gagal dengan
  `gen_random_bytes(integer) does not exist` dalam fungsi kelulusan empat
  argumen. Migrasi pgcrypto di bawah membetulkan fungsi tiga argumen lama;
  ia belum menyelesaikan laluan empat argumen yang ditambah kemudian.
- Backend Docker/OTP/storan sebenar dan skrip permulaan tidak dijalankan
  semula dalam semakan ini. Bukti 17 September di bawah ialah rekod sejarah,
  bukan pengesahan keadaan runtime semasa. Tiada deployment dibuat.

## Cara guna sekarang

- Aplikasi: http://127.0.0.1:5173
- Peti e-mel OTP ujian (Mailpit): http://127.0.0.1:55324
- Supabase Studio: http://127.0.0.1:55323

Buka Docker Desktop, kemudian jalankan dari akar projek:

```powershell
.\infra\mula-local.ps1
npm.cmd run dev -- --host 127.0.0.1
```

Skrip menyalin input runtime ke `%LOCALAPPDATA%\eLawatan-local` kerana
Docker tidak dapat membaca bind mount pemacu D: yang dikesan sebagai
removable. Fail sumber kekal di repositori. Skrip menggunakan CLI 2.117.0,
menghidupkan Supabase, menggunakan migrasi tertunggak pada database local,
menyediakan bucket private dan menulis `.env` frontend dengan anon key sahaja.
Jangan sunting salinan runtime; selepas menukar fungsi atau konfigurasi,
hentikan stack secara biasa dan jalankan skrip semula.

Untuk hentikan backend dengan data dikekalkan:

```powershell
npx.cmd --yes supabase@2.117.0 stop
```

Port projek ialah 55320–55324 kerana Windows menempah julat 54280–54379.
Storan local diaktifkan dalam salinan konfigurasi sahaja. R2 kekal laluan
lalai apabila `STORAN_LOCAL_URL` tidak ditetapkan. Tiada key R2 diperlukan
untuk ujian ini. Bucket `elawatan-dokumen-local` adalah private; pautan
dikeluarkan selepas semakan keizinan server. Pautan upload local sah dua
jam (API Supabase); pautan lihat lima minit. R2 kekal 15 minit untuk upload.

## Bukti checkpoint 17 September 2026 (sejarah)

- Docker Linux 29.8.0 dan WSL 2 disahkan berjalan.
- Migrasi, seed, Auth, Edge Functions dan Storage berjalan pada Supabase local.
- Log masuk OTP sekolah berjaya melalui Chrome dan Mailpit; identiti ABA1234 betul.
- `node ujian/local-smoke.mjs` lulus: OTP empat peranan, draf, dokumen
  PUT/GET/padam, bucket private, sekatan anon/PPD luar skop, hantar,
  semak PPD, sah PPD, QR anon dan sekatan padam selepas penghantaran.
- Surat kelulusan contoh dibuka dalam pelayar; nombor rujukan dan QR dipaparkan.
- Rekod pengguna/sesi kekal selepas stop/start backend semasa pembetulan mount.
- `npm.cmd run build`: lulus. `npm.cmd run ujian:db`: 47/47 lulus.
- `npm.cmd run ujian:fn`: 4/4 lulus. `npm.cmd run semak:fn`: lulus.
- Skrip mula local dijalankan semula pada stack aktif: lulus, tiada reset data.

Ujian smoke mencipta rekod bertajuk `UJIAN LOCAL` dan mengekalkannya untuk
semakan. Ia hanya menerima URL `http://127.0.0.1:55321`, menggunakan OTP
Mailpit serta sesi pengguna sebenar, bukan service-role bagi aliran permohonan.
Tunggu sekurang-kurangnya 60 saat sebelum mengulang untuk mematuhi had OTP.

Pepijat yang ditemui: `tindakan_kelulusan` tidak mencari schema `extensions`
tempat Supabase memasang pgcrypto. Migrasi `20260917000100_laluan_pgcrypto.sql`
membetulkan search_path. Fixture PGlite turut meniru lokasi pgcrypto ini.

Belum disahkan: keseluruhan wizard enam langkah melalui klik manual,
peranti telefon sebenar, cetakan fizikal/PDF berbilang halaman, ketahanan
fail selepas restart storan, serta integrasi Supabase/R2 cloud.

## Skop dipersetujui

Jalankan frontend dan backend pada komputer pembangunan menggunakan data
contoh sahaja. Tiada deployment cloud atau perubahan data production.
Supabase local menyediakan Postgres, Auth, peti e-mel OTP ujian dan Edge
Functions. Muat naik dokumen juga perlu disediakan secara local; kod semasa
masih menggunakan Cloudflare R2.

## Status sebelum restart (sejarah)

- WSL 2.7.14 dipasang dan versinya disahkan.
- Supabase CLI 2.117.0 tersedia melalui `npx.cmd --yes supabase@2.117.0`.
- Virtual Machine Platform diaktifkan melalui DISM dengan `/norestart`.
  Kod keluar **3010**: Windows perlu direstart sebelum meneruskan.
- Docker Desktop dikemas kini ke 4.91.0 di `%LOCALAPPDATA%\Programs\DockerDesktop`;
  pemasang selesai dengan kod 0. Engine belum disahkan berjalan.
- Frontend belum mempunyai `.env` yang sah. Pelayan Vite hidup sahaja tidak
  membuktikan aplikasi boleh digunakan.

## Pelan asal selepas restart (rujukan)

1. Buka Docker Desktop dan sahkan engine Linux berjalan.
2. Jalankan `npx.cmd --yes supabase@2.117.0 start` dari akar projek.
   Semak keserasian konfigurasi CLI, migrasi dan seed; jangan abaikan health check.
3. Ambil URL API dan anon key **local** daripada status CLI untuk `.env`.
   Tetapkan `VITE_URL_SISTEM=http://127.0.0.1:5173`.
   Jangan letakkan service-role key dalam frontend.
4. Hidangkan empat Edge Functions local. Sahkan `daftar-semak` dan OTP melalui
   peti e-mel ujian; jangan hantar OTP ke alamat e-mel sebenar.
5. Sediakan storan dokumen local dengan perubahan minimum, sambil mengekalkan
   semakan keizinan server dan laluan R2 sedia ada. Pelaksanaan ini masih belum dibuat.
6. Jalankan `npm.cmd run dev -- --host 127.0.0.1` dan uji dalam pelayar.

## Akaun contoh daripada seed.sql

| Peranan | E-mel |
|---|---|
| Sekolah | aba1234@moe-dl.edu.my |
| Penyemak PPD | ppd.ku.pegawai@moe.gov.my |
| Pengesah PPD | ppd.ku.ketua@moe.gov.my |
| Penyemak JPN | jpn.pegawai@moe.gov.my |
| Pengesah JPN | jpn.pengarah@moe.gov.my |
| Pentadbir | admin.elawatan@moe.gov.my |

## Kriteria siap

- Log masuk OTP local berjaya, peranan dan sekolah sepadan dengan seed.
- Draf boleh disimpan, dibuka semula dan dihantar selepas lengkap.
- Dokumen boleh dimuat naik, dilihat dan dipadam mengikut keizinan.
- PPD boleh menyemak dan mengesahkan permohonan contoh dalam daerah.
- Cetakan dan pengesahan QR boleh dibuka.
- Data kekal selepas backend dihentikan dan dihidupkan semula.
- Build dan ujian berkaitan lulus selepas perubahan.

Aliran backend penuh local kini diuji melalui skrip integrasi; ujian UI
setakat log masuk, dashboard dan halaman surat. Jangan jalankan `db reset` selepas CikguIK
mula mengisi data ujian tanpa persetujuan kerana ia memadam data local.
