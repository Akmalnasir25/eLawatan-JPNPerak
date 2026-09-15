# Nota Sambung Kerja

Checkpoint: commit `bc26b9f` — 15 September 2026.
Baca `README.md` untuk cara pasang; fail ini hanya menyenaraikan
**apa yang tinggal**.

---

## Siap dan disahkan

| Lapisan | Keadaan |
|---|---|
| Skema Postgres (18 jadual, enum, indeks) | Siap · sintaks lulus parser Postgres |
| Enjin peraturan SQL (25 fungsi plpgsql) | Siap · lulus parser plpgsql |
| Row Level Security semua jadual | Siap |
| Data rujukan Lampiran C, D, Senarai Semak | Siap |
| Edge Functions (4) | Siap · **belum ditaip-semak** (Deno tiada pada mesin) |
| Antara muka React penuh | Siap · `tsc` lulus, `vite build` lulus |
| Cetakan Lampiran A, Senarai Semak, Surat QR, Lampiran G | Siap |
| Panel pentadbir 6 tab, laporan, pengesahan QR awam | Siap |

---

## Belum dibuat — mula di sini

1. **Jalankan terhadap Postgres sebenar.** Belum pernah berlaku. Mesin ini
   tiada Docker, jadi `supabase start` tidak dapat dijalankan. Langkah
   pertama sesi seterusnya: pasang Docker Desktop, kemudian

   ```bash
   npm run db:mula
   npm run db:set-semula
   ```

   Ini akan mendedahkan sebarang ralat semantik yang parser tidak dapat
   tangkap — nama lajur tersalah, jenis tidak padan, susunan pencetus.

2. **Ujian hujung-ke-hujung aliran kelulusan.** Log masuk sebagai
   `aba1234@moe-dl.edu.my` (sekolah), hantar permohonan, kemudian
   `ppd.ku.pegawai@moe.gov.my` → `ppd.ku.ketua@moe.gov.my`. Baca kod OTP
   di Inbucket, `http://localhost:54324`.

3. **Uji muat naik R2 sebenar.** Perlu bucket dan token sebenar. Titik
   paling mungkin gagal ialah tetapan CORS bucket — lihat
   `infra/r2-cors.json`.

4. **Taip-semak Edge Functions** dengan Deno:
   `deno check supabase/functions/**/*.ts`

5. **Notifikasi e-mel dan peringatan tarikh tutup** — Fasa 4 blueprint,
   belum disentuh langsung.

---

## Keputusan yang dibuat semasa membina

- **OTP e-mel Supabase Auth, bukan OTP buatan sendiri.** Supabase sudah
  mengendalikan penjanaan, tempoh luput dan had kadar, serta mengeluarkan
  JWT sebenar. OTP sendiri bermakna perlu mencipta sesi sendiri — risiko
  keselamatan yang tidak berbaloi.
- **Pendaftaran dan log masuk berkongsi satu skrin.** Aliran padanan
  senarai + OTP dalam spesifikasi sudah merangkumi kedua-duanya;
  `/daftar` hanya mengalih ke `/masuk`.
- **Peranan diberi melalui pencetus `handle_pengguna_baharu`.** Pegawai
  yang didaftarkan pentadbir dipautkan pada log masuk pertama; e-mel yang
  sepadan senarai sekolah menjadi akaun sekolah secara automatik; e-mel
  lain tidak mendapat baris `pegawai` langsung dan dihalang masuk.
- **Senarai murid penuh dimuat naik sebagai dokumen**, tidak dimasukkan
  baris demi baris — selaras Lampiran A D2.
- **Kod PPD `PRK-KU`, `PRK-KS` dan seterusnya adalah rekaan sementara.**
  Mesti diganti dengan kod rasmi JPN Perak sebelum sebarang rintis.
