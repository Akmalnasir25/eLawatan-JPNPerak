# Kalendar cuti Perak

Skop dipersetujui pada 19 September 2026: kalendar lawatan memaparkan latar
kuning bagi cuti umum Perak dan cuti sekolah Kumpulan B. Nama cuti berada
di bahagian bawah kotak tarikh. Lawatan kekal kelihatan, termasuk apabila
cuti umum bertindih cuti sekolah. Agenda telefon turut memaparkan hari cuti
walaupun tiada lawatan. Klik tarikh memaparkan jenis cuti dan pautan sumber.

## Data dan kemas kini

### Automasi yang dipersetujui (19 September 2026)

- Skop: Supabase Cron memanggil Edge Function setiap hari, mengambil tahun
  semasa Malaysia dan tahun berikutnya untuk Perak / Kumpulan B. Tahun
  dikira semasa pelaksanaan, bukan dimasukkan setiap tahun. Tiada MCP,
  dependency baharu atau maklumat murid dihantar kepada API.
- Respons dinormalisasi dan disimpan sebagai calon semakan per rekod.
  Label `confirmed` pembekal tidak bermaksud telah disahkan rasmi.
  Admin menerima atau menolak calon selepas membandingkan data lama/baharu;
  hanya rekod yang diterima dipaparkan kepada pengguna. Tiada taip semula
  tarikh atau pengambilan manual tahunan.
- Muatan sama tidak menghasilkan calon/notifikasi pendua. Pindaan sumber
  menghasilkan semakan baharu; keputusan versi lama ditolak jika calon
  berubah ketika admin menyemak. Rekod yang hilang daripada API tidak
  dipadam secara automatik. Salinan rasmi 2026 kekal sebagai sandaran.
- Admin boleh menarik balik rekod API yang tersilap diterima tanpa memadam
  sejarah, atau menerima semula rekod ditolak selepas semakan baharu.
  Salinan rujukan rasmi 2026 tidak diubah oleh tindakan API ini; rekod API
  dengan jenis dan julat sama tidak menggandakan label salinan tersebut.
- Kegagalan, respons kosong dan data belum diterbitkan tidak menimpa data
  diterima. Cubaan berikutnya berlaku esok. Paparan admin membezakan cubaan
  terakhir, kejayaan, calon menunggu dan data diterima; ketiadaan data bukan
  bukti tiada cuti. Notifikasi perubahan hanya dalam sistem.
- Backend menguatkuasakan admin aktif bagi keputusan. RPC kemasukan dan
  kunci kerja hanya service_role; token Cron khusus disimpan dalam Vault
  dan Edge secrets. Tiada rahsia dalam browser atau repository.
- Kunci kerja luput menghalang kerja serentak; penyimpanan setiap sumber
  atomik. Gangguan satu sumber tidak menghalang tiga sumber lain.
- Pemasangan Cron dibuat sekali selepas deployment, berasingan daripada
  migration jadual supaya demo/PGlite tidak memerlukan pg_cron/pg_net.
  Demo memaparkan status belum berjalan, bukan berpura-pura sudah berjadual.

Kriteria penerimaan: pertukaran tahun Malaysia automatik; skop negeri/kumpulan
betul; ulang muatan tidak menggandakan rekod; data diterima kekal selepas
ralat; admin sahaja boleh menerima/menolak; versi lapuk gagal dengan mesej
jelas; tarikh baharu diterima muncul kuning pada kalendar; paparan separa,
ralat, retry dan skrin telefon boleh digunakan.

Pengesahan: ujian normalisasi, RPC dengan RLS sebenar dalam PGlite, binaan
TypeScript, semakan Edge Function dan semakan UI demo. Pengaktifan production
memerlukan backend sasaran, secrets dan Cron; ia bukan sebahagian ujian demo.
Recovery: hentikan jadual Cron, kekalkan jadual/data untuk siasatan, deploy
semula frontend terdahulu jika perlu. Jangan drop jadual atau reset data.

- `src/lib/cuti-kalendar.ts` menyimpan salinan rujukan 2026 beserta pautan
  BKPP JPM dan KPM. Cuti awal Januari bersumber takwim sesi 2025/2026;
  cuti 18 Mac bersumber pengumuman tambahan KPM. Cuti gantian Perak
  dimasukkan secara nyata; tiada enjin penjana cuti gantian umum.
- Integrasi REST berjadual disediakan melalui `selaras-cuti`. Tiada data
  sekolah, peserta atau lawatan dihantar kepada penyedia kalendar luar.
  Langkah pengaktifan sekali dan recovery: [infra/CUTI-AUTO.md](infra/CUTI-AUTO.md).
- Respons API Malaysia Calendar yang diperiksa pada 19 September 2026:
  `/v1/holidays?year=2027&state=perak` mengembalikan 18 rekod, termasuk
  sumber komuniti dan tarikh tentative; `/v1/school/holidays?year=2027&group=B`
  mengembalikan `dataAvailable: false`. Jangan anggap senarai kosong sebagai
  tiada cuti, atau menganggap label confirmed API sebagai pengesahan rasmi.
- Data 2027 belum diterima untuk paparan umum. UI menyatakan jenis cuti
  yang belum ada dan senarai separa; perubahan tahun tidak menyalin pola
  tahun sebelumnya. Selepas Cron aktif, pengambilan berlaku sendiri; admin
  hanya menyemak calon baharu/berubah dalam Pentadbiran > Kalendar Cuti.
- Respons API 2026 memasukkan Hari Raya Qurban hari kedua bagi Perak;
  rekod itu tidak digunakan. Salinan sistem mengikut senarai rasmi Perak.

## Batasan

### Peringatan B1.4 (keputusan susulan 19 September 2026)

Tarikh mula atau tamat keseluruhan pada Sabtu pertama, ketiga atau kelima mencetuskan
makluman serta-merta sebelum ringkasan julat tarikh, berdasarkan tarikh
yang sedang dipilih sebelum respons simpanan pelayan. Rujukan ialah perenggan
3 Surat Siaran KPM Bil. 2 Tahun 2016; pautan salinan surat dilabel sebagai
laman pihak ketiga. Pengiraan mengikut turutan Sabtu, bukan baris kalendar.

Ini makluman sahaja: pemohon masih boleh ke langkah berikutnya dan proses
permohonan biasa, termasuk program KPM pada tarikh berkenaan. Tiada syarat
justifikasi baharu atau sekatan penghantaran/kelulusan ditambah. Sabtu di
tengah perjalanan tidak mencetuskan makluman. Kedua-dua hujung julat keseluruhan
disemak, bukan sempadan setiap destinasi. Contoh 2–7 November 2026 memberi
peringatan tarikh tamat (Sabtu pertama), manakala 2–8 November tidak.
Lawatan sehari memaparkan satu peringatan bertanda tarikh mula dan tamat.

Sebelum perubahan ini, B1.4 hanya memaparkan julat tarikh dan bilangan hari
sebelum lawatan. Kini kotak peringatan menyatakan tarikh yang terlibat,
kedudukannya sebagai tarikh mula/tamat, turutan Sabtu dan rujukan surat.

| Contoh julat tahun 2026 | Paparan yang dijangka |
| --- | --- |
| 2–7 November | Peringatan tarikh tamat: Sabtu pertama |
| 2–8 November | Tiada peringatan; 7 November hanya di tengah perjalanan |
| 7–8 November | Peringatan tarikh mula: Sabtu pertama |
| 7 November sahaja | Satu peringatan untuk tarikh mula dan tamat |
| 7–21 November | Dua tarikh dalam kotak peringatan: Sabtu pertama dan ketiga |
| 14–28 November | Tiada peringatan ini; Sabtu kedua dan keempat |

Fail terlibat: `src/halaman/langkah/Langkah2.tsx` memaparkan makluman dan
menyimpan pilihan medan tarikh sementara; `src/lib/peringatan-sabtu.ts`
mengira kedua-dua hujung julat tanpa bergantung pada API cuti atau rangkaian.
Medan tarikh tamat turut bergerak ke hadapan apabila tarikh mula yang dipilih
melepasi tarikh tamat, selaras dengan kekangan simpanan sedia ada.

Pengesahan: 7 ujian `ujian/peringatan-sabtu.test.mjs` dan build lulus.
Chrome demo mengesahkan 2–7 November memaparkan peringatan tarikh tamat
sebaik sahaja tarikh hingga dipilih, sebelum simpanan pelayan selesai.
Pilihan 7 November sebagai tarikh mula juga diuji; butang Seterusnya masih
membuka Langkah 3 (Kewangan). Tarikh asal draf demo dipulihkan selepas ujian.

Penanda cuti tidak meluluskan atau melarang lawatan. Tiada sekatan Sabtu
minggu 1/3/5 atau Ahad ditambah; tafsiran operasi JPN, pengecualian dan
lawatan berbilang hari masih perlu disahkan sebelum sebarang sekatan ditambah.
Perubahan borang hanya menyediakan makluman. API kelulusan dan peraturan
pangkalan data tidak diubah.

Data cuti kekal tersedia jika permintaan lawatan gagal. Status lawatan
yang belum tersedia tidak dipaparkan sebagai sifar. Respons bulan lama
diabaikan selepas pengguna berpindah bulan.

## Pengesahan

### Masa perjalanan B1.4 (19 September 2026)

- Tarikh destinasi dikekalkan. Perjalanan keseluruhan diisi sekali: bahagian
  pergi (tarikh mula automatik daripada destinasi paling awal + masa bertolak)
  dan pulang (tarikh/masa bertolak pulang + tarikh/anggaran masa tiba di sekolah).
- Tarikh pulang lalai kepada destinasi terakhir. Tarikh tiba lalai kepada tarikh
  pulang sehingga pemohon mengubahnya; kedua-duanya boleh diselaraskan.
- Lima kolum nullable baharu pada `permohonan`, migration
  `20260919000200_masa_perjalanan.sql`. Tiada perubahan RLS atau data lama.
  Tarikh agregat destinasi, kiraan tempoh permohonan dan peringatan Sabtu kekal
  berasaskan tarikh destinasi; tarikh ketibaan ialah maklumat tambahan perjalanan.
- Peringatan segera, tidak menyekat langkah seterusnya: tanpa penginapan,
  tarikh tiba selepas hari mula dan masa tiba diisi mencetuskan perkara 4.1.3.
  23:59 pada hari mula tidak mencetuskan; 00:00 hari berikutnya mencetuskan.
  Urutan pulang/tiba sebelum perjalanan sebelumnya turut diberi peringatan.
- Tiada peringatan umum bagi lawatan bermalam. Paparkan amaran hanya apabila
  semakan masa/urutan mengesan isu; masa tamat aktiviti tidak direkodkan, jadi
  perkara 4.1.4 tidak dinilai daripada masa ketibaan. Tiada had masa bertolak
  direka. Lanjutan waktu tetap memerlukan pertimbangan pelulus.
- Ringkasan disertakan pada paparan permohonan pegawai dan cetakan Lampiran A.
  Label pergi dan ketibaan menggunakan "sekolah/lokasi ditetapkan" supaya
  tempat berkumpul seperti PPD atau lokasi lain turut diliputi.
  Masa yang belum diisi tidak diberi nilai andaian. Waktu menggunakan waktu
  Malaysia. Semakan ini tidak mengesahkan jadual zon waktu luar negara.
- Sumber: SPI KPM Bil. 9 Tahun 2023, halaman bercetak 6, perkara 4.1.3–4.1.4
  (PDF rasmi KPM yang disemak dalam sesi ini).
- Uji: `node --test ujian/masa-perjalanan.test.mjs ujian/peringatan-sabtu.test.mjs`.
  11/11 ujian dan build lulus dalam persekitaran tempatan. Pelayar demo
  mengesahkan amaran tengah malam, simpanan kekal selepas reload dan butang
  Seterusnya yang masih boleh digunakan ketika amaran dipaparkan.
  Migration production belum dijalankan. Demo memuat migration baharu secara
  automatik selepas reload, tanpa reset data.

`node --test ujian/cuti-kalendar.test.mjs` menyemak sempadan julat,
pertindihan, cuti tambahan/gantian, skop Perak dan tahun tanpa data.
Jalankan `npm.cmd run build` serta semakan desktop/telefon untuk perubahan UI.

Automasi: `node --test ujian/cuti-api.test.mjs ujian/cuti-auto.test.mjs
ujian/cuti-handler.test.mjs ujian/cuti-kalendar.test.mjs` (satu baris command)
meliputi 32 ujian. Semua lulus pada 19 September 2026, termasuk pengesahan
API, sempadan tahun Malaysia, RLS, idempotency, audit, versi lapuk,
penarikan balik, kunci luput dan kegagalan separa. Build production dan
semakan Deno bagi Edge Function lulus. Tiada dependency baharu.

Ujian keseluruhan: 177/194 lulus. Terdapat 17 kegagalan sedia ada berkaitan
`gen_random_bytes(integer)` dalam laluan kelulusan/QR. Ujian asas
`aliran.test.mjs` tanpa migration cuti baharu menghasilkan ralat sama
(53/62 lulus, 9 gagal). Fail/peraturan kelulusan tidak diubah dalam skop ini.

Runtime demo mengesahkan migration baharu dan panel status kosong berfungsi.
Panel admin disemak pada desktop dan emulasi telefon 390px tanpa limpahan
mendatar. Pemilihan tahun 2027 memaparkan status belum diambil dengan jelas.
Pengaktifan Cron/Edge pada backend sebenar belum dibuat; SQL pengaktifan
belum diuji pada pg_cron/pg_net sebenar. Semakan rutin harian production
dan aliran menerima calon melalui browser masih perlu disahkan di staging.

Semakan 19 September 2026: 6/6 ujian tarikh dan build lulus. Chrome demo
memaparkan penanda cuti sekolah 1–6 September, nama Hari Malaysia di bawah
kotak 16 September serta butiran/sumber apabila dipilih. Emulasi lebar 390px
memaparkan agenda cuti dan tiada limpahan mendatar (scrollWidth = innerWidth).
Januari 2027 memaparkan makluman data cuti belum tersedia. Telefon fizikal
dan runtime production belum diuji.
