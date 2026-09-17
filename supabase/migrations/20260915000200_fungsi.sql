-- ════════════════════════════════════════════════════════════════════
-- eLAWATAN Perak — Fungsi, Pencetus dan Enjin Peraturan
-- ════════════════════════════════════════════════════════════════════

-- ── Identiti pengguna semasa ────────────────────────────────────────
-- SECURITY DEFINER supaya dasar RLS pada `pegawai` tidak berulang balik
-- ke atas dirinya sendiri.

create or replace function id_pegawai_saya() returns uuid
language sql stable security definer set search_path = public as $$
  select id from pegawai where user_id = auth.uid() and aktif limit 1;
$$;

create or replace function peranan_saya() returns peranan_t
language sql stable security definer set search_path = public as $$
  select peranan from pegawai where user_id = auth.uid() and aktif limit 1;
$$;

create or replace function skop_saya() returns text
language sql stable security definer set search_path = public as $$
  select kod_skop from pegawai where user_id = auth.uid() and aktif limit 1;
$$;

create or replace function emel_saya() returns text
language sql stable security definer set search_path = public as $$
  select emel from pegawai where user_id = auth.uid() and aktif limit 1;
$$;

create or replace function adalah_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select peranan = 'admin' from pegawai where user_id = auth.uid() and aktif limit 1),
    false);
$$;

-- ── Pendaftaran automatik selepas pengesahan OTP ────────────────────
-- Pegawai yang telah didaftarkan pentadbir hanya dipautkan.
-- E-mel yang sepadan dengan senarai sekolah JPN menjadi akaun sekolah.
-- E-mel lain tidak mendapat baris `pegawai` — sistem menolak capaian.

create or replace function handle_pengguna_baharu() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_sekolah sekolah%rowtype;
begin
  update pegawai
     set user_id = new.id
   where lower(emel) = lower(new.email)
     and user_id is null;

  if found then
    return new;
  end if;

  select * into v_sekolah
    from sekolah
   where lower(emel) = lower(new.email) and aktif
   limit 1;

  if found then
    insert into pegawai (user_id, emel, nama, peranan, kod_skop, jawatan)
    values (new.id, lower(new.email), v_sekolah.nama, 'sekolah',
            v_sekolah.kod_sekolah, 'Akaun Sekolah')
    on conflict (emel) do update set user_id = excluded.user_id;

    insert into log_audit (pegawai_id, emel_pegawai, peristiwa, nilai_baharu)
    values ((select id from pegawai where user_id = new.id),
            lower(new.email), 'AKAUN_SEKOLAH_DIDAFTARKAN',
            jsonb_build_object('kod_sekolah', v_sekolah.kod_sekolah,
                               'nama', v_sekolah.nama));
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_pengguna_baharu();

-- ── Nombor rujukan ──────────────────────────────────────────────────
-- Format: JPNPk/LWT/2026/PRK-KU/ABA1234/0147

create or replace function jana_no_rujukan(p_kod_ppd text, p_kod_sekolah text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_tahun int := extract(year from now())::int;
  v_turutan int;
begin
  insert into turutan_rujukan (tahun, nilai)
  values (v_tahun, 1)
  on conflict (tahun) do update set nilai = turutan_rujukan.nilai + 1
  returning nilai into v_turutan;

  return format('JPNPk/LWT/%s/%s/%s/%s',
                v_tahun, p_kod_ppd, p_kod_sekolah, lpad(v_turutan::text, 4, '0'));
end;
$$;

-- ── Rantaian kelulusan ──────────────────────────────────────────────

create or replace function status_seterusnya(p_kategori kategori_t, p_status status_t)
returns status_t
language sql immutable as $$
  select case
    when p_status = 'MENUNGGU_PPD_SEMAK' then 'MENUNGGU_PPD_SAH'::status_t
    when p_status = 'MENUNGGU_PPD_SAH' then
      case when p_kategori = 'DALAM_DAERAH' then 'DILULUSKAN'::status_t
           else 'MENUNGGU_JPN_SEMAK'::status_t end
    when p_status = 'MENUNGGU_JPN_SEMAK' then 'MENUNGGU_JPN_SAH'::status_t
    when p_status = 'MENUNGGU_JPN_SAH' then
      case when p_kategori = 'LUAR_NEGARA' then 'MENUNGGU_KPM'::status_t
           else 'DILULUSKAN'::status_t end
    when p_status = 'MENUNGGU_KPM' then 'DILULUSKAN'::status_t
    else null::status_t
  end;
$$;

create or replace function peranan_bagi_status(p_status status_t)
returns peranan_t
language sql immutable as $$
  select case p_status
    when 'MENUNGGU_PPD_SEMAK' then 'ppd_pegawai'::peranan_t
    when 'MENUNGGU_PPD_SAH'   then 'ppd_ketua'::peranan_t
    when 'MENUNGGU_JPN_SEMAK' then 'jpn_pegawai'::peranan_t
    when 'MENUNGGU_JPN_SAH'   then 'jpn_pengarah'::peranan_t
    when 'MENUNGGU_KPM'       then 'kpm'::peranan_t
    else null::peranan_t
  end;
$$;

create or replace function bahagian_bagi_status(p_status status_t)
returns text
language sql immutable as $$
  select case p_status
    when 'MENUNGGU_PPD_SAH' then 'G'
    when 'MENUNGGU_JPN_SAH' then 'H'
    when 'MENUNGGU_KPM'     then 'J'
    else null
  end;
$$;

-- ── Nisbah pengiring (Lampiran C) ───────────────────────────────────

create or replace function kira_nisbah(p_kod nisbah_kategori_t, p_bil_murid int,
                                       p_bil_pengiring int)
returns jsonb
language plpgsql stable set search_path = public as $$
declare
  n nisbah_pengiring%rowtype;
  v_perlu int;
  v_had_terendah int;
begin
  select * into n from nisbah_pengiring where kod = p_kod;
  if not found then
    return jsonb_build_object('sah', true, 'nota', 'Kategori nisbah tidak dikenali');
  end if;

  v_perlu        := ceil(p_bil_murid::numeric / n.bil_murid)::int;
  v_had_terendah := ceil(p_bil_murid::numeric / n.had_pengecualian)::int;

  return jsonb_build_object(
    'kategori',       n.keterangan,
    'nisbah',         format('1 : %s', n.bil_murid),
    'had_pengecualian', format('1 : %s', n.had_pengecualian),
    'perlu',          v_perlu,
    'had_terendah',   v_had_terendah,
    'ada',            p_bil_pengiring,
    'sah',            p_bil_pengiring >= v_perlu,
    'perlu_justifikasi',
      p_bil_pengiring < v_perlu and p_bil_pengiring >= v_had_terendah,
    'disekat',        p_bil_pengiring < v_had_terendah
  );
end;
$$;

-- ── Dokumen wajib mengikut keadaan borang ───────────────────────────

create or replace function dokumen_diperlukan(p_permohonan_id uuid)
returns setof jenis_dokumen
language plpgsql stable set search_path = public as $$
declare
  p permohonan%rowtype;
  v_ciri text[];
begin
  select * into p from permohonan where id = p_permohonan_id;
  if not found then return; end if;

  v_ciri := array_remove(array[
    case when p.ada_penginapan then 'ada_penginapan' end,
    case when p.ada_risiko_tinggi then 'ada_risiko_tinggi' end,
    case when p.ada_aktiviti_air then 'ada_aktiviti_air' end,
    case when p.anjuran_pihak_luar then 'anjuran_pihak_luar' end,
    case when p.ada_anggota_keselamatan then 'ada_anggota_keselamatan' end,
    case when p.bil_bukan_guru > 0 then 'ada_bukan_murid' end,
    case when p.lawatan_berperingkat then 'lawatan_berperingkat' end
  ], null);

  return query
    select jd.* from jenis_dokumen jd
    where jd.aktif
      and not jd.dijana_sistem
      and (
        jd.syarat = '{}'::jsonb
        or (jd.syarat ? 'pengangkutan'
            and exists (select 1
                          from jsonb_array_elements_text(jd.syarat -> 'pengangkutan') x
                         where x.value = any (p.pengangkutan::text[])))
        or (jd.syarat ? 'kategori'
            and p.kategori is not null
            and exists (select 1
                          from jsonb_array_elements_text(jd.syarat -> 'kategori') x
                         where x.value = p.kategori::text))
        or (jd.syarat ? 'ciri'
            and exists (select 1
                          from jsonb_array_elements_text(jd.syarat -> 'ciri') x
                         where x.value = any (v_ciri)))
      )
    order by jd.susunan, jd.kod;
end;
$$;

-- ── Enjin pengesahan sebelum hantar ─────────────────────────────────

create or replace function semak_kelengkapan(p_permohonan_id uuid)
returns jsonb
language plpgsql stable set search_path = public as $$
declare
  p permohonan%rowtype;
  v_ralat text[] := '{}';
  v_amaran text[] := '{}';
  v_tempoh_min int;
  v_hari int;
  v_nisbah jsonb;
  v_bil_tempat int;
  v_ketua peserta%rowtype;
  v_kurang text[];
  v_bil_dok int;
begin
  select * into p from permohonan where id = p_permohonan_id;
  if not found then
    return jsonb_build_object('boleh_hantar', false, 'ralat',
                              array['Permohonan tidak dijumpai']);
  end if;

  -- Nota: guna array_append, bukan `v_ralat || 'teks'`. Literal tanpa jenis
  -- ditafsir sebagai text[] dan gagal dengan "malformed array literal".

  -- Bahagian B1
  if p.kategori is null then
    v_ralat := array_append(v_ralat, 'Kategori lawatan belum ditentukan.');
  end if;
  if coalesce(length(trim(p.tujuan)), 0) < 10 then
    v_ralat := array_append(v_ralat, 'Tujuan lawatan mesti sekurang-kurangnya 10 aksara.');
  end if;
  if array_length(p.pengangkutan, 1) is null then
    v_ralat := array_append(v_ralat, 'Jenis pengangkutan belum dipilih.');
  end if;
  if p.anjuran_pihak_luar and coalesce(trim(p.nama_penganjur_luar), '') = '' then
    v_ralat := array_append(v_ralat, 'Nama penganjur luar wajib diisi.');
  end if;

  -- Tempat dan tarikh
  select count(*) into v_bil_tempat
    from permohonan_tempat where permohonan_id = p.id;
  if v_bil_tempat = 0 then
    v_ralat := array_append(v_ralat, 'Sekurang-kurangnya satu tempat lawatan perlu diisi.');
  end if;

  -- Tempoh minimum mengikut kategori (Lampiran E dan F)
  if p.kategori is not null and p.tarikh_mula is not null then
    select coalesce((nilai ->> p.kategori::text)::int, 21) into v_tempoh_min
      from tetapan where kunci = 'tempoh_minimum';
    v_hari := p.tarikh_mula - current_date;
    if v_hari < v_tempoh_min then
      v_ralat := array_append(v_ralat, format(
        'Permohonan %s perlu dihantar sekurang-kurangnya %s hari sebelum lawatan. Tinggal %s hari.',
        replace(p.kategori::text, '_', ' '), v_tempoh_min, v_hari));
    end if;
  end if;

  -- Peserta
  if p.bil_murid <= 0 then
    v_ralat := array_append(v_ralat, 'Bilangan murid belum diisi.');
  end if;
  if p.bil_guru <= 0 then
    v_ralat := array_append(v_ralat, 'Bilangan guru pengiring belum diisi.');
  end if;

  select * into v_ketua from peserta
   where permohonan_id = p.id and kategori = 'KETUA_ROMBONGAN' limit 1;
  if not found then
    v_ralat := array_append(v_ralat, 'Ketua rombongan belum ditetapkan.');
  else
    if coalesce(trim(v_ketua.kp), '') = '' then
      v_ralat := array_append(v_ralat, 'No. kad pengenalan ketua rombongan wajib diisi.');
    end if;
    if coalesce(trim(v_ketua.telefon), '') = '' then
      v_ralat := array_append(v_ralat, 'No. telefon ketua rombongan wajib diisi.');
    end if;
    if p.kategori = 'LUAR_NEGARA' and coalesce(trim(v_ketua.pasport), '') = '' then
      v_ralat := array_append(v_ralat, 'No. pasport ketua rombongan wajib bagi lawatan luar negara.');
    end if;
  end if;

  -- Nisbah pengiring (Lampiran C)
  v_nisbah := kira_nisbah(p.nisbah_kategori, p.bil_murid, p.bil_guru);
  if (v_nisbah ->> 'disekat')::boolean then
    v_ralat := array_append(v_ralat, format(
      'Nisbah pengiring tidak mencukupi. Diperlukan %s pengiring (%s); had pengecualian terendah %s. Ada %s.',
      v_nisbah ->> 'perlu', v_nisbah ->> 'nisbah',
      v_nisbah ->> 'had_terendah', v_nisbah ->> 'ada'));
  elsif (v_nisbah ->> 'perlu_justifikasi')::boolean
        and coalesce(length(trim(p.justifikasi_nisbah)), 0) < 20 then
    v_ralat := array_append(v_ralat, 'Justifikasi pengecualian nisbah (Bahagian I) wajib diisi sekurang-kurangnya 20 aksara.');
  end if;

  -- Dokumen wajib
  select array_agg(d.nama order by d.susunan), count(*)
    into v_kurang, v_bil_dok
    from dokumen_diperlukan(p.id) d
   where not exists (select 1 from dokumen dk
                      where dk.permohonan_id = p.id and dk.jenis_dokumen = d.kod);
  if coalesce(v_bil_dok, 0) > 0 then
    v_ralat := array_append(v_ralat, format('Dokumen belum dimuat naik: %s',
                                 array_to_string(v_kurang, '; ')));
  end if;

  -- Amaran (tidak menyekat)
  if p.tarikh_mula is not null
     and extract(isodow from p.tarikh_mula) between 1 and 5 then
    v_amaran := array_append(v_amaran, 'Tarikh lawatan jatuh pada hari persekolahan — rujuk SPI Bil. 5/2002.');
  end if;
  if (v_nisbah ->> 'perlu_justifikasi')::boolean then
    v_amaran := array_append(v_amaran, 'Nisbah pengiring di bawah keperluan tetapi dalam had pengecualian — Bahagian I terpakai.');
  end if;

  return jsonb_build_object(
    'boleh_hantar', array_length(v_ralat, 1) is null,
    'ralat',        coalesce(v_ralat, '{}'),
    'amaran',       coalesce(v_amaran, '{}'),
    'nisbah',       v_nisbah
  );
end;
$$;

-- ── Hantar permohonan ───────────────────────────────────────────────

create or replace function hantar_permohonan(p_permohonan_id uuid)
returns permohonan
language plpgsql security definer set search_path = public as $$
declare
  p permohonan%rowtype;
  v_semak jsonb;
  v_peg pegawai%rowtype;
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

-- ── Tindakan kelulusan ──────────────────────────────────────────────

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

  insert into kelulusan (permohonan_id, peringkat, bahagian, pegawai_id, nama_pegawai,
                         jawatan_pegawai, peranan, tindakan, catatan, pintasan_admin)
  values (p.id, p.status, bahagian_bagi_status(p.status), v_peg.id, v_peg.nama,
          v_peg.jawatan, v_peg.peranan, p_tindakan, p_catatan, v_pintasan);

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

-- ── Pintasan status oleh pentadbir ──────────────────────────────────

create or replace function tukar_status_pentadbir(p_permohonan_id uuid,
                                                  p_status status_t,
                                                  p_sebab text)
returns permohonan
language plpgsql security definer set search_path = public as $$
declare
  p permohonan%rowtype;
  v_peg pegawai%rowtype;
  v_lama status_t;
begin
  select * into v_peg from pegawai where user_id = auth.uid() and aktif;
  if not found or v_peg.peranan <> 'admin' then
    raise exception 'Hanya pentadbir sistem boleh menukar status secara manual.';
  end if;
  if coalesce(length(trim(p_sebab)), 0) < 10 then
    raise exception 'Sebab pertukaran status wajib diisi.';
  end if;

  select status into v_lama from permohonan where id = p_permohonan_id;
  update permohonan set status = p_status, dikemaskini_pada = now()
   where id = p_permohonan_id returning * into p;

  insert into log_audit (permohonan_id, no_rujukan, pegawai_id, emel_pegawai,
                         peristiwa, nilai_lama, nilai_baharu)
  values (p.id, p.no_rujukan, v_peg.id, v_peg.emel, 'STATUS_DITUKAR_PENTADBIR',
          jsonb_build_object('status', v_lama),
          jsonb_build_object('status', p_status, 'sebab', p_sebab));

  return p;
end;
$$;

-- ── Laporan pasca-lawatan (Lampiran G) ──────────────────────────────
-- Menerima laporan dan menutup rekod dalam satu urus niaga. Sekolah
-- tidak boleh menetapkan status SELESAI secara terus.

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

  insert into laporan_pasca (permohonan_id, ringkasan, bil_hadir_murid,
                             bil_hadir_guru, ada_insiden, butiran_insiden,
                             cadangan, dihantar_oleh, dihantar_pada)
  values (p.id, p_ringkasan, p_bil_hadir_murid, p_bil_hadir_guru,
          p_ada_insiden, p_butiran_insiden, p_cadangan, v_peg.id, now())
  on conflict (permohonan_id) do update
    set ringkasan = excluded.ringkasan,
        bil_hadir_murid = excluded.bil_hadir_murid,
        bil_hadir_guru = excluded.bil_hadir_guru,
        ada_insiden = excluded.ada_insiden,
        butiran_insiden = excluded.butiran_insiden,
        cadangan = excluded.cadangan,
        dihantar_oleh = excluded.dihantar_oleh,
        dihantar_pada = now()
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

-- ── Penyelarasan automatik ──────────────────────────────────────────

create or replace function selaras_permohonan() returns trigger
language plpgsql set search_path = public as $$
begin
  new.dikemaskini_pada := now();
  return new;
end;
$$;

create trigger permohonan_selaras
before update on permohonan
for each row execute function selaras_permohonan();

-- Kemas kini julat tarikh induk apabila tempat berubah
create or replace function selaras_tarikh_permohonan() returns trigger
language plpgsql set search_path = public as $$
declare
  v_id uuid;
begin
  -- NEW tidak wujud pada DELETE, OLD tidak wujud pada INSERT. Merujuk
  -- medan rekod yang belum ditetapkan akan menimbulkan ralat, jadi
  -- pilih sumber mengikut operasi.
  if tg_op = 'DELETE' then
    v_id := old.permohonan_id;
  else
    v_id := new.permohonan_id;
  end if;
  update permohonan p
     set tarikh_mula  = t.min_dari,
         tarikh_tamat = t.max_hingga
    from (select min(tarikh_dari) as min_dari, max(tarikh_hingga) as max_hingga
            from permohonan_tempat where permohonan_id = v_id) t
   where p.id = v_id;
  return null;
end;
$$;

create trigger tempat_selaras_tarikh
after insert or update or delete on permohonan_tempat
for each row execute function selaras_tarikh_permohonan();

-- Kunci suntingan selepas dihantar
create or replace function halang_sunting_selepas_hantar() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.status not in ('DRAF', 'DIKEMBALIKAN')
     and peranan_saya() = 'sekolah'
     and new.status = old.status then
    raise exception 'Permohonan berstatus % tidak boleh disunting oleh sekolah.', old.status;
  end if;
  return new;
end;
$$;

create trigger permohonan_kunci
before update on permohonan
for each row execute function halang_sunting_selepas_hantar();

-- ── Pandangan bantuan ───────────────────────────────────────────────

create or replace view v_permohonan_ringkas
with (security_invoker = true) as
select p.id,
       p.no_rujukan,
       p.status,
       p.kategori,
       p.tujuan,
       p.tarikh_mula,
       p.tarikh_tamat,
       p.bil_murid,
       p.bil_guru,
       p.bil_bukan_guru,
       p.kutipan_murid + p.kutipan_guru + p.sumber_lain as jumlah_a,
       coalesce((select sum(jumlah) from permohonan_penaja pn
                  where pn.permohonan_id = p.id), 0) as jumlah_b,
       p.kod_sekolah,
       s.nama as nama_sekolah,
       p.kod_ppd,
       d.nama as nama_ppd,
       p.dihantar_pada,
       p.diluluskan_pada,
       p.dicipta_pada,
       p.dikemaskini_pada,
       p.catatan_kembali,
       (select kod from pengesahan_qr q where q.permohonan_id = p.id limit 1) as kod_qr
  from permohonan p
  join sekolah s on s.kod_sekolah = p.kod_sekolah
  left join ppd d on d.kod_ppd = p.kod_ppd;
