import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import ts from 'typescript'

const kod = await fs.readFile(new URL('../src/lib/cuti-kalendar.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(kod, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { CUTI_PERAK, cutiPadaTarikh, adaDataCuti, SUMBER_CUTI } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))
const adaJenis = (tarikh, jenis) => cutiPadaTarikh(tarikh).some((c) => c.jenis === jenis)

test('cuti penggal Kumpulan B meliputi kedua-dua hujung julat tanpa melimpah', () => {
  assert.equal(adaJenis('2026-08-28', 'sekolah'), false)
  assert.equal(adaJenis('2026-08-29', 'sekolah'), true)
  assert.equal(adaJenis('2026-09-06', 'sekolah'), true)
  assert.equal(adaJenis('2026-09-07', 'sekolah'), false)
})

test('cuti umum dan cuti sekolah bertindih dikekalkan bersama', () => {
  assert.deepEqual(cutiPadaTarikh('2026-08-31').map((c) => c.jenis), ['umum', 'sekolah'])
  assert.equal(adaJenis('2026-09-16', 'umum'), true)
  assert.equal(adaJenis('2026-09-16', 'sekolah'), false)
})

test('pindaan cuti Mac, cuti gantian dan sempadan tahun dipelihara', () => {
  assert.equal(adaJenis('2026-03-18', 'sekolah'), true)
  assert.equal(adaJenis('2026-03-18', 'umum'), false)
  assert.equal(adaJenis('2026-03-20', 'umum'), true)
  for (const d of ['2026-02-02', '2026-03-23', '2026-06-02', '2026-11-09']) assert.equal(adaJenis(d, 'umum'), true)
  assert.equal(adaJenis('2026-01-11', 'sekolah'), true)
  assert.equal(adaJenis('2026-01-12', 'sekolah'), false)
  assert.equal(adaJenis('2026-12-31', 'sekolah'), true)
})

test('Perak tidak mewarisi cuti negeri lain atau sekatan hujung minggu', () => {
  assert.equal(adaJenis('2026-05-28', 'umum'), false)
  assert.equal(adaJenis('2026-05-30', 'umum'), false)
  assert.equal(adaJenis('2026-11-06', 'umum'), true)
  assert.deepEqual(cutiPadaTarikh('2026-09-19'), [])
  assert.deepEqual(cutiPadaTarikh('2026-09-20'), [])
})

test('tahun tanpa data tidak dijana atau dianggap telah disahkan', () => {
  assert.equal(adaDataCuti(2026), true)
  assert.equal(adaDataCuti(2027), false)
  assert.deepEqual(cutiPadaTarikh('2027-01-01'), [])
})

test('setiap rekod mempunyai julat sah, sumber dan identiti unik', () => {
  const ids = new Set()
  for (const c of CUTI_PERAK) {
    assert.ok(c.mula <= c.tamat)
    assert.match(c.mula, /^2026-\d{2}-\d{2}$/)
    assert.match(c.tamat, /^2026-\d{2}-\d{2}$/)
    assert.ok(SUMBER_CUTI[c.sumber])
    const id = `${c.jenis}:${c.mula}:${c.nama}`
    assert.ok(!ids.has(id))
    ids.add(id)
  }
})
