import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20'

const ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID') ?? ''
const ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID') ?? ''
const SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY') ?? ''
export const BUCKET = Deno.env.get('R2_BUCKET') ?? 'elawatan-dokumen'

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.error('R2 belum dikonfigurasi — tetapkan R2_* dalam Edge Function secrets.')
}

const ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`

const klien = new AwsClient({
  accessKeyId: ACCESS_KEY_ID,
  secretAccessKey: SECRET_ACCESS_KEY,
  service: 's3',
  region: 'auto',
})

function urlObjek(kunci: string): string {
  const laluan = kunci.split('/').map(encodeURIComponent).join('/')
  return `${ENDPOINT}/${BUCKET}/${laluan}`
}

/** Pautan bertandatangan untuk memuat naik satu objek. */
export async function presignNaik(
  kunci: string,
  jenisMime: string,
  tempohSaat = 900,
): Promise<string> {
  const url = new URL(urlObjek(kunci))
  url.searchParams.set('X-Amz-Expires', String(tempohSaat))

  const signed = await klien.sign(
    new Request(url.toString(), {
      method: 'PUT',
      headers: { 'Content-Type': jenisMime },
    }),
    { aws: { signQuery: true, allHeaders: false } },
  )
  return signed.url
}

/** Pautan bertandatangan untuk melihat atau memuat turun satu objek. */
export async function presignLihat(
  kunci: string,
  namaFail?: string,
  tempohSaat = 300,
): Promise<string> {
  const url = new URL(urlObjek(kunci))
  url.searchParams.set('X-Amz-Expires', String(tempohSaat))
  if (namaFail) {
    url.searchParams.set(
      'response-content-disposition',
      `inline; filename="${namaFail.replace(/"/g, '')}"`,
    )
  }
  const signed = await klien.sign(new URL(url.toString()).toString(), {
    method: 'GET',
    aws: { signQuery: true },
  })
  return signed.url
}

/** Buang satu objek daripada bucket. */
export async function padamObjek(kunci: string): Promise<boolean> {
  const res = await klien.fetch(urlObjek(kunci), { method: 'DELETE' })
  return res.ok || res.status === 404
}

/** Kunci storan yang boleh diramal: satu folder setiap permohonan. */
export function binaKunci(
  permohonanId: string,
  jenisDokumen: string,
  namaFail: string,
): string {
  const bersih = namaFail
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(-120)
  return `permohonan/${permohonanId}/${jenisDokumen}/${crypto.randomUUID()}-${bersih}`
}
