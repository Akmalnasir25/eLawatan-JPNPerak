-- ════════════════════════════════════════════════════════════════════
-- eLAWATAN Perak — Had Masa Tindakan, Eskalasi dan Peringatan
--
-- Setiap peringkat kelulusan diberi had hari bekerja. Permohonan yang
-- melebihi had ditanda lewat; selepas tempoh eskalasi, pegawai atasan
-- dimaklumkan. jana_peringatan() dijalankan sekali sehari (pg_cron)
-- dan juga menghantar peringatan tarikh tutup serta laporan pasca.
-- ════════════════════════════════════════════════════════════════════

-- ── Bila status semasa bermula ──────────────────────────────────────

alter table permohonan add column status_sejak timestamptz;

update permohonan p
   set status_sejak = coalesce(
         (select max(k.tarikh_tindakan) from kelulusan k where k.permohonan_id = p.id),
         p.dihantar_pada,
         p.dikemaskini_pada);

alter table permohonan
  alter column status_sejak set default now(),
  alter column status_sejak set not null;

create or replace function tanda_status_sejak() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status is distinct from old.status then
    new.status_sejak := now();
  end if;
  return new;
end;
$$;

create trigger permohonan_status_sejak
before update of status on permohonan
for each row execute function tanda_status_sejak();

-- ── Tetapan ─────────────────────────────────────────────────────────

insert into tetapan (kunci, nilai, nota, dikunci) values
  ('had_masa_tindakan',
   '{"MENUNGGU_PPD_SEMAK": 5, "MENUNGGU_PPD_SAH": 3,
     "MENUNGGU_JPN_SEMAK": 5, "MENUNGGU_JPN_SAH": 3,
     "MENUNGGU_KPM": 10, "eskalasi_selepas": 2}',
   'Had hari bekerja bagi setiap peringkat. eskalasi_selepas = hari bekerja selepas had sebelum pegawai atasan dimaklumkan.',
   false),
  ('cuti_umum', '[]',
   'Tarikh cuti umum (YYYY-MM-DD) yang tidak dikira sebagai hari bekerja.',
   false)
on conflict (kunci) do nothing;

-- ── Kiraan hari bekerja ─────────────────────────────────────────────

/** Hari bekerja (Isnin–Jumaat, bukan cuti umum) selepas p_dari hingga p_hingga. */
create or replace function hari_bekerja(p_dari timestamptz, p_hingga timestamptz default now())
returns int
language sql stable set search_path = public as $$
  select count(*)::int
    from generate_series(tarikh_my(p_dari) + 1, tarikh_my(p_hingga), interval '1 day') h
   where extract(isodow from h) < 6
     and not exists (
       select 1 from tetapan t, jsonb_array_elements_text(t.nilai) c
        where t.kunci = 'cuti_umum' and c = to_char(h, 'YYYY-MM-DD'));
$$;

create or replace function had_masa_status(p_status status_t) returns int
language sql stable set search_path = public as $$
  select (nilai ->> p_status::text)::int from tetapan where kunci = 'had_masa_tindakan';
$$;

-- ── Pandangan ringkas dengan had masa ───────────────────────────────

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
       (select kod from pengesahan_qr q where q.permohonan_id = p.id limit 1) as kod_qr,
       p.status_sejak,
       case when p.status::text like 'MENUNGGU%' then hari_bekerja(p.status_sejak) end as hari_menunggu,
       case when p.status::text like 'MENUNGGU%' then had_masa_status(p.status) end as had_hari
  from permohonan p
  join sekolah s on s.kod_sekolah = p.kod_sekolah
  left join ppd d on d.kod_ppd = p.kod_ppd;

-- ── Peringatan harian ───────────────────────────────────────────────

/** Pegawai atasan bagi peringkat yang lewat: penyemak → pengesah, pengesah → pentadbir. */
create or replace function penerima_eskalasi(p_permohonan_id uuid, p_status status_t)
returns setof uuid
language sql stable security definer set search_path = public as $$
  with p as (select * from permohonan where id = p_permohonan_id)
  select g.id from pegawai g, p
   where g.aktif
     and case p_status
           when 'MENUNGGU_PPD_SEMAK' then g.peranan = 'ppd_ketua' and g.kod_skop = p.kod_ppd
           when 'MENUNGGU_JPN_SEMAK' then g.peranan = 'jpn_pengarah' and g.kod_skop = p.kod_jpn
           else g.peranan = 'admin'
         end;
$$;

create or replace function sudah_dimaklumkan(p_permohonan_id uuid, p_jenis text, p_pegawai_id uuid,
                                             p_sejak timestamptz)
returns boolean
language sql stable set search_path = public as $$
  select exists (select 1 from notifikasi
                  where permohonan_id = p_permohonan_id and jenis = p_jenis
                    and pegawai_id = p_pegawai_id and dicipta_pada >= p_sejak);
$$;

create or replace function jana_peringatan() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_id uuid;
  v_had int;
  v_eskalasi int;
  v_tempoh int;
  v_akhir date;
  v_lewat int := 0;
  v_naik int := 0;
  v_tutup int := 0;
  v_laporan int := 0;
  v_hari_ini date := tarikh_my();
  v_ringkas text;
begin
  select coalesce((nilai ->> 'eskalasi_selepas')::int, 2) into v_eskalasi
    from tetapan where kunci = 'had_masa_tindakan';
  v_eskalasi := coalesce(v_eskalasi, 2);

  -- 1 & 2. Lewat dan eskalasi
  for r in
    select p.*, s.nama as nama_sekolah, hari_bekerja(p.status_sejak) as hari
      from permohonan p join sekolah s on s.kod_sekolah = p.kod_sekolah
     where p.status::text like 'MENUNGGU%'
  loop
    v_had := had_masa_status(r.status);
    continue when v_had is null or r.hari <= v_had;
    v_ringkas := format('%s — %s: %s hari bekerja di peringkat %s (had %s hari).',
                        coalesce(r.no_rujukan, 'Draf'), r.nama_sekolah, r.hari,
                        label_status(r.status), v_had);

    for v_id in select penerima_peringkat(r.id, r.status) loop
      if not sudah_dimaklumkan(r.id, 'LEWAT_TINDAKAN', v_id, now() - interval '20 hours') then
        perform cipta_notifikasi(v_id, r.id, 'LEWAT_TINDAKAN',
          'Permohonan melebihi had masa tindakan', v_ringkas, '/permohonan/' || r.id);
        v_lewat := v_lewat + 1;
      end if;
    end loop;

    if r.hari > v_had + v_eskalasi then
      for v_id in select penerima_eskalasi(r.id, r.status) loop
        if not sudah_dimaklumkan(r.id, 'ESKALASI', v_id, r.status_sejak) then
          perform cipta_notifikasi(v_id, r.id, 'ESKALASI',
            'Eskalasi: permohonan tertangguh', v_ringkas, '/permohonan/' || r.id);
          v_naik := v_naik + 1;
        end if;
      end loop;
    end if;
  end loop;

  -- 3. Tarikh akhir hantar (tempoh minimum) semakin hampir
  for r in
    select p.* from permohonan p
     where p.status in ('DRAF', 'DIKEMBALIKAN')
       and p.kategori is not null and p.tarikh_mula is not null
  loop
    select coalesce((nilai ->> r.kategori::text)::int, 21) into v_tempoh
      from tetapan where kunci = 'tempoh_minimum';
    v_akhir := r.tarikh_mula - coalesce(v_tempoh, 21);
    continue when v_hari_ini < v_akhir - 3 or v_hari_ini > v_akhir;

    for v_id in select penerima_sekolah(r.kod_sekolah) loop
      if not sudah_dimaklumkan(r.id, 'TARIKH_TUTUP_HAMPIR', v_id, now() - interval '20 hours') then
        perform cipta_notifikasi(v_id, r.id, 'TARIKH_TUTUP_HAMPIR',
          'Tarikh akhir menghantar permohonan hampir tiba',
          format('%s mesti dihantar selewat-lewatnya %s supaya memenuhi tempoh minimum %s hari.',
                 coalesce(left(r.tujuan, 90), 'Permohonan draf'),
                 to_char(v_akhir, 'DD/MM/YYYY'), v_tempoh),
          '/permohonan/' || r.id || '/sunting');
        v_tutup := v_tutup + 1;
      end if;
    end loop;
  end loop;

  -- 4. Laporan pasca-lawatan belum dihantar
  for r in
    select p.* from permohonan p
     where p.status = 'DILULUSKAN'
       and p.tarikh_tamat is not null and p.tarikh_tamat < v_hari_ini
       and not exists (select 1 from laporan_pasca l where l.permohonan_id = p.id)
  loop
    for v_id in select penerima_sekolah(r.kod_sekolah) loop
      if not sudah_dimaklumkan(r.id, 'LAPORAN_PASCA', v_id, now() - interval '7 days') then
        perform cipta_notifikasi(v_id, r.id, 'LAPORAN_PASCA',
          'Laporan pasca-lawatan belum dihantar',
          format('%s tamat pada %s. Sila hantar Lampiran G dalam tempoh 7 hari.',
                 coalesce(r.no_rujukan, 'Lawatan'), to_char(r.tarikh_tamat, 'DD/MM/YYYY')),
          '/permohonan/' || r.id || '/laporan');
        v_laporan := v_laporan + 1;
      end if;
    end loop;
  end loop;

  return jsonb_build_object('lewat', v_lewat, 'eskalasi', v_naik,
                            'tarikh_tutup', v_tutup, 'laporan_pasca', v_laporan);
end;
$$;

/** Pentadbir boleh menjalankan peringatan serta-merta dari panel. */
create or replace function jana_peringatan_pentadbir() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not adalah_admin() then
    raise exception 'Hanya pentadbir sistem boleh menjalankan peringatan secara manual.';
  end if;
  return jana_peringatan();
end;
$$;

revoke all on function jana_peringatan() from public, anon, authenticated;
revoke all on function penerima_eskalasi(uuid, status_t) from public, anon, authenticated;
revoke all on function jana_peringatan_pentadbir() from public;
grant execute on function jana_peringatan_pentadbir() to authenticated;
grant execute on function hari_bekerja(timestamptz, timestamptz) to authenticated;
grant execute on function had_masa_status(status_t) to authenticated;
