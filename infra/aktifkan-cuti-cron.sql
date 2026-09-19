-- Jalankan SEKALI selepas migration, Edge Function dan rahsia disahkan di staging.
-- Skrip ini tidak mencipta rahsia. Sediakan elawatan_url dan elawatan_cuti_token
-- melalui Supabase Vault dahulu; token mesti sama dengan CUTI_CRON_TOKEN di Edge.
begin;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $aktifkan$
declare v_url text; v_token text; v_job bigint;
begin
  if (select count(*) from vault.decrypted_secrets where name='elawatan_url')<>1
    or (select count(*) from vault.decrypted_secrets where name='elawatan_cuti_token')<>1 then
    raise exception 'Sediakan tepat satu rahsia Vault elawatan_url dan elawatan_cuti_token dahulu.';
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name='elawatan_url';
  select decrypted_secret into v_token from vault.decrypted_secrets where name='elawatan_cuti_token';
  if v_url is null or v_url !~ '^https://[a-z0-9]+\.supabase\.co$' then
    raise exception 'elawatan_url mesti URL asas projek Supabase HTTPS yang betul, tanpa slash hujung.';
  end if;
  if v_token is null or length(trim(v_token))<32 then
    raise exception 'Token cuti mesti rahsia rawak sekurang-kurangnya 32 aksara.';
  end if;
  -- Mengulang skrip menggantikan jadual bernama sama, bukan menambah tugas berganda.
  for v_job in select jobid from cron.job where jobname='elawatan-cuti-harian' loop
    perform cron.unschedule(v_job);
  end loop;
  perform cron.schedule('elawatan-cuti-harian', '0 19 * * *', $kerja$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name='elawatan_url') || '/functions/v1/selaras-cuti',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cuti-token', (select decrypted_secret from vault.decrypted_secrets where name='elawatan_cuti_token')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 90000
    );
  $kerja$);
end;
$aktifkan$;
commit;
