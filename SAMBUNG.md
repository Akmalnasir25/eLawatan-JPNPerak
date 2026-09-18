# Nota Sambung Kerja

Kemas kini terakhir: 18 September 2026.
Baca `README.md` untuk cara pasang; fail ini hanya menyenaraikan
**apa yang tinggal**.

## Notifikasi, had masa, pemangku, privasi, kalendar, bantuan (migrasi 12–17)

- **Sunting pegawai** (migrasi 12): pendaftar membetulkan nama, jawatan
  dan e-mel (e-mel hanya sebelum log masuk pertama).
- **Notifikasi**: pencetus status → loceng dalam sistem + baris gilir e-mel
  (`hantar-notifikasi`, Resend). Peringatan harian `jana_peringatan()`:
  lewat, eskalasi, tarikh akhir hantar, laporan pasca — tanpa pendua.
- **Had masa**: `status_sejak`, hari bekerja tolak `cuti_umum`; lencana
  pada semua senarai; amaran pada papan pemuka.
- **Pemangku**: hanya pengesah (KPPD, Pengarah); pemangku = penyemak
  pejabat sama; "b.p." + cop pejabat; asingan tugas dikuatkuasa di DB dan
  diterangkan di skrin.
- **Privasi**: pintu persetujuan versi, halaman `/privasi`, tempoh
  simpanan + anonimkan rekod luput.
- **Kalendar** (`/kalendar`) dan **Pusat Bantuan** (`/bantuan`).
- 144/144 ujian Postgres lulus (30 baharu); `hantar-notifikasi` lulus
  `deno check`; semua aliran di atas disahkan dalam Chrome pada mod demo.

**Belum:** jadual pg_cron dan penghantaran e-mel sebenar (perlu projek
Supabase + kunci Resend — lihat README §13); senarai cuti umum; semakan
kandungan notis privasi oleh JPN.

---

## Akaun pegawai, kata laluan dan sekatan (migrasi 11)

- **Urus Pegawai** pada bar navigasi: pendaftar melihat akaun dalam skopnya
  sahaja, mendaftarkan pegawai penyemak tanpa had bilangan, dan
  menyahaktifkan akaun. `daftar_pegawai()` memaksa kod skop daripada akaun
  pendaftar; hanya pentadbir boleh menaipnya sendiri.
- **Log masuk kali pertama**: e-mel → OTP → cipta kata laluan → terus masuk.
  Log masuk seterusnya menggunakan kata laluan; *Lupa kata laluan*
  mengulangi laluan OTP. Akaun lama yang dahulunya OTP sahaja diarahkan
  mencipta kata laluan pada log masuk berikutnya.
- **Sekatan sementara**: 5 percubaan gagal dalam 15 minit menyekat e-mel
  selama 15 minit, disemak dalam Edge Function `log-masuk` sebelum kata
  laluan diuji, jadi kata laluan betul pun ditolak semasa disekat.
  Nilai dalam `tetapan` → `sekatan_log_masuk`. Jadual `cubaan_masuk`
  mempunyai RLS hidup tanpa sebarang dasar — peranan perkhidmatan sahaja.
- **Kata laluan**: minimum 12 aksara, tidak boleh mengandungi nama e-mel,
  dan disemak terhadap Have I Been Pwned secara k-anonymity (hanya lima
  aksara cincangan SHA-1 dihantar). Pentadbir tidak pernah boleh melihat
  atau menetapkan kata laluan sesiapa — `tetap-kata-laluan` hanya menyentuh
  pemilik token.
- **Tandatangan Guru Besar dan cop kini milik `sekolah`**, bukan akaun
  individu, supaya pengguna sekolah kedua mewarisi imej yang sama.
- 109/109 ujian Postgres lulus (19 ujian baharu), tujuh Edge Function lulus
  `deno check`, dan aliran penuh disahkan dalam Chrome tanpa kepala:
  daftar → OTP → cipta kata laluan → log masuk → 5 kali gagal → disekat →
  lupa kata laluan → akaun dinyahaktifkan ditolak.

---

## Kemas kini Semua Permohonan — Tarikh Lawatan

- Lajur Tarikh kini Tarikh Lawatan, termasuk julat untuk lawatan beberapa hari.
- Susunan automatik: sedang berlangsung/hari ini, akan datang paling hampir,
  tarikh lepas paling terkini, kemudian tanpa tarikh. Carian, penapis dan eksport
  CSV menggunakan susunan yang sama.
- Kiraan hari menggunakan tarikh kalendar Asia/Kuala_Lumpur: Hari ini, Esok,
  N hari lagi, Sedang berlangsung atau Tarikh telah berlalu. Status ditolak,
  batal dan selesai tidak memaparkan countdown. Jingga hanya untuk permohonan
  menunggu dengan baki 0–7 hari.
- Halaman mengambil rekod berhalaman sebelum menyusun; tidak lagi terhad pada
  500 rekod paling baru dikemas kini. Skop capaian tetap ditentukan oleh RLS.
  Dashboard dan aliran kelulusan tidak berubah; tiada migrasi diperlukan.
- Build lulus; 81/81 ujian pada kandungan commit lulus, termasuk 9 ujian
  tarikh/pagination. Ujian visual pelayar belum dibuat.
  Cuba dengan refresh demo pada port 5500.

---

## Siap dan disahkan

| Lapisan | Keadaan |
|---|---|
| Skema, fungsi, RLS, data rujukan | **Dijalankan atas Postgres 18 sebenar** (PGlite) — 109 ujian lulus |
| Edge Functions (7) | Lulus `deno check`; tandatangan R2 lulus 4 ujian luar talian |
| Antara muka React penuh | `tsc` lulus, `vite build` lulus |
| Cetakan, panel pentadbir, laporan, pengesahan QR | Siap |
| Profil, tandatangan digital & cop rasmi (migrasi 5) | Diuji dalam pelayar: muat naik, SVG ditolak, cetakan F/G/penyemak/surat/senarai semak, pembekuan selepas imej dibuang, naik taraf pangkalan demo lama |
| Reka bentuk korporat sektor awam (migrasi 6) | Diuji dalam pelayar pada desktop dan telefon: log masuk, papan pemuka, borang, garis masa kelulusan, surat rasmi, pengesahan QR |
| Mod demo (`npm run demo`) | Diuji hujung-ke-hujung dalam Chrome tanpa kepala: OTP, borang, muat naik, kelulusan, cetakan, pentadbir, paparan telefon |

Jalankan semua semakan: `npm run ujian`

### Pepijat yang dijumpai oleh ujian Postgres sebenar

1. `semak_kelengkapan` — `v_ralat || 'teks'` ditafsir sebagai gabungan dua
   tatasusunan dan meletup dengan *malformed array literal*. Setiap draf
   yang tidak lengkap akan gagal dan bukannya memaparkan senarai ralat.
   Diganti dengan `array_append` (17 tempat).
2. `selaras_tarikh_permohonan` — merujuk `new` pada DELETE (dibetulkan
   sebelum checkpoint pertama, kini disahkan oleh ujian).
3. `daftar-semak` — ralat jenis pada data `ppd` yang dibenamkan.
4. Borang baharu mencipta **dua** draf setiap kali dibuka (kesan React
   berjalan semula) — dikawal dengan ref.
5. Kad permohonan melimpah keluar skrin telefon — `min-w-0` pada item grid.
6. Label medan borang tidak dipautkan kepada input (kebolehcapaian) —
   `Medan` kini menetapkan `htmlFor`/`id` secara automatik.
7. Senarai syarat pada surat kelulusan hilang nombor — `listStyle: decimal`.

---

## Belum dibuat — mula di sini

1. **Sambung ke projek Supabase sebenar.** Ikut README bahagian 4.
   Ujian PGlite meniru Supabase, bukan Supabase itu sendiri — perkara
   yang belum diuji: templat e-mel OTP, had kadar Auth, dan pemanggilan
   Edge Functions melalui gerbang Supabase.

2. **Uji muat naik R2 sebenar.** Perlu bucket dan token sebenar. Titik
   paling mungkin gagal ialah tetapan CORS bucket — lihat
   `infra/r2-cors.json`.

3. **Hantar e-mel sebenar kepada pegawai yang baru didaftarkan.**
   Sekarang pendaftar perlu memberitahu mereka secara manual bahawa akaun
   sudah dibuka. Notifikasi automatik tergolong dalam Fasa 4 di bawah.

4. **Notifikasi e-mel dan peringatan tarikh tutup** — Fasa 4 blueprint,
   belum disentuh.

5. **Logo rasmi dan maklumat jabatan.** Letak `public/logo-jabatan.png`
   dan sahkan alamat/telefon/e-mel JPN di Pentadbiran → Tetapan & Surat.
   Nilai sekarang adalah sementara.

---

## Keputusan yang dibuat semasa membina

- **OTP e-mel Supabase Auth, bukan OTP buatan sendiri.** Supabase sudah
  mengendalikan penjanaan, tempoh luput dan had kadar, serta mengeluarkan
  JWT sebenar. OTP sendiri bermakna perlu mencipta sesi sendiri — risiko
  keselamatan yang tidak berbaloi.
- **Pendaftaran dan log masuk berkongsi satu skrin.** Aliran padanan
  senarai + OTP dalam spesifikasi sudah merangkumi kedua-duanya;
  `/daftar` hanya mengalih ke `/masuk`.
- **Log masuk kata laluan melalui Edge Function, bukan terus dari pelayar.**
  Jika pelayar memanggil `signInWithPassword` sendiri, sekatan boleh
  dipintas dengan hanya tidak memanggil fungsi kiraan. `log-masuk`
  menyemak sekatan, mengesahkan kata laluan, merekod percubaan, kemudian
  memulangkan sesi — semuanya di pelayan.
- **Peranan diberi melalui pencetus `handle_pengguna_baharu`.** Pegawai
  yang didaftarkan pentadbir dipautkan pada log masuk pertama; e-mel yang
  sepadan senarai sekolah menjadi akaun sekolah secara automatik; e-mel
  lain tidak mendapat baris `pegawai` langsung dan dihalang masuk.
- **Senarai murid penuh dimuat naik sebagai dokumen**, tidak dimasukkan
  baris demi baris — selaras Lampiran A D2.
- **Kod PPD `PRK-KU`, `PRK-KS` dan seterusnya adalah rekaan sementara.**
  Mesti diganti dengan kod rasmi JPN Perak sebelum sebarang rintis.
