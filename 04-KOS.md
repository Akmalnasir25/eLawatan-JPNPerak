# Kos — eLAWATAN Perak

Semua kadar pada **September 2026**. Kadar tukaran **1 USD ≈ RM 4.05** (13 September 2026).
Harga langganan berubah — sahkan semula sebelum bajet diluluskan.

---

## 1. Kos Pembangunan — Langganan AI

Sistem ini dibina dengan bantuan pengekodan AI, bukan pasukan pembangun.
Itu yang menjadikan kos pembangunan sebenar begitu rendah — tetapi ia tetap
kos yang perlu dinyatakan secara terbuka, kerana ia menggantikan bajet
perolehan perisian yang biasanya ratusan ribu ringgit.

| Vendor | Pelan | USD/bulan | RM anggaran | Sesuai untuk |
|---|---|---|---|---|
| **Claude** | Pro | $20 | ± RM 81 | Kerja harian 1–2 jam: menulis modul, membaiki pepijat, dokumentasi |
| **Claude** | Max 5× | $100 | ± RM 405 | Pembangunan intensif — modul penuh dalam satu sesi |
| **Claude** | Max 20× | $200 | ± RM 810 | Melebihi keperluan projek ini |
| **ChatGPT** | Go | $8 | ± RM 32 | Penggunaan ringan, bukan kod berat |
| **ChatGPT** | Plus | $20 | ± RM 81 | Setara Claude Pro |
| **ChatGPT** | Pro | $200 | ± RM 810 | Melebihi keperluan projek ini |
| **ChatGPT** | Business | $25/pengguna | ± RM 101 | Jika JPN mahu lesen berpasukan dengan kawalan pentadbir |
| **GitHub** | Copilot Pro | $10 | ± RM 41 | Pelengkap dalam editor; pilihan |
| API | Bayar ikut guna | berubah | — | Automasi dalam sistem, bukan untuk membina |

### Cadangan praktikal

Satu langganan peringkat **USD 20** — Claude Pro atau ChatGPT Plus — memadai untuk Fasa 1–3.
Naik taraf ke peringkat **USD 100** hanya sepanjang **Fasa 2** (4 minggu pembinaan teras),
kemudian turun semula.

> **Kos pembangunan keseluruhan Fasa 1–4: di bawah RM 600.**

---

## 2. Nama Domain — Kadar dan Kelayakan

| Sambungan | Kadar setahun | Kelayakan | Kesesuaian |
|---|---|---|---|
| **`.gov.my`** | **RM 80** | Agensi kerajaan sahaja | **Pilihan utama** — `lawatan.jpnperak.gov.my` ialah alamat paling sah di mata sekolah dan ibu bapa |
| **`.edu.my`** | **RM 80** | Organisasi pendidikan Malaysia berdaftar; perlu dokumen sokongan | Pilihan kedua jika permohonan `.gov.my` lambat |
| `.my` | ± RM 89 | Terbuka | Hanya jika dua di atas tidak dapat diperoleh. Kurang meyakinkan |
| `.com.my` | ± RM 60 | Syarikat berdaftar SSM | **Tidak sesuai** — menandakan entiti perniagaan |

> **Perangkap bajet:** Tawaran promosi pendaftaran tahun pertama serendah RM 8 **tidak terpakai**
> kepada `.gov.my` dan `.edu.my`, dan pembaharuan tetap pada kadar penuh.
> Bajet hendaklah menggunakan **kadar penuh RM 80 setahun**.

### Alternatif: subdomain percuma

Jika JPN memperoleh subdomain di bawah zon `moe.gov.my` sedia ada —
contohnya `lawatan.jpnperak.moe.gov.my` — **kos domain RM 80 hilang sepenuhnya**,
dan ia lebih sah daripada mendaftar `.gov.my` berasingan.

**Amaran:** rekod DNS `moe.gov.my` dikawal KPM, bukan JPN. Permohonan perlu
dinaikkan ke atas dan mungkin mengambil masa. Jangan tunggu — mula dengan
pautan dari laman JPN, mohon subdomain secara selari.

---

## 3. Kos Operasi Tahunan

| Komponen | A · Supabase + R2 | C · Supabase + Drive | B · Apps Script + Drive |
|---|---|---|---|
| Pangkalan data | RM 1,215 | RM 1,215 | RM 0 |
| Storan dokumen | ± RM 36 | RM 0 | RM 0 |
| Hosting antara muka | RM 0 | RM 0 | RM 0 |
| Nama domain `.gov.my` / `.edu.my` | RM 80 | RM 80 | RM 80 |
| Langganan AI penyelenggaraan | ± RM 972 | ± RM 972 | ± RM 972 |
| **Jumlah setahun** | **± RM 2,300** | **± RM 2,270** | **± RM 1,050** |
| Tanpa langganan AI | ± RM 1,330 | ± RM 1,295 | RM 80 |

**Andaian:** Supabase Pro USD 25 sebulan; storan R2 pada 50 GB dokumen.
Kos **tidak termasuk masa pembangun** — jika kerja ini dilaksanakan sebagai
tugas rasmi, tiada kos tunai bagi komponen tersebut.

---

## 4. Perbandingan Skala

Perolehan sistem pengurusan sekolah komersial biasanya bermula pada
**puluhan ribu ringgit setahun** bagi satu negeri, ditambah caj penyesuaian.

Opsyen A berjalan pada **kurang RM 2,300 setahun** termasuk langganan AI
penyelenggaraan dan nama domain — dengan kod yang dimiliki sepenuhnya oleh JPN.

Beza kos antara Opsyen A dan Opsyen B ialah lebih kurang **RM 1,250 setahun** —
kurang daripada kos sewa sebuah bas untuk satu lawatan sekolah. Itulah harga
bagi audit kalis ubah, keselamatan peringkat pangkalan data dan skala negeri.

---

## 5. Tier Percuma — Boleh Tampung Tak?

### Had tier percuma yang masih wujud (2026)

| Platform | Percuma | Perangkap |
|---|---|---|
| **Supabase** | 500 MB pangkalan data, 1 GB storan fail, 5 GB bandwidth, 50,000 MAU | **Projek dijeda jika 7 hari tiada aktiviti** |
| **Oracle Cloud Always Free** | VM sehingga 24 GB RAM, 200 GB storan, tidak tidur | Pengguna jadi pentadbir sistem — patch, backup, SSL |
| **Render** | Ada | Web service tidur selepas 15 minit; Postgres percuma **30 hari sahaja** |
| **InfinityFree / Byet** | Hosting PHP percuma | Tiada SLA — **tidak sesuai untuk sistem rasmi** |

### Kiraan sebenar

**Rintis satu PPD** — anggaran 80 sekolah × 6 lawatan setahun ≈ 500 permohonan:

| Komponen | Saiz anggaran | Had percuma | Cukup? |
|---|---|---|---|
| Metadata (borang, peserta, kelulusan, audit) | ~25 MB | 500 MB | **Lebih dari cukup** |
| Dokumen sokongan (15 fail × ~1 MB imbasan) | **~7.5 GB** | 1 GB | **Pecah serta-merta** |

**Seluruh Perak** (~15,000 permohonan setahun): metadata ~750 MB setahun —
melepasi had percuma dalam setahun. Tetapi perhatikan: **dokumen yang pecah dahulu**,
jauh lebih awal daripada pangkalan data.

### Kesimpulan

**Storan dokumen ialah kekangan sebenar, bukan pangkalan data.**

Itulah sebabnya **Opsyen C** wujud: letak fail dalam Google Drive DELIMa —
kuota sudah dibayar lesen KPM, jadi masalah storan hilang terus.

> **Fasa rintis penuh boleh berjalan pada RM 0** kecuali domain,
> menggunakan Supabase free tier untuk metadata + Drive DELIMa untuk dokumen.
> JPN boleh menguji setahun tanpa bajet langsung, dan naik taraf hanya bila terbukti.

**Nota:** perangkap "projek dijeda selepas 7 hari" perlu diberi perhatian —
cuti sekolah panjang boleh menjejakkan projek tier percuma. Senang dihidupkan
semula, tetapi jangan sampai berlaku ketika pegawai JPN cuba membukanya.

---

## 6. Ringkasan Bajet Cadangan

| Fasa | Komponen | Kos |
|---|---|---|
| Fasa 1–4 (12 minggu) | Langganan AI pembangunan | ± RM 600 |
| Rintis (tahun 1) | Supabase free tier + Drive DELIMa | RM 0 |
| Rintis (tahun 1) | Nama domain `.gov.my` | RM 80 |
| | **Jumlah untuk membuktikan konsep** | **± RM 680** |
| Skala negeri (tahun 2+) | Opsyen A penuh setahun | ± RM 2,300 |
