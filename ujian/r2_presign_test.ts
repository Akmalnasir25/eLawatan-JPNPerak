// Ujian tandatangan pautan R2 dengan kelayakan palsu — tiada rangkaian.
// Jalankan: npm run ujian:fn
import { assert, assertEquals, assertMatch } from 'jsr:@std/assert@1'

Deno.env.set('R2_ACCOUNT_ID', 'akaunujian')
Deno.env.set('R2_ACCESS_KEY_ID', 'AKIAUJIAN')
Deno.env.set('R2_SECRET_ACCESS_KEY', 'rahsia-ujian')
Deno.env.set('R2_BUCKET', 'elawatan-dokumen')

const { binaKunci, presignLihat, presignNaik } = await import(
  '../supabase/functions/_shared/r2.ts'
)

Deno.test('pautan muat naik: PUT bertandatangan, tamat 15 minit', async () => {
  const url = new URL(await presignNaik('permohonan/abc/SURAT_IRINGAN/x.pdf', 'application/pdf'))
  assertEquals(url.host, 'akaunujian.r2.cloudflarestorage.com')
  assertEquals(url.pathname, '/elawatan-dokumen/permohonan/abc/SURAT_IRINGAN/x.pdf')
  assertEquals(url.searchParams.get('X-Amz-Expires'), '900')
  assertEquals(url.searchParams.get('X-Amz-Algorithm'), 'AWS4-HMAC-SHA256')
  assertMatch(url.searchParams.get('X-Amz-Credential')!, /^AKIAUJIAN\/\d{8}\/auto\/s3\/aws4_request$/)
  assertMatch(url.searchParams.get('X-Amz-Signature')!, /^[0-9a-f]{64}$/)
  // Content-Type tidak boleh ditandatangani — pelayar menghantarnya sendiri
  assertEquals(url.searchParams.get('X-Amz-SignedHeaders'), 'host')
})

Deno.test('pautan lihat: tamat 5 minit, nama fail dalam disposition', async () => {
  const url = new URL(await presignLihat('permohonan/abc/K/y.pdf', 'Surat "rasmi".pdf'))
  assertEquals(url.searchParams.get('X-Amz-Expires'), '300')
  assertEquals(
    url.searchParams.get('response-content-disposition'),
    'inline; filename="Surat rasmi.pdf"',
  )
  assertMatch(url.searchParams.get('X-Amz-Signature')!, /^[0-9a-f]{64}$/)
})

Deno.test('tandatangan berubah jika kunci berubah', async () => {
  const a = new URL(await presignLihat('a.pdf')).searchParams.get('X-Amz-Signature')
  const b = new URL(await presignLihat('b.pdf')).searchParams.get('X-Amz-Signature')
  assert(a !== b)
})

Deno.test('kunci storan: satu folder setiap permohonan, nama fail dibersihkan', () => {
  const k = binaKunci('uuid-1', 'KEN_PERMIT', 'Permit Bas (salinan) #2.pdf')
  assertMatch(k, /^permohonan\/uuid-1\/KEN_PERMIT\/[0-9a-f-]{36}-Permit_Bas_salinan_2\.pdf$/)
  const jahat = binaKunci('uuid-1', 'X', '../../etc/passwd')
  assert(!jahat.includes('/../'), 'laluan tidak boleh keluar dari folder permohonan')
  assertEquals(jahat.split('/').length, 4)
})
