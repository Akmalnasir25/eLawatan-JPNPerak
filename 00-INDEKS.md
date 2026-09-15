# eLAWATAN Perak — Dokumentasi Projek

Sistem Permohonan dan Kelulusan Lawatan Murid Sekolah secara atas talian
di bawah Jabatan Pendidikan Negeri Perak, menerusi kemudahan Google
pada platform DELIMa 3.0.

---

## Senarai Dokumen

| Fail | Kandungan |
|---|---|
| `01-BLUEPRINT.md` | Blueprint teknikal penuh — masalah, cadangan, seni bina, model data, pelan pelaksanaan |
| `02-SPESIFIKASI-SISTEM.md` | Spesifikasi sistem sebenar — peranan, status, rantaian kelulusan, aliran OTP, skema pangkalan data |
| `03-RUJUKAN-DASAR.md` | SPI berkaitan, Lampiran A–G, nisbah pengiring, Senarai Semak JPN Perak |
| `04-KOS.md` | Kos pembangunan (langganan AI), kos operasi tahunan, kadar domain |
| `05-SLAID-PITCHING.md` | Susunan 30 slaid pembentangan |

---

## Status Projek

| Perkara | Status |
|---|---|
| Sesi libat urus JPN Perak | Selesai — 15 September 2026 |
| Blueprint | Siap |
| Prototaip demo berfungsi | Siap |
| Keputusan backend | **Supabase** (Opsyen A) |
| Rantaian kelulusan | Dikemas kini selepas sesi — dua peringkat setiap pejabat |
| Pendaftaran sekolah | Padanan senarai JPN + pengesahan OTP |

---

## Keputusan Utama Yang Telah Dibuat

1. **Backend: Supabase** — Postgres, Auth, Storage, Row Level Security.
   Laravel dipertimbangkan tetapi ditolak buat masa ini kerana penyelenggara
   tunggal tidak berpengalaman PHP, dan frontend statik Supabase boleh
   diletakkan terus dalam hosting JPN sedia ada tanpa memasang apa-apa.

2. **Frontend: React 18 + TypeScript + Vite + TailwindCSS**, PWA,
   di-hos sebagai fail statik.

3. **Satu akaun per sekolah** — e-mel rasmi sekolah mewakili sekolah.
   Bahagian F (Ulasan Guru Besar) ditandatangani pada salinan bercetak.

4. **Dua peringkat kelulusan di setiap pejabat** — penyemak dan pengesah.

5. **Permohonan ke JPN wajib melalui PPD** — tiada laluan pintas.

---

## Perkara Yang Masih Perlu Disahkan

- [ ] Senarai mansuh dalam SPI Bil. 9/2023 — pekeliling lama mana yang masih berkuat kuasa
- [ ] Label bahagian borang: edaran JPN Perak guna F/G/H/I/J; salinan PDF SPI guna G/H/I/J
- [ ] Struktur OU akaun DELIMa dan capaian Directory API
- [ ] Pemilik sistem di JPN dan barisan sokongan pertama di PPD
- [ ] PPD rintis dan penggal permulaan
- [ ] Penerimaan surat kelulusan berkod QR sebagai dokumen rasmi
- [ ] Subdomain di bawah `moe.gov.my` — proses dan tempoh permohonan

---

*Dokumentasi ini disediakan oleh Muhammad Akmal bin Nasir.
Kemas kini terakhir: 15 September 2026.*
