-- Supabase memasang pgcrypto dalam schema extensions. Fungsi kelulusan
-- sebelum ini hanya mencari public, lalu gagal ketika menjana kod QR.
alter function public.tindakan_kelulusan(uuid, public.tindakan_t, text)
  set search_path = public, extensions;
