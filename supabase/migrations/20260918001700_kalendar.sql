-- ════════════════════════════════════════════════════════════════════
-- eLAWATAN Perak — Kalendar Lawatan
--
-- Lawatan yang bertindih dengan julat tarikh, bersama tempat dan ketua
-- rombongan untuk hubungan kecemasan. SECURITY INVOKER: RLS memutuskan
-- skop — JPN dan pentadbir melihat seluruh negeri, PPD daerahnya,
-- sekolah lawatannya sendiri.
-- ════════════════════════════════════════════════════════════════════

create or replace function kalendar_lawatan(p_dari date, p_hingga date)
returns setof jsonb
language plpgsql stable security invoker set search_path = public as $$
begin
  if p_dari is null or p_hingga is null or p_hingga < p_dari then
    raise exception 'Julat tarikh tidak sah.';
  end if;
  if p_hingga - p_dari > 62 then
    raise exception 'Julat kalendar tidak boleh melebihi 62 hari.';
  end if;

  return query
    select jsonb_build_object(
             'id', p.id,
             'no_rujukan', p.no_rujukan,
             'status', p.status,
             'kategori', p.kategori,
             'tujuan', p.tujuan,
             'tarikh_mula', p.tarikh_mula,
             'tarikh_tamat', p.tarikh_tamat,
             'kod_sekolah', p.kod_sekolah,
             'nama_sekolah', s.nama,
             'kod_ppd', p.kod_ppd,
             'nama_ppd', d.nama,
             'bil_murid', p.bil_murid,
             'bil_guru', p.bil_guru,
             'bil_bukan_guru', p.bil_bukan_guru,
             'tempat', coalesce((
               select jsonb_agg(jsonb_build_object(
                        'tempat', t.tempat, 'negeri', t.negeri, 'negara', t.negara,
                        'tarikh_dari', t.tarikh_dari, 'tarikh_hingga', t.tarikh_hingga)
                      order by t.susunan, t.tarikh_dari)
                 from permohonan_tempat t where t.permohonan_id = p.id), '[]'::jsonb),
             'ketua', (
               select jsonb_build_object('nama', k.nama, 'telefon', k.telefon)
                 from peserta k
                where k.permohonan_id = p.id and k.kategori = 'KETUA_ROMBONGAN'
                order by k.susunan limit 1))
      from permohonan p
      join sekolah s on s.kod_sekolah = p.kod_sekolah
      left join ppd d on d.kod_ppd = p.kod_ppd
     where p.tarikh_mula is not null
       and p.tarikh_mula <= p_hingga
       and coalesce(p.tarikh_tamat, p.tarikh_mula) >= p_dari
       and p.status not in ('DRAF', 'DIKEMBALIKAN', 'DITOLAK', 'BATAL')
     order by p.tarikh_mula, s.nama;
end;
$$;

revoke all on function kalendar_lawatan(date, date) from public, anon;
grant execute on function kalendar_lawatan(date, date) to authenticated;
