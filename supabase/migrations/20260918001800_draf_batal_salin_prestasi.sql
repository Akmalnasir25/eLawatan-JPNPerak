-- ════════════════════════════════════════════════════════════════════
-- eLAWATAN Perak — Draf, Pembatalan, Salin Permohonan dan Prestasi
--
-- 1. Domain e-mel rasmi sekolah KPM (moe.edu.my) dibenarkan — senarai
--    rasmi sekolah JPN menggunakan domain ini.
-- 2. "Permohonan Baharu" menggunakan semula draf kosong sekolah dan
--    tidak lagi mencipta draf berganda.
-- 3. Sekolah boleh membatalkan permohonan yang telah dihantar atau
--    diluluskan, dengan sebab. Pegawai terlibat dimaklumkan.
-- 4. Sekolah boleh menyalin permohonan lama sebagai draf baharu.
-- 5. Statistik masa kelulusan setiap peringkat dan setiap pegawai.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Domain ───────────────────────────────────────────────────────

update tetapan
   set nilai = (select jsonb_agg(distinct d order by d)
                  from jsonb_array_elements_text(nilai || '["moe.edu.my"]'::jsonb) d)
 where kunci = 'domain_dibenarkan';

-- ── 2. Draf kosong ──────────────────────────────────────────────────

/** Draf kosong milik sekolah pemanggil (belum diisi apa-apa), jika ada. */
create or replace function cari_draf_kosong() returns uuid
language sql stable security invoker set search_path = public as $$
  select p.id
    from permohonan p
   where p.status = 'DRAF'
     and p.kod_sekolah = skop_saya()
     and peranan_saya() = 'sekolah'
     and coalesce(trim(p.tujuan), '') = ''
     and p.kategori is null
     and p.bil_murid = 0 and p.bil_guru = 0 and p.bil_bukan_guru = 0
     and not exists (select 1 from permohonan_tempat t where t.permohonan_id = p.id)
     and not exists (select 1 from peserta x where x.permohonan_id = p.id)
     and not exists (select 1 from dokumen d where d.permohonan_id = p.id)
   order by p.dicipta_pada desc
   limit 1;
$$;

-- ── 3. Pembatalan ───────────────────────────────────────────────────

alter table permohonan
  add column sebab_batal     text,
  add column dibatalkan_pada timestamptz;

create or replace function batal_permohonan(p_permohonan_id uuid, p_sebab text)
returns permohonan
language plpgsql security definer set search_path = public as $$
declare
  v_peg pegawai%rowtype;
  p permohonan%rowtype;
  v_lama status_t;
  v_id uuid;
  v_sekolah text;
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
    raise exception 'Hanya sekolah pemilik boleh membatalkan permohonan ini.';
  end if;

  if p.status = 'DRAF' then
    raise exception 'Draf tidak perlu dibatalkan — padam sahaja.';
  end if;
  if p.status not in ('MENUNGGU_PPD_SEMAK', 'MENUNGGU_PPD_SAH', 'MENUNGGU_JPN_SEMAK',
                      'MENUNGGU_JPN_SAH', 'MENUNGGU_KPM', 'DIKEMBALIKAN', 'DILULUSKAN') then
    raise exception 'Permohonan berstatus % tidak boleh dibatalkan.', p.status;
  end if;
  if p.status = 'DILULUSKAN' and p.tarikh_tamat is not null and p.tarikh_tamat < tarikh_my() then
    raise exception 'Lawatan telah berlangsung. Hantar laporan pasca-lawatan sebaliknya.';
  end if;
  if coalesce(length(trim(p_sebab)), 0) < 10 then
    raise exception 'Sebab pembatalan wajib diisi (sekurang-kurangnya 10 aksara).';
  end if;

  v_lama := p.status;
  update permohonan
     set status = 'BATAL', sebab_batal = trim(p_sebab), dibatalkan_pada = now()
   where id = p.id
  returning * into p;

  insert into log_audit (permohonan_id, no_rujukan, pegawai_id, emel_pegawai,
                         peristiwa, nilai_lama, nilai_baharu)
  values (p.id, p.no_rujukan, v_peg.id, v_peg.emel, 'PERMOHONAN_DIBATALKAN',
          jsonb_build_object('status', v_lama),
          jsonb_build_object('sebab', trim(p_sebab)));

  -- Maklumkan pegawai yang sedang menunggu dan yang pernah bertindak.
  select nama into v_sekolah from sekolah where kod_sekolah = p.kod_sekolah;
  for v_id in
    select penerima_peringkat(p.id, v_lama) where v_lama::text like 'MENUNGGU%'
    union
    select distinct k.pegawai_id from kelulusan k
     join pegawai g on g.id = k.pegawai_id and g.aktif
     where k.permohonan_id = p.id and k.pegawai_id <> v_peg.id
  loop
    perform cipta_notifikasi(
      v_id, p.id, 'STATUS_BATAL', 'Lawatan dibatalkan oleh sekolah',
      format('%s — %s: %s. Sebab: %s', coalesce(p.no_rujukan, 'Draf'),
             coalesce(v_sekolah, p.kod_sekolah), coalesce(left(p.tujuan, 90), ''), trim(p_sebab)),
      '/permohonan/' || p.id);
  end loop;

  return p;
end;
$$;

-- ── 4. Salin permohonan ─────────────────────────────────────────────

/**
 * Draf baharu daripada permohonan lama: maklumat lawatan, tempat (tarikh
 * dianjak ke tahun hadapan jika sudah berlalu), kewangan, penaja, ketua
 * rombongan dan guru. Murid, bukan murid, dokumen dan kelulusan tidak disalin.
 */
create or replace function salin_permohonan(p_permohonan_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_peg pegawai%rowtype;
  p permohonan%rowtype;
  v_baharu uuid;
  v_anjak int := 0;
begin
  select * into v_peg from pegawai where user_id = auth.uid() and aktif;
  if not found or v_peg.peranan <> 'sekolah' then
    raise exception 'Hanya akaun sekolah boleh menyalin permohonan.';
  end if;

  select * into p from permohonan where id = p_permohonan_id;
  if not found or p.kod_sekolah <> v_peg.kod_skop then
    raise exception 'Permohonan tidak dijumpai atau bukan milik sekolah anda.';
  end if;

  -- Anjak tarikh setahun demi setahun sehingga selepas hari ini.
  if p.tarikh_mula is not null then
    while (p.tarikh_mula + make_interval(years => v_anjak))::date <= tarikh_my() loop
      v_anjak := v_anjak + 1;
    end loop;
  end if;

  insert into permohonan (kod_sekolah, kod_ppd, kod_jpn, status, kategori, tujuan,
                          pengangkutan, nisbah_kategori, ada_penginapan, ada_risiko_tinggi,
                          ada_aktiviti_air, anjuran_pihak_luar, ada_anggota_keselamatan,
                          nama_penganjur_luar, kutipan_murid, kutipan_guru, sumber_lain,
                          sumber_lain_nota, bil_murid, bil_guru, bil_bukan_guru,
                          justifikasi_nisbah, dicipta_oleh)
  select s.kod_sekolah, s.kod_ppd, s.kod_jpn, 'DRAF', p.kategori, p.tujuan,
         p.pengangkutan, p.nisbah_kategori, p.ada_penginapan, p.ada_risiko_tinggi,
         p.ada_aktiviti_air, p.anjuran_pihak_luar, p.ada_anggota_keselamatan,
         p.nama_penganjur_luar, p.kutipan_murid, p.kutipan_guru, p.sumber_lain,
         p.sumber_lain_nota, p.bil_murid, p.bil_guru, p.bil_bukan_guru,
         p.justifikasi_nisbah, v_peg.id
    from sekolah s where s.kod_sekolah = p.kod_sekolah
  returning id into v_baharu;

  insert into permohonan_tempat (permohonan_id, susunan, tempat, negeri, negara,
                                 tarikh_dari, tarikh_hingga, penginapan)
  select v_baharu, susunan, tempat, negeri, negara,
         (tarikh_dari + make_interval(years => v_anjak))::date,
         (tarikh_hingga + make_interval(years => v_anjak))::date, penginapan
    from permohonan_tempat where permohonan_id = p.id;

  insert into permohonan_penaja (permohonan_id, susunan, nama_penaja, jenis_tajaan, jumlah)
  select v_baharu, susunan, nama_penaja, jenis_tajaan, jumlah
    from permohonan_penaja where permohonan_id = p.id;

  insert into peserta (permohonan_id, kategori, susunan, nama, kp, no_sijil_lahir, pasport,
                       jantina, tahun_tingkatan, jawatan, alamat, telefon, catatan)
  select v_baharu, kategori, susunan, nama, kp, no_sijil_lahir, pasport,
         jantina, tahun_tingkatan, jawatan, alamat, telefon, catatan
    from peserta
   where permohonan_id = p.id
     and kategori in ('KETUA_ROMBONGAN', 'GURU_PENGIRING', 'PEMUNGUT_BAYARAN',
                      'ANGGOTA_KESELAMATAN');

  insert into log_audit (permohonan_id, pegawai_id, emel_pegawai, peristiwa, nilai_baharu)
  values (v_baharu, v_peg.id, v_peg.emel, 'PERMOHONAN_DISALIN',
          jsonb_build_object('daripada', coalesce(p.no_rujukan, p.id::text), 'anjak_tahun', v_anjak));

  return v_baharu;
end;
$$;

-- ── 5. Prestasi kelulusan ───────────────────────────────────────────

/**
 * Tempoh setiap tindakan kelulusan dalam hari bekerja, dikira dari
 * tindakan sebelumnya atau penghantaran terakhir sebelum tindakan itu.
 * SECURITY INVOKER: hanya permohonan dalam skop pemanggil dikira.
 */
create or replace function prestasi_kelulusan(p_tahun int) returns jsonb
language sql stable security invoker set search_path = public as $$
  with tindakan as (
    select k.peringkat, k.nama_pegawai, k.tarikh_tindakan,
           hari_bekerja(
             greatest(
               (select max(k2.tarikh_tindakan) from kelulusan k2
                 where k2.permohonan_id = k.permohonan_id
                   and k2.tarikh_tindakan < k.tarikh_tindakan),
               (select max(a.masa) from log_audit a
                 where a.permohonan_id = k.permohonan_id
                   and a.peristiwa = 'PERMOHONAN_DIHANTAR'
                   and a.masa <= k.tarikh_tindakan)),
             k.tarikh_tindakan) as hari,
           had_masa_status(k.peringkat) as had
      from kelulusan k
     where not k.pintasan_admin
       and extract(year from k.tarikh_tindakan) = p_tahun
  ),
  peringkat as (
    select peringkat,
           count(*) as bil,
           round(avg(hari)::numeric, 1) as purata,
           max(hari) as maksimum,
           count(*) filter (where had is not null and hari > had) as lewat,
           max(had) as had
      from tindakan group by peringkat
  ),
  pegawai as (
    select nama_pegawai, peringkat,
           count(*) as bil,
           round(avg(hari)::numeric, 1) as purata,
           count(*) filter (where had is not null and hari > had) as lewat
      from tindakan group by nama_pegawai, peringkat
  )
  select jsonb_build_object(
    'peringkat', coalesce((select jsonb_agg(to_jsonb(x) order by x.peringkat) from peringkat x), '[]'),
    'pegawai', coalesce((select jsonb_agg(to_jsonb(y) order by y.lewat desc, y.purata desc) from pegawai y), '[]'));
$$;

-- ── Keizinan ────────────────────────────────────────────────────────

revoke all on function batal_permohonan(uuid, text) from public;
revoke all on function salin_permohonan(uuid) from public;
grant execute on function cari_draf_kosong() to authenticated;
grant execute on function batal_permohonan(uuid, text) to authenticated;
grant execute on function salin_permohonan(uuid) to authenticated;
grant execute on function prestasi_kelulusan(int) to authenticated;
