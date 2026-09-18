-- ════════════════════════════════════════════════════════════════════
-- eLAWATAN Perak — Pemangku Pengesah
--
-- KPPD atau Pengarah JPN yang bercuti melantik seorang pegawai penyemak
-- dalam pejabat yang sama sebagai pemangku bagi tempoh tertentu. Dalam
-- tempoh itu pemangku boleh mengesahkan permohonan di peringkat pengesah.
--
-- Peraturan:
--   1. Hanya peringkat pengesah (ppd_ketua, jpn_pengarah) boleh dipangku.
--   2. Pemangku mesti penyemak aktif dalam kod skop yang sama.
--   3. Pemangku tidak boleh mengesahkan permohonan yang disemaknya sendiri.
--   4. Surat dan borang mencetak nama pemangku dengan "b.p." jawatan asal,
--      tandatangan pemangku sendiri dan cop rasmi pejabat.
-- ════════════════════════════════════════════════════════════════════

create table pemangkuan (
  id              uuid primary key default gen_random_uuid(),
  pegawai_asal    uuid not null references pegawai (id),
  pemangku        uuid not null references pegawai (id),
  tarikh_mula     date not null,
  tarikh_tamat    date not null,
  sebab           text,
  dicipta_oleh    uuid references pegawai (id),
  dicipta_pada    timestamptz not null default now(),
  dibatalkan_oleh uuid references pegawai (id),
  dibatalkan_pada timestamptz,
  constraint pemangkuan_tarikh_waras check (tarikh_tamat >= tarikh_mula),
  constraint pemangkuan_bukan_diri check (pemangku <> pegawai_asal)
);
create index pemangkuan_pemangku_idx on pemangkuan (pemangku, tarikh_mula, tarikh_tamat);
create index pemangkuan_asal_idx on pemangkuan (pegawai_asal, tarikh_mula);

alter table pemangkuan enable row level security;
-- Tulis melalui fungsi sahaja; baca rekod yang melibatkan diri sendiri.
create policy pemangkuan_baca on pemangkuan
  for select to authenticated using (
    adalah_admin() or pegawai_asal = id_pegawai_saya() or pemangku = id_pegawai_saya()
  );

alter table kelulusan add column pemangku_bagi uuid references pegawai (id);
comment on column kelulusan.pemangku_bagi is
  'Pegawai asal yang dipangku ketika tindakan ini diambil; null jika bukan pemangku.';

-- ── Tarikh kalendar Malaysia ────────────────────────────────────────
-- UTC+8 tetap (tiada waktu jimat siang), jadi tidak bergantung pada
-- pangkalan data zon waktu pelayan.

create or replace function tarikh_my(p_masa timestamptz default now()) returns date
language sql immutable as $$
  select ((p_masa at time zone 'UTC') + interval '8 hours')::date;
$$;

/** Peranan penyemak yang layak memangku sesuatu peranan pengesah. */
create or replace function peranan_pemangku_layak(p_peranan peranan_t)
returns peranan_t[]
language sql immutable as $$
  select case p_peranan
    when 'ppd_ketua'    then array['ppd_pegawai']::peranan_t[]
    when 'jpn_pengarah' then array['jpn_pegawai']::peranan_t[]
    else array[]::peranan_t[]
  end;
$$;

/** Pegawai asal yang sedang dipangku oleh seorang pegawai hari ini. */
create or replace function pemangkuan_aktif(p_pegawai_id uuid)
returns setof pegawai
language sql stable security definer set search_path = public as $$
  select a.*
    from pemangkuan m
    join pegawai a on a.id = m.pegawai_asal and a.aktif
    join pegawai s on s.id = m.pemangku and s.aktif
   where m.pemangku = p_pegawai_id
     and m.dibatalkan_pada is null
     and tarikh_my() between m.tarikh_mula and m.tarikh_tamat
     and a.kod_skop is not distinct from s.kod_skop
     and s.peranan = any (peranan_pemangku_layak(a.peranan));
$$;

-- ── Lantik dan batal ────────────────────────────────────────────────

create or replace function lantik_pemangku(
  p_pemangku uuid,
  p_tarikh_mula date,
  p_tarikh_tamat date,
  p_sebab text default null,
  p_pegawai_asal uuid default null
) returns pemangkuan
language plpgsql security definer set search_path = public as $$
declare
  v_peg pegawai%rowtype;
  v_asal pegawai%rowtype;
  v_calon pegawai%rowtype;
  v_baharu pemangkuan%rowtype;
begin
  select * into v_peg from pegawai where user_id = auth.uid() and aktif;
  if not found then
    raise exception 'Akaun tiada capaian sistem.';
  end if;

  if p_pegawai_asal is not null and p_pegawai_asal <> v_peg.id and v_peg.peranan <> 'admin' then
    raise exception 'Anda hanya boleh melantik pemangku bagi diri sendiri.';
  end if;

  select * into v_asal from pegawai where id = coalesce(p_pegawai_asal, v_peg.id) and aktif;
  if not found then
    raise exception 'Pegawai asal tidak dijumpai atau tidak aktif.';
  end if;
  if v_asal.peranan not in ('ppd_ketua', 'jpn_pengarah') then
    raise exception 'Hanya KPPD dan Pengarah JPN boleh mempunyai pemangku.';
  end if;

  select * into v_calon from pegawai where id = p_pemangku and aktif;
  if not found
     or v_calon.kod_skop is distinct from v_asal.kod_skop
     or not (v_calon.peranan = any (peranan_pemangku_layak(v_asal.peranan))) then
    raise exception 'Pemangku mesti pegawai penyemak aktif dalam pejabat yang sama.';
  end if;

  if p_tarikh_mula is null or p_tarikh_tamat is null or p_tarikh_tamat < p_tarikh_mula then
    raise exception 'Tarikh tamat mesti pada atau selepas tarikh mula.';
  end if;
  if p_tarikh_mula < tarikh_my() then
    raise exception 'Tarikh mula tidak boleh sebelum hari ini.';
  end if;
  if p_tarikh_tamat - p_tarikh_mula > 90 then
    raise exception 'Tempoh pemangkuan tidak boleh melebihi 90 hari.';
  end if;

  if exists (
    select 1 from pemangkuan
     where pegawai_asal = v_asal.id
       and dibatalkan_pada is null
       and daterange(tarikh_mula, tarikh_tamat, '[]')
           && daterange(p_tarikh_mula, p_tarikh_tamat, '[]')
  ) then
    raise exception 'Sudah ada pemangku bagi tempoh yang bertindih.';
  end if;

  insert into pemangkuan (pegawai_asal, pemangku, tarikh_mula, tarikh_tamat, sebab, dicipta_oleh)
  values (v_asal.id, v_calon.id, p_tarikh_mula, p_tarikh_tamat,
          nullif(trim(p_sebab), ''), v_peg.id)
  returning * into v_baharu;

  insert into log_audit (pegawai_id, emel_pegawai, peristiwa, nilai_baharu)
  values (v_peg.id, v_peg.emel, 'PEMANGKU_DILANTIK',
          jsonb_build_object('pegawai_asal', v_asal.emel, 'pemangku', v_calon.emel,
                             'tarikh_mula', p_tarikh_mula, 'tarikh_tamat', p_tarikh_tamat));

  return v_baharu;
end;
$$;

create or replace function batal_pemangku(p_id uuid) returns pemangkuan
language plpgsql security definer set search_path = public as $$
declare
  v_peg pegawai%rowtype;
  v_m pemangkuan%rowtype;
begin
  select * into v_peg from pegawai where user_id = auth.uid() and aktif;
  if not found then
    raise exception 'Akaun tiada capaian sistem.';
  end if;

  select * into v_m from pemangkuan where id = p_id;
  if not found then
    raise exception 'Rekod pemangkuan tidak dijumpai.';
  end if;
  if v_m.pegawai_asal <> v_peg.id and v_peg.peranan <> 'admin' then
    raise exception 'Hanya pegawai asal atau pentadbir boleh membatalkan pemangkuan.';
  end if;
  if v_m.dibatalkan_pada is not null then
    raise exception 'Pemangkuan ini sudah dibatalkan.';
  end if;

  update pemangkuan set dibatalkan_pada = now(), dibatalkan_oleh = v_peg.id
   where id = p_id returning * into v_m;

  insert into log_audit (pegawai_id, emel_pegawai, peristiwa, nilai_baharu)
  values (v_peg.id, v_peg.emel, 'PEMANGKU_DIBATALKAN', jsonb_build_object('pemangkuan_id', p_id));

  return v_m;
end;
$$;

-- ── Senarai untuk antara muka ───────────────────────────────────────

create or replace function senarai_pemangkuan() returns setof jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
           'id', m.id,
           'pegawai_asal', m.pegawai_asal,
           'nama_asal', a.nama, 'jawatan_asal', a.jawatan, 'peranan_asal', a.peranan,
           'pemangku', m.pemangku,
           'nama_pemangku', s.nama, 'jawatan_pemangku', s.jawatan,
           'tarikh_mula', m.tarikh_mula, 'tarikh_tamat', m.tarikh_tamat,
           'sebab', m.sebab, 'dicipta_pada', m.dicipta_pada,
           'status', case
             when m.dibatalkan_pada is not null then 'DIBATALKAN'
             when tarikh_my() > m.tarikh_tamat then 'TAMAT'
             when tarikh_my() < m.tarikh_mula then 'AKAN_DATANG'
             else 'AKTIF' end)
    from pemangkuan m
    join pegawai a on a.id = m.pegawai_asal
    join pegawai s on s.id = m.pemangku
    join pegawai g on g.user_id = auth.uid() and g.aktif
   where (g.peranan = 'admin' or m.pegawai_asal = g.id or m.pemangku = g.id)
     and m.tarikh_tamat >= tarikh_my() - 30
   order by m.tarikh_mula desc;
$$;

/** Calon pemangku yang layak bagi pegawai asal (diri sendiri, atau pilihan pentadbir). */
create or replace function calon_pemangku(p_pegawai_asal uuid default null) returns setof jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_peg pegawai%rowtype;
  v_asal pegawai%rowtype;
begin
  select * into v_peg from pegawai where user_id = auth.uid() and aktif;
  if not found then return; end if;
  if p_pegawai_asal is not null and p_pegawai_asal <> v_peg.id and v_peg.peranan <> 'admin' then
    return;
  end if;
  select * into v_asal from pegawai where id = coalesce(p_pegawai_asal, v_peg.id);
  if not found then return; end if;

  return query
    select jsonb_build_object('id', c.id, 'nama', c.nama, 'jawatan', c.jawatan,
                              'peranan', c.peranan, 'emel', c.emel)
      from pegawai c
     where c.aktif
       and c.id <> v_asal.id
       and c.kod_skop is not distinct from v_asal.kod_skop
       and c.peranan = any (peranan_pemangku_layak(v_asal.peranan))
     order by c.nama;
end;
$$;

/** Peranan yang sedang dipangku oleh pengguna semasa. */
create or replace function pemangkuan_saya() returns setof jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
           'pegawai_asal', a.id, 'nama', a.nama, 'jawatan', a.jawatan,
           'peranan', a.peranan, 'kod_skop', a.kod_skop,
           'tarikh_tamat', (select max(m.tarikh_tamat) from pemangkuan m
                             where m.pegawai_asal = a.id and m.pemangku = g.id
                               and m.dibatalkan_pada is null
                               and tarikh_my() between m.tarikh_mula and m.tarikh_tamat))
    from pegawai g, pemangkuan_aktif(g.id) a
   where g.user_id = auth.uid() and g.aktif;
$$;

-- ── Tindakan kelulusan dengan pemangku ──────────────────────────────

create or replace function tindakan_kelulusan(
  p_permohonan_id uuid,
  p_tindakan tindakan_t,
  p_catatan text default null,
  p_semakan text[] default null
) returns permohonan
language plpgsql security definer set search_path = public as $$
declare
  p permohonan%rowtype;
  v_peg pegawai%rowtype;
  v_asal pegawai%rowtype;
  v_pemangku boolean := false;
  v_peranan_perlu peranan_t;
  v_pintasan boolean := false;
  v_seterusnya status_t;
  v_kod text;
  v_semakan jsonb;
  v_kurang text;
begin
  select * into v_peg from pegawai where user_id = auth.uid() and aktif;
  if not found then
    raise exception 'Akaun tiada capaian sistem.';
  end if;

  select * into p from permohonan where id = p_permohonan_id for update;
  if not found then
    raise exception 'Permohonan tidak dijumpai.';
  end if;

  v_peranan_perlu := peranan_bagi_status(p.status);
  if v_peranan_perlu is null then
    raise exception 'Permohonan berstatus % tidak menunggu sebarang tindakan.', p.status;
  end if;

  if v_peg.peranan = 'admin' then
    v_pintasan := true;
  elsif v_peg.peranan <> v_peranan_perlu then
    -- Pemangku pengesah bagi pejabat permohonan ini?
    select a.* into v_asal
      from pemangkuan_aktif(v_peg.id) a
     where a.peranan = v_peranan_perlu
       and ((a.peranan = 'ppd_ketua' and a.kod_skop = p.kod_ppd)
         or (a.peranan = 'jpn_pengarah' and a.kod_skop = p.kod_jpn))
     limit 1;
    if not found then
      raise exception 'Peringkat ini menunggu tindakan %, bukan %.',
        v_peranan_perlu, v_peg.peranan;
    end if;
    v_pemangku := true;

    -- Asingan tugas: penyemak tidak mengesahkan semakannya sendiri.
    if exists (select 1 from kelulusan k
                where k.permohonan_id = p.id
                  and k.pegawai_id = v_peg.id
                  and k.tarikh_tindakan >= coalesce(p.dihantar_pada, '-infinity'::timestamptz)) then
      raise exception 'Pemangku tidak boleh mengesahkan permohonan yang telah disemaknya sendiri.';
    end if;
  else
    -- Skop mesti sepadan
    if v_peg.peranan in ('ppd_pegawai', 'ppd_ketua') and v_peg.kod_skop <> p.kod_ppd then
      raise exception 'Permohonan ini di luar daerah anda.';
    end if;
    if v_peg.peranan in ('jpn_pegawai', 'jpn_pengarah') and v_peg.kod_skop <> p.kod_jpn then
      raise exception 'Permohonan ini di luar negeri anda.';
    end if;
  end if;

  if p_tindakan in ('KEMBALI', 'TOLAK')
     and coalesce(length(trim(p_catatan)), 0) < 10 then
    raise exception 'Catatan wajib diisi (sekurang-kurangnya 10 aksara) bagi tindakan %.',
      p_tindakan;
  end if;

  -- Penyemak mesti menanda setiap perkara sebelum memperakukan.
  if p_tindakan = 'SOKONG' and p.status in ('MENUNGGU_PPD_SEMAK', 'MENUNGGU_JPN_SEMAK') then
    select string_agg(i ->> 'label', '; ')
      into v_kurang
      from jsonb_array_elements((select nilai from tetapan where kunci = 'item_semakan')) i
     where not (i ->> 'kod' = any (coalesce(p_semakan, '{}')));
    if v_kurang is not null then
      raise exception 'Semua perkara semakan mesti ditanda sebelum diperakukan. Belum ditanda: %',
        v_kurang;
    end if;

    select jsonb_agg(i)
      into v_semakan
      from jsonb_array_elements((select nilai from tetapan where kunci = 'item_semakan')) i;
  end if;

  -- Pintasan pentadbir tidak membawa tandatangan sesiapa. Pemangku
  -- menandatangani sendiri dengan "b.p." jawatan asal dan cop pejabat.
  insert into kelulusan (permohonan_id, peringkat, bahagian, pegawai_id, nama_pegawai,
                         jawatan_pegawai, peranan, tindakan, catatan, pintasan_admin,
                         kunci_tandatangan, kunci_cop, semakan, pemangku_bagi)
  values (p.id, p.status, bahagian_bagi_status(p.status), v_peg.id, v_peg.nama,
          case when v_pemangku
               then 'b.p. ' || coalesce(v_asal.jawatan, v_asal.nama)
               else v_peg.jawatan end,
          case when v_pemangku then v_peranan_perlu else v_peg.peranan end,
          p_tindakan, p_catatan, v_pintasan,
          case when v_pintasan or p_tindakan <> 'SOKONG' then null else v_peg.kunci_tandatangan end,
          case when v_pintasan or p_tindakan <> 'SOKONG' then null
               when v_pemangku then v_asal.kunci_cop
               else v_peg.kunci_cop end,
          v_semakan,
          case when v_pemangku then v_asal.id end);

  if p_tindakan = 'SOKONG' then
    v_seterusnya := status_seterusnya(p.kategori, p.status);
    update permohonan
       set status = v_seterusnya,
           diluluskan_pada = case when v_seterusnya = 'DILULUSKAN' then now()
                                  else diluluskan_pada end,
           dikemaskini_pada = now()
     where id = p.id
    returning * into p;

    if p.status = 'DILULUSKAN' then
      v_kod := upper(encode(gen_random_bytes(6), 'hex'));
      insert into pengesahan_qr (kod, permohonan_id) values (v_kod, p.id)
      on conflict do nothing;
    end if;

  elsif p_tindakan = 'KEMBALI' then
    update permohonan
       set status = 'DIKEMBALIKAN', catatan_kembali = p_catatan, dikemaskini_pada = now()
     where id = p.id
    returning * into p;

  else
    update permohonan
       set status = 'DITOLAK', catatan_kembali = p_catatan, dikemaskini_pada = now()
     where id = p.id
    returning * into p;
  end if;

  insert into log_audit (permohonan_id, no_rujukan, pegawai_id, emel_pegawai,
                         peristiwa, nilai_baharu)
  values (p.id, p.no_rujukan, v_peg.id, v_peg.emel,
          case when v_pintasan then 'KELULUSAN_PINTASAN_PENTADBIR' else 'TINDAKAN_KELULUSAN' end,
          jsonb_build_object('tindakan', p_tindakan, 'status_baharu', p.status,
                             'catatan', p_catatan, 'peranan', v_peg.peranan,
                             'semakan', v_semakan,
                             'pemangku_bagi', case when v_pemangku then v_asal.emel end));

  return p;
end;
$$;

-- ── Keizinan ────────────────────────────────────────────────────────

revoke all on function pemangkuan_aktif(uuid) from public, anon, authenticated;
revoke all on function lantik_pemangku(uuid, date, date, text, uuid) from public;
revoke all on function batal_pemangku(uuid) from public;
revoke all on function senarai_pemangkuan() from public;
revoke all on function calon_pemangku(uuid) from public;
revoke all on function pemangkuan_saya() from public;

grant execute on function lantik_pemangku(uuid, date, date, text, uuid) to authenticated;
grant execute on function batal_pemangku(uuid) to authenticated;
grant execute on function senarai_pemangkuan() to authenticated;
grant execute on function calon_pemangku(uuid) to authenticated;
grant execute on function pemangkuan_saya() to authenticated;
grant execute on function tarikh_my(timestamptz) to authenticated;
