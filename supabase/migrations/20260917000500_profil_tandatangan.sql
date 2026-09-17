-- ════════════════════════════════════════════════════════════════════
-- eLAWATAN Perak — Profil Akaun, Tandatangan Digital dan Cop Rasmi
--
-- Tandatangan dan cop DIBEKUKAN pada saat tindakan: rekod kelulusan,
-- permohonan (Bahagian F) dan laporan (Lampiran G) menyimpan kunci imej
-- yang digunakan ketika itu. Menukar profil atau pemegang jawatan tidak
-- mengubah dokumen yang sudah ditandatangani. Fail imej tidak pernah
-- ditimpa — setiap muat naik mencipta kunci baharu.
-- ════════════════════════════════════════════════════════════════════

-- ── Lajur baharu ────────────────────────────────────────────────────

alter table pegawai
  add column nama_pemohon            text,
  add column kunci_tandatangan       text,
  add column kunci_cop               text,
  add column profil_dikemaskini_pada timestamptz;

comment on column pegawai.nama_pemohon is
  'Akaun sekolah sahaja: guru yang menguruskan permohonan bagi pihak sekolah.';
comment on column pegawai.kunci_tandatangan is
  'Kunci R2 imej tandatangan. Bagi akaun sekolah, tandatangan Guru Besar / Pengetua.';
comment on column pegawai.kunci_cop is 'Kunci R2 imej cop rasmi pejabat.';

alter table kelulusan
  add column kunci_tandatangan text,
  add column kunci_cop         text;

alter table permohonan
  add column nama_guru_besar      text,
  add column nama_pemohon         text,
  add column kunci_tandatangan_gb text,
  add column kunci_cop_sekolah    text;

comment on column permohonan.kunci_tandatangan_gb is
  'Bahagian F — dibekukan semasa permohonan dihantar.';

alter table laporan_pasca
  add column nama_guru_besar      text,
  add column kunci_tandatangan_gb text,
  add column kunci_cop_sekolah    text;

-- ── Kemas kini profil sendiri ───────────────────────────────────────
-- Pegawai tidak mempunyai hak UPDATE pada jadual pegawai (hanya pentadbir),
-- jadi perubahan profil melalui fungsi ini yang menghadkan lajur.

create or replace function kemas_profil(
  p_nama text,
  p_jawatan text,
  p_telefon text,
  p_nama_pemohon text default null,
  p_nama_guru_besar text default null
) returns pegawai
language plpgsql security definer set search_path = public as $$
declare
  v_peg pegawai%rowtype;
  v_lama jsonb;
begin
  select * into v_peg from pegawai where user_id = auth.uid() and aktif;
  if not found then
    raise exception 'Akaun tiada capaian sistem.';
  end if;

  if v_peg.peranan = 'sekolah' then
    -- Nama sekolah datang daripada senarai rasmi JPN; hanya pentadbir boleh ubah.
    if coalesce(length(trim(p_nama_guru_besar)), 0) < 3 then
      raise exception 'Nama Guru Besar / Pengetua wajib diisi.';
    end if;
    select jsonb_build_object('nama_guru_besar', nama_guru_besar,
                              'nama_pemohon', v_peg.nama_pemohon)
      into v_lama from sekolah where kod_sekolah = v_peg.kod_skop;

    update sekolah set nama_guru_besar = trim(p_nama_guru_besar)
     where kod_sekolah = v_peg.kod_skop;

    update pegawai
       set nama_pemohon = nullif(trim(p_nama_pemohon), ''),
           telefon = nullif(trim(p_telefon), ''),
           profil_dikemaskini_pada = now()
     where id = v_peg.id
    returning * into v_peg;
  else
    if coalesce(length(trim(p_nama)), 0) < 3 then
      raise exception 'Nama penuh wajib diisi.';
    end if;
    v_lama := jsonb_build_object('nama', v_peg.nama, 'jawatan', v_peg.jawatan);

    update pegawai
       set nama = trim(p_nama),
           jawatan = nullif(trim(p_jawatan), ''),
           telefon = nullif(trim(p_telefon), ''),
           profil_dikemaskini_pada = now()
     where id = v_peg.id
    returning * into v_peg;
  end if;

  insert into log_audit (pegawai_id, emel_pegawai, peristiwa, nilai_lama, nilai_baharu)
  values (v_peg.id, v_peg.emel, 'PROFIL_DIKEMASKINI', v_lama,
          jsonb_build_object('nama', v_peg.nama, 'jawatan', v_peg.jawatan,
                             'nama_pemohon', v_peg.nama_pemohon,
                             'nama_guru_besar', p_nama_guru_besar));
  return v_peg;
end;
$$;

-- ── Tetapkan imej tandatangan atau cop ──────────────────────────────
-- Kunci mesti berada di bawah folder profil pemanggil sendiri, jadi
-- tiada sesiapa boleh menunjuk kepada tandatangan orang lain.

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

  if p_jenis = 'tandatangan' then
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

-- ── Kunci imej yang boleh dipaparkan bagi satu permohonan ───────────
-- Digunakan oleh Edge Function r2-tandatangan untuk halaman cetakan.

create or replace function kunci_imej_permohonan(p_id uuid)
returns setof text
language sql stable security definer set search_path = public as $$
  select k from (
    select kunci_tandatangan_gb as k from permohonan where id = p_id
    union select kunci_cop_sekolah from permohonan where id = p_id
    union select kunci_tandatangan from kelulusan where permohonan_id = p_id
    union select kunci_cop from kelulusan where permohonan_id = p_id
    union select kunci_tandatangan_gb from laporan_pasca where permohonan_id = p_id
    union select kunci_cop_sekolah from laporan_pasca where permohonan_id = p_id
  ) s where k is not null;
$$;

revoke all on function kunci_imej_permohonan(uuid) from public, anon, authenticated;

-- ── Fungsi sedia ada dikemas kini untuk membekukan imej ─────────────

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
  select g.nama_pemohon, g.kunci_tandatangan, g.kunci_cop
    into v_sekolah_peg
    from pegawai g
   where g.peranan = 'sekolah' and g.kod_skop = p.kod_sekolah
   limit 1;

  update permohonan
     set nama_guru_besar = (select nama_guru_besar from sekolah
                             where kod_sekolah = p.kod_sekolah),
         nama_pemohon = v_sekolah_peg.nama_pemohon,
         kunci_tandatangan_gb = v_sekolah_peg.kunci_tandatangan,
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

create or replace function tindakan_kelulusan(
  p_permohonan_id uuid,
  p_tindakan tindakan_t,
  p_catatan text default null
) returns permohonan
language plpgsql security definer set search_path = public as $$
declare
  p permohonan%rowtype;
  v_peg pegawai%rowtype;
  v_peranan_perlu peranan_t;
  v_pintasan boolean := false;
  v_seterusnya status_t;
  v_kod text;
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
    raise exception 'Peringkat ini menunggu tindakan %, bukan %.',
      v_peranan_perlu, v_peg.peranan;
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

  -- Pintasan pentadbir tidak membawa tandatangan sesiapa: pentadbir bukan
  -- pemegang jawatan dan tidak boleh menandatangani bagi pihaknya.
  -- Kembalikan dan Tolak juga tidak ditandatangani pada borang.
  insert into kelulusan (permohonan_id, peringkat, bahagian, pegawai_id, nama_pegawai,
                         jawatan_pegawai, peranan, tindakan, catatan, pintasan_admin,
                         kunci_tandatangan, kunci_cop)
  values (p.id, p.status, bahagian_bagi_status(p.status), v_peg.id, v_peg.nama,
          v_peg.jawatan, v_peg.peranan, p_tindakan, p_catatan, v_pintasan,
          case when v_pintasan or p_tindakan <> 'SOKONG' then null else v_peg.kunci_tandatangan end,
          case when v_pintasan or p_tindakan <> 'SOKONG' then null else v_peg.kunci_cop end);

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
                             'catatan', p_catatan, 'peranan', v_peg.peranan));

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

  select g.kunci_tandatangan, g.kunci_cop into v_sekolah_peg
    from pegawai g
   where g.peranan = 'sekolah' and g.kod_skop = p.kod_sekolah
   limit 1;

  insert into laporan_pasca (permohonan_id, ringkasan, bil_hadir_murid,
                             bil_hadir_guru, ada_insiden, butiran_insiden,
                             cadangan, dihantar_oleh, dihantar_pada,
                             nama_guru_besar, kunci_tandatangan_gb, kunci_cop_sekolah)
  values (p.id, p_ringkasan, p_bil_hadir_murid, p_bil_hadir_guru,
          p_ada_insiden, p_butiran_insiden, p_cadangan, v_peg.id, now(),
          (select nama_guru_besar from sekolah where kod_sekolah = p.kod_sekolah),
          v_sekolah_peg.kunci_tandatangan, v_sekolah_peg.kunci_cop)
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

revoke all on function kemas_profil(text, text, text, text, text) from public;
revoke all on function tetapkan_imej_profil(text, text) from public;
grant execute on function kemas_profil(text, text, text, text, text) to authenticated;
grant execute on function tetapkan_imej_profil(text, text) to authenticated;
