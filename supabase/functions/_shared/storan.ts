// Penyesuai ujian local; laluan biasa kekal Cloudflare R2.
import * as r2 from './r2.ts'
import { klienPentadbir } from './supabase.ts'

export { binaKunci } from './r2.ts'
const localUrl = Deno.env.get('STORAN_LOCAL_URL')
const bucket = 'elawatan-dokumen-local'
export const tempohNaik = localUrl ? 7200 : 900

function urlPelayar(url: string): string {
  if (localUrl !== 'http://127.0.0.1:55321' || Deno.env.get('DENO_DEPLOYMENT_ID')) {
    throw new Error('Storan local hanya dibenarkan untuk ujian setempat.')
  }
  const hasil = new URL(url)
  return `${localUrl}${hasil.pathname}${hasil.search}`
}

export async function presignNaik(kunci: string, mime: string, saat = 900): Promise<string> {
  if (!localUrl) return r2.presignNaik(kunci, mime, saat)
  urlPelayar(localUrl) // Sahkan mod sebelum akses storan.
  const { data, error } = await klienPentadbir().storage.from(bucket).createSignedUploadUrl(kunci)
  if (error) throw error
  return urlPelayar(data.signedUrl)
}

export async function presignLihat(kunci: string, nama?: string, saat = 300): Promise<string> {
  if (!localUrl) return r2.presignLihat(kunci, nama, saat)
  urlPelayar(localUrl)
  const { data, error } = await klienPentadbir().storage.from(bucket).createSignedUrl(kunci, saat)
  if (error) throw error
  return urlPelayar(data.signedUrl)
}

export async function padamObjek(kunci: string): Promise<boolean> {
  if (!localUrl) return r2.padamObjek(kunci)
  urlPelayar(localUrl)
  const { error } = await klienPentadbir().storage.from(bucket).remove([kunci])
  return !error
}
