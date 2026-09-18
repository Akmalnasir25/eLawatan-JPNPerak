-- ════════════════════════════════════════════════════════════════════
-- eLAWATAN Perak — Sunting Pegawai oleh Pendaftar
--
-- Pendaftar boleh membetulkan nama, jawatan dan e-mel pegawai dalam
-- skopnya. Peranan dan kod skop tidak boleh diubah di sini.
--
-- E-mel hanya boleh diubah SEBELUM pegawai log masuk kali pertama.
-- Selepas itu e-mel terikat pada akaun auth Supabase; menukarnya di
-- jadual pegawai sahaja akan memutuskan pautan log masuk.
-- ════════════════════════════════════════════════════════════════════

create or replace function kemaskini_pegawai(
  p_id uuid,
  p_nama text,
  p_jawatan text default null,
  p_emel text default null
) returns pegawai
language plpgsql security definer set search_path = public as $$
declare
  v_peg pegawai%rowtype;
  v_sasaran pegawai%rowtype;
  v_lama pegawai%rowtype;
  v_emel text;
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
    raise exception 'Kemas kini maklumat anda sendiri melalui halaman Profil.';
  end if;
  if v_peg.peranan <> 'admin' then
    if v_sasaran.kod_skop is distinct from v_peg.kod_skop then
      raise exception 'Pegawai ini di luar skop anda.';
    end if;
    if not (v_sasaran.peranan = any (peranan_boleh_daftar(v_peg.peranan))) then
      raise exception 'Anda tidak boleh menyunting peranan %.', v_sasaran.peranan;
    end if;
  end if;

  if coalesce(length(trim(p_nama)), 0) < 3 then
    raise exception 'Nama pegawai wajib diisi.';
  end if;

  v_emel := coalesce(lower(trim(p_emel)), v_sasaran.emel);
  if v_emel <> lower(v_sasaran.emel) then
    if v_sasaran.user_id is not null then
      raise exception 'E-mel tidak boleh diubah selepas pegawai log masuk kali pertama.';
    end if;
    if v_emel !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      raise exception 'Alamat e-mel tidak sah.';
    end if;
    if not domain_dibenarkan(v_emel) then
      raise exception 'Hanya e-mel domain rasmi KPM diterima.';
    end if;
    if exists (select 1 from pegawai where lower(emel) = v_emel and id <> p_id) then
      raise exception 'E-mel ini sudah berdaftar dalam sistem.';
    end if;
  end if;

  v_lama := v_sasaran;
  update pegawai
     set nama = trim(p_nama),
         jawatan = nullif(trim(p_jawatan), ''),
         emel = v_emel
   where id = p_id
  returning * into v_sasaran;

  insert into log_audit (pegawai_id, emel_pegawai, peristiwa, nilai_lama, nilai_baharu)
  values (v_peg.id, v_peg.emel, 'PEGAWAI_DIKEMASKINI',
          jsonb_build_object('emel', v_lama.emel, 'nama', v_lama.nama, 'jawatan', v_lama.jawatan),
          jsonb_build_object('emel', v_sasaran.emel, 'nama', v_sasaran.nama,
                             'jawatan', v_sasaran.jawatan));

  return v_sasaran;
end;
$$;

revoke all on function kemaskini_pegawai(uuid, text, text, text) from public;
grant execute on function kemaskini_pegawai(uuid, text, text, text) to authenticated;
