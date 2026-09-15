# Blueprint eLAWATAN Perak

**Kertas Cadangan Teknikal — Sesi Libat Urus**
Sistem Permohonan dan Kelulusan Lawatan Murid Sekolah secara atas talian,
di bawah Jabatan Pendidikan Negeri Perak, menerusi kemudahan Google pada platform DELIMa 3.0.

| | |
|---|---|
| Versi | Draf 1.0 — blueprint |
| Tarikh | 15 September 2026 |
| Rujukan dasar | SPI KPM Bil. 9 Tahun 2023 |
| Skop rintis | 1 PPD → seluruh Perak |
| Disediakan oleh | Muhammad Akmal bin Nasir |

---

## 1.0 Masalah & Cadangan

### Satu pautan, satu rekod, kelulusan berperingkat

Permohonan lawatan murid hari ini bergerak sebagai fail fizikal dan PDF e-mel: sekolah mencetak kertas cadangan, menghantar ke PPD, PPD menyemak secara manual, JPN menerima salinan berasingan. Tiada seorang pun tahu status sebenar sesuatu permohonan tanpa bertanya.

**Keadaan semasa**

- Borang berbeza antara PPD — format tidak seragam
- Dokumen sokongan tersebar: e-mel, WhatsApp, salinan cetak
- Sekolah tidak tahu permohonan di meja siapa
- Tiada jejak audit bila berlaku insiden semasa lawatan
- Statistik lawatan negeri dikumpul semula secara manual setiap penggal

**Selepas eLAWATAN**

- Satu borang digital seragam untuk seluruh Perak
- Dokumen sokongan dimuat naik sekali, terikat pada nombor rujukan
- Papan pemuka status masa nyata di setiap peringkat
- Log tidak boleh diubah: siapa lulus, bila, dengan catatan apa
- Laporan negeri dijana serta-merta — ikut daerah, kategori, bulan

> **Prinsip reka bentuk.** Sistem tidak mencipta dasar baharu. Ia hanya menguatkuasakan apa yang sudah termaktub dalam **Surat Pekeliling Ikhtisas Bil. 9 Tahun 2023 — Garis Panduan Lawatan Murid Sekolah**: borang tidak boleh dihantar selagi dokumen wajib tidak lengkap, dan permohonan tidak boleh melompat peringkat pelulus.

---

## 2.0 Asas Dasar & Pekeliling

Setiap sekatan dalam borang mesti boleh ditunjuk puncanya. Sistem ini tidak mencipta satu pun peraturan baharu.

### Pekeliling peringkat KPM

| Rujukan | Tajuk | Peranan dalam sistem |
|---|---|---|
| **SPI Bil. 9/2023** | Garis Panduan Lawatan Murid Sekolah Bawah KPM Mulai Tahun 2023 | Dokumen induk — kategori, kuasa melulus, dokumen wajib, syarat keselamatan |
| SPI Bil. 10/2011 | Garis Panduan Penglibatan Pihak Sekolah Dalam Program/Aktiviti Anjuran Pihak Luar Selain Agensi Di Bawah KPM | Semakan tambahan bila lawatan dianjurkan pihak luar |
| SPI Bil. 9/2004 | Panduan Penglibatan Murid Sekolah Dalam Program/Aktiviti Anjuran Agensi Selain Agensi Di Bawah KPM | Asas medan "penganjur luar" |
| SPI Bil. 5/2002 | Lawatan Sekolah Pada Hari Persekolahan | Asas amaran bila tarikh jatuh pada hari persekolahan |
| SPI Bil. 9/2000 | Panduan Keselamatan Diri Pelajar Semasa PJK Serta Kegiatan Kokurikulum dan Sukan Di Dalam dan Di Luar Kawasan Sekolah | Asas borang penilaian risiko dan semakan nisbah pengiring |
| SPI KPM 12/7/1966 | Pekeliling lawatan sekolah — masih dihoskan JPN Perak bersama SPI Bil. 9/2023 | Rujukan sejarah |
| Peraturan Lawatan Sekolah 1957 | Dinyatakan pada kepala Lampiran A edaran JPN Perak | Asas perundangan |

> **Perlu disahkan:** status mansuh bagi pekeliling lama di atas hendaklah disahkan daripada senarai mansuh dalam SPI Bil. 9/2023 itu sendiri sebelum dikodkan sebagai rujukan dalam sistem. Ini tindakan pertama dalam Fasa 1.

### Borang & dokumen edaran JPN Perak

Portal rasmi JPN Perak, di bawah *Muat Turun → Sektor → Sektor Pengurusan Sekolah*, sudah mengedarkan satu set lengkap borang lawatan.

| Dokumen | Format | Peranan dalam sistem |
|---|---|---|
| Borang Permohonan Lawatan Murid — Lampiran A | .docx | Menjadi skrin borang digital, medan demi medan |
| Tatacara Pengisian Lampiran A dan B | .pptx | Sumber teks bantuan setiap medan |
| Senarai Semak Lawatan Murid Sekolah (BSS Pin.1/2023) | .xlsx | Menjadi senarai dokumen wajib yang menguatkuasakan butang Hantar |
| Borang Kebenaran Penggunaan Kenderaan Sendiri Oleh Guru | .pdf | Dokumen wajib bersyarat |
| Borang Guru Pengiring Ke Luar Negara | folder | Dicetuskan hanya bagi lawatan Luar Negara |

> **Kedudukan cadangan ini.** eLAWATAN bukan borang baharu — ia **Lampiran A yang hidup**. Setiap medan digital dipetakan terus kepada medan dalam Lampiran A, dan Senarai Semak JPN Perak menjadi peraturan pengesahan borang.

---

## 3.0 Pengguna & Peranan

Semua pengguna membuka pautan yang sama. Peringkat capaian ditentukan oleh **e-mel yang log masuk**, bukan dipilih pengguna.

| Peranan | Skop data | Boleh buat |
|---|---|---|
| **Akaun Sekolah** | Satu sekolah | Isi borang, muat naik dokumen, jejak status, hantar laporan pasca-lawatan |
| **Pegawai PPD (Penyemak)** | Satu daerah | Semakan pertama — sokong, kembalikan atau tolak |
| **Pegawai Pendidikan Daerah (Pengesah)** | Satu daerah | Bahagian G — pelulus akhir bagi lawatan Dalam Daerah |
| **Pegawai JPN (Penyemak)** | Seluruh negeri | Semakan kedua sebelum pengesahan Pengarah |
| **Pengarah JPN (Pengesah)** | Seluruh negeri | Bahagian H — pelulus akhir bagi Antara Daerah dan Antara Negeri |
| **Bahagian Penyelaras KPM** | Lawatan luar negara | Bahagian J — sokongan ke Ketua Pendaftar |
| **Pentadbir Sistem** | Seluruh negeri | Daftar pegawai & skop, konfigur kategori dan dokumen wajib, pintasan kelulusan, log audit |

**Nota:** Bahagian F (Ulasan Pengetua atau Guru Besar) ditandatangani di sekolah pada salinan bercetak sebelum permohonan dihantar. Sistem menyediakan ruang tandatangan itu pada cetakan Lampiran A.

---

## 4.0 Matriks Kategori & Pelulus

Guru mengisi destinasi dan jenis aktiviti. Enjin peraturan menentukan kategori, laluan kelulusan dan tarikh tutup.

| Kategori | Ciri lawatan | Laluan kelulusan | Tempoh minimum |
|---|---|---|---|
| **Dalam Daerah** | Semua tempat dalam daerah yang sama | Sekolah → Pegawai PPD → **PPD (Bhg G)** — tamat | 21 hari |
| **Antara Daerah** | Merentas daerah dalam negeri sama | Sekolah → Pegawai PPD → PPD → Pegawai JPN → **Pengarah JPN (Bhg H)** | 30 hari |
| **Antara Negeri** | Merentas sempadan negeri | Sama seperti Antara Daerah — tidak dipanjangkan ke KPM | 30 hari |
| **Luar Negara** | Program antarabangsa | + **Bahagian Penyelaras KPM (Bhg J)** → Ketua Pendaftar | 60 hari |

Kategori dan pelulus diambil terus daripada Lampiran A (Bahagian G, H, I, J) dan carta alir Lampiran E dan F dalam SPI Bil. 9/2023.

### Nisbah pengiring — Lampiran C

Sistem mengira nisbah automatik daripada bilangan murid dan pengiring, kemudian menghalang penghantaran jika nisbah tidak dipenuhi. Jika kekurangan masih dalam had pengecualian, sistem membuka medan justifikasi Bahagian I.

| Bil. | Kategori murid | Pengiring : murid | Had pengecualian |
|---|---|---|---|
| (a) | Ketidakupayaan penglihatan (B1), fizikal, pelbagai | 1 : 1 | 1 : 3 |
| (b) | Ketidakupayaan penglihatan (rabun) | 1 : 3 | 1 : 4 |
| (c) | Ketidakupayaan pendengaran dan bermasalah pembelajaran | 1 : 5 | 1 : 7 |
| (d) | Ketidakupayaan pendengaran berbaki dan pertuturan | 1 : 7 | 1 : 10 |
| (e) | Murid prasekolah | 1 : 5 | 1 : 7 |
| (f) | Murid sekolah rendah | 1 : 5 | 1 : 7 |
| (g) | Murid sekolah menengah | 1 : 8 | 1 : 10 |

### Dokumen wajib

Butang *Hantar* kekal mati sehingga setiap item wajib dimuat naik. Senarai diambil terus daripada Senarai Semak BSS Pin.1/2023 — lihat `03-RUJUKAN-DASAR.md`.

---

## 5.0 Aliran Kerja & Status

### Laluan penuh — contoh lawatan Antara Negeri

| Peringkat | Tindakan |
|---|---|
| 0 | **Draf** — sekolah isi borang, muat naik dokumen. Boleh simpan dan sambung |
| 1 | **Semakan Pertama** — Pegawai PPD semak kelengkapan dan pematuhan |
| 2 | **Bahagian G** — Pegawai Pendidikan Daerah sahkan dan sokong ke JPN |
| 3 | **Semakan Kedua** — Pegawai JPN semak |
| 4 | **Bahagian H** — Pengarah JPN luluskan, surat kelulusan berkod QR dijana |
| 5 | **Laporan** — laporan pasca-lawatan (Lampiran G) dalam 7 hari, rekod ditutup |

Bagi Dalam Daerah, rantaian tamat di Bahagian G. Bagi Luar Negara, permohonan diangkat ke Bahagian Penyelaras dan Ketua Pendaftar selepas Bahagian H.

### Senarai status rasmi

| Status | Maksud |
|---|---|
| `DRAF` | Milik sekolah sepenuhnya. Boleh dipadam |
| `MENUNGGU_PPD_SEMAK` | Dihantar. Sekolah tidak boleh sunting lagi |
| `MENUNGGU_PPD_SAH` | Disemak pegawai, menunggu pengesahan PPD |
| `MENUNGGU_JPN_SEMAK` | Disahkan PPD, dalam giliran semakan negeri |
| `MENUNGGU_JPN_SAH` | Disemak pegawai JPN, menunggu Pengarah |
| `MENUNGGU_KPM` | Diangkat ke Bahagian Penyelaras (luar negara) |
| `DIKEMBALIKAN` | Perlu pindaan. Catatan pelulus wajib diisi |
| `DITOLAK` | Ditutup dengan sebab. Perlu permohonan baharu |
| `DILULUSKAN` | Surat kelulusan tersedia. Rekod dikunci |
| `SELESAI` | Laporan pasca-lawatan diterima. Masuk arkib |
| `BATAL` | Ditarik balik oleh sekolah sebelum tarikh lawatan |

### Format nombor rujukan

```
JPNPk / LWT / 2026 / PRK-KU / ABA1234 / 0147
         │      │       │         │        └── nombor turutan
         │      │       │         └── kod sekolah
         │      │       └── kod PPD
         │      └── tahun
         └── jenis rekod (lawatan)
```

---

## 6.0 Seni Bina Sistem

Bahagian hadapan tidak berubah antara ketiga-tiga opsyen: satu aplikasi web responsif, satu URL, log masuk Google DELIMa.

### Bahagian hadapan

| Lapisan | Pilihan |
|---|---|
| Rangka | React 18 + TypeScript, dibina dengan Vite |
| Gaya | TailwindCSS dengan sistem reka bentuk sendiri |
| PWA | Boleh dipasang pada telefon; draf tersimpan luar talian |
| Responsif | Telefon guru, tablet Guru Besar, komputer meja PPD |
| Cetakan | Lembaran gaya cetak khusus — Lampiran A dan Senarai Semak serupa borang rasmi |
| Bahasa | Bahasa Melayu sepenuhnya, istilah daripada Lampiran A |
| Kod | Repositori Git milik JPN, tiada lesen berbayar |

### Opsyen A — Supabase + Cloudflare R2 *(cadangan utama)*

| Lapisan | Pilihan |
|---|---|
| Hosting | Cloudflare Pages atau subfolder hosting JPN |
| Identiti | Supabase Auth dengan Google OIDC, dihadkan domain DELIMa/KPM |
| Pangkalan data | Supabase Postgres dengan Row Level Security |
| Logik | Edge Functions — enjin kategori, penjanaan PDF, notifikasi |
| Dokumen | Cloudflare R2 — pautan bertandatangan, tiada caj egress |

### Opsyen B — Apps Script + Google Drive

| Lapisan | Pilihan |
|---|---|
| Hosting | Google Apps Script Web App |
| Identiti | `Session.getActiveUser()` |
| Pangkalan data | Google Sheets |
| Logik | Apps Script `.gs` sebagai API REST |
| Dokumen | Google Drive, satu folder setiap permohonan |

### Opsyen C — Supabase + Google Drive *(sandaran)*

| Lapisan | Pilihan |
|---|---|
| Pangkalan data | Supabase Postgres — metadata sahaja |
| Dokumen | Google Drive DELIMa — fail murid kekal dalam ekosistem KPM |
| Sandaran | Eksport berjadual Postgres → Google Sheets mingguan |

---

## 7.0 Perbandingan Backend

> **Istilah: apa itu kedaulatan data?** Kedaulatan data bermaksud data tertakluk kepada undang-undang negara tempat ia disimpan secara fizikal. Jika senarai murid Perak disimpan dalam pelayan di Singapura, data itu berada di bawah bidang kuasa undang-undang negara tersebut, bukan Malaysia sahaja.

### Opsyen A — kelebihan

- **Pangkalan data sebenar.** Postgres dengan indeks; carian 50,000 rekod di bawah sesaat
- **Row Level Security.** Pegawai PPD Kinta Utara secara fizikal tidak boleh menarik data daerah lain, walaupun kod hadapan pecah
- **Tiada had kuota pelaksanaan harian**
- **Masa nyata.** Status berubah di skrin PPD sebaik pengesahan dibuat
- **Log audit kalis ubah** — rekod kelulusan tidak boleh dipadam
- **Sandaran automatik** dengan pemulihan titik masa

### Opsyen A — yang perlu diluluskan

- Kelulusan keselamatan ICT — data berada di luar ekosistem Google KPM
- Kos langganan berulang setiap tahun
- Kemahiran SQL dan pengurusan migrasi skema
- Isu kedaulatan data — pelayan terdekat di Singapura

### Opsyen B — kelebihan

- 100% dalam DELIMa; tiada vendor luar, tiada kelulusan tambahan
- Kos sifar — termasuk dalam lesen Google Workspace KPM
- Identiti percuma melalui sesi Google
- Boleh diselenggara oleh guru ICT dalaman
- Prototaip berfungsi dalam mingguan

### Opsyen B — had yang menghalang skala negeri

- **Kuota harian** — laporan negeri boleh gagal separuh jalan
- **Prestasi merudum** melebihi puluhan ribu baris
- **Tiada transaksi sebenar** — kelulusan serentak boleh tulis-ganti
- **Tiada padanan kepada RLS**
- **Log audit boleh dipadam** oleh pemilik helaian — kelemahan serius bagi rekod kelulusan rasmi
- Kuota e-mel harian mengehadkan notifikasi

### Opsyen C — kelebihan

- Fail murid kekal dalam Drive DELIMa — isu kedaulatan data selesai
- Enjin carian dan laporan Postgres penuh
- Storan percuma — kuota Drive sudah dibayar lesen KPM
- Sandaran dua lapis: Postgres dan sejarah versi Drive
- Justifikasi keselamatan lebih mudah

### Opsyen C — harga yang dibayar

- Dua sistem perlu diselaraskan — fail dipadam meninggalkan rekod yatim
- Perlu kelulusan pentadbir DELIMa untuk akaun perkhidmatan
- Kuota API Drive pada musim puncak
- Langganan Supabase masih berbayar

### Ringkasan berdampingan

| Kriteria | A · Supabase + R2 | C · Supabase + Drive | B · Apps Script + Drive |
|---|---|---|---|
| Skala 1,000+ sekolah | Selesa | Selesa | Terhad |
| Audit kalis ubah | Ya | Ya | Lemah |
| Keselamatan di enjin data | RLS penuh | RLS penuh | Tiada |
| Status masa nyata | Ya | Ya | Tidak |
| Kedaulatan data murid | Perlu justifikasi | Kekal dalam KPM | Kekal dalam KPM |
| Kos setahun | ± RM 2,300 | ± RM 2,270 | ± RM 1,050 |

### Cadangan

**Opsyen A sebagai pilihan utama; Opsyen C jika bajet tidak diluluskan.**

eLAWATAN akan memegang rekod kelulusan rasmi dan data peribadi murid bagi seluruh negeri. Dua keperluan itu — log audit kalis ubah dan keselamatan dikuatkuasakan di peringkat pangkalan data — hanya dipenuhi oleh opsyen berasaskan Postgres.

Beza kos antara Opsyen A dan Opsyen B ialah lebih kurang **RM 1,250 setahun**. Itu kurang daripada kos sewa sebuah bas untuk satu lawatan sekolah.

Kedua-dua A dan C berdiri di atas Postgres, jadi keputusan ini tidak mengubah reka bentuk sistem — hanya tempat fail disimpan.

---

## 8.0 Model Data

Tujuh jadual teras. Struktur sama sama ada dalam Sheets atau Postgres.

| Jadual | Medan utama |
|---|---|
| `sekolah` | kod_sekolah · nama · jenis · emel · kod_ppd · kod_jpn · alamat · aktif |
| `pegawai` | id · emel · nama · peranan · kod_skop · jawatan · status · aktif |
| `permohonan` | id · no_rujukan · kod_sekolah · kategori · tujuan · destinasi · tarikh_mula · tarikh_tamat · bil_murid · bil_guru · bil_bukan_guru · anggaran_kos · status · pelulus_akhir · dicipta_oleh · dicipta_pada |
| `peserta` | id · permohonan_id · nama · kategori · kp · pasport · jantina · jawatan_kelas · alamat · telefon |
| `dokumen` | id · permohonan_id · jenis_dokumen · nama_fail · pautan_storan · saiz · cincangan_sha256 · dimuat_naik_oleh · dimuat_naik_pada |
| `kelulusan` | id · permohonan_id · peringkat · pegawai_id · tindakan · catatan · tarikh_tindakan · cop_digital |
| `log_audit` | id · permohonan_id · pegawai_id · peristiwa · nilai_lama · nilai_baharu · alamat_ip · masa — *tambah sahaja* |
| `laporan_pasca` | permohonan_id · ringkasan · bil_hadir_sebenar · insiden · gambar · dihantar_pada |

### Contoh dasar Row Level Security

```sql
create policy "ppd_lihat_daerah_sendiri"
on permohonan for select using (
  exists (
    select 1 from pegawai p
    join sekolah s on s.kod_sekolah = permohonan.kod_sekolah
    where p.emel = auth.jwt() ->> 'email'
      and p.peranan in ('ppd_pegawai','ppd_ketua')
      and p.kod_skop = s.kod_ppd
  )
);
```

Tujuh baris ini menggantikan puluhan semakan `if` dalam kod hadapan — dan tidak boleh dipintas walaupun oleh permintaan API yang dibuat terus.

---

## 9.0 Keselamatan & Kepatuhan

Sistem ini memegang nama, kelas dan nombor telefon waris murid.

### Kawalan akses

- Log masuk terhad kepada domain DELIMa/KPM sahaja — akaun peribadi ditolak di peringkat penyedia identiti
- Peranan ditetapkan oleh pentadbir, tidak pernah dipilih sendiri oleh pengguna
- Skop data dikuatkuasakan di peringkat pangkalan data, bukan antara muka
- Sesi tamat automatik selepas tempoh tidak aktif

### Integriti rekod

- Permohonan dikunci daripada suntingan sebaik dihantar
- Setiap tindakan kelulusan disimpan dengan identiti, masa dan catatan
- Log audit tambah-sahaja; tiada peranan pengguna boleh memadamnya
- **Cincangan SHA-256** setiap dokumen dikira semasa muat naik — membuktikan fail tidak ditukar selepas kelulusan
- Surat kelulusan membawa kod QR yang mengesahkan kesahihan dalam talian

> **Data peribadi murid.** Senarai murid, maklumat waris dan surat kebenaran ibu bapa hendaklah dilayan sebagai data sensitif. Tempoh penyimpanan dan jadual pelupusan perlu ditetapkan oleh JPN, bukan oleh pembangun.

---

## 10.0 Pelan Pelaksanaan

### Fasa 1 — Penetapan keperluan (2 minggu)

- Sahkan senarai mansuh dalam SPI Bil. 9/2023
- Sahkan matriks kategori & pelulus dengan Sektor Pengurusan Sekolah JPN
- Petakan setiap medan Lampiran A kepada medan borang digital
- Terjemahkan Senarai Semak JPN Perak menjadi peraturan pengesahan borang
- Pilih satu PPD rintis dan sepuluh sekolah sukarela

### Fasa 2 — Pembinaan teras (4 minggu)

- Log masuk Google DELIMa dan pemetaan peranan
- Pendaftaran sekolah dengan padanan senarai + OTP
- Borang permohonan dengan enjin kategori dan semakan kelengkapan
- Papan pemuka setiap peringkat
- Muat naik dokumen

### Fasa 3 — Rintis lapangan (3 minggu)

- Taklimat sehari untuk sepuluh sekolah rintis dan pegawai PPD
- Jalan selari dengan proses manual sebagai jaring keselamatan
- Kumpul maklum balas mingguan; ukur masa pusingan sebenar

### Fasa 4 — Penambahbaikan & laporan (3 minggu)

- Penjanaan surat kelulusan berkod QR
- Laporan daerah & negeri, eksport Excel
- Notifikasi e-mel dan peringatan tarikh tutup
- Modul laporan pasca-lawatan

### Fasa 5 — Pelancaran berperingkat (berterusan)

- Pelancaran mengikut kelompok PPD, bukan serentak seluruh negeri
- Latih seorang penyelaras ICT di setiap PPD sebagai barisan sokongan pertama
- Semakan prestasi suku tahunan

---

## 11.0 Risiko & Mitigasi

| Risiko | Kesan | Mitigasi |
|---|---|---|
| Pegawai kembali kepada e-mel kerana lebih pantas | Tinggi | Laluan segera dalam sistem dengan justifikasi bertulis; JPN umumkan sistem sebagai saluran rasmi tunggal selepas tarikh tertentu |
| Data sekolah tidak tepat — kod sekolah, pemetaan PPD | Tinggi | Import daripada pangkalan data rasmi JPN; sekolah sahkan profil pada log masuk pertama |
| Pegawai bertukar dan tiada siapa boleh meluluskan | Sederhana | Peranan diberikan kepada jawatan, bukan individu; pentadbir boleh menukar pemegang dalam beberapa saat |
| Kuota Apps Script tercapai pada musim puncak | Sederhana | Pantau penggunaan dari fasa rintis; reka lapisan data supaya boleh ditukar |
| **Kebergantungan seorang pembangun** | Tinggi | Kod dalam repositori JPN, dokumentasi lengkap, dua pegawai dilatih sebelum pelancaran penuh |
| Capaian internet sekolah luar bandar lemah | Sederhana | PWA dengan simpanan draf luar talian |

---

## 12.0 Keputusan Yang Dipohon

1. Adakah pemetaan **kategori kepada pelulus** yang dikodkan (Bahagian F–J) menepati amalan JPN Perak?
2. Berapakah **tempoh minimum permohonan** yang hendak dikuatkuasakan bagi setiap kategori?
3. Adakah sistem dibenarkan menjadi **saluran rasmi tunggal**, atau kekal selari dengan e-mel?
4. Adakah data murid dibenarkan disimpan **di luar ekosistem Google KPM**?
5. Siapakah **pemilik sistem** di JPN, dan siapa barisan sokongan pertama di PPD?
6. **PPD manakah** dicadangkan sebagai daerah rintis, dan bila penggal yang sesuai?
7. Adakah surat kelulusan berkod QR **diterima sebagai dokumen rasmi**?

---

*eLAWATAN Perak — blueprint draf 1.0 untuk perbincangan, bukan spesifikasi muktamad.*
*Rujukan dasar: Surat Pekeliling Ikhtisas Bil. 9 Tahun 2023, Garis Panduan Lawatan Murid Sekolah.*
*Angka tempoh, kos dan jangka masa adalah anggaran perancangan yang perlu disahkan bersama JPN Perak.*
