-- Pengambilan automatik tidak menerbitkan tarikh tanpa keputusan admin.
create table public.cuti_kerja (
  id boolean primary key default true check (id),
  token uuid, luput timestamptz, cubaan_pada timestamptz, selesai_pada timestamptz
);
insert into public.cuti_kerja(id) values(true);
create table public.cuti_sumber (
  tahun integer not null check(tahun between 2000 and 2200),
  jenis text not null check(jenis in ('umum','sekolah')),
  cubaan_pada timestamptz not null,
  berjaya_pada timestamptz,
  status text not null check(status in ('berjaya','belum_tersedia','gagal')),
  mesej text,
  primary key(tahun,jenis)
);
create table public.cuti_calon (
  tahun integer not null,
  jenis text not null,
  id text not null check(length(id) between 1 and 200),
  data jsonb not null,
  versi text not null,
  keputusan text not null default 'menunggu' check(keputusan in ('menunggu','diterima','ditolak')),
  diterbitkan jsonb,
  disahkan_pada timestamptz,
  dilihat_pada timestamptz not null default now(),
  primary key(tahun,jenis,id),
  foreign key(tahun,jenis) references public.cuti_sumber(tahun,jenis)
);
create table public.cuti_keputusan (
  id bigint generated always as identity primary key,
  tahun integer not null, jenis text not null, sumber_id text not null,
  versi text not null, data jsonb not null, keputusan text not null,
  pegawai_id uuid not null references public.pegawai(id),
  pada timestamptz not null default now()
);

alter table public.cuti_kerja enable row level security;
alter table public.cuti_sumber enable row level security;
alter table public.cuti_calon enable row level security;
alter table public.cuti_keputusan enable row level security;
revoke all on public.cuti_kerja, public.cuti_sumber, public.cuti_calon, public.cuti_keputusan from public, anon, authenticated;
grant select on public.cuti_kerja, public.cuti_sumber, public.cuti_calon, public.cuti_keputusan to authenticated;
-- Token kunci tidak perlu didedahkan walaupun kepada admin browser.
revoke select on public.cuti_kerja from authenticated;
grant all on public.cuti_kerja, public.cuti_sumber, public.cuti_calon, public.cuti_keputusan to service_role;
create policy cuti_sumber_admin on public.cuti_sumber for select to authenticated using(public.adalah_admin());
create policy cuti_calon_admin on public.cuti_calon for select to authenticated using(public.adalah_admin());
create policy cuti_keputusan_admin on public.cuti_keputusan for select to authenticated using(public.adalah_admin());

create function public.mula_selaras_cuti() returns uuid
language plpgsql security definer set search_path = public as $$
declare v_token uuid;
begin
  update cuti_kerja set token=gen_random_uuid(), luput=now()+interval '5 minutes',
    cubaan_pada=now(), selesai_pada=null
    where id and (token is null or luput < now()) returning token into v_token;
  return v_token;
end;
$$;

create function public.simpan_selaras_cuti(p_token uuid, p_tahun integer, p_jenis text,
  p_data jsonb, p_status text, p_mesej text default null) returns integer
language plpgsql security definer set search_path = public as $$
declare c jsonb; v_versi text; lama cuti_calon%rowtype; v_baru integer:=0;
begin
  perform 1 from cuti_kerja where id and token=p_token and luput > now() for update;
  if not found then raise exception 'Kunci penyelarasan telah luput.'; end if;
  if p_status is null or p_status not in ('berjaya','belum_tersedia','gagal') then
    raise exception 'Status penyelarasan tidak sah.';
  end if;
  if p_status='berjaya' then
    if p_data is null or jsonb_typeof(p_data) <> 'array' then raise exception 'Data cuti tidak sah.'; end if;
    if jsonb_array_length(p_data) not between 1 and 200 then raise exception 'Senarai cuti kosong atau terlalu besar.'; end if;
    if (select count(distinct value->>'id') from jsonb_array_elements(p_data)) <> jsonb_array_length(p_data) then
      raise exception 'Identiti cuti berulang.';
    end if;
  end if;
  insert into cuti_sumber(tahun,jenis,cubaan_pada,berjaya_pada,status,mesej)
  values(p_tahun,p_jenis,now(),case when p_status='berjaya' then now() end,p_status,left(p_mesej,300))
  on conflict(tahun,jenis) do update set cubaan_pada=now(), status=excluded.status,mesej=excluded.mesej,
    berjaya_pada=coalesce(excluded.berjaya_pada,cuti_sumber.berjaya_pada);
  if p_status <> 'berjaya' then return 0; end if;
  for c in select value from jsonb_array_elements(p_data) loop
    if jsonb_typeof(c)<>'object' or coalesce(length(c->>'id'),0) not between 1 and 200
      or coalesce(length(c->>'nama'),0) not between 1 and 200
      or coalesce(c->>'mula','') !~ '^\d{4}-\d{2}-\d{2}$'
      or coalesce(c->>'tamat','') !~ '^\d{4}-\d{2}-\d{2}$'
      or extract(year from (c->>'mula')::date)<>p_tahun
      or extract(year from (c->>'tamat')::date)<>p_tahun
      or (c->>'mula')::date > (c->>'tamat')::date
      or coalesce(jsonb_typeof(c->'amaran'),'')<>'array'
    then raise exception 'Rekod cuti tidak sah.'; end if;
    v_versi:=md5(c::text);
    select * into lama from cuti_calon where tahun=p_tahun and jenis=p_jenis and id=c->>'id' for update;
    if not found then
      insert into cuti_calon(tahun,jenis,id,data,versi) values(p_tahun,p_jenis,c->>'id',c,v_versi);
      v_baru:=v_baru+1;
    elsif lama.versi<>v_versi then
      update cuti_calon set data=c, versi=v_versi, keputusan='menunggu',dilihat_pada=now()
        where tahun=p_tahun and jenis=p_jenis and id=c->>'id';
      v_baru:=v_baru+1;
    else
      update cuti_calon set dilihat_pada=now() where tahun=p_tahun and jenis=p_jenis and id=c->>'id';
    end if;
  end loop;
  if v_baru>0 then
    insert into notifikasi(pegawai_id,jenis,tajuk,mesej,pautan,emel_status)
      select id,'CUTI_PERLU_SEMAKAN','Data cuti baharu untuk disemak',
        v_baru||' rekod cuti '||p_jenis||' tahun '||p_tahun||' menunggu semakan.',
        '/pentadbir?tab=kalendar','DILANGKAU' from pegawai where aktif and peranan='admin';
  end if;
  return v_baru;
end;
$$;

create function public.tamat_selaras_cuti(p_token uuid) returns void
language sql security definer set search_path = public as $$
  update cuti_kerja set token=null,luput=null,selesai_pada=now() where id and token=p_token;
$$;

create function public.putuskan_cuti(p_tahun integer,p_jenis text,p_id text,p_versi text,p_terima boolean) returns void
language plpgsql security definer set search_path = public as $$
declare c cuti_calon%rowtype; v_keputusan text;
begin
  if not adalah_admin() then raise exception 'Hanya admin aktif boleh menyemak cuti.' using errcode='42501'; end if;
  if p_terima is null then raise exception 'Keputusan diperlukan.'; end if;
  select * into c from cuti_calon where tahun=p_tahun and jenis=p_jenis and id=p_id for update;
  if not found then raise exception 'Calon cuti tidak ditemui.'; end if;
  if p_versi is null or c.versi<>p_versi then raise exception 'Data cuti telah berubah. Muat semula dan semak versi terkini.'; end if;
  v_keputusan:=case when p_terima then 'diterima' else 'ditolak' end;
  if c.keputusan=v_keputusan then return; end if;
  if c.keputusan<>'menunggu' and not (c.keputusan='ditolak' and p_terima) then
    raise exception 'Versi ini sudah diputuskan. Muat semula senarai.';
  end if;
  update cuti_calon set keputusan=v_keputusan,
    diterbitkan=case when p_terima then data else diterbitkan end,
    disahkan_pada=case when p_terima then now() else disahkan_pada end
    where tahun=p_tahun and jenis=p_jenis and id=p_id;
  insert into cuti_keputusan(tahun,jenis,sumber_id,versi,data,keputusan,pegawai_id)
    values(p_tahun,p_jenis,p_id,p_versi,c.data,v_keputusan,id_pegawai_saya());
  insert into log_audit(pegawai_id,emel_pegawai,peristiwa,nilai_lama,nilai_baharu)
    values(id_pegawai_saya(),emel_saya(),'CUTI_DISEMAK',c.diterbitkan,
      jsonb_build_object('tahun',p_tahun,'jenis',p_jenis,'keputusan',v_keputusan,'data',c.data));
end;
$$;

-- RPC baca hanya mendedahkan cuti diterima; tiada calon, token atau identiti admin.
create function public.tarik_balik_cuti(p_tahun integer,p_jenis text,p_id text,p_versi text) returns void
language plpgsql security definer set search_path = public as $$
declare c cuti_calon%rowtype;
begin
  if not adalah_admin() then raise exception 'Hanya admin aktif boleh menyemak cuti.' using errcode='42501'; end if;
  select * into c from cuti_calon where tahun=p_tahun and jenis=p_jenis and id=p_id for update;
  if not found or p_versi is null or c.versi<>p_versi then raise exception 'Data cuti telah berubah. Muat semula status.'; end if;
  if c.diterbitkan is null then return; end if;
  update cuti_calon set diterbitkan=null,disahkan_pada=null,
    keputusan=case when keputusan='menunggu' then 'menunggu' else 'ditolak' end
    where tahun=p_tahun and jenis=p_jenis and id=p_id;
  insert into cuti_keputusan(tahun,jenis,sumber_id,versi,data,keputusan,pegawai_id)
    values(p_tahun,p_jenis,p_id,p_versi,c.diterbitkan,'ditarik_balik',id_pegawai_saya());
  insert into log_audit(pegawai_id,emel_pegawai,peristiwa,nilai_lama,nilai_baharu)
    values(id_pegawai_saya(),emel_saya(),'CUTI_DISEMAK',c.diterbitkan,
      jsonb_build_object('tahun',p_tahun,'jenis',p_jenis,'keputusan','ditarik_balik'));
end;
$$;

create function public.cuti_diterima(p_dari integer,p_hingga integer) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if id_pegawai_saya() is null then raise exception 'Sila log masuk semula.' using errcode='42501'; end if;
  if p_dari is null or p_hingga is null or p_hingga-p_dari not between 0 and 2 then raise exception 'Julat tahun tidak sah.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('tahun',tahun,'jenis',jenis,'data',diterbitkan,'disahkan_pada',disahkan_pada))
    from cuti_calon where tahun between p_dari and p_hingga and diterbitkan is not null),'[]'::jsonb);
end;
$$;

create function public.status_cuti_admin() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not adalah_admin() then raise exception 'Hanya admin aktif boleh melihat penyelarasan.' using errcode='42501'; end if;
  return jsonb_build_object(
    'kerja',(select jsonb_build_object('cubaan_pada',cubaan_pada,'selesai_pada',selesai_pada,'sedang_berjalan',token is not null and luput>now()) from cuti_kerja where id),
    'sumber',coalesce((select jsonb_agg(s order by tahun desc,jenis) from cuti_sumber s),'[]'::jsonb),
    'calon',coalesce((select jsonb_agg(c order by tahun desc,jenis,id) from cuti_calon c),'[]'::jsonb));
end;
$$;

revoke all on function public.mula_selaras_cuti(),public.simpan_selaras_cuti(uuid,integer,text,jsonb,text,text),public.tamat_selaras_cuti(uuid) from public,anon,authenticated;
grant execute on function public.mula_selaras_cuti(),public.simpan_selaras_cuti(uuid,integer,text,jsonb,text,text),public.tamat_selaras_cuti(uuid) to service_role;
revoke all on function public.putuskan_cuti(integer,text,text,text,boolean),public.cuti_diterima(integer,integer),public.status_cuti_admin() from public,anon;
grant execute on function public.putuskan_cuti(integer,text,text,text,boolean),public.cuti_diterima(integer,integer),public.status_cuti_admin() to authenticated;
revoke all on function public.tarik_balik_cuti(integer,text,text,text) from public,anon;
grant execute on function public.tarik_balik_cuti(integer,text,text,text) to authenticated;
