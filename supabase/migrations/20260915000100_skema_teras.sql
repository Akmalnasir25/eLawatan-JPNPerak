-- ════════════════════════════════════════════════════════════════════
-- eLAWATAN Perak — Skema Teras
-- Rujukan: SPI KPM Bil. 9 Tahun 2023, Lampiran A–G
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Jenis tersuai ───────────────────────────────────────────────────

create type peranan_t as enum (
  'sekolah', 'ppd_pegawai', 'ppd_ketua',
  'jpn_pegawai', 'jpn_pengarah', 'kpm', 'admin'
);

create type kategori_t as enum (
  'DALAM_DAERAH', 'ANTARA_DAERAH', 'ANTARA_NEGERI', 'LUAR_NEGARA'
);

create type status_t as enum (
  'DRAF',
  'MENUNGGU_PPD_SEMAK', 'MENUNGGU_PPD_SAH',
  'MENUNGGU_JPN_SEMAK', 'MENUNGGU_JPN_SAH',
  'MENUNGGU_KPM',
  'DIKEMBALIKAN', 'DITOLAK', 'DILULUSKAN', 'SELESAI', 'BATAL'
);

create type tindakan_t as enum ('SOKONG', 'KEMBALI', 'TOLAK');

create type peserta_kategori_t as enum (
  'KETUA_ROMBONGAN', 'MURID', 'GURU_PENGIRING',
  'BUKAN_MURID', 'ANGGOTA_KESELAMATAN', 'PEMUNGUT_BAYARAN'
);

create type pengangkutan_t as enum (
  'BAS_PERSIARAN', 'VAN_PERSIARAN', 'BAS_SEKOLAH_SEWA',
  'BAS_SEKOLAH_KPM', 'VAN_KPM', 'COASTER',
  'KENDERAAN_TENTERA', 'KENDERAAN_POLIS',
  'KENDERAAN_GURU', 'KENDERAAN_IBU_BAPA'
);

-- Kategori murid bagi nisbah pengiring (Lampiran C)
create type nisbah_kategori_t as enum ('a', 'b', 'c', 'd', 'e', 'f', 'g');

-- ── Jadual rujukan ──────────────────────────────────────────────────

create table ppd (
  kod_ppd  text primary key,
  nama     text not null,
  kod_jpn  text not null default 'A',
  emel     text,
  telefon  text,
  aktif    boolean not null default true
);
comment on table ppd is 'Pejabat Pendidikan Daerah. kod_jpn A = Perak.';

create table sekolah (
  kod_sekolah     text primary key,
  nama            text not null,
  jenis           text not null default 'RENDAH',
  emel            text not null unique,
  kod_ppd         text not null references ppd (kod_ppd),
  kod_jpn         text not null default 'A',
  nama_guru_besar text,
  alamat          text,
  poskod          text,
  bandar          text,
  negeri          text not null default 'Perak',
  telefon         text,
  faks            text,
  aktif           boolean not null default true,
  dicipta_pada    timestamptz not null default now()
);
create index sekolah_kod_ppd_idx on sekolah (kod_ppd);
create index sekolah_emel_idx on sekolah (lower(emel));
comment on table sekolah is
  'Senarai rasmi sekolah JPN. Menentukan e-mel mana yang sah untuk mendaftar.';
comment on column sekolah.jenis is
  'RENDAH | MENENGAH | PRASEKOLAH | KHAS | TEKNIK | SBP | AGAMA';

create table pegawai (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid unique references auth.users (id) on delete set null,
  emel         text not null unique,
  nama         text not null,
  peranan      peranan_t not null,
  kod_skop     text,
  jawatan      text,
  telefon      text,
  aktif        boolean not null default true,
  dicipta_pada timestamptz not null default now()
);
create index pegawai_emel_idx on pegawai (lower(emel));
create index pegawai_peranan_skop_idx on pegawai (peranan, kod_skop);
comment on column pegawai.kod_skop is
  'kod_sekolah | kod_ppd | kod_jpn | null. Peranan diberi kepada jawatan, bukan individu.';

-- Lampiran C — nisbah pengiring kepada murid
create table nisbah_pengiring (
  kod              nisbah_kategori_t primary key,
  keterangan       text not null,
  bil_pengiring    int not null default 1,
  bil_murid        int not null,
  had_pengecualian int not null,
  susunan          int not null
);

-- Lampiran D — Bahagian Penyelaras lawatan antarabangsa
create table bahagian_penyelaras (
  id            serial primary key,
  jenis_sekolah text not null,
  bahagian      text not null
);

-- Senarai Semak BSS Pin.1/2023 — jenis dokumen sokongan
create table jenis_dokumen (
  kod          text primary key,
  nama         text not null,
  kumpulan     text not null,
  bil_salinan   int not null default 1,
  perlu_sah_kj  boolean not null default false,
  dijana_sistem boolean not null default false,
  syarat        jsonb not null default '{}'::jsonb,
  susunan       int not null default 0,
  aktif         boolean not null default true
);
comment on column jenis_dokumen.dijana_sistem is
  'Dijana oleh sistem (cth. Lampiran A) — tidak perlu dimuat naik sekolah.';
comment on column jenis_dokumen.kumpulan is
  'PERMOHONAN | KENDERAAN | PESERTA | KESELAMATAN | LUAR_NEGARA';
comment on column jenis_dokumen.syarat is
  'Kosong = sentiasa wajib. Kunci: pengangkutan[], kategori[], ciri[] — dipadan dengan borang.';

-- Tetapan boleh ubah oleh pentadbir
create table tetapan (
  kunci            text primary key,
  nilai            jsonb not null,
  nota             text,
  dikunci          boolean not null default false,
  dikemaskini_pada timestamptz not null default now()
);
comment on column tetapan.dikunci is
  'Dikunci = terikat SPI, pentadbir tidak boleh ubah dari antara muka.';

-- ── Permohonan ──────────────────────────────────────────────────────

create table permohonan (
  id          uuid primary key default gen_random_uuid(),
  no_rujukan  text unique,
  kod_sekolah text not null references sekolah (kod_sekolah),
  kod_ppd     text not null,
  kod_jpn     text not null default 'A',
  status      status_t not null default 'DRAF',

  -- Bahagian B1
  kategori        kategori_t,
  tujuan          text,
  pengangkutan    pengangkutan_t [] not null default '{}',
  nisbah_kategori nisbah_kategori_t not null default 'f',

  -- Ciri tambahan yang mencetuskan dokumen
  ada_penginapan          boolean not null default false,
  ada_risiko_tinggi       boolean not null default false,
  ada_aktiviti_air        boolean not null default false,
  anjuran_pihak_luar      boolean not null default false,
  ada_anggota_keselamatan boolean not null default false,
  nama_penganjur_luar     text,
  lawatan_berperingkat    boolean not null default false,

  -- Julat tarikh (dikira daripada permohonan_tempat)
  tarikh_mula  date,
  tarikh_tamat date,

  -- Bahagian C — kewangan
  kutipan_murid    numeric(12, 2) not null default 0,
  kutipan_guru     numeric(12, 2) not null default 0,
  sumber_lain      numeric(12, 2) not null default 0,
  sumber_lain_nota text,

  -- Bilangan peserta
  bil_murid      int not null default 0,
  bil_guru       int not null default 0,
  bil_bukan_guru int not null default 0,

  -- Bahagian I — justifikasi pengecualian nisbah
  justifikasi_nisbah text,

  -- Jejak
  dicipta_oleh     uuid references pegawai (id),
  dicipta_pada     timestamptz not null default now(),
  dihantar_pada    timestamptz,
  diluluskan_pada  timestamptz,
  dikemaskini_pada timestamptz not null default now(),
  catatan_kembali  text,

  constraint tarikh_waras check (
    tarikh_tamat is null or tarikh_mula is null or tarikh_tamat >= tarikh_mula
  )
);
create index permohonan_sekolah_idx on permohonan (kod_sekolah);
create index permohonan_ppd_status_idx on permohonan (kod_ppd, status);
create index permohonan_status_idx on permohonan (status);
create index permohonan_tarikh_idx on permohonan (tarikh_mula);

-- B1.4 — tempat dilawati dan penginapan
create table permohonan_tempat (
  id            uuid primary key default gen_random_uuid(),
  permohonan_id uuid not null references permohonan (id) on delete cascade,
  susunan       int not null default 0,
  tempat        text not null,
  negeri        text,
  negara        text not null default 'Malaysia',
  tarikh_dari   date not null,
  tarikh_hingga date not null,
  penginapan    text,
  constraint tempat_tarikh_waras check (tarikh_hingga >= tarikh_dari)
);
create index tempat_permohonan_idx on permohonan_tempat (permohonan_id);

-- B2 — lawatan berperingkat
create table permohonan_peringkat (
  id            uuid primary key default gen_random_uuid(),
  permohonan_id uuid not null references permohonan (id) on delete cascade,
  susunan       int not null default 0,
  keterangan    text not null,
  tarikh_dari   date not null,
  tarikh_hingga date not null,
  bil_murid     int not null default 0
);
create index peringkat_permohonan_idx on permohonan_peringkat (permohonan_id);

-- C2 — penaja
create table permohonan_penaja (
  id            uuid primary key default gen_random_uuid(),
  permohonan_id uuid not null references permohonan (id) on delete cascade,
  susunan       int not null default 0,
  nama_penaja   text not null,
  jenis_tajaan  text,
  jumlah        numeric(12, 2) not null default 0
);
create index penaja_permohonan_idx on permohonan_penaja (permohonan_id);

-- D & E — anggota rombongan
create table peserta (
  id              uuid primary key default gen_random_uuid(),
  permohonan_id   uuid not null references permohonan (id) on delete cascade,
  kategori        peserta_kategori_t not null,
  susunan         int not null default 0,
  nama            text not null,
  kp              text,
  no_sijil_lahir  text,
  pasport         text,
  jantina         text,
  tahun_tingkatan text,
  jawatan         text,
  alamat          text,
  telefon         text,
  catatan         text
);
create index peserta_permohonan_idx on peserta (permohonan_id, kategori);

-- Dokumen sokongan — fail sebenar dalam Cloudflare R2
create table dokumen (
  id               uuid primary key default gen_random_uuid(),
  permohonan_id    uuid not null references permohonan (id) on delete cascade,
  jenis_dokumen    text not null references jenis_dokumen (kod),
  nama_fail        text not null,
  kunci_r2         text not null unique,
  saiz             bigint not null default 0,
  jenis_mime       text,
  cincangan_sha256 text not null,
  dimuat_naik_oleh uuid references pegawai (id),
  dimuat_naik_pada timestamptz not null default now()
);
create index dokumen_permohonan_idx on dokumen (permohonan_id);
comment on column dokumen.cincangan_sha256 is
  'Dikira dalam pelayar semasa muat naik. Membuktikan fail tidak ditukar selepas kelulusan.';

-- Rekod kelulusan setiap peringkat
create table kelulusan (
  id              uuid primary key default gen_random_uuid(),
  permohonan_id   uuid not null references permohonan (id) on delete cascade,
  peringkat       status_t not null,
  bahagian        text,
  pegawai_id      uuid references pegawai (id),
  nama_pegawai    text not null,
  jawatan_pegawai text,
  peranan         peranan_t not null,
  tindakan        tindakan_t not null,
  catatan         text,
  pintasan_admin  boolean not null default false,
  tarikh_tindakan timestamptz not null default now()
);
create index kelulusan_permohonan_idx on kelulusan (permohonan_id, tarikh_tindakan);
comment on column kelulusan.bahagian is 'Bahagian Lampiran A: G | H | J';

-- Lampiran G — laporan pasca-lawatan
create table laporan_pasca (
  permohonan_id   uuid primary key references permohonan (id) on delete cascade,
  ringkasan       text not null,
  bil_hadir_murid int not null default 0,
  bil_hadir_guru  int not null default 0,
  ada_insiden     boolean not null default false,
  butiran_insiden text,
  cadangan        text,
  dihantar_oleh   uuid references pegawai (id),
  dihantar_pada   timestamptz not null default now()
);

-- Log audit — TAMBAH SAHAJA
create table log_audit (
  id            bigserial primary key,
  permohonan_id uuid references permohonan (id) on delete set null,
  no_rujukan    text,
  pegawai_id    uuid references pegawai (id),
  emel_pegawai  text,
  peristiwa     text not null,
  nilai_lama    jsonb,
  nilai_baharu  jsonb,
  masa          timestamptz not null default now()
);
create index audit_permohonan_idx on log_audit (permohonan_id, masa desc);
create index audit_masa_idx on log_audit (masa desc);

-- Turutan nombor rujukan setiap tahun
create table turutan_rujukan (
  tahun int primary key,
  nilai int not null default 0
);

-- Pengesahan surat kelulusan melalui kod QR
create table pengesahan_qr (
  kod           text primary key,
  permohonan_id uuid not null references permohonan (id) on delete cascade,
  dijana_pada   timestamptz not null default now()
);
