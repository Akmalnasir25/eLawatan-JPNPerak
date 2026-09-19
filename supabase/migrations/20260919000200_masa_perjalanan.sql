-- Maklumat tambahan perjalanan keseluruhan; rekod lama kekal sah.
-- Polisi RLS permohonan sedia ada terus mengawal baca/tulis.
alter table public.permohonan
  add column masa_bertolak time,
  add column tarikh_pulang date,
  add column masa_pulang time,
  add column tarikh_tiba date,
  add column masa_tiba time;

alter table public.permohonan add constraint masa_perjalanan_jam_sah check (
  (masa_bertolak is null or masa_bertolak < time '24:00') and
  (masa_pulang is null or masa_pulang < time '24:00') and
  (masa_tiba is null or masa_tiba < time '24:00')
);
comment on column public.permohonan.tarikh_tiba is
  'Tarikh anggaran tiba semula di sekolah. NULL mengikuti tarikh_pulang atau tarikh_tamat.';
