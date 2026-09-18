-- ════════════════════════════════════════════════════════════════════
-- eLAWATAN Perak — Notifikasi Dalam Sistem dan E-mel
--
-- Setiap pertukaran status mencipta notifikasi untuk pihak yang perlu
-- tahu: pegawai yang perlu bertindak (termasuk pemangku), dan sekolah
-- apabila permohonan dikembalikan, ditolak atau diluluskan.
--
-- Jadual `notifikasi` juga baris gilir e-mel. Edge Function
-- `hantar-notifikasi` (dijadualkan setiap beberapa minit) mengambil
-- baris MENUNGGU dan menghantarnya. Jika e-mel dimatikan dalam tetapan,
-- baris baharu terus DILANGKAU tetapi masih dipapar dalam sistem.
-- ════════════════════════════════════════════════════════════════════

create table notifikasi (
  id                 bigserial primary key,
  pegawai_id         uuid not null references pegawai (id) on delete cascade,
  permohonan_id      uuid references permohonan (id) on delete cascade,
  jenis              text not null,
  tajuk              text not null,
  mesej              text not null,
  pautan             text,
  dicipta_pada       timestamptz not null default now(),
  dibaca_pada        timestamptz,
  emel_status        text not null default 'MENUNGGU'
                     check (emel_status in ('MENUNGGU', 'DIHANTAR', 'GAGAL', 'DILANGKAU')),
  emel_cubaan        int not null default 0,
  emel_dihantar_pada timestamptz,
  emel_ralat         text
);
create index notifikasi_pegawai_idx on notifikasi (pegawai_id, dicipta_pada desc);
create index notifikasi_emel_idx on notifikasi (id) where emel_status = 'MENUNGGU';
create index notifikasi_dedup_idx on notifikasi (permohonan_id, jenis, pegawai_id, dicipta_pada desc);

alter table notifikasi enable row level security;
-- Baca milik sendiri sahaja. Ditulis oleh pencetus dan fungsi pelayan.
create policy notifikasi_baca on notifikasi
  for select to authenticated using (pegawai_id = id_pegawai_saya());

insert into tetapan (kunci, nilai, nota, dikunci) values
  ('notifikasi_emel', '{"aktif": true}',
   'Hantar salinan notifikasi melalui e-mel. Jika dimatikan, notifikasi masih dipapar dalam sistem.',
   false)
on conflict (kunci) do nothing;

-- ── Bantuan ─────────────────────────────────────────────────────────

create or replace function label_status(p_status status_t) returns text
language sql immutable as $$
  select case p_status
    when 'DRAF' then 'Draf'
    when 'MENUNGGU_PPD_SEMAK' then 'Menunggu Semakan PPD'
    when 'MENUNGGU_PPD_SAH' then 'Menunggu Pengesahan PPD'
    when 'MENUNGGU_JPN_SEMAK' then 'Menunggu Semakan JPN'
    when 'MENUNGGU_JPN_SAH' then 'Menunggu Pengesahan Pengarah'
    when 'MENUNGGU_KPM' then 'Menunggu Bahagian Penyelaras KPM'
    when 'DIKEMBALIKAN' then 'Dikembalikan untuk Pindaan'
    when 'DITOLAK' then 'Ditolak'
    when 'DILULUSKAN' then 'Diluluskan'
    when 'SELESAI' then 'Selesai'
    when 'BATAL' then 'Dibatalkan'
  end;
$$;

create or replace function cipta_notifikasi(
  p_pegawai_id uuid,
  p_permohonan_id uuid,
  p_jenis text,
  p_tajuk text,
  p_mesej text,
  p_pautan text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_emel boolean;
begin
  select coalesce((nilai ->> 'aktif')::boolean, true) into v_emel
    from tetapan where kunci = 'notifikasi_emel';
  insert into notifikasi (pegawai_id, permohonan_id, jenis, tajuk, mesej, pautan, emel_status)
  values (p_pegawai_id, p_permohonan_id, p_jenis, p_tajuk, p_mesej, p_pautan,
          case when coalesce(v_emel, true) then 'MENUNGGU' else 'DILANGKAU' end);
end;
$$;

/** Pegawai yang perlu bertindak pada sesuatu status, termasuk pemangku aktif. */
create or replace function penerima_peringkat(p_permohonan_id uuid, p_status status_t)
returns setof uuid
language sql stable security definer set search_path = public as $$
  with p as (select * from permohonan where id = p_permohonan_id),
  pemegang as (
    select g.*
      from pegawai g, p
     where g.aktif
       and g.peranan = peranan_bagi_status(p_status)
       and case
             when g.peranan in ('ppd_pegawai', 'ppd_ketua') then g.kod_skop = p.kod_ppd
             when g.peranan in ('jpn_pegawai', 'jpn_pengarah') then g.kod_skop = p.kod_jpn
             when g.peranan = 'kpm' then true
             else false
           end
  )
  select id from pemegang
  union
  select m.pemangku
    from pemangkuan m
    join pemegang a on a.id = m.pegawai_asal
    join pegawai s on s.id = m.pemangku and s.aktif
   where m.dibatalkan_pada is null
     and tarikh_my() between m.tarikh_mula and m.tarikh_tamat;
$$;

create or replace function penerima_sekolah(p_kod_sekolah text) returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from pegawai
   where aktif and peranan = 'sekolah' and kod_skop = p_kod_sekolah;
$$;

-- ── Pencetus pertukaran status ──────────────────────────────────────

create or replace function notifikasi_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_sekolah text;
  v_ringkas text;
  v_pautan text := '/permohonan/' || new.id;
begin
  select nama into v_sekolah from sekolah where kod_sekolah = new.kod_sekolah;
  v_ringkas := format('%s — %s: %s',
                      coalesce(new.no_rujukan, 'Draf'),
                      coalesce(v_sekolah, new.kod_sekolah),
                      coalesce(left(new.tujuan, 90), 'tanpa tujuan'));

  if new.status::text like 'MENUNGGU%' then
    for v_id in select penerima_peringkat(new.id, new.status) loop
      perform cipta_notifikasi(
        v_id, new.id, 'TINDAKAN_DIPERLUKAN',
        'Permohonan menunggu tindakan anda',
        v_ringkas || '. Status: ' || label_status(new.status) || '.',
        v_pautan);
    end loop;
  end if;

  if new.status in ('DIKEMBALIKAN', 'DITOLAK', 'DILULUSKAN') then
    for v_id in select penerima_sekolah(new.kod_sekolah) loop
      perform cipta_notifikasi(
        v_id, new.id, 'STATUS_' || new.status::text,
        case new.status
          when 'DIKEMBALIKAN' then 'Permohonan dikembalikan untuk pindaan'
          when 'DITOLAK' then 'Permohonan ditolak'
          else 'Permohonan diluluskan'
        end,
        v_ringkas || '.' ||
          case when new.status = 'DILULUSKAN'
               then ' Surat kelulusan boleh dicetak daripada sistem.'
               else coalesce(' Catatan: ' || new.catatan_kembali, '') end,
        v_pautan);
    end loop;
  end if;

  return null;
end;
$$;

create trigger permohonan_notifikasi_status
after update of status on permohonan
for each row
when (old.status is distinct from new.status)
execute function notifikasi_status();

-- ── Fungsi pengguna ─────────────────────────────────────────────────

create or replace function kiraan_notifikasi_belum_baca() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from notifikasi
   where pegawai_id = id_pegawai_saya() and dibaca_pada is null;
$$;

/** Tanda satu notifikasi, atau semua jika p_id null, sebagai dibaca. */
create or replace function tandai_notifikasi_dibaca(p_id bigint default null) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_n int;
begin
  update notifikasi set dibaca_pada = now()
   where pegawai_id = id_pegawai_saya()
     and dibaca_pada is null
     and (p_id is null or id = p_id);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ── Baris gilir e-mel (peranan perkhidmatan sahaja) ─────────────────

/** Ambil sehingga p_had notifikasi untuk dihantar; kiraan cubaan dinaikkan. */
create or replace function ambil_notifikasi_emel(p_had int default 50) returns setof jsonb
language plpgsql security definer set search_path = public as $$
begin
  return query
    with dipilih as (
      select n.id from notifikasi n
       where n.emel_status = 'MENUNGGU' and n.emel_cubaan < 3
       order by n.id
       limit greatest(1, least(p_had, 200))
       for update skip locked
    ), dikemas as (
      update notifikasi n set emel_cubaan = n.emel_cubaan + 1
        from dipilih d where n.id = d.id
      returning n.*
    )
    select jsonb_build_object('id', k.id, 'emel', g.emel, 'nama', g.nama,
                              'tajuk', k.tajuk, 'mesej', k.mesej, 'pautan', k.pautan)
      from dikemas k join pegawai g on g.id = k.pegawai_id
     where g.aktif;
end;
$$;

create or replace function tanda_emel_notifikasi(p_id bigint, p_berjaya boolean, p_ralat text default null)
returns void
language sql security definer set search_path = public as $$
  update notifikasi
     set emel_status = case when p_berjaya then 'DIHANTAR'
                            when emel_cubaan >= 3 then 'GAGAL'
                            else 'MENUNGGU' end,
         emel_dihantar_pada = case when p_berjaya then now() else emel_dihantar_pada end,
         emel_ralat = case when p_berjaya then null else left(p_ralat, 500) end
   where id = p_id;
$$;

-- ── Keizinan ────────────────────────────────────────────────────────

revoke all on function cipta_notifikasi(uuid, uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function penerima_peringkat(uuid, status_t) from public, anon, authenticated;
revoke all on function penerima_sekolah(text) from public, anon, authenticated;
revoke all on function ambil_notifikasi_emel(int) from public, anon, authenticated;
revoke all on function tanda_emel_notifikasi(bigint, boolean, text) from public, anon, authenticated;
revoke all on function kiraan_notifikasi_belum_baca() from public;
revoke all on function tandai_notifikasi_dibaca(bigint) from public;

grant execute on function kiraan_notifikasi_belum_baca() to authenticated;
grant execute on function tandai_notifikasi_dibaca(bigint) to authenticated;
