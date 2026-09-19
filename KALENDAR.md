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

Penanda cuti tidak meluluskan atau melarang lawatan. Tiada sekatan Sabtu
minggu 1/3/5 atau Ahad ditambah; tafsiran operasi JPN, pengecualian dan
lawatan berbilang hari masih perlu disahkan. Fail borang, API kelulusan
dan peraturan pangkalan data tidak diubah.

Data cuti kekal tersedia jika permintaan lawatan gagal. Status lawatan
yang belum tersedia tidak dipaparkan sebagai sifar. Respons bulan lama
diabaikan selepas pengguna berpindah bulan.

## Pengesahan

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
