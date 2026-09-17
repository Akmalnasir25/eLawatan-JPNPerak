-- Sejarah semakan mengikut versi fail dan pegawai. Tiada kemas kini/padam
-- terus oleh klien; identiti, masa dan skop ditentukan di pelayan.
create table semakan_dokumen (
  id uuid primary key default gen_random_uuid(),
  permohonan_id uuid not null references permohonan(id) on delete cascade,
  dokumen_id uuid not null,
  cincangan_sha256 text not null,
  nama_fail text not null,
  pegawai_id uuid not null references pegawai(id),
  nama_pegawai text not null,
  peranan peranan_t not null,
  status text not null check (status in ('DIBUKA', 'PATUH', 'PEMBETULAN')),
  catatan text not null default '' check (length(catatan) <= 2000),
  masa timestamptz not null default clock_timestamp(),
  check (status <> 'PEMBETULAN' or length(trim(catatan)) > 0)
);
create index semakan_dokumen_permohonan_idx on semakan_dokumen(permohonan_id, masa desc);
alter table semakan_dokumen enable row level security;
revoke all on semakan_dokumen from anon, authenticated;
grant select on semakan_dokumen to authenticated;
create policy semakan_dokumen_baca on semakan_dokumen for select to authenticated
  using (boleh_lihat_permohonan(permohonan_id));

create function rekod_semakan_dokumen(
  p_dokumen_id uuid,
  p_cincangan text,
  p_status text default 'DIBUKA',
  p_catatan text default ''
) returns semakan_dokumen
language plpgsql security definer set search_path = public as $$
declare
  d dokumen%rowtype;
  p permohonan%rowtype;
  g pegawai%rowtype;
  r semakan_dokumen%rowtype;
  nota text := trim(coalesce(p_catatan, ''));
begin
  select * into g from pegawai where user_id = auth.uid() and aktif;
  if not found then raise exception 'Sesi tiada capaian. Sila log masuk semula.'; end if;
  select * into d from dokumen where id = p_dokumen_id;
  if not found or not boleh_lihat_permohonan(d.permohonan_id) then
    raise exception 'Dokumen tidak tersedia atau di luar skop capaian anda.';
  end if;
  -- Kunci induk sebelum fail, supaya keputusan tidak bersilang tindakan kelulusan.
  select * into p from permohonan where id = d.permohonan_id for update;
  select * into d from dokumen where id = p_dokumen_id for share;
  if not found or d.cincangan_sha256 is distinct from p_cincangan then
    raise exception 'Dokumen telah berubah. Muat semula dan semak versi terkini.';
  end if;
  if p_status is null or p_status not in ('DIBUKA', 'PATUH', 'PEMBETULAN') then
    raise exception 'Pilih keputusan semakan yang sah.';
  end if;
  if length(nota) > 2000 then raise exception 'Catatan mesti tidak melebihi 2000 aksara.'; end if;
  if p_status = 'DIBUKA' then
    nota := '';
  else
    if p.status not in ('MENUNGGU_PPD_SEMAK', 'MENUNGGU_JPN_SEMAK')
       or (g.peranan <> 'admin' and g.peranan <> peranan_bagi_status(p.status)) then
      raise exception 'Semakan hanya boleh disimpan oleh penyemak pada giliran semasa.';
    end if;
    if p_status = 'PEMBETULAN' and nota = '' then
      raise exception 'Nyatakan pembetulan yang diperlukan dalam catatan.';
    end if;
    if not exists (select 1 from semakan_dokumen s where s.dokumen_id = d.id
      and s.cincangan_sha256 = d.cincangan_sha256 and s.pegawai_id = g.id and s.status = 'DIBUKA') then
      raise exception 'Buka dokumen ini dahulu sebelum menyimpan semakan.';
    end if;
    -- Retry keputusan sama tidak menghasilkan rekod pendua.
    select * into r from semakan_dokumen s where s.dokumen_id = d.id
      and s.cincangan_sha256 = d.cincangan_sha256 and s.pegawai_id = g.id
      and s.status <> 'DIBUKA' order by masa desc limit 1;
    if found and r.status = p_status and r.catatan = nota then return r; end if;
  end if;
  insert into semakan_dokumen (permohonan_id, dokumen_id, cincangan_sha256,
    nama_fail, pegawai_id, nama_pegawai, peranan, status, catatan)
  values (d.permohonan_id, d.id, d.cincangan_sha256, d.nama_fail,
    g.id, g.nama, g.peranan, p_status, nota) returning * into r;
  return r;
end;
$$;
revoke all on function rekod_semakan_dokumen(uuid, text, text, text) from public, anon;
grant execute on function rekod_semakan_dokumen(uuid, text, text, text) to authenticated;
