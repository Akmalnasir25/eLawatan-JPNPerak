# Kad papan pemuka dan senarai bertapis

Enam kad boleh diklik, termasuk nilai sifar. Komputer: tiga lajur; telefon:
dua lajur. Pautan `/senarai?kumpulan=...` memulihkan penapis selepas reload
atau Back. Penapis aktif ditunjukkan dan boleh dibuang.

- `draf`: DRAF dan DIKEMBALIKAN (sekolah).
- `tindakan`: peringkat pengguna termasuk pemangkuan (pegawai).
- `proses`: semua status MENUNGGU.
- `lulus`: DILULUSKAN dan SELESAI.
- Jumlah: semua rekod dalam skop.
- `laporan_perlu`: DILULUSKAN, tarikh_tamat sebelum hari ini di Malaysia,
  dan tiada rekod laporan pasca. Hari terakhir lawatan belum dikira tertunggak.
- `laporan_siap`: rekod laporan pasca telah wujud; bukan status SELESAI sahaja.

Kiraan dan senarai berkongsi fungsi penapis. Kedua-dua sumber dipaginasi hingga
habis (500 setiap halaman), menggantikan had 200 rekod papan pemuka. RLS
permohonan/laporan sedia ada kekal mengawal skop sekolah, PPD, JPN dan admin.
Kegagalan membaca mana-mana sumber dipaparkan sebagai ralat, bukan kiraan sifar.

Sekolah boleh membuka Isi laporan. Pegawai memantau melalui Lihat permohonan;
Lihat laporan membuka Lampiran G sedia ada untuk laporan siap. Tiada perubahan
kuasa menghantar laporan. Panel sisi laporan lama dibuang untuk mengelakkan
kiraan bercanggah dan pautan yang hanya membuka rekod pertama.

Pengesahan: `node --test ujian/papan-pemuka.test.mjs` dan `npm.cmd run build`.
Ujian meliputi sempadan hari tamat, status dikecualikan, laporan sebenar,
pemangkuan, 1201 permohonan/601 laporan dan kegagalan sumber laporan.

Semakan 19 September 2026: build dan 4/4 ujian lulus. Chrome demo memaparkan
enam kad; klik kad proses bernilai 2 membuka 2 daripada 4 rekod, kad laporan
bernilai 0 membuka mesej kosong yang tepat, dan Back kembali ke papan pemuka.
Paparan sempit yang dilaporkan pelayar ialah 487px: dua lajur tanpa limpahan
mendatar. Telefon fizikal dan deployment production belum diuji.
