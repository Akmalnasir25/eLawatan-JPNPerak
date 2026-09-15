# Spesifikasi Sistem eLAWATAN

Spesifikasi teknikal sistem sebenar, seperti yang dipersetujui selepas
sesi libat urus JPN Perak pada 15 September 2026.

---

## 1. Peranan Pengguna

Peringkat capaian ditentukan sepenuhnya oleh **e-mel yang log masuk**.
Pengguna tidak pernah memilih peranan sendiri.

| Kod peranan | Nama paparan | Skop | Peringkat |
|---|---|---|---|
| `sekolah` | Akaun Sekolah | kod sekolah | Sekolah |
| `ppd_pegawai` | Pegawai PPD (Penyemak) | kod PPD | PPD |
| `ppd_ketua` | Pegawai Pendidikan Daerah (Pengesah) | kod PPD | PPD |
| `jpn_pegawai` | Pegawai JPN (Penyemak) | kod negeri | JPN |
| `jpn_pengarah` | Pengarah JPN (Pengesah) | kod negeri | JPN |
| `kpm` | Bahagian Penyelaras KPM | — | KPM |
| `admin` | Pentadbir Sistem | seluruh negeri | Pentadbir |

### Prinsip

- **Satu akaun mewakili satu sekolah.** E-mel rasmi sekolah, bukan e-mel guru.
- **Dua peranan di setiap pejabat** — seorang menyemak, seorang mengesahkan.
- **Bahagian F** (Ulasan Guru Besar) ditandatangani pada salinan bercetak di sekolah.
- Peranan diberikan kepada **jawatan**, bukan individu. Bila pegawai bertukar, pentadbir tukar pemegang — tiada permohonan tersekat.

---

## 2. Rantaian Kelulusan

```
Dalam Daerah
  Sekolah → Pegawai PPD (semak) → PPD (sah, Bhg G) → SELESAI

Antara Daerah / Antara Negeri
  Sekolah → Pegawai PPD (semak) → PPD (sah, Bhg G)
          → Pegawai JPN (semak) → Pengarah JPN (sah, Bhg H) → SELESAI

Luar Negara
  Sekolah → Pegawai PPD → PPD → Pegawai JPN → Pengarah JPN
          → Bahagian Penyelaras KPM (Bhg J) → SELESAI
```

**Wajib melalui PPD.** Permohonan ke JPN tidak boleh melangkau peringkat daerah. Sistem yang menguatkuasakan, bukan pengguna yang memilih.

### Pemetaan status kepada peranan

| Status | Menunggu tindakan |
|---|---|
| `MENUNGGU_PPD_SEMAK` | `ppd_pegawai` |
| `MENUNGGU_PPD_SAH` | `ppd_ketua` |
| `MENUNGGU_JPN_SEMAK` | `jpn_pegawai` |
| `MENUNGGU_JPN_SAH` | `jpn_pengarah` |
| `MENUNGGU_KPM` | `kpm` |

### Tindakan yang tersedia

Setiap pegawai pada gilirannya ada tiga pilihan:

| Tindakan | Kesan | Catatan |
|---|---|---|
| **Sokong / Luluskan** | Maju ke peringkat seterusnya, atau `DILULUSKAN` jika peringkat akhir | Pilihan |
| **Kembalikan untuk Pindaan** | Status `DIKEMBALIKAN`, sekolah boleh sunting dan hantar semula | **Wajib** |
| **Tolak** | Status `DITOLAK`, rekod ditutup | **Wajib** |

Pentadbir sistem boleh bertindak bagi pihak mana-mana peringkat. Setiap pintasan direkodkan dalam log audit dengan nama pentadbir dan ditandakan `(pintasan pentadbir)`.

---

## 3. Pendaftaran Sekolah — Padanan Senarai + OTP

JPN mempunyai senarai: **e-mel rasmi, nama sekolah, kod sekolah, daerah**.
Senarai ini diimport sekali oleh pentadbir.

### Aliran

| Langkah | Tindakan sistem |
|---|---|
| 1 | Sekolah masukkan e-mel rasmi |
| 2 | Sistem semak domain — hanya `moe-dl.edu.my` dan `moe.gov.my` |
| 3 | Sistem semak e-mel belum berdaftar |
| 4 | Sistem padankan dengan senarai sekolah JPN |
| 5 | Papar padanan: nama sekolah, kod, daerah, negeri — **tidak boleh diubah sekolah** |
| 6 | Jana OTP 6 digit, hantar ke e-mel tersebut |
| 7 | Sekolah masukkan OTP |
| 8 | Sah → akaun aktif serta-merta, **tiada kelulusan manual** |

### Kes ralat

| Keadaan | Mesej |
|---|---|
| Domain bukan KPM | "Hanya e-mel domain moe-dl.edu.my atau moe.gov.my diterima." |
| Sudah berdaftar | "E-mel ini sudah berdaftar. Sila log masuk terus." |
| Tiada dalam senarai | "E-mel ini tiada dalam senarai sekolah JPN. Sila hubungi pentadbir sistem." |
| OTP salah | "Kod OTP tidak sepadan. Sila cuba lagi." |

### Rasional

Senarai JPN menentukan **e-mel mana yang sah**; OTP membuktikan **siapa yang benar-benar memegangnya**. Gabungan dua ini menghapuskan keperluan pengesahan manual — JPN tidak perlu meluluskan pendaftaran satu per satu.

**Kemas kini senarai:** import semula setiap awal penggal, atau bila JPN menerima senarai pertukaran sekolah.

---

## 4. Dokumen Wajib

Diambil daripada **Senarai Semak Permohonan Lawatan Murid Sekolah, BSS Pin.1/2023**.
Butang *Hantar* kekal mati sehingga semua item wajib dipenuhi.

### Kumpulan Permohonan (sentiasa wajib)

- Surat iringan permohonan daripada sekolah kepada PPD/JPN — 1 salinan
- Borang Permohonan Lawatan Murid Sekolah (Lampiran A) — 4 salinan, dijana sistem
- Kertas kerja lawatan / program — 1 salinan
- Jadual tentatif lawatan yang lengkap
- Surat kebenaran program daripada PPD/JPN/KPM — *jika anjuran pihak luar*

### Kumpulan Kenderaan (bersyarat mengikut jenis pengangkutan)

**Bas Persiaran / Van Persiaran / Bas Sekolah sewa** — tujuh dokumen, setiap satu perlu disahkan Ketua Jabatan:

1. Salinan pendaftaran / pemilikan kenderaan
2. Permit kenderaan / lesen bas
3. Salinan kad pengenalan pemandu
4. Salinan lesen memandu dan Lesen Vokasional Malaysia (LVM)
5. Salinan perlindungan insurans kenderaan
6. Salinan cukai jalan kenderaan
7. Salinan perakuan pemeriksaan kenderaan PUSPAKOM

**Bas Sekolah KPM / Van / Coaster / kenderaan Tentera atau Polis**
- Surat kelulusan penggunaan kenderaan daripada Unit Pentadbiran PPD/JPN

**Kenderaan Guru**
- Borang Kebenaran Penggunaan Kenderaan Sendiri Oleh Guru
- Salinan insurans dan cukai jalan kenderaan guru

**Kenderaan Ibu Bapa**
- Surat akuan penggunaan kenderaan ibu bapa

### Kumpulan Peserta

- Senarai murid — nama, no. sijil lahir/KP, jantina, tahun/tingkatan, alamat, telefon
- Senarai guru pengiring
- Senarai bukan murid (ibu bapa / individu) — *jika ada*
- Senarai pengiring anggota keselamatan — *jika ada*
- Lampiran B — borang kebenaran ibu bapa dan pengesahan kesihatan murid

### Kumpulan Keselamatan

- Perlindungan insurans murid
- Borang penilaian risiko — *jika menginap atau aktiviti berisiko tinggi*
- Tauliah penyelamat air berkelayakan (Pingat Gangsa / Bronze Medallion, RLSS) — *jika aktiviti air*

### Kumpulan Luar Negara

- Borang Guru Pengiring Lawatan Murid Ke Luar Negara
- Salinan pasport semua anggota rombongan

---

## 5. Borang Digital — Pemetaan Lampiran A

Borang enam langkah, setiap langkah memetakan bahagian Lampiran A:

| Langkah | Bahagian | Kandungan |
|---|---|---|
| 1 | **A · B1** | Maklumat sekolah (auto-isi), kategori lawatan, tujuan, jenis pengangkutan, ciri tambahan |
| 2 | **B1.4 · B2** | Tempat dilawati + tarikh + penginapan (baris boleh tambah); lawatan berperingkat |
| 3 | **C1 · C2** | Sumber kewangan dengan kiraan automatik; penaja; JUMLAH A + B |
| 4 | **D · E** | Ketua rombongan; senarai anggota mengikut kategori; guru pemungut bayaran |
| 5 | **I** | Nisbah pengiring (Lampiran C) dan justifikasi pengecualian |
| 6 | **Hantar** | Dokumen sokongan dan semakan akhir |

### Ciri tambahan yang mencetuskan dokumen

- Melibatkan penginapan
- Aktiviti berisiko tinggi
- Melibatkan aktiviti air — Pusat Kokurikulum Negeri atau Program Terapi PPKI
- Program anjuran pihak luar selain agensi KPM
- Disertai pengiring anggota keselamatan

### Pengesahan automatik sebelum hantar

- Tujuan lawatan sekurang-kurangnya 10 aksara
- Jenis pengangkutan dipilih
- Sekurang-kurangnya satu tempat dengan tarikh sah (`hingga` tidak lebih awal daripada `dari`)
- **Tempoh minimum** dipenuhi mengikut kategori
- Bilangan murid dan guru diisi
- Ketua rombongan: nama, KP, telefon; pasport wajib bagi Luar Negara
- **Nisbah pengiring** dipenuhi, atau justifikasi Bahagian I diisi jika dalam had pengecualian
- Semua dokumen wajib dimuat naik

---

## 6. Pengurusan Dokumen

- Fail dimuat naik disimpan dalam folder Google Drive DELIMa yang dinamakan mengikut nombor rujukan
- **Cincangan SHA-256 dikira semasa muat naik** dan disimpan bersama rekod
- Pegawai boleh klik **Lihat** pada mana-mana dokumen: pratonton imej/PDF, nama fail, saiz, jenis, siapa muat naik, masa, cincangan, lokasi storan
- Jika fail ditukar selepas kelulusan, nilai cincangan berubah — pegawai boleh membuktikan dokumen yang diluluskan ialah dokumen yang sama

---

## 7. Cetakan & Dokumen Keluaran

| Dokumen | Kandungan |
|---|---|
| **Lampiran A** | Borang rasmi penuh dengan kategori dipangkah, semua bahagian A–J, blok tandatangan Ketua Rombongan dan setiap pelulus, nota "Disediakan dalam empat salinan" dan "Permohonan Peraturan Lawatan Sekolah 1957" |
| **Senarai Semak BSS Pin.1/2023** | Ditanda ✓/✗ automatik daripada data borang, termasuk kepala (nama sekolah, ketua rombongan, tarikh, bilangan peserta Guru/Murid/Bukan Guru) dan semakan tempoh 21/30/60 hari |
| **Surat Kelulusan** | Kepala JPN Perak, nombor rujukan, butiran lawatan, lima syarat kelulusan, kod QR pengesahan, tandatangan pelulus |
| **Lampiran G** | Borang laporan lawatan pasca-lawatan |

Semua cetakan menggunakan lembaran gaya cetak khusus — menu dan bar sistem hilang automatik.

---

## 8. Panel Pentadbir

Enam tab:

| Tab | Kuasa |
|---|---|
| **Pegawai & Peranan** | Sunting nama, e-mel, peranan, skop, jawatan. Daftar pegawai baharu (domain disemak). Padam akaun |
| **Import Akaun** | Tampal CSV `emel, nama, kod_sekolah, jawatan`. Pratonton dengan status setiap baris. Import pukal |
| **Profil Sekolah** | Senarai sekolah — kod, nama, Guru Besar, kod PPD, nama PPD, kod JPN. Pemetaan ini menentukan permohonan sampai ke meja mana |
| **Kategori & Tempoh** | Ubah tempoh minimum setiap kategori. Laluan kelulusan dan nisbah Lampiran C **dikunci** — terikat SPI |
| **Semua Permohonan** | Tukar status manual, buka rekod, padam rekod ujian |
| **Sistem** | Statistik, senarai kuasa pentadbir, eksport JSON, set semula |

**Pintasan kelulusan:** pentadbir boleh bertindak di mana-mana peringkat, dengan amaran jelas dan rekod audit.

---

## 9. Log Audit

- **Tambah sahaja** — tiada peranan pengguna boleh memadam
- Setiap peristiwa merekod: masa, pegawai, peristiwa, nombor rujukan
- Direkod: penghantaran, setiap tindakan kelulusan, pertukaran status oleh pentadbir, pendaftaran akaun, perubahan tetapan, import pukal

---

## 10. Nota Pelaksanaan Supabase

- Skop daerah/negeri dikuatkuasakan melalui **Row Level Security**, bukan kod hadapan
- `auth.jwt() ->> 'email'` dipadankan dengan jadual `pegawai` untuk menentukan peranan dan skop
- Log masuk dihadkan kepada domain KPM di peringkat penyedia identiti
- Jadual `log_audit` hanya membenarkan `INSERT` — tiada `UPDATE` atau `DELETE` untuk mana-mana peranan
- OTP dijana dan disahkan dalam Edge Function; kod tidak pernah didedahkan kepada klien dalam sistem sebenar

---

*Spesifikasi ini menggambarkan prototaip demo yang sudah berfungsi.
Sebarang perubahan perlu dikemas kini dalam dokumen ini dan dalam sistem serentak.*
