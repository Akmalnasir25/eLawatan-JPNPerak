# Pelan — Pendaftaran Pegawai dan Log Masuk Kata Laluan

Draf perancangan, 18 September 2026. Belum dilaksanakan.

Keputusan yang telah dibuat:

- Pendaftar: **KPPD, Pengarah JPN, Pentadbir** — dan juga **pegawai penyemak**
  serta **akaun sekolah**, masing-masing dalam skop sendiri. Bahagian KPM tidak.
- **Semua** akaun beralih kepada kata laluan, termasuk sekolah.
- Akaun sedia ada **wajib** mencipta kata laluan pada log masuk berikutnya.
- Kata laluan: **minimum 12 aksara** dan ditolak jika pernah bocor.

---

## 1. Aliran log masuk

Satu medan e-mel di skrin pertama. Sistem menentukan langkah seterusnya —
pengguna tidak memilih.

| Keadaan e-mel | Skrin seterusnya |
|---|---|
| Tiada dalam senarai JPN dan tiada rekod pegawai | Ditolak: "Sila hubungi pentadbir sistem" |
| Berdaftar, **belum ada kata laluan** | Cipta Kata Laluan → OTP ke e-mel → tetapkan kata laluan → terus masuk |
| Berdaftar, sudah ada kata laluan | Medan kata laluan → masuk |
| Lupa kata laluan | OTP ke e-mel → tetapkan kata laluan baharu |
| Akaun dinyahaktifkan | Ditolak dengan sebab |

Domain `moe-dl.edu.my` dan `moe.gov.my` kekal disemak dahulu, sebelum
sebarang kod dihantar.

---

## 2. Siapa boleh mendaftarkan siapa

Dikuatkuasakan dalam fungsi pangkalan data, bukan hanya disembunyikan
pada antara muka.

| Pendaftar | Boleh daftar | Skop |
|---|---|---|
| Pentadbir sistem | Semua peranan | Seluruh negeri |
| Pengarah JPN | Pegawai JPN (penyemak) | Kod JPN sendiri |
| Pegawai JPN | Pegawai JPN (penyemak) | Kod JPN sendiri |
| KPPD | Pegawai PPD (penyemak) | Kod PPD sendiri |
| Pegawai PPD | Pegawai PPD (penyemak) | Kod PPD sendiri |
| Akaun sekolah | Pengguna sekolah | Kod sekolah sendiri |

Peraturan yang dikuatkuasakan:

1. Tiada sesiapa boleh mendaftar peranan **lebih tinggi** daripada dirinya.
   Penyemak tidak boleh mencipta pengesah; pengesah tidak boleh mencipta
   pentadbir. Hanya pentadbir boleh mencipta pengesah dan pentadbir.
2. Kod skop pegawai baharu **dipaksa sama** dengan skop pendaftar (kecuali
   pentadbir). Medan itu tidak diterima daripada borang.
3. Domain e-mel disemak; e-mel yang sudah wujud ditolak dengan mesej jelas.
4. Setiap pendaftaran, penyahaktifan dan penetapan semula direkod dalam
   log audit bersama nama pendaftar.

---

## 3. Perubahan pangkalan data (migrasi 11)

```
alter table pegawai
  add column kata_laluan_ditetapkan boolean not null default false,
  add column didaftar_oleh uuid references pegawai(id),
  add column didaftar_pada timestamptz,
  add column log_masuk_terakhir timestamptz;
```

Fungsi baharu (semuanya SECURITY DEFINER, dengan semakan peranan di dalam):

| Fungsi | Tugas |
|---|---|
| `daftar_pegawai(nama, emel, peranan, jawatan)` | Mendaftar pegawai mengikut peraturan di atas |
| `senarai_pegawai_skop()` | Senarai pegawai dalam skop pendaftar, untuk halaman urus |
| `tukar_status_pegawai(id, aktif)` | Aktif/nyahaktif; tidak boleh menyentuh peranan lebih tinggi |
| `tandai_kata_laluan_ditetapkan()` | Dipanggil selepas kata laluan berjaya disimpan |

`kata_laluan_ditetapkan` disimpan dalam jadual `pegawai` kerana kata laluan
sebenar dalam skema `auth` Supabase tidak boleh dibaca oleh aplikasi.

Peraturan RLS sedia ada tidak dilonggarkan: pegawai masih tidak boleh
`UPDATE` jadual `pegawai` secara terus.

---

## 4. Tetapan Supabase Auth

- Hidupkan log masuk e-mel + kata laluan (kini OTP sahaja).
- Panjang minimum 12 aksara dalam `config.toml` dan di papan pemuka.
- OTP kekal, tetapi hanya untuk **cipta kata laluan** dan **lupa kata laluan**.
- Semakan kata laluan bocor: guna tetapan Supabase jika tersedia pada pelan
  JPN. Jika tidak, Edge Function `semak-kata-laluan` menyemak sendiri melalui
  API julat HaveIBeenPwned — hanya lima aksara pertama cincangan SHA-1
  dihantar, **bukan kata laluan**.
- Had kadar permintaan OTP sedia ada dikekalkan.

---

## 5. Antara muka

**Skrin log masuk** — tiga keadaan seperti jadual di Bahagian 1, dengan
penunjuk kekuatan kata laluan dan mesej ralat dalam Bahasa Melayu.

**Halaman baharu: Urus Pegawai** (menu muncul mengikut peranan)

- Senarai pegawai dalam skop: nama, e-mel, peranan, status kata laluan,
  log masuk terakhir.
- Borang daftar: nama, e-mel, jawatan. Peranan dan skop ditetapkan sistem.
- Butang nyahaktif/aktifkan semula.
- Nota di skrin: pegawai baharu perlu log masuk sendiri untuk mencipta
  kata laluan; pendaftar tidak pernah melihat atau menetapkan kata laluan orang lain.

**Panel pentadbir** — tab Pegawai & Peranan sedia ada dikekalkan, ditambah
lajur status kata laluan.

---

## 6. Mod demo

Klien demo perlu menyimpan cincangan kata laluan dalam `auth.users` tiruan
dan meniru `signInWithPassword`. Tanpa ini, mod demo tidak lagi mewakili
aliran sebenar.

---

## 7. Ujian

- **Pangkalan data:** penyemak tidak boleh mencipta pengesah; skop dipaksa;
  domain ditolak; e-mel berganda ditolak; sekolah hanya dalam kod sendiri;
  log audit terisi.
- **Aliran pelayar:** daftar → log masuk pertama → OTP → cipta kata laluan →
  log keluar → log masuk kata laluan → lupa kata laluan → masuk semula.
- **Kata laluan lemah** dan **kata laluan bocor** ditolak.
- Akaun lama diarahkan mencipta kata laluan.

---

## 8. Perkara yang perlu diputuskan sebelum mula

1. **Sekolah dengan lebih daripada satu pengguna.** Spesifikasi asal
   (`02-SPESIFIKASI-SISTEM.md`) menetapkan *satu akaun mewakili satu sekolah*.
   Membenarkan sekolah mendaftar pengguna tambahan mengubah prinsip itu.
   Cadangan: tandatangan dan cop Guru Besar dipindahkan ke peringkat
   **sekolah**, bukan pada akaun individu, supaya Bahagian F kekal betul
   walaupun beberapa guru log masuk. Nama pemohon diambil daripada pengguna
   yang menghantar.
2. **Penetapan semula kata laluan oleh pendaftar.** Cadangan: tidak dibenarkan.
   Pengguna menetapkan semula sendiri melalui OTP. Pendaftar hanya boleh
   menyahaktifkan akaun.
3. **Percubaan log masuk gagal berulang.** Perlu dasar sekatan sementara.
4. **E-mel jemputan.** Supabase hanya menghantar kod OTP. Jika pegawai baharu
   perlu menerima e-mel "anda telah didaftarkan", ia kerja tambahan.
