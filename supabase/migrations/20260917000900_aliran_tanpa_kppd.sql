-- ════════════════════════════════════════════════════════════════════
-- eLAWATAN Perak — Aliran Kelulusan Tanpa KPPD bagi Lawatan Luar Daerah
-- ════════════════════════════════════════════════════════════════════
-- Dalam Daerah:           Penyemak PPD → KPPD (Bhg. G) → DILULUSKAN
-- Antara Daerah / Negeri: Penyemak PPD → Penyemak JPN → Pengarah (Bhg. H)
-- Luar Negara:            Penyemak PPD → Penyemak JPN → Pengarah → KPM
--
-- KPPD hanya mengesahkan lawatan yang kelulusannya di peringkat PPD.
-- Permohonan luar daerah yang sudah berada di MENUNGGU_PPD_SAH sebelum
-- migrasi ini masih boleh diselesaikan oleh KPPD dan terus ke JPN.

create or replace function status_seterusnya(p_kategori kategori_t, p_status status_t)
returns status_t
language sql immutable as $$
  select case
    when p_status = 'MENUNGGU_PPD_SEMAK' then
      case when p_kategori = 'DALAM_DAERAH' then 'MENUNGGU_PPD_SAH'::status_t
           else 'MENUNGGU_JPN_SEMAK'::status_t end
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

update tetapan
   set nilai = '{"DALAM_DAERAH":["MENUNGGU_PPD_SEMAK","MENUNGGU_PPD_SAH"],
                 "ANTARA_DAERAH":["MENUNGGU_PPD_SEMAK","MENUNGGU_JPN_SEMAK","MENUNGGU_JPN_SAH"],
                 "ANTARA_NEGERI":["MENUNGGU_PPD_SEMAK","MENUNGGU_JPN_SEMAK","MENUNGGU_JPN_SAH"],
                 "LUAR_NEGARA":["MENUNGGU_PPD_SEMAK","MENUNGGU_JPN_SEMAK","MENUNGGU_JPN_SAH","MENUNGGU_KPM"]}'
 where kunci = 'laluan_kelulusan';
