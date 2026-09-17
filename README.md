# eLAWATAN Perak — Sistem Sebenar

Sistem Permohonan dan Kelulusan Lawatan Murid Sekolah, Jabatan Pendidikan
Negeri Perak. Dibina menurut **Opsyen A** dalam `01-BLUEPRINT.md`:
Supabase Postgres untuk data, Cloudflare R2 untuk dokumen.

Dokumentasi dasar dan pitching kekal dalam `00-INDEKS.md` hingga
`05-SLAID-PITCHING.md`. Fail ini menerangkan **cara memasang dan
menjalankan sistem**.

---

## 1. Susunan Projek

```
├── src/                     Antara muka React 18 + TypeScript + Tailwind
│   ├── lib/                 Supabase, R2, jenis, istilah, capaian data
│   ├── komponen/            Rangka aplikasi dan komponen kongsi
│   ├── halaman/             Skrin sistem
│   │   └── langkah/         Borang enam langkah (Lampiran A)
│   └── cetak/               Lampiran A, Senarai Semak, Surat Kelulusan, Lampiran G
├── supabase/
│   ├── migrations/          Skema, fungsi, RLS, data rujukan
│   ├── functions/           Edge Functions (Deno)
│   ├── templates/           Templat e-mel OTP
│   ├── seed.sql             Data ujian setempat sahaja
│   └── config.toml
├── infra/r2-cors.json       Tetapan CORS bucket Cloudflare R2
└── .env.example
```

---

## 2. Prasyarat

| Perkakas | Versi | Nota |
|---|---|---|
| Node.js | 20 atau lebih baharu | Diuji pada 24 |
| npm | 10 atau lebih baharu | |
| Docker Desktop | terkini | **Hanya** untuk `supabase start` setempat |
| Akaun Supabase | — | Percuma memadai untuk rintis |
| Akaun Cloudflare | — | R2 memerlukan kad, tetapi 10 GB pertama percuma |

---

## 3. Cuba Dahulu — Mod Demo (tanpa akaun)

```bash
npm install
npm run demo             # http://localhost:5173
```

Postgres sebenar (PGlite) berjalan **dalam pelayar**, menjalankan migrasi
yang sama seperti pengeluaran. Semua peraturan, rantaian kelulusan dan RLS
berkelakuan seperti sistem sebenar. Tiada data dihantar ke mana-mana.

- Baner kuning di bawah skrin: **log masuk pantas** sebagai mana-mana
  peranan, dan **Set semula** untuk memadam data demo.
- Log masuk biasa pun berfungsi — kod OTP dipaparkan di penjuru kanan atas.
- Empat permohonan contoh disediakan dalam pelbagai status.
- Dokumen yang dimuat naik disimpan dalam IndexedDB pelayar, bukan R2.

Kod demo (`src/demo/`) hanya dimuatkan oleh `npm run demo`. Binaan
pengeluaran (`npm run build`) tidak mengandunginya langsung — alias
`#klien` dalam `vite.config.ts` memilih klien Supabase sebenar.

---

## 4. Sediakan Supabase

1. Buka `https://supabase.com/dashboard` → **New project**.
   Pilih wilayah **Singapore (ap-southeast-1)** — paling hampir.
2. Catat **Project URL** dan **anon key** dari *Settings → API*.
3. Pautkan repositori dan tolak skema:

```bash
npx supabase login
npx supabase link --project-ref <ref-projek-anda>
npm run db:tolak          # menjalankan keempat-empat migrasi
```

4. Dalam *Authentication → Providers*, pastikan **Email** dihidupkan
   dan **Confirm email** dimatikan (OTP menggantikannya).
5. Dalam *Authentication → Email Templates → Magic Link*, tampal
   kandungan `supabase/templates/otp.html`.
6. Dalam *Authentication → URL Configuration*, tetapkan Site URL kepada
   alamat sistem anda.

> **Data ujian.** `supabase/seed.sql` mengandungi empat sekolah dan lapan
> akaun pegawai contoh. Ia dijalankan automatik oleh `supabase db reset`
> pada pangkalan data setempat sahaja. **Jangan** jalankan pada projek
> pengeluaran — import senarai sebenar melalui Panel Pentadbir.

### Pentadbir pertama

Migrasi tidak mencipta sebarang akaun. Selepas skema ditolak, masukkan
baris pentadbir pertama melalui *SQL Editor* Supabase:

```sql
insert into pegawai (emel, nama, peranan, jawatan)
values ('nama.anda@moe.gov.my', 'Nama Penuh Anda', 'admin',
        'Penyelaras ICT, Sektor Pengurusan Sekolah');
```

Log masuk dengan e-mel itu; pencetus `handle_pengguna_baharu` akan
memautkan baris tersebut kepada akaun auth anda secara automatik.

---

## 5. Sediakan Cloudflare R2

1. Cloudflare Dashboard → **R2** → *Create bucket*, namakan
   `elawatan-dokumen`. Pilih lokasi **Asia-Pacific**.
2. *Manage R2 API Tokens* → **Create API token** dengan keizinan
   *Object Read & Write* pada bucket tersebut. Simpan
   **Access Key ID** dan **Secret Access Key**.
3. Catat **Account ID** dari halaman utama R2.
4. Tetapkan CORS bucket — *Settings → CORS Policy* — dengan kandungan
   `infra/r2-cors.json`. Gantikan domain pengeluaran dengan domain
   sebenar anda.

> Tanpa CORS yang betul, muat naik akan gagal dengan mesej
> *"Muat naik gagal. Semak sambungan internet dan tetapan CORS bucket R2."*

---

## 6. Rahsia

### Frontend

```bash
cp .env.example .env
```

Isi `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` dan `VITE_URL_SISTEM`.
Nilai `VITE_*` terdedah kepada pelayar — **jangan** letak service key
atau kunci R2 di sini.

### Edge Functions

```bash
cp supabase/functions/.env.example supabase/functions/.env
```

Untuk pengeluaran, tetapkan rahsia pada Supabase, bukan dalam fail:

```bash
npx supabase secrets set \
  R2_ACCOUNT_ID=... \
  R2_ACCESS_KEY_ID=... \
  R2_SECRET_ACCESS_KEY=... \
  R2_BUCKET=elawatan-dokumen \
  DOMAIN_DIBENARKAN=moe-dl.edu.my,moe.gov.my
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` dan `SUPABASE_SERVICE_ROLE_KEY`
disuntik automatik oleh platform.

---

## 7. Jalankan

```bash
npm install
npm run dev              # http://localhost:5173
```

Tabur Edge Functions:

```bash
npm run fn:tabur         # menabur kesemua lima fungsi
```

Bina untuk pengeluaran:

```bash
npm run build            # hasil dalam dist/
```

`dist/` ialah fail statik — boleh diletakkan pada Cloudflare Pages atau
terus dalam hosting JPN sedia ada. Pastikan pelayan mengarahkan semua
laluan yang tidak dijumpai kepada `index.html` (aplikasi satu halaman).

### Pembangunan setempat penuh (perlu Docker)

```bash
npm run db:mula          # Postgres + Auth + Studio + Inbucket
npm run db:set-semula    # migrasi + seed.sql
npm run fn:hidang        # Edge Functions setempat
```

E-mel OTP setempat boleh dibaca di Inbucket, `http://localhost:54324`.

### Ujian (tanpa Docker)

```bash
npm run ujian            # kesemua di bawah
npm run ujian:db         # 57 ujian aliran atas Postgres sebenar (PGlite)
npm run ujian:fn         # tandatangan pautan R2, tanpa rangkaian
npm run semak:fn         # taip-semak Edge Functions dengan Deno
```

`ujian:db` menjalankan migrasi dan `seed.sql` sebenar ke dalam Postgres
yang dikompil ke WASM, meniru skema `auth` Supabase, kemudian bertindak
sebagai setiap peranan dengan RLS berkuat kuasa. Tiada Docker diperlukan.
Deno dimuat turun automatik melalui npm pada kali pertama.

---

## 8. Cara Sistem Menguatkuasakan Dasar

| Peraturan | Tempat ia dikuatkuasakan |
|---|---|
| Skop daerah dan negeri | Dasar RLS pada `permohonan` dan jadual anak |
| Rantaian kelulusan berperingkat | `tindakan_kelulusan()` — menolak tindakan bukan pada giliran |
| Wajib melalui PPD | `status_seterusnya()` — tiada laluan melangkau |
| Tempoh minimum 21/30/60 hari | `semak_kelengkapan()`, boleh ubah dalam `tetapan` |
| Nisbah pengiring Lampiran C | `kira_nisbah()` — menyekat atau membuka Bahagian I |
| Dokumen wajib | `dokumen_diperlukan()` — dinilai daripada keadaan borang |
| Catatan wajib bagi Kembalikan dan Tolak | `tindakan_kelulusan()` |
| Log audit tidak boleh dipadam | Tiada dasar UPDATE atau DELETE pada `log_audit` |
| Permohonan dikunci selepas hantar | Pencetus `halang_sunting_selepas_hantar` |
| Domain e-mel KPM sahaja | `daftar-semak` + semakan pelayar |
| Tandatangan dan cop dibekukan pada saat tindakan | `tindakan_kelulusan()`, `hantar_permohonan()`, `hantar_laporan_pasca()` |
| Tiada sesiapa boleh guna tandatangan orang lain | `tetapkan_imej_profil()` — kunci mesti di bawah `profil/<id sendiri>/` |
| Pintasan pentadbir tidak mencetak tandatangan | `tindakan_kelulusan()` |

Antara muka memaparkan peraturan ini, tetapi **tidak** bergantung
kepadanya untuk keselamatan. Setiap satu dikuatkuasakan semula di
peringkat pangkalan data.

---

## 9. Perkara Yang Perlu Disahkan Sebelum Pelancaran

Diambil daripada `00-INDEKS.md`, dan kekal terbuka:

- [ ] **Kod PPD** dalam `20260915000400_data_rujukan.sql` adalah
      sementara (`PRK-KU`, `PRK-KS`, …). Ganti dengan kod rasmi JPN Perak.
- [ ] **Senarai sekolah** perlu diimport daripada pangkalan data rasmi
      JPN melalui Panel Pentadbir → Import Akaun.
- [ ] Label bahagian borang — sistem mengikut label edaran JPN Perak
      (F/G/H/I/J). Sahkan terhadap salinan PDF SPI.
- [ ] Senarai mansuh dalam SPI Bil. 9/2023.
- [ ] Penerimaan surat kelulusan berkod QR sebagai dokumen rasmi.
- [ ] Tempoh penyimpanan dan jadual pelupusan data peribadi murid —
      ditetapkan oleh JPN, bukan oleh pembangun.
- [ ] Subdomain di bawah `moe.gov.my`.

---

## 10. Profil, Tandatangan Digital dan Cop Rasmi

Setiap akaun mempunyai halaman **Profil** (menu atas, atau klik nama di
penjuru kanan).

| Akaun | Boleh ubah | Tandatangan dicetak pada |
|---|---|---|
| Sekolah | Nama Guru Besar, nama pemohon, telefon | Bahagian F (semasa dihantar), Lampiran G |
| Pegawai PPD / JPN (penyemak) | Nama, jawatan, telefon | "Disemak oleh" dalam Bahagian G / H |
| KPPD | Nama, jawatan, telefon | Bahagian G, Senarai Semak, surat kelulusan Dalam Daerah |
| Pengarah JPN | Nama, jawatan, telefon | Bahagian H, surat kelulusan Antara Daerah/Negeri |
| Bahagian Penyelaras KPM | Nama, jawatan, telefon | Bahagian J, surat kelulusan Luar Negara |

- Imej PNG, JPEG atau WebP, maksimum 1 MB. **SVG ditolak** kerana boleh
  membawa skrip. PNG berlatar lutsinar memberi hasil terbaik.
- Imej disimpan secara peribadi dalam R2 di bawah `profil/<id pegawai>/`
  dan hanya dipaparkan melalui pautan bertandatangan yang tamat dalam
  5–10 minit.
- **Dibekukan pada saat tindakan.** Rekod kelulusan menyimpan kunci imej
  yang digunakan ketika itu. Menukar tandatangan, membuangnya, atau menukar
  pemegang jawatan tidak mengubah dokumen yang sudah ditandatangani.
- Hanya tindakan **Sokong / Luluskan** ditandatangani. Kembalikan, Tolak dan
  pintasan pentadbir tidak mencetak tandatangan sesiapa.
- Nama sekolah dan kod sekolah kekal dikawal pentadbir (senarai rasmi JPN).

---

## 11. Identiti Korporat

Reka bentuk mengikut kelaziman portal sektor awam: bar utiliti (tarikh,
saiz teks, kontras tinggi), kepala jabatan, navigasi biru tua dengan
aksen emas, jejak halaman, dan kaki laman korporat.

- **Logo.** Letakkan logo rasmi yang diluluskan di
  `public/logo-jabatan.png`. Ia dipaparkan pada kepala laman, kaki laman
  dan kepala surat. Sebelum fail itu wujud, lambang neutral dipaparkan —
  sistem ini **tidak** melukis semula Jata Negara atau logo agensi.
- **Maklumat jabatan dan slogan surat** dikemas kini di
  *Pentadbiran → Tetapan & Surat*. Alamat, telefon dan e-mel yang ada
  sekarang adalah **nilai sementara** dan mesti disahkan dengan JPN Perak.
- **Surat kelulusan** mengikut format surat rasmi: kepala surat berlogo,
  Ruj. Kami dan Tarikh, perenggan bernombor, slogan, tandatangan dan cop,
  serta s.k. Lawatan Dalam Daerah dikeluarkan atas nama PPD; selainnya
  atas nama JPN.
- **Fon Inter** di-hos sendiri (`@fontsource/inter`) — tiada panggilan ke
  pelayan fon luar.

---

## 12. Had Yang Diketahui

- **Google OIDC DELIMa dimatikan.** Log masuk menggunakan OTP e-mel.
  Hidupkan dalam `supabase/config.toml` apabila Client ID diperoleh, dan
  hadkan domain di peringkat penyedia identiti (`hd=moe-dl.edu.my`).
- **Notifikasi e-mel dan peringatan tarikh tutup belum dibina.** Ini
  Fasa 4 dalam blueprint.
- **Senarai murid penuh dimuat naik sebagai dokumen**, bukan dimasukkan
  baris demi baris — selaras dengan Lampiran A D2 yang membenarkan
  lampiran berasingan.
- **Pratonton dokumen dibuka dalam tab baharu** melalui pautan
  bertandatangan lima minit, bukan dibenamkan dalam halaman.
