# Pengaktifan cuti automatik sekali sahaja

Kod ini menyediakan pengambilan harian bagi tahun semasa dan tahun berikutnya mengikut waktu Malaysia. Admin menyemak calon baharu atau berubah; pengambilan API tidak menerbitkan tarikh secara automatik. Tahun sasaran berubah sendiri apabila tahun bertukar. Data kosong, API gagal atau pengesahan gagal tidak memadam cuti yang telah diterima.

## Sumber API dan cara mendapatkannya

Pembekal ialah projek pihak ketiga **Malaysia Calendar API oleh Junhui20**:

- Kod sumber dan README: https://github.com/Junhui20/malaysia-calendar-api
- Dokumentasi pembekal: https://mycal-web.pages.dev/docs
- Spesifikasi OpenAPI: https://github.com/Junhui20/malaysia-calendar-api/blob/main/openapi.yaml
- URL asas REST: `https://mycal-api.huijun00100101.workers.dev/v1`

eLAWATAN memanggil REST terus dari backend. Pemasangan LobeHub, MCP server
atau SDK npm tidak diperlukan. Pelaksanaan semasa tidak menghantar API key
kepada pembekal; `CUTI_CRON_TOKEN` ialah rahsia dalaman untuk melindungi
fungsi eLAWATAN sendiri, bukan kunci yang perlu diperoleh daripada Junhui20.

| Data | Endpoint yang digunakan | Skop |
| --- | --- | --- |
| Cuti umum | `GET /holidays?year=2027&state=perak` | Persekutuan dan negeri Perak |
| Cuti sekolah | `GET /school/holidays?year=2027&group=B` | Kumpulan B, ditapis lagi mengikut pengecualian negeri |

Contoh semakan respons awam melalui terminal (tahun 2027 hanya contoh):

```sh
curl "https://mycal-api.huijun00100101.workers.dev/v1/holidays?year=2027&state=perak"
curl "https://mycal-api.huijun00100101.workers.dev/v1/school/holidays?year=2027&group=B"
```

Kod URL, penapisan dan pengesahan respons berada dalam
[`supabase/functions/_shared/cuti-api.ts`](../supabase/functions/_shared/cuti-api.ts).
[`selaras-cuti/index.ts`](../supabase/functions/selaras-cuti/index.ts) mengira
tahun semasa dan tahun berikutnya mengikut `Asia/Kuala_Lumpur` pada setiap
pelaksanaan. Tiada angka tahun yang perlu disunting setiap Januari.

API hanya boleh memberikan data yang telah diterbitkan pembekalnya. Respons
kosong, `dataAvailable: false`, tarikh sementara dan sumber komuniti mesti
dibezakan daripada cuti yang sudah disahkan. Semak dengan
[BKPP JPM](https://www.kabinet.gov.my/) dan [KPM](https://www.moe.gov.my/).
Pautan serta contoh endpoint disemak terhadap README pembekal pada
19 September 2026; ketersediaan data tahun berikutnya tidak dijamin.

## Perubahan dalam eLAWATAN

- `/kalendar`: cuti umum Perak dan cuti sekolah berwarna kuning, nama cuti
  di bawah kotak tarikh, butiran sumber, agenda telefon dan makluman data
  tahun/jenis yang belum tersedia. Lawatan masih mengikut skop capaian asal.
- `/pentadbir?tab=kalendar`: status pengambilan, tapisan tahun, perbandingan
  rekod lama/baharu, terima/tolak dan tarik balik rekod API dengan audit.
- Migration `20260919000100_cuti_auto.sql`: simpanan calon/data diterima,
  status sumber, kunci kerja dan sejarah keputusan; keputusan memerlukan
  admin aktif dan pengambilan memerlukan peranan perkhidmatan.
- Edge Function `selaras-cuti`: empat permintaan bagi dua tahun dan dua
  jenis cuti; respons disahkan sebelum disimpan. Muatan berulang tidak
  menggandakan notifikasi, manakala kegagalan mengekalkan salinan terakhir.
- [`aktifkan-cuti-cron.sql`](aktifkan-cuti-cron.sql): jadual harian 03:00
  Malaysia selepas pengaktifan sekali. Ia berasingan daripada migration.

Salinan rujukan rasmi 2026 dikekalkan. Tiada peraturan melarang lawatan pada
Sabtu minggu 1/3/5 atau Ahad ditambah. Commit/push kod juga tidak menjalankan
deployment, migration production atau mengaktifkan Cron.
Spesifikasi, keputusan skop dan bukti ujian: [KALENDAR.md](../KALENDAR.md).

## Prasyarat dan urutan pengaktifan

Pengaktifan memerlukan backend Supabase yang berjalan. Vite, demo PGlite dan `npm run dev` tidak menjalankan Cron atau Edge Function. Jangan menganggap paparan kalendar tempatan membuktikan jadual awan aktif.

1. Sahkan projek Supabase sasaran dan buat sandaran yang boleh dipulihkan. Uji migration `20260919000100_cuti_auto.sql` serta semakan akses di staging dahulu. Perubahan production memerlukan persetujuan pemilik sistem.
2. Jana token rawak kriptografi sekurang-kurangnya 32 aksara (disyorkan 32 bait rawak dalam hex). Simpan secara selamat; jangan masukkan token dalam Git, screenshot, log atau bundle frontend.
3. Dalam Supabase Edge Function Secrets, tetapkan `CUTI_CRON_TOKEN` kepada token tersebut. Fungsi turut memerlukan `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` yang disediakan oleh hosted Supabase. Token Cron khusus ini bukan service-role key.
4. Dalam Supabase Vault, cipta tepat satu rahsia bernama `elawatan_url` dengan URL asas projek, tanpa slash hujung; cipta `elawatan_cuti_token` dengan token sama. Gunakan Dashboard atau saluran rahsia yang diluluskan. Skrip pengaktifan tidak mengandungi nilai rahsia.
5. Deploy Edge Function `selaras-cuti` dengan `verify_jwt = false` daripada konfigurasi projek. JWT platform dimatikan kerana fungsi mengesahkan sendiri header `x-cuti-token`; jangan deploy tanpa kod pengesahan token tersebut.
6. Uji POST sekali melalui alat ujian backend yang menyimpan header secara selamat. Endpoint ialah `/functions/v1/selaras-cuti`, body `{}`, header `Content-Type: application/json` dan `x-cuti-token`. Permintaan tanpa token mesti menerima 401; token belum dikonfigurasi menghasilkan 503. Permintaan sah menghasilkan 200, atau 202 jika satu kerja masih berjalan. Ralat pangkalan data menghasilkan 500; jangan anggap berjaya.
7. Selepas ujian staging lulus dan pengaktifan sasaran diluluskan, jalankan `infra/aktifkan-cuti-cron.sql` menggunakan SQL Editor sebagai pentadbir projek. Ia mengaktifkan `pg_cron`/`pg_net`, mengesahkan Vault dan menggantikan tugas bernama `elawatan-cuti-harian` jika sudah wujud. Semak Cron menggunakan zon masa UTC: jadual `0 19 * * *` bersamaan 03:00 pagi Malaysia pada hari berikutnya.

Tiada langkah di atas dijalankan secara automatik hanya kerana fail ini wujud. Selepas pengaktifan sekali, tiada input tahun atau tarikan API tahunan diperlukan.

## Bukti penyelarasan benar-benar berjalan

- Semak `cron.job`: tugas `elawatan-cuti-harian` mesti aktif dengan jadual yang betul. `cron.job_run_details` hanya membuktikan panggilan SQL dihantar; ia tidak membuktikan Edge Function berjaya.
- Semak respons HTTP `net._http_response` dan log Edge Function. `status: separa` bermaksud ada tahun/sumber belum tersedia atau gagal; bilangan sumber dipulangkan tanpa data cuti atau rahsia. HTTP 500 bermaksud kegagalan pangkalan data walaupun sumber lain mungkin sempat disimpan.
- Pada tab Kalendar pentadbir, sahkan masa cubaan dan hasil setiap kombinasi tahun/jenis berubah, serta masa berjaya hanya berubah selepas sumber sah diterima. Semak semula selepas jadual harian sebenar, bukan setakat ujian manual.
- Ulang permintaan sah dengan data sama: calon dan notifikasi tidak patut berganda. Cubaan serentak menerima 202 apabila kunci masih aktif; kunci yang tertinggal luput selepas lima minit.
- Jika status gagal berulang, semak sambungan API, bentuk respons dan log backend. Data sekolah dengan bilangan hari tidak sepadan julat ditolak supaya sistem tidak mewarnakan hari tambahan secara salah. Semak sumber rasmi sebelum menerima calon.

Jangan paparkan keseluruhan `vault.decrypted_secrets` atau kandungan header dalam semakan. Tiada emel dihantar oleh proses penyelarasan ini; calon baharu menghasilkan notifikasi dalaman untuk admin aktif.

## Henti atau pulihkan

Untuk menghentikan jadual tanpa memadam data, jalankan:

```sql
select cron.unschedule(jobid)
from cron.job
where jobname = 'elawatan-cuti-harian';
```

Permintaan yang sudah dihantar mungkin masih selesai. Kekalkan jadual cuti, calon, keputusan dan salinan diterima. Baiki masalah di staging, kemudian jalankan skrip pengaktifan semula. Jika token perlu ditukar, hentikan jadual dahulu, ubah Edge Secret dan Vault kepada token baharu yang sama, uji, kemudian aktifkan semula. Perubahan token dan operasi production mesti melalui persetujuan pemilik sistem.
