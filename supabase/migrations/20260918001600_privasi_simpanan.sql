-- ════════════════════════════════════════════════════════════════════
-- eLAWATAN Perak — Notis Privasi (PDPA 2010) dan Tempoh Simpanan
--
-- 1. Setiap pengguna mesti bersetuju dengan notis privasi versi semasa
--    sebelum menggunakan sistem. Versi dan masa persetujuan direkod.
-- 2. Rekod yang ditutup melebihi tempoh simpanan boleh dianonimkan oleh
--    pentadbir: data peribadi peserta dipadam, rekod lawatan dikekalkan
--    untuk statistik dan log audit tidak disentuh.
-- ════════════════════════════════════════════════════════════════════

alter table pegawai
  add column privasi_versi             text,
  add column privasi_dipersetujui_pada timestamptz;

alter table permohonan add column dianonimkan_pada timestamptz;

insert into tetapan (kunci, nilai, nota, dikunci) values
  ('tempoh_simpanan', '{"tahun": 7}',
   'Tempoh (tahun) rekod permohonan yang ditutup disimpan sebelum data peribadi peserta boleh dianonimkan.',
   false)
on conflict (kunci) do nothing;

create or replace function setuju_privasi(p_versi text) returns pegawai
language plpgsql security definer set search_path = public as $$
declare
  v_peg pegawai%rowtype;
begin
  if coalesce(length(trim(p_versi)), 0) = 0 or length(p_versi) > 40 then
    raise exception 'Versi notis privasi tidak sah.';
  end if;

  update pegawai
     set privasi_versi = trim(p_versi), privasi_dipersetujui_pada = now()
   where user_id = auth.uid() and aktif
  returning * into v_peg;
  if not found then
    raise exception 'Akaun tiada capaian sistem.';
  end if;

  insert into log_audit (pegawai_id, emel_pegawai, peristiwa, nilai_baharu)
  values (v_peg.id, v_peg.emel, 'PRIVASI_DIPERSETUJUI', jsonb_build_object('versi', trim(p_versi)));

  return v_peg;
end;
$$;

-- ── Tempoh simpanan ─────────────────────────────────────────────────

create or replace function tahun_simpanan() returns int
language sql stable set search_path = public as $$
  select greatest(1, coalesce((select (nilai ->> 'tahun')::int from tetapan
                                where kunci = 'tempoh_simpanan'), 7));
$$;

/** Rekod ditutup yang melepasi tempoh simpanan dan belum dianonimkan. */
create or replace function rekod_luput() returns setof jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not adalah_admin() then
    raise exception 'Hanya pentadbir sistem boleh melihat rekod luput.';
  end if;
  return query
    select jsonb_build_object(
             'id', p.id, 'no_rujukan', p.no_rujukan, 'status', p.status,
             'nama_sekolah', s.nama, 'tujuan', p.tujuan,
             'tarikh_mula', p.tarikh_mula, 'dikemaskini_pada', p.dikemaskini_pada,
             'bil_peserta', (select count(*) from peserta x where x.permohonan_id = p.id),
             'bil_dokumen', (select count(*) from dokumen d where d.permohonan_id = p.id))
      from permohonan p join sekolah s on s.kod_sekolah = p.kod_sekolah
     where p.status in ('SELESAI', 'DITOLAK', 'BATAL')
       and p.dianonimkan_pada is null
       and p.dikemaskini_pada < now() - make_interval(years => tahun_simpanan())
     order by p.dikemaskini_pada;
end;
$$;

/**
 * Padam data peribadi peserta bagi satu rekod luput. Pulangkan id
 * dokumen supaya antara muka memadam fail R2 melalui r2-padam.
 */
create or replace function anonimkan_permohonan(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_peg pegawai%rowtype;
  p permohonan%rowtype;
  v_peserta int;
begin
  select * into v_peg from pegawai where user_id = auth.uid() and aktif;
  if not found or v_peg.peranan <> 'admin' then
    raise exception 'Hanya pentadbir sistem boleh menganonimkan rekod.';
  end if;

  select * into p from permohonan where id = p_id for update;
  if not found then
    raise exception 'Permohonan tidak dijumpai.';
  end if;
  if p.dianonimkan_pada is not null then
    raise exception 'Rekod ini sudah dianonimkan.';
  end if;
  if p.status not in ('SELESAI', 'DITOLAK', 'BATAL')
     or p.dikemaskini_pada >= now() - make_interval(years => tahun_simpanan()) then
    raise exception 'Rekod ini belum melepasi tempoh simpanan % tahun.', tahun_simpanan();
  end if;

  update peserta
     set nama = 'Peserta ' || (susunan + 1), kp = null, no_sijil_lahir = null,
         pasport = null, alamat = null, telefon = null, catatan = null
   where permohonan_id = p_id;
  get diagnostics v_peserta = row_count;

  update permohonan set dianonimkan_pada = now() where id = p_id;

  insert into log_audit (permohonan_id, no_rujukan, pegawai_id, emel_pegawai, peristiwa, nilai_baharu)
  values (p.id, p.no_rujukan, v_peg.id, v_peg.emel, 'DATA_PERIBADI_DIANONIMKAN',
          jsonb_build_object('bil_peserta', v_peserta, 'tahun_simpanan', tahun_simpanan()));

  return jsonb_build_object(
    'bil_peserta', v_peserta,
    'dokumen', coalesce((select jsonb_agg(d.id) from dokumen d where d.permohonan_id = p_id), '[]'));
end;
$$;

revoke all on function setuju_privasi(text) from public;
revoke all on function rekod_luput() from public;
revoke all on function anonimkan_permohonan(uuid) from public;
grant execute on function setuju_privasi(text) to authenticated;
grant execute on function rekod_luput() to authenticated;
grant execute on function anonimkan_permohonan(uuid) to authenticated;
