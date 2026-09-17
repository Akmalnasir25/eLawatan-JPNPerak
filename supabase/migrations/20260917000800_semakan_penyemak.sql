-- ════════════════════════════════════════════════════════════════════
-- eLAWATAN Perak — Senarai Semak Penyemak
-- ════════════════════════════════════════════════════════════════════
-- Penyemak (PPD dan JPN) menanda setiap perkara sebelum memperakukan
-- permohonan. Pengesah (KPPD dan Pengarah) membaca perakuan itu dan
-- tidak perlu menyemak semula butiran.

insert into tetapan (kunci, nilai, nota, dikunci) values
  ('item_semakan',
   '[{"kod":"MAKLUMAT_SEKOLAH", "label":"Maklumat sekolah, pemohon dan tujuan lawatan lengkap (Bhg. A, B1)"},
     {"kod":"TEMPAT_TARIKH",    "label":"Tempat, tarikh dan tempoh permohonan mematuhi tempoh minimum"},
     {"kod":"PESERTA",          "label":"Senarai peserta dan ketua rombongan lengkap (Bhg. D, E)"},
     {"kod":"NISBAH",           "label":"Nisbah guru pengiring kepada murid dipatuhi atau pengecualian berjustifikasi"},
     {"kod":"PENGANGKUTAN",     "label":"Pengangkutan mempunyai permit, insurans, cukai jalan dan PUSPAKOM yang sah"},
     {"kod":"KEWANGAN",         "label":"Kewangan dan kutipan bayaran munasabah (Bhg. C)"},
     {"kod":"KESELAMATAN",      "label":"Aspek keselamatan, penginapan dan aktiviti berisiko telah dinilai"},
     {"kod":"DOKUMEN",          "label":"Dokumen sokongan lengkap mengikut Senarai Semak BSS Pin.1/2023"}]',
   'Perkara yang mesti ditanda penyemak PPD dan JPN sebelum memperakukan permohonan.',
   false)
on conflict (kunci) do nothing;

-- Salinan perkara yang ditanda, termasuk label pada masa itu, supaya
-- rekod tidak berubah jika senarai dipinda kemudian.
alter table kelulusan add column semakan jsonb;
comment on column kelulusan.semakan is
  'Perkara yang ditanda penyemak: [{kod, label}]. Hanya pada peringkat semakan.';

drop function tindakan_kelulusan(uuid, tindakan_t, text);

create function tindakan_kelulusan(
  p_permohonan_id uuid,
  p_tindakan tindakan_t,
  p_catatan text default null,
  p_semakan text[] default null
) returns permohonan
language plpgsql security definer set search_path = public as $$
declare
  p permohonan%rowtype;
  v_peg pegawai%rowtype;
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

  -- Pintasan pentadbir tidak membawa tandatangan sesiapa: pentadbir bukan
  -- pemegang jawatan dan tidak boleh menandatangani bagi pihaknya.
  -- Kembalikan dan Tolak juga tidak ditandatangani pada borang.
  insert into kelulusan (permohonan_id, peringkat, bahagian, pegawai_id, nama_pegawai,
                         jawatan_pegawai, peranan, tindakan, catatan, pintasan_admin,
                         kunci_tandatangan, kunci_cop, semakan)
  values (p.id, p.status, bahagian_bagi_status(p.status), v_peg.id, v_peg.nama,
          v_peg.jawatan, v_peg.peranan, p_tindakan, p_catatan, v_pintasan,
          case when v_pintasan or p_tindakan <> 'SOKONG' then null else v_peg.kunci_tandatangan end,
          case when v_pintasan or p_tindakan <> 'SOKONG' then null else v_peg.kunci_cop end,
          v_semakan);

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
                             'semakan', v_semakan));

  return p;
end;
$$;

revoke all on function tindakan_kelulusan(uuid, tindakan_t, text, text[]) from public;
grant execute on function tindakan_kelulusan(uuid, tindakan_t, text, text[]) to authenticated;
