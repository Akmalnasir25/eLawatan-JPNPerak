-- ════════════════════════════════════════════════════════════════════
-- eLAWATAN Perak — Pendaftaran Pegawai dan Log Masuk Kata Laluan
--
-- 1. Pengesah, penyemak dan akaun sekolah boleh mendaftarkan pegawai
--    dalam skop masing-masing. Peraturan dikuatkuasakan di sini, bukan
--    pada antara muka: tiada sesiapa boleh mencipta peranan lebih tinggi
--    daripada dirinya, dan kod skop dipaksa mengikut pendaftar.
-- 2. Setiap akaun mencipta kata laluan sendiri melalui OTP. Pendaftar
--    tidak pernah melihat atau menetapkan kata laluan orang lain.
-- 3. Percubaan log masuk gagal berulang disekat sementara.
-- 4. Tandatangan Guru Besar dan cop dipindahkan ke peringkat SEKOLAH,
--    kerana satu sekolah kini boleh mempunyai beberapa pengguna.
-- ════════════════════════════════════════════════════════════════════

-- ── Lajur akaun ─────────────────────────────────────────────────────

alter table pegawai
  add column kata_laluan_ditetapkan boolean not null default false,
  add column didaftar_oleh          uuid references pegawai (id),
  add column didaftar_pada          timestamptz,
  add column log_masuk_terakhir     timestamptz;

comment on column pegawai.kata_laluan_ditetapkan is
  'Kata laluan sebenar disimpan dalam skema auth Supabase dan tidak boleh
   dibaca aplikasi; penanda ini memberitahu skrin log masuk langkah mana
   yang perlu dipaparkan.';

-- Akaun sedia ada yang pernah log masuk melalui OTP tetap perlu mencipta
-- kata laluan pada log masuk berikutnya (lalai false di atas).

-- ── Tandatangan di peringkat sekolah ────────────────────────────────

alter table sekolah
  add column kunci_tandatangan_gb text,
  add column kunci_cop            text;

comment on column sekolah.kunci_tandatangan_gb is
  'Tandatangan Guru Besar / Pengetua. Dikongsi oleh semua pengguna sekolah.';

-- Pindahkan imej sedia ada daripada akaun sekolah ke rekod sekolah.
update sekolah s
   set kunci_tandatangan_gb = g.kunci_tandatangan,
       kunci_cop = g.kunci_cop
  from pegawai g
 where g.peranan = 'sekolah'
   and g.kod_skop = s.kod_sekolah
   and (g.kunci_tandatangan is not null or g.kunci_cop is not null);

-- ── Domain e-mel dibenarkan ─────────────────────────────────────────
-- Satu sumber untuk pangkalan data, Edge Function dan antara muka.

insert into tetapan (kunci, nilai, nota, dikunci) values
  ('domain_dibenarkan', '["moe-dl.edu.my", "moe.gov.my"]',
   'Domain e-mel yang dibenarkan log masuk dan didaftarkan.', false)
on conflict (kunci) do nothing;

create or replace function domain_dibenarkan(p_emel text) returns boolean
language sql stable set search_path = public as $$
  select exists (
    select 1 from tetapan, jsonb_array_elements_text(nilai) d
     where kunci = 'domain_dibenarkan'
       and lower(split_part(p_emel, '@', 2)) = lower(d)
  );
$$;

-- ── Sekatan sementara selepas percubaan gagal ───────────────────────

create table cubaan_masuk (
  id      bigserial primary key,
  emel    text not null,
  berjaya boolean not null,
  ip      text,
  masa    timestamptz not null default now()
);
create index cubaan_masuk_emel_idx on cubaan_masuk (lower(emel), masa desc);

alter table cubaan_masuk enable row level security;
-- Tiada dasar: hanya peranan perkhidmatan (Edge Function) boleh menyentuhnya.

comment on table cubaan_masuk is
  'Percubaan log masuk kata laluan. Dinilai oleh Edge Function log-masuk;
   tidak boleh dibaca atau ditulis oleh mana-mana peranan pengguna.';

insert into tetapan (kunci, nilai, nota, dikunci) values
  ('sekatan_log_masuk',
   '{"had_cubaan": 5, "tetingkap_minit": 15, "sekatan_minit": 15}',
   'Selepas berapa percubaan gagal dalam tetingkap masa, akaun disekat sementara.',
   false)
on conflict (kunci) do nothing;

/**
 * Keadaan sekatan bagi satu e-mel. Dipanggil oleh Edge Function sebelum
 * sebarang percubaan kata laluan.
 */
create or replace function status_sekatan(p_emel text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_had int;
  v_tetingkap int;
  v_sekatan int;
  v_gagal int;
  v_terakhir timestamptz;
  v_tamat timestamptz;
begin
  select coalesce((nilai ->> 'had_cubaan')::int, 5),
         coalesce((nilai ->> 'tetingkap_minit')::int, 15),
         coalesce((nilai ->> 'sekatan_minit')::int, 15)
    into v_had, v_tetingkap, v_sekatan
    from tetapan where kunci = 'sekatan_log_masuk';

  select count(*), max(masa) into v_gagal, v_terakhir
    from cubaan_masuk
   where lower(emel) = lower(trim(p_emel))
     and not berjaya
     and masa > now() - make_interval(mins => v_tetingkap);

  v_tamat := v_terakhir + make_interval(mins => v_sekatan);

  return jsonb_build_object(
    'disekat', v_gagal >= v_had and v_tamat > now(),
    'cubaan_gagal', v_gagal,
    'baki_cubaan', greatest(0, v_had - v_gagal),
    'saat_lagi', greatest(0, ceil(extract(epoch from (v_tamat - now())))::int),
    'had', v_had
  );
end;
$$;

/** Rekod satu percubaan. Kejayaan memadam sejarah gagal e-mel itu. */
create or replace function rekod_cubaan(p_emel text, p_berjaya boolean, p_ip text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into cubaan_masuk (emel, berjaya, ip)
  values (lower(trim(p_emel)), p_berjaya, p_ip);

  if p_berjaya then
    delete from cubaan_masuk
     where lower(emel) = lower(trim(p_emel)) and not berjaya;
    update pegawai set log_masuk_terakhir = now()
     where lower(emel) = lower(trim(p_emel));
  end if;

  -- Simpan sejarah pendek sahaja.
  delete from cubaan_masuk where masa < now() - interval '7 days';
end;
$$;

-- ── Pendaftaran pegawai oleh pengesah, penyemak dan sekolah ─────────

/** Peranan yang boleh didaftarkan oleh satu peranan. Tiada peranan boleh
 *  mencipta peranan yang lebih tinggi daripada dirinya. */
create or replace function peranan_boleh_daftar(p_peranan peranan_t)
returns peranan_t[]
language sql immutable as $$
  select case p_peranan
    when 'admin'        then array['sekolah','ppd_pegawai','ppd_ketua','jpn_pegawai','jpn_pengarah','kpm','admin']::peranan_t[]
    when 'jpn_pengarah' then array['jpn_pegawai']::peranan_t[]
    when 'jpn_pegawai'  then array['jpn_pegawai']::peranan_t[]
    when 'ppd_ketua'    then array['ppd_pegawai']::peranan_t[]
    when 'ppd_pegawai'  then array['ppd_pegawai']::peranan_t[]
    when 'sekolah'      then array['sekolah']::peranan_t[]
    else array[]::peranan_t[]
  end;
$$;

create or replace function daftar_pegawai(
  p_nama text,
  p_emel text,
  p_peranan peranan_t,
  p_jawatan text default null,
  p_kod_skop text default null
) returns pegawai
language plpgsql security definer set search_path = public as $$
declare
  v_peg pegawai%rowtype;
  v_emel text := lower(trim(p_emel));
  v_skop text;
  v_baharu pegawai%rowtype;
begin
  select * into v_peg from pegawai where user_id = auth.uid() and aktif;
  if not found then
    raise exception 'Akaun tiada capaian sistem.';
  end if;

  if not (p_peranan = any (peranan_boleh_daftar(v_peg.peranan))) then
    raise exception 'Peranan % tidak boleh didaftarkan oleh %.', p_peranan, v_peg.peranan;
  end if;

  if coalesce(length(trim(p_nama)), 0) < 3 then
    raise exception 'Nama pegawai wajib diisi.';
  end if;
  if v_emel !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Alamat e-mel tidak sah.';
  end if;
  if not domain_dibenarkan(v_emel) then
    raise exception 'Hanya e-mel domain rasmi KPM diterima.';
  end if;
  if exists (select 1 from pegawai where lower(emel) = v_emel) then
    raise exception 'E-mel ini sudah berdaftar dalam sistem.';
  end if;

  -- Skop dipaksa mengikut pendaftar; hanya pentadbir boleh menetapkannya.
  v_skop := case when v_peg.peranan = 'admin' then nullif(trim(p_kod_skop), '')
                 else v_peg.kod_skop end;
  if p_peranan <> 'kpm' and p_peranan <> 'admin' and v_skop is null then
    raise exception 'Kod skop diperlukan bagi peranan %.', p_peranan;
  end if;

  insert into pegawai (emel, nama, peranan, kod_skop, jawatan,
                       didaftar_oleh, didaftar_pada)
  values (v_emel, trim(p_nama), p_peranan, v_skop, nullif(trim(p_jawatan), ''),
          v_peg.id, now())
  returning * into v_baharu;

  insert into log_audit (pegawai_id, emel_pegawai, peristiwa, nilai_baharu)
  values (v_peg.id, v_peg.emel, 'PEGAWAI_DIDAFTARKAN',
          jsonb_build_object('emel', v_emel, 'nama', trim(p_nama),
                             'peranan', p_peranan, 'kod_skop', v_skop));

  return v_baharu;
end;
$$;

/** Pegawai dalam skop pemanggil, untuk halaman Urus Pegawai. */
create or replace function senarai_pegawai_skop()
returns setof pegawai
language plpgsql stable security definer set search_path = public as $$
declare
  v_peg pegawai%rowtype;
begin
  select * into v_peg from pegawai where user_id = auth.uid() and aktif;
  if not found then return; end if;

  if v_peg.peranan = 'admin' then
    return query select * from pegawai order by peranan, nama;
  else
    return query
      select * from pegawai
       where kod_skop is not distinct from v_peg.kod_skop
         and peranan = any (
           case
             when v_peg.peranan in ('jpn_pengarah', 'jpn_pegawai')
               then array['jpn_pegawai','jpn_pengarah']::peranan_t[]
             when v_peg.peranan in ('ppd_ketua', 'ppd_pegawai')
               then array['ppd_pegawai','ppd_ketua']::peranan_t[]
             when v_peg.peranan = 'sekolah' then array['sekolah']::peranan_t[]
             else array[v_peg.peranan]::peranan_t[]
           end)
       order by peranan, nama;
  end if;
end;
$$;

/** Aktif atau nyahaktif akaun dalam skop sendiri. Kata laluan tidak boleh
 *  disentuh oleh sesiapa selain pemiliknya. */
create or replace function tukar_status_pegawai(p_id uuid, p_aktif boolean)
returns pegawai
language plpgsql security definer set search_path = public as $$
declare
  v_peg pegawai%rowtype;
  v_sasaran pegawai%rowtype;
begin
  select * into v_peg from pegawai where user_id = auth.uid() and aktif;
  if not found then
    raise exception 'Akaun tiada capaian sistem.';
  end if;

  select * into v_sasaran from pegawai where id = p_id;
  if not found then
    raise exception 'Pegawai tidak dijumpai.';
  end if;
  if v_sasaran.id = v_peg.id then
    raise exception 'Anda tidak boleh menukar status akaun anda sendiri.';
  end if;
  if v_peg.peranan <> 'admin' then
    if v_sasaran.kod_skop is distinct from v_peg.kod_skop then
      raise exception 'Pegawai ini di luar skop anda.';
    end if;
    if not (v_sasaran.peranan = any (peranan_boleh_daftar(v_peg.peranan))) then
      raise exception 'Anda tidak boleh menukar status peranan %.', v_sasaran.peranan;
    end if;
  end if;

  update pegawai set aktif = p_aktif where id = p_id returning * into v_sasaran;

  insert into log_audit (pegawai_id, emel_pegawai, peristiwa, nilai_baharu)
  values (v_peg.id, v_peg.emel,
          case when p_aktif then 'PEGAWAI_DIAKTIFKAN' else 'PEGAWAI_DINYAHAKTIFKAN' end,
          jsonb_build_object('emel', v_sasaran.emel, 'peranan', v_sasaran.peranan));

  return v_sasaran;
end;
$$;

-- ── Fungsi sedia ada dikemas kini ───────────────────────────────────

create or replace function tetapkan_imej_profil(p_jenis text, p_kunci text)
returns pegawai
language plpgsql security definer set search_path = public as $$
declare
  v_peg pegawai%rowtype;
  v_lama text;
begin
  select * into v_peg from pegawai where user_id = auth.uid() and aktif;
  if not found then
    raise exception 'Akaun tiada capaian sistem.';
  end if;
  if p_jenis not in ('tandatangan', 'cop') then
    raise exception 'Jenis imej tidak sah: %', p_jenis;
  end if;
  if p_kunci is not null
     and p_kunci not like format('profil/%s/%s/%%', v_peg.id, p_jenis) then
    raise exception 'Kunci imej bukan milik akaun ini.';
  end if;

  -- Tandatangan Guru Besar dan cop sekolah milik SEKOLAH, bukan individu:
  -- satu sekolah boleh mempunyai beberapa pengguna, tetapi Bahagian F
  -- mesti sentiasa membawa tandatangan Guru Besar yang sama.
  if v_peg.peranan = 'sekolah' then
    if p_jenis = 'tandatangan' then
      select kunci_tandatangan_gb into v_lama from sekolah where kod_sekolah = v_peg.kod_skop;
      update sekolah set kunci_tandatangan_gb = p_kunci where kod_sekolah = v_peg.kod_skop;
    else
      select kunci_cop into v_lama from sekolah where kod_sekolah = v_peg.kod_skop;
      update sekolah set kunci_cop = p_kunci where kod_sekolah = v_peg.kod_skop;
    end if;
    update pegawai set profil_dikemaskini_pada = now()
     where id = v_peg.id returning * into v_peg;
  elsif p_jenis = 'tandatangan' then
    v_lama := v_peg.kunci_tandatangan;
    update pegawai set kunci_tandatangan = p_kunci, profil_dikemaskini_pada = now()
     where id = v_peg.id returning * into v_peg;
  else
    v_lama := v_peg.kunci_cop;
    update pegawai set kunci_cop = p_kunci, profil_dikemaskini_pada = now()
     where id = v_peg.id returning * into v_peg;
  end if;

  insert into log_audit (pegawai_id, emel_pegawai, peristiwa, nilai_lama, nilai_baharu)
  values (v_peg.id, v_peg.emel, 'IMEJ_PROFIL_DITUKAR',
          jsonb_build_object('jenis', p_jenis, 'kunci', v_lama),
          jsonb_build_object('jenis', p_jenis, 'kunci', p_kunci));
  return v_peg;
end;
$$;

create or replace function hantar_permohonan(p_permohonan_id uuid)
returns permohonan
language plpgsql security definer set search_path = public as $$
declare
  p permohonan%rowtype;
  v_semak jsonb;
  v_peg pegawai%rowtype;
  v_sekolah_peg record;
begin
  select * into v_peg from pegawai where user_id = auth.uid() and aktif;
  if not found then
    raise exception 'Akaun tiada capaian sistem.';
  end if;

  select * into p from permohonan where id = p_permohonan_id for update;
  if not found then
    raise exception 'Permohonan tidak dijumpai.';
  end if;

  if v_peg.peranan <> 'admin'
     and (v_peg.peranan <> 'sekolah' or v_peg.kod_skop <> p.kod_sekolah) then
    raise exception 'Hanya sekolah pemilik boleh menghantar permohonan ini.';
  end if;

  if p.status not in ('DRAF', 'DIKEMBALIKAN') then
    raise exception 'Permohonan berstatus % tidak boleh dihantar.', p.status;
  end if;

  v_semak := semak_kelengkapan(p.id);
  if not (v_semak ->> 'boleh_hantar')::boolean then
    raise exception 'Permohonan belum lengkap: %',
      array_to_string(array(select jsonb_array_elements_text(v_semak -> 'ralat')), ' | ');
  end if;

  if p.no_rujukan is null then
    update permohonan set no_rujukan = jana_no_rujukan(p.kod_ppd, p.kod_sekolah)
     where id = p.id;
  end if;

  -- Bahagian F: bekukan Guru Besar, pemohon, tandatangan dan cop sekolah
  -- pada saat penghantaran. Profil yang berubah kemudian tidak menyentuh
  -- permohonan yang sudah dihantar.
  -- Tandatangan dan cop diambil daripada rekod sekolah, bukan akaun
  -- individu, supaya betul walaupun beberapa guru berkongsi sekolah.
  -- Nama pemohon ialah pengguna yang menekan Hantar.
  select s.nama_guru_besar, s.kunci_tandatangan_gb, s.kunci_cop
    into v_sekolah_peg
    from sekolah s
   where s.kod_sekolah = p.kod_sekolah;

  update permohonan
     set nama_guru_besar = v_sekolah_peg.nama_guru_besar,
         nama_pemohon = coalesce(nullif(trim(v_peg.nama_pemohon), ''), v_peg.nama),
         kunci_tandatangan_gb = v_sekolah_peg.kunci_tandatangan_gb,
         kunci_cop_sekolah = v_sekolah_peg.kunci_cop
   where id = p.id;

  update permohonan
     set status = 'MENUNGGU_PPD_SEMAK',
         dihantar_pada = now(),
         catatan_kembali = null,
         dikemaskini_pada = now()
   where id = p.id
  returning * into p;

  insert into log_audit (permohonan_id, no_rujukan, pegawai_id, emel_pegawai,
                         peristiwa, nilai_baharu)
  values (p.id, p.no_rujukan, v_peg.id, v_peg.emel, 'PERMOHONAN_DIHANTAR',
          jsonb_build_object('status', p.status, 'kategori', p.kategori));

  return p;
end;
$$;

create or replace function hantar_laporan_pasca(
  p_permohonan_id uuid,
  p_ringkasan text,
  p_bil_hadir_murid int,
  p_bil_hadir_guru int,
  p_ada_insiden boolean,
  p_butiran_insiden text default null,
  p_cadangan text default null
) returns laporan_pasca
language plpgsql security definer set search_path = public as $$
declare
  p permohonan%rowtype;
  v_peg pegawai%rowtype;
  v_laporan laporan_pasca%rowtype;
  v_sekolah_peg record;
begin
  select * into v_peg from pegawai where user_id = auth.uid() and aktif;
  if not found then
    raise exception 'Akaun tiada capaian sistem.';
  end if;

  select * into p from permohonan where id = p_permohonan_id for update;
  if not found then
    raise exception 'Permohonan tidak dijumpai.';
  end if;

  if v_peg.peranan <> 'admin'
     and (v_peg.peranan <> 'sekolah' or v_peg.kod_skop <> p.kod_sekolah) then
    raise exception 'Hanya sekolah pemilik boleh menghantar laporan ini.';
  end if;

  if p.status not in ('DILULUSKAN', 'SELESAI') then
    raise exception 'Laporan hanya boleh dihantar bagi permohonan yang diluluskan.';
  end if;

  if coalesce(length(trim(p_ringkasan)), 0) < 20 then
    raise exception 'Ringkasan laporan mesti sekurang-kurangnya 20 aksara.';
  end if;
  if p_ada_insiden and coalesce(length(trim(p_butiran_insiden)), 0) < 10 then
    raise exception 'Butiran insiden wajib diisi apabila insiden dilaporkan.';
  end if;

  select s.kunci_tandatangan_gb, s.kunci_cop into v_sekolah_peg
    from sekolah s
   where s.kod_sekolah = p.kod_sekolah;

  insert into laporan_pasca (permohonan_id, ringkasan, bil_hadir_murid,
                             bil_hadir_guru, ada_insiden, butiran_insiden,
                             cadangan, dihantar_oleh, dihantar_pada,
                             nama_guru_besar, kunci_tandatangan_gb, kunci_cop_sekolah)
  values (p.id, p_ringkasan, p_bil_hadir_murid, p_bil_hadir_guru,
          p_ada_insiden, p_butiran_insiden, p_cadangan, v_peg.id, now(),
          (select nama_guru_besar from sekolah where kod_sekolah = p.kod_sekolah),
          v_sekolah_peg.kunci_tandatangan_gb, v_sekolah_peg.kunci_cop)
  on conflict (permohonan_id) do update
    set ringkasan = excluded.ringkasan,
        bil_hadir_murid = excluded.bil_hadir_murid,
        bil_hadir_guru = excluded.bil_hadir_guru,
        ada_insiden = excluded.ada_insiden,
        butiran_insiden = excluded.butiran_insiden,
        cadangan = excluded.cadangan,
        dihantar_oleh = excluded.dihantar_oleh,
        dihantar_pada = now(),
        nama_guru_besar = excluded.nama_guru_besar,
        kunci_tandatangan_gb = excluded.kunci_tandatangan_gb,
        kunci_cop_sekolah = excluded.kunci_cop_sekolah
  returning * into v_laporan;

  update permohonan set status = 'SELESAI', dikemaskini_pada = now()
   where id = p.id and status = 'DILULUSKAN';

  insert into log_audit (permohonan_id, no_rujukan, pegawai_id, emel_pegawai,
                         peristiwa, nilai_baharu)
  values (p.id, p.no_rujukan, v_peg.id, v_peg.emel, 'LAPORAN_PASCA_DIHANTAR',
          jsonb_build_object('bil_hadir_murid', p_bil_hadir_murid,
                             'ada_insiden', p_ada_insiden));

  return v_laporan;
end;
$$;

-- ── Keizinan ────────────────────────────────────────────────────────

revoke all on function daftar_pegawai(text, text, peranan_t, text, text) from public;
revoke all on function senarai_pegawai_skop() from public;
revoke all on function tukar_status_pegawai(uuid, boolean) from public;
revoke all on function status_sekatan(text) from public, anon, authenticated;
revoke all on function rekod_cubaan(text, boolean, text) from public, anon, authenticated;

grant execute on function daftar_pegawai(text, text, peranan_t, text, text) to authenticated;
grant execute on function senarai_pegawai_skop() to authenticated;
grant execute on function tukar_status_pegawai(uuid, boolean) to authenticated;
grant execute on function domain_dibenarkan(text) to anon, authenticated;

-- Domain dibenarkan dibaca oleh halaman log masuk sebelum log masuk.
drop policy if exists tetapan_baca_awam on tetapan;
create policy tetapan_baca_awam on tetapan
  for select to anon
  using (kunci in ('maklumat_jpn', 'slogan_surat', 'domain_dibenarkan'));
