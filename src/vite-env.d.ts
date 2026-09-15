/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_DOMAIN_DIBENARKAN?: string
  readonly VITE_URL_SISTEM?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
