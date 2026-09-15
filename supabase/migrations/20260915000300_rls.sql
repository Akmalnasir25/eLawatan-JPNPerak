-- ════════════════════════════════════════════════════════════════════
-- eLAWATAN Perak — Row Level Security
-- Skop daerah dan negeri dikuatkuasakan di enjin data, bukan di kod hadapan.
-- ════════════════════════════════════════════════════════════════════

-- ── Fungsi keizinan ─────────────────────────────────────────────────

create or replace function boleh_lihat_permohonan(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from permohonan p
      join pegawai g on g.user_id = auth.uid() and g.aktif
     where p.id = p_id
       and (
            g.peranan = 'admin'
         or (g.peranan = 'sekolah' and g.kod_skop = p.kod_sekolah)
         or (g.peranan in ('ppd_pegawai', 'ppd_ketua') and g.kod_skop = p.kod_ppd)
         or (g.peranan in ('jpn_pegawai', 'jpn_pengarah') and g.kod_skop = p.kod_jpn)
         or (g.peranan = 'kpm' and p.kategori = 'LUAR_NEGARA')
       )
  );
$$;

create or replace function boleh_sunting_permohonan(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from permohonan p
      join pegawai g on g.user_id = auth.uid() and g.aktif
     where p.id = p_id
       and (
            g.peranan = 'admin'
         or (g.peranan = 'sekolah'
             and g.kod_skop = p.kod_sekolah
             and p.status in ('DRAF', 'DIKEMBALIKAN'))
       )
  );
$$;

-- Varian eksplisit untuk Edge Functions, yang berjalan sebagai peranan
-- perkhidmatan dan tidak mempunyai auth.uid(). Peraturan kekal sama —
-- satu sumber kebenaran untuk RLS dan untuk pautan muat naik R2.

create or replace function boleh_lihat_permohonan_bagi(p_id uuid, p_pegawai_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from permohonan p
      join pegawai g on g.id = p_pegawai_id and g.aktif
     where p.id = p_id
       and (
            g.peranan = 'admin'
         or (g.peranan = 'sekolah' and g.kod_skop = p.kod_sekolah)
         or (g.peranan in ('ppd_pegawai', 'ppd_ketua') and g.kod_skop = p.kod_ppd)
         or (g.peranan in ('jpn_pegawai', 'jpn_pengarah') and g.kod_skop = p.kod_jpn)
         or (g.peranan = 'kpm' and p.kategori = 'LUAR_NEGARA')
       )
  );
$$;

create or replace function boleh_sunting_permohonan_bagi(p_id uuid, p_pegawai_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from permohonan p
      join pegawai g on g.id = p_pegawai_id and g.aktif
     where p.id = p_id
       and (
            g.peranan = 'admin'
         or (g.peranan = 'sekolah'
             and g.kod_skop = p.kod_sekolah
             and p.status in ('DRAF', 'DIKEMBALIKAN'))
       )
  );
$$;

revoke all on function boleh_lihat_permohonan_bagi(uuid, uuid) from public, anon, authenticated;
revoke all on function boleh_sunting_permohonan_bagi(uuid, uuid) from public, anon, authenticated;

-- ── Hidupkan RLS ────────────────────────────────────────────────────

alter table ppd                  enable row level security;
alter table sekolah              enable row level security;
alter table pegawai              enable row level security;
alter table nisbah_pengiring     enable row level security;
alter table bahagian_penyelaras  enable row level security;
alter table jenis_dokumen        enable row level security;
alter table tetapan              enable row level security;
alter table permohonan           enable row level security;
alter table permohonan_tempat    enable row level security;
alter table permohonan_peringkat enable row level security;
alter table permohonan_penaja    enable row level security;
alter table peserta              enable row level security;
alter table dokumen              enable row level security;
alter table kelulusan            enable row level security;
alter table laporan_pasca        enable row level security;
alter table log_audit            enable row level security;
alter table pengesahan_qr        enable row level security;
alter table turutan_rujukan      enable row level security;

-- ── Jadual rujukan: baca untuk semua pengguna sah, tulis pentadbir ──

create policy rujukan_baca on ppd
  for select to authenticated using (true);
create policy rujukan_tulis on ppd
  for all to authenticated using (adalah_admin()) with check (adalah_admin());

create policy nisbah_baca on nisbah_pengiring
  for select to authenticated using (true);
create policy nisbah_tulis on nisbah_pengiring
  for all to authenticated using (adalah_admin()) with check (adalah_admin());

create policy penyelaras_baca on bahagian_penyelaras
  for select to authenticated using (true);
create policy penyelaras_tulis on bahagian_penyelaras
  for all to authenticated using (adalah_admin()) with check (adalah_admin());

create policy jenis_dok_baca on jenis_dokumen
  for select to authenticated using (true);
create policy jenis_dok_tulis on jenis_dokumen
  for all to authenticated using (adalah_admin()) with check (adalah_admin());

create policy tetapan_baca on tetapan
  for select to authenticated using (true);
create policy tetapan_tulis on tetapan
  for all to authenticated
  using (adalah_admin() and not dikunci)
  with check (adalah_admin() and not dikunci);

-- ── Sekolah ─────────────────────────────────────────────────────────

create policy sekolah_baca on sekolah
for select to authenticated using (
  adalah_admin()
  or (peranan_saya() = 'sekolah' and skop_saya() = kod_sekolah)
  or (peranan_saya() in ('ppd_pegawai', 'ppd_ketua') and skop_saya() = kod_ppd)
  or (peranan_saya() in ('jpn_pegawai', 'jpn_pengarah') and skop_saya() = kod_jpn)
  or peranan_saya() = 'kpm'
);

create policy sekolah_tulis on sekolah
  for all to authenticated using (adalah_admin()) with check (adalah_admin());

-- ── Pegawai ─────────────────────────────────────────────────────────

create policy pegawai_baca_sendiri on pegawai
  for select to authenticated using (user_id = auth.uid() or adalah_admin());

create policy pegawai_tulis on pegawai
  for all to authenticated using (adalah_admin()) with check (adalah_admin());

-- ── Permohonan ──────────────────────────────────────────────────────

create policy permohonan_baca on permohonan
for select to authenticated using (
  adalah_admin()
  or (peranan_saya() = 'sekolah' and skop_saya() = kod_sekolah)
  or (peranan_saya() in ('ppd_pegawai', 'ppd_ketua') and skop_saya() = kod_ppd)
  or (peranan_saya() in ('jpn_pegawai', 'jpn_pengarah') and skop_saya() = kod_jpn)
  or (peranan_saya() = 'kpm' and kategori = 'LUAR_NEGARA')
);

create policy permohonan_cipta on permohonan
for insert to authenticated with check (
  adalah_admin()
  or (peranan_saya() = 'sekolah' and skop_saya() = kod_sekolah and status = 'DRAF')
);

-- Pegawai tidak mengemas kini baris secara terus; mereka guna
-- tindakan_kelulusan() yang berjalan sebagai SECURITY DEFINER.
create policy permohonan_sunting on permohonan
for update to authenticated
using (
  adalah_admin()
  or (peranan_saya() = 'sekolah' and skop_saya() = kod_sekolah
      and status in ('DRAF', 'DIKEMBALIKAN'))
)
with check (
  adalah_admin()
  or (peranan_saya() = 'sekolah' and skop_saya() = kod_sekolah)
);

create policy permohonan_padam on permohonan
for delete to authenticated using (
  adalah_admin()
  or (peranan_saya() = 'sekolah' and skop_saya() = kod_sekolah and status = 'DRAF')
);

-- ── Jadual anak ─────────────────────────────────────────────────────
-- Corak sama: lihat jika boleh lihat induk, sunting jika boleh sunting induk.

create policy tempat_baca on permohonan_tempat
  for select to authenticated using (boleh_lihat_permohonan(permohonan_id));
create policy tempat_tulis on permohonan_tempat
  for all to authenticated
  using (boleh_sunting_permohonan(permohonan_id))
  with check (boleh_sunting_permohonan(permohonan_id));

create policy peringkat_baca on permohonan_peringkat
  for select to authenticated using (boleh_lihat_permohonan(permohonan_id));
create policy peringkat_tulis on permohonan_peringkat
  for all to authenticated
  using (boleh_sunting_permohonan(permohonan_id))
  with check (boleh_sunting_permohonan(permohonan_id));

create policy penaja_baca on permohonan_penaja
  for select to authenticated using (boleh_lihat_permohonan(permohonan_id));
create policy penaja_tulis on permohonan_penaja
  for all to authenticated
  using (boleh_sunting_permohonan(permohonan_id))
  with check (boleh_sunting_permohonan(permohonan_id));

create policy peserta_baca on peserta
  for select to authenticated using (boleh_lihat_permohonan(permohonan_id));
create policy peserta_tulis on peserta
  for all to authenticated
  using (boleh_sunting_permohonan(permohonan_id))
  with check (boleh_sunting_permohonan(permohonan_id));

create policy dokumen_baca on dokumen
  for select to authenticated using (boleh_lihat_permohonan(permohonan_id));
create policy dokumen_tulis on dokumen
  for all to authenticated
  using (boleh_sunting_permohonan(permohonan_id))
  with check (boleh_sunting_permohonan(permohonan_id));

-- ── Kelulusan: baca sahaja dari klien ───────────────────────────────
-- Baris ditulis oleh tindakan_kelulusan() sahaja.

create policy kelulusan_baca on kelulusan
  for select to authenticated using (boleh_lihat_permohonan(permohonan_id));

-- ── Laporan pasca-lawatan (Lampiran G) ──────────────────────────────

create policy laporan_baca on laporan_pasca
  for select to authenticated using (boleh_lihat_permohonan(permohonan_id));

create policy laporan_tulis on laporan_pasca
for all to authenticated
using (
  adalah_admin()
  or exists (select 1 from permohonan p
              where p.id = permohonan_id
                and peranan_saya() = 'sekolah'
                and skop_saya() = p.kod_sekolah
                and p.status in ('DILULUSKAN', 'SELESAI'))
)
with check (
  adalah_admin()
  or exists (select 1 from permohonan p
              where p.id = permohonan_id
                and peranan_saya() = 'sekolah'
                and skop_saya() = p.kod_sekolah
                and p.status in ('DILULUSKAN', 'SELESAI'))
);

-- ── Log audit: TAMBAH SAHAJA ────────────────────────────────────────
-- Tiada dasar UPDATE atau DELETE wujud, jadi kedua-duanya ditolak
-- untuk setiap peranan pengguna — termasuk pentadbir.

create policy audit_baca on log_audit
for select to authenticated using (
  adalah_admin()
  or (permohonan_id is not null and boleh_lihat_permohonan(permohonan_id))
  or pegawai_id = id_pegawai_saya()
);

create policy audit_tambah on log_audit
for insert to authenticated with check (pegawai_id = id_pegawai_saya());

-- ── Pengesahan QR ───────────────────────────────────────────────────

create policy qr_baca on pengesahan_qr
  for select to authenticated using (boleh_lihat_permohonan(permohonan_id));

-- Pengesahan awam surat kelulusan — hanya butiran minimum didedahkan.
create or replace function sah_lawatan(p_kod text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select jsonb_build_object(
        'sah',          true,
        'no_rujukan',   p.no_rujukan,
        'nama_sekolah', s.nama,
        'kategori',     p.kategori,
        'tujuan',       p.tujuan,
        'tarikh_mula',  p.tarikh_mula,
        'tarikh_tamat', p.tarikh_tamat,
        'bil_murid',    p.bil_murid,
        'bil_guru',     p.bil_guru,
        'status',       p.status,
        'diluluskan_pada', p.diluluskan_pada)
       from pengesahan_qr q
       join permohonan p on p.id = q.permohonan_id
       join sekolah s on s.kod_sekolah = p.kod_sekolah
      where q.kod = upper(trim(p_kod))
        and p.status in ('DILULUSKAN', 'SELESAI')),
    jsonb_build_object('sah', false));
$$;

-- ── Turutan rujukan: tiada capaian klien ────────────────────────────
-- RLS dihidupkan tanpa sebarang dasar — hanya SECURITY DEFINER boleh menulis.

-- ── Keizinan pelaksanaan ────────────────────────────────────────────

revoke all on function hantar_permohonan(uuid) from public;
revoke all on function tindakan_kelulusan(uuid, tindakan_t, text) from public;
revoke all on function tukar_status_pentadbir(uuid, status_t, text) from public;
revoke all on function jana_no_rujukan(text, text) from public;

grant execute on function hantar_permohonan(uuid) to authenticated;
grant execute on function tindakan_kelulusan(uuid, tindakan_t, text) to authenticated;
grant execute on function tukar_status_pentadbir(uuid, status_t, text) to authenticated;
grant execute on function semak_kelengkapan(uuid) to authenticated;
grant execute on function dokumen_diperlukan(uuid) to authenticated;
grant execute on function kira_nisbah(nisbah_kategori_t, int, int) to authenticated;
grant execute on function peranan_saya() to authenticated;
grant execute on function skop_saya() to authenticated;
grant execute on function emel_saya() to authenticated;
grant execute on function id_pegawai_saya() to authenticated;
grant execute on function adalah_admin() to authenticated;
grant execute on function boleh_lihat_permohonan(uuid) to authenticated;
grant execute on function boleh_sunting_permohonan(uuid) to authenticated;
grant execute on function sah_lawatan(text) to anon, authenticated;
grant execute on function hantar_laporan_pasca(uuid, text, int, int, boolean, text, text)
  to authenticated;
