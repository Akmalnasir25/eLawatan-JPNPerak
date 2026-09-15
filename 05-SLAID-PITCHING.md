# Slaid Pitching eLAWATAN Perak

Susunan 30 slaid untuk sesi libat urus.
Format 16:9, navigasi anak panah kiri/kanan atau ruang, ada skrin penuh dan togol tema.

---

## Slaid 1 — Tajuk

**eLAWATAN Perak**

Sistem permohonan dan kelulusan lawatan murid sekolah secara atas talian — satu pautan, satu rekod, kelulusan berperingkat daripada sekolah hingga JPN.

*Cadangan Draf 1.0 · Rujukan SPI Bil. 9/2023 · 15 September 2026*

---

## BAHAGIAN 01 — MASALAH

### Slaid 2 — Pembahagi
**Masalah yang sebenarnya.** Bukan kekurangan borang. Kekurangan satu tempat untuk borang itu hidup.

### Slaid 3 — Keadaan semasa
**Permohonan lawatan bergerak sebagai kertas dan lampiran e-mel**

*Di sekolah:* borang berbeza antara PPD · dokumen bertaburan dalam e-mel, WhatsApp, cetak · guru tidak tahu permohonan di meja siapa

*Di PPD & JPN:* permohonan tidak lengkap tetap sampai · statistik dikumpul manual setiap penggal · tiada jejak audit bila berlaku insiden

### Slaid 4 — Soalan yang paling kerap
> **"Sudah sampai mana?"**

Tiada seorang pun boleh menjawabnya tanpa menelefon seseorang. Itulah kos sebenar proses manual — bukan kertas, tetapi masa menunggu jawapan.

---

## BAHAGIAN 02 — CADANGAN

### Slaid 5 — Pembahagi
**Cadangan sistem.** Sistem tidak mencipta dasar baharu. Ia menguatkuasakan dasar yang sudah ada.

### Slaid 6 — Tiga prinsip
**Satu pautan** — semua peringkat buka URL yang sama, peranan ditentukan akaun DELIMa
**Satu rekod** — satu nombor rujukan mengikat borang, dokumen, tandatangan, laporan
**Dasar dikuatkuasakan** — borang tidak boleh dihantar jika tidak lengkap; tiada lompat peringkat

### Slaid 7 — Pekeliling rujukan
SPI 9/2023 (induk) · SPI 10/2011 · SPI 9/2004 · SPI 5/2002 · SPI 9/2000 · SPI 12/7/1966

*Nota: status mansuh pekeliling lama perlu disahkan — tindakan pertama Fasa 1*

### Slaid 8 — Borang JPN Perak
**Borang JPN Perak sudah wujud. Sistem ini menjadikannya skrin.**

Lampiran A → skrin borang digital · Tatacara Pengisian → teks bantuan · Senarai Semak → syarat butang Hantar · Borang kenderaan & luar negara → dicetuskan bersyarat

> eLAWATAN bukan borang baharu. Ia **Lampiran A yang hidup**.

### Slaid 9 — Peranan
Akaun Sekolah · Pegawai PPD (semak) · Pegawai Pendidikan Daerah (sah) · Pegawai JPN (semak) · Pengarah JPN (sah) · Bahagian Penyelaras KPM · Pentadbir

### Slaid 10 — Matriks kategori
| Kategori | Laluan | Tempoh |
|---|---|---|
| Dalam Daerah | Sekolah → Pegawai PPD → **PPD (Bhg G)** | 21 hari |
| Antara Daerah | + Pegawai JPN → **Pengarah JPN (Bhg H)** | 30 hari |
| Antara Negeri | sama, tidak ke KPM | 30 hari |
| Luar Negara | + **Bahagian Penyelaras (Bhg J)** | 60 hari |

### Slaid 11 — Aliran kerja
Draf → Semakan PPD → Pengesahan PPD → Semakan JPN → Pengesahan Pengarah → Laporan

### Slaid 12 — Dokumen wajib
**Permohonan tidak lengkap tidak pernah sampai ke meja pegawai**

Perancangan · Peserta · Keselamatan · Kenderaan — butang *Hantar* mati sehingga lengkap

### Slaid 13 — Nombor rujukan & status
`JPNPk/LWT/2026/PRK-KU/ABA1234/0147` — sembilan status rasmi, log audit tambah-sahaja

---

## BAHAGIAN 03 — TEKNOLOGI

### Slaid 14 — Pembahagi
**Pilihan teknologi.** Antara muka sama bagi ketiga-tiga opsyen. Yang berbeza hanya tempat data disimpan.

### Slaid 15 — Bahagian hadapan
**Apa yang dibina, dan dengan apa**

React 18 + TypeScript + Vite · TailwindCSS dengan sistem reka bentuk sendiri · PWA dengan draf luar talian · Responsif telefon/tablet/desktop · Lembaran gaya cetak khusus · Bahasa Melayu sepenuhnya · Repositori Git milik JPN

### Slaid 16 — Tiga opsyen
**A · Supabase + Cloudflare R2** *(cadangan utama)*
**C · Supabase + Google Drive** *(sandaran)*
**B · Apps Script + Google Drive**

### Slaid 17 — Opsyen A: kenapa
**Satu-satunya opsyen yang boleh menampung seluruh Perak**

*Keupayaan:* Postgres sebenar · tiada kuota harian · masa nyata · skala 1,000+ sekolah
*Keselamatan:* Row Level Security · log audit kalis ubah · sandaran automatik · R2 tanpa caj egress

*Yang perlu diluluskan: langganan tahunan dan justifikasi keselamatan ICT. Kos ± RM 2,300 setahun.*

### Slaid 18 — Opsyen B: had
**Percuma, tetapi ada siling yang keras**

*Had teknikal:* kuota harian · prestasi merudum · tiada transaksi · tiada masa nyata
*Risiko tadbir urus:* **log audit boleh dipadam** · tiada RLS · sesiapa yang boleh sunting skrip boleh baca semua data murid

*Sesuai sebagai pembuktian konsep. Tidak sesuai sebagai sistem rasmi negeri.*

### Slaid 19 — Opsyen C: sandaran
**Enjin penuh, fail murid kekal dalam DELIMa**

Postgres penuh · isu kedaulatan data selesai · storan percuma · justifikasi lebih mudah
*Harga: dua sistem diselaraskan · kelulusan pentadbir DELIMa · kuota API Drive*

### Slaid 20 — Perbandingan
Lajur A dan C ditonjolkan. Enam kriteria: skala · audit · keselamatan enjin data · masa nyata · kedaulatan data · kos.

> Beza kos A dan B: **± RM 1,250 setahun** — kurang daripada sewa sebuah bas untuk satu lawatan.

### Slaid 21 — Cadangan
**Opsyen A sebagai pilihan utama. Opsyen C jika bajet tidak diluluskan.**

Kedua-duanya berdiri di atas Postgres — keputusan ini tidak mengubah reka bentuk sistem, hanya tempat fail disimpan.

---

## BAHAGIAN 04 — KOS

### Slaid 22 — Pembahagi
**Kos sebenar.** Dinyatakan terbuka, termasuk kos alat AI yang menggantikan bajet perolehan perisian.

### Slaid 23 — Langganan AI
Claude Pro $20 · Max 5× $100 · ChatGPT Go $8 / Plus $20 / Business $25 · Copilot Pro $10

> Satu langganan peringkat USD 20 memadai untuk Fasa 1–3. Kos pembangunan keseluruhan **di bawah RM 600**.

### Slaid 24 — Bil tahunan
A ± RM 2,300 · C ± RM 2,270 · B ± RM 1,050

Domain `.gov.my` / `.edu.my` RM 80 — promosi tahun pertama **tidak terpakai**.

### Slaid 25 — Perspektif
> **RM 2,300**

Kos penuh setahun bagi Opsyen A — berbanding puluhan ribu ringgit setahun bagi sistem komersial untuk satu negeri, sebelum caj penyesuaian. Dan kod ini dimiliki sepenuhnya oleh JPN.

---

## BAHAGIAN 05 — PELAKSANAAN

### Slaid 26 — Pembahagi
**Pelan pelaksanaan.** Rintis satu daerah sebelum menyentuh seluruh negeri.

### Slaid 27 — Lima fasa
Fasa 1 Keperluan (2 mgg) · Fasa 2 Bina teras (4 mgg) · Fasa 3 Rintis lapangan (3 mgg) · Fasa 4 Tambah baik (3 mgg) · Fasa 5 Lancar berperingkat

### Slaid 28 — Risiko
**Yang paling mungkin menggagalkan projek ini bukan teknologi**

Kembali kepada e-mel · Data sekolah tidak tepat · Bergantung seorang pembangun — setiap satu dengan mitigasinya

### Slaid 29 — Keputusan dipohon
Tujuh soalan: matriks pelulus · tempoh minimum · saluran rasmi tunggal · kedaulatan data · pemilik sistem · PPD rintis · surat QR

### Slaid 30 — Langkah seterusnya
**Di mana kita mula?**

1. **Sahkan dasar** — pemetaan kategori kepada pelulus, senarai mansuh SPI
2. **Tanya DELIMa** — struktur OU, senarai e-mel mengikut sekolah
3. **Tetapkan pemilik** — siapa di JPN, siapa sokongan di PPD
4. **Pilih daerah rintis** — satu PPD, sepuluh sekolah sukarela

> Prototaip sudah berfungsi hari ini. Yang tinggal bukan soalan teknikal, tetapi **keputusan dasar dan pemilikan**.

---

## Nota Pembentangan

- **Slaid 4** dan **slaid 25** ialah dua momen utama — beri masa untuk ia meresap
- **Slaid 8** hujah paling kuat kepada pegawai: sistem tidak menggantikan borang mereka
- **Slaid 18** hujah paling tajam menentang Opsyen B: log audit boleh dipadam
- **Slaid 30** letak bola di tangan JPN — tiga daripada empat perkara hanya perlukan jawapan, bukan bajet
- Demo langsung dicadangkan selepas slaid 13 atau selepas slaid 21
