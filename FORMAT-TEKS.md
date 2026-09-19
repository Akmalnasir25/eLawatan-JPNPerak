# Format Tujuan Lawatan dan Nama Ketua Rombongan

Skop: suntingan pemohon pada Langkah 1 dan Langkah 4 sahaja. Tiada migrasi,
normalisasi ketika membaca data, atau perubahan pukal rekod lama/diluluskan.
Nama tempat, alamat dan catatan bebas tidak disentuh.

Tujuan Lawatan diselaraskan selepas medan disunting dan kehilangan fokus.
Kata sendi/hubung lazim kekal kecil kecuali perkataan pertama. Nama huruf
besar dalam tajuk bercampur (AEON), singkatan bertitik (A.E.O.N.) dan ejaan
bercampur (UiTM/i-City) dikekalkan. Tajuk seluruhnya besar ditukar kepada
format tajuk kecuali singkatan dikenali atau singkatan pendek sehingga tiga
huruf. Sistem tidak dapat mengenal pasti semua nama khas secara pasti;
pemohon boleh memilih Kekalkan format asal atau membetulkan ejaan sendiri.
Nota semakan muncul apabila format berubah, tanpa pop-up.

Nama Ketua Rombongan disimpan mengikut input asal dahulu. Selepas suntingan,
sistem menawarkan cadangan; hanya Gunakan cadangan menyimpan format baharu.
Kekalkan nama asal menutup cadangan. bin/binti/bt./b./a/l/a/p/anak dikekalkan
sebagai perkataan, tanpa pengembangan singkatan. Inisial bertitik dan ejaan
bercampur dihormati. Semakan dokumen pengenalan kekal tanggungjawab pemohon.
Kegagalan menyimpan mengekalkan input dan menyediakan cubaan semula.

Paparan sistem, Lampiran A dan Surat Kelulusan membaca nilai tersimpan yang
sama. Tiada pengubah format tambahan ketika mencetak, jadi rekod lama tidak
berubah hanya kerana dicetak. Penciptaan ketua baharu dikongsi semasa permintaan
bertindih untuk mengelakkan dua rekod ketua apabila beberapa medan disunting.

Ujian: `node --test ujian/format-teks.test.mjs` dan `npm.cmd run build`.

Semakan pelaksanaan: 5/5 ujian format dan build lulus. Laluan cetakan
disemak dalam kod: Lampiran A dan Surat Kelulusan membaca tujuan/nama
tersimpan tanpa menukar huruf. Ujian interaksi terima/abaikan, simpan/reload
dan cetakan dalam pelayar belum disahkan kerana sambungan pelayar tidak
tersedia semasa pelaksanaan ini. Tiada deployment atau perubahan data lama.
