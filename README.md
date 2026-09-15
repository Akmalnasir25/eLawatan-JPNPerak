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

## 3. Sediakan Supabase

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

## 4. Sediakan Cloudflare R2

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

## 5. Rahsia

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

## 6. Jalankan

```bash
npm install
npm run dev              # http://localhost:5173
```

Tabur Edge Functions:

```bash
npm run fn:tabur         # menabur kesemua empat fungsi
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

---

## 7. Cara Sistem Menguatkuasakan Dasar

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

Antara muka memaparkan peraturan ini, tetapi **tidak** bergantung
kepadanya untuk keselamatan. Setiap satu dikuatkuasakan semula di
peringkat pangkalan data.

---

## 8. Perkara Yang Perlu Disahkan Sebelum Pelancaran

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

## 9. Had Yang Diketahui

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
