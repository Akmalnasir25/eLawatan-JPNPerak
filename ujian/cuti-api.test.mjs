import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import ts from 'typescript'

const kod = await fs.readFile(new URL('../supabase/functions/_shared/cuti-api.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(kod, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { normalizeCuti, tahunSasaran, muatCuti } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))
const umum = (lebih = {}) => ({ id: 'tahun-baharu', date: '2027-01-01', name: { ms: 'Tahun Baharu' }, states: ['perak'], isPublicHoliday: true, status: 'confirmed', source: 'jpm', ...lebih })
const sekolah = (lebih = {}) => ({ id: 'penggal-1', year: 2027, group: 'B', name: { ms: 'Cuti Penggal 1' }, startDate: '2027-03-20', endDate: '2027-03-28', days: 9, ...lebih })
const payload = (...data) => ({ data, meta: { year: 2027 } })

test('normalisasi stabil walaupun susunan dan metadata hulu berubah', () => {
  const a = umum({ id: 'a', states: ['*'] })
  const z = umum({ id: 'z', date: '2027-05-01' })
  assert.deepEqual(normalizeCuti(payload(z, a), 2027, 'umum'), normalizeCuti({ data: [{ ...a, updatedAt: 'baharu' }, z], meta: { lastUpdated: 'berubah' } }, 2027, 'umum'))
  assert.deepEqual(normalizeCuti(payload(a), 2027, 'umum'), [{ id: 'a', nama: 'Tahun Baharu', mula: '2027-01-01', tamat: '2027-01-01', amaran: [] }])
})

test('cuti negeri lain dan hari bukan cuti umum ditapis', () => {
  const hasil = normalizeCuti(payload(umum(), umum({ id: 'kelantan', states: ['kelantan'] }), umum({ id: 'peringatan', isPublicHoliday: false })), 2027, 'umum')
  assert.deepEqual(hasil.map((c) => c.id), ['tahun-baharu'])
})

test('kumpulan sekolah dan pengecualian negeri dihormati', () => {
  const hasil = normalizeCuti(payload(sekolah(), sekolah({ id: 'a', group: 'A' }), sekolah({ id: 'sarawak', states: ['sarawak'] }), sekolah({ id: 'kecuali', excludeStates: ['perak'] })), 2027, 'sekolah')
  assert.deepEqual(hasil.map((c) => c.id), ['penggal-1'])
  assert.equal(normalizeCuti(payload(sekolah({ excludeStates: ['sarawak'] })), 2027, 'sekolah').length, 1)
  assert.equal(normalizeCuti(payload(sekolah({ excludeStates: [] })), 2027, 'sekolah').length, 1)
})

test('tarikh anggaran dan sumber komuniti kekal sebagai amaran', () => {
  const hasil = normalizeCuti(payload(umum({ status: 'tentative', source: 'community', isEstimated: true })), 2027, 'umum')
  assert.equal(hasil[0].amaran.length, 2)
  assert.match(hasil[0].amaran.join(' '), /komuniti.*anggaran/)
})

test('respons kosong atau tahun belum tersedia tidak menjadi kejayaan kosong', () => {
  for (const p of [payload(), { data: [], meta: { dataAvailable: false } }, payload(umum({ states: ['kedah'] }))]) {
    assert.throws(() => normalizeCuti(p, 2027, 'umum'), /belum tersedia/)
  }
})

test('rekod rosak menolak seluruh kelompok dan bukan sebahagian sahaja', () => {
  for (const rosak of [
    umum({ date: '2027-02-29' }), umum({ date: '2027-13-01' }), umum({ date: '2026-01-01' }),
    umum({ date: '2027-1-01' }), umum({ name: { ms: ' ' } }), umum({ id: 'x'.repeat(201) }),
    umum({ name: { ms: 'x'.repeat(201) } }), umum({ states: 'perak' }), umum({ states: [] }),
    umum({ isPublicHoliday: 'true' }), umum({ status: 'unknown' }), umum({ source: undefined }), umum({ isEstimated: 'yes' }),
  ]) {
    assert.throws(() => normalizeCuti(payload(umum({ id: 'sah' }), rosak), 2027, 'umum'), /tidak sah/)
  }
  for (const p of [null, [], {}, { data: 'invalid' }, { data: [umum()], meta: { year: 2026 } }, { data: Array.from({ length: 201 }, (_, i) => umum({ id: String(i) })) }]) {
    assert.throws(() => normalizeCuti(p, 2027, 'umum'), /tidak sah/)
  }
  assert.throws(() => normalizeCuti(payload(umum(), umum()), 2027, 'umum'), /tidak sah/)
})

test('julat sekolah tidak bersambung tidak mengada-adakan cuti tambahan', () => {
  assert.throws(() => normalizeCuti(payload(sekolah({ startDate: '2027-02-15', endDate: '2027-02-19', days: 3 })), 2027, 'sekolah'), /tidak sepadan/)
  for (const perubahan of [{ endDate: '2027-03-19' }, { startDate: '2026-12-31' }, { days: 0 }, { days: '9' }, { year: 2026 }, { group: 'C' }]) {
    assert.throws(() => normalizeCuti(payload(sekolah(perubahan)), 2027, 'sekolah'), /tidak sah/)
  }
})

test('tahun sasaran bertukar mengikut tengah malam Malaysia', () => {
  assert.deepEqual(tahunSasaran(new Date('2026-12-31T15:59:59Z')), [2026, 2027])
  assert.deepEqual(tahunSasaran(new Date('2026-12-31T16:00:00Z')), [2027, 2028])
  assert.throws(() => tahunSasaran(new Date('invalid')), /tidak sah/)
})

test('muatCuti memanggil URL tetap dengan tahun, skop dan had masa', async () => {
  const panggilan = []
  const fetcher = async (url, options) => {
    panggilan.push([url, options])
    return Response.json(payload(url.includes('/school/') ? sekolah() : umum()))
  }
  await muatCuti(2027, 'umum', fetcher)
  await muatCuti(2027, 'sekolah', fetcher)
  assert.equal(panggilan[0][0], 'https://mycal-api.huijun00100101.workers.dev/v1/holidays?year=2027&state=perak')
  assert.equal(panggilan[1][0], 'https://mycal-api.huijun00100101.workers.dev/v1/school/holidays?year=2027&group=B')
  assert.ok(panggilan[0][1].signal instanceof AbortSignal)
  assert.equal(panggilan[0][1].redirect, 'error')
})

test('kegagalan rangkaian, HTTP, JSON dan respons terlalu besar ditolak', async () => {
  await assert.rejects(muatCuti(2027, 'umum', async () => { throw new Error('network') }), /network/)
  await assert.rejects(muatCuti(2027, 'umum', async () => new Response('no', { status: 503 })), /HTTP 503/)
  await assert.rejects(muatCuti(2027, 'umum', async () => new Response('<html>')), /tidak sah/)
  await assert.rejects(muatCuti(2027, 'umum', async () => new Response('small', { headers: { 'content-length': String(600000) } })), /tidak sah/)
  let dibatalkan = false
  const body = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(300000)) }, cancel() { dibatalkan = true } })
  await assert.rejects(muatCuti(2027, 'umum', async () => new Response(body)), /tidak sah/)
  assert.equal(dibatalkan, true)
})
