import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import ts from 'typescript'

const kod = await fs.readFile(new URL('../src/lib/peringatan-sabtu.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(kod, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { peringatanSabtu, peringatanSabtuJulat } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))

test('2 hingga 7 November memberi peringatan tarikh tamat Sabtu pertama', () => {
  assert.deepEqual(peringatanSabtuJulat([{ mula: '2026-11-02', tamat: '2026-11-07' }]), [
    { tarikh: '2026-11-07', minggu: 1, kedudukan: 'Tarikh tamat' },
  ])
})
test('Sabtu hanya di tengah perjalanan tidak diberi peringatan, termasuk pertukaran destinasi', () => {
  assert.deepEqual(peringatanSabtuJulat([{ mula: '2026-11-02', tamat: '2026-11-08' }]), [])
  assert.deepEqual(peringatanSabtuJulat([
    { mula: '2026-11-07', tamat: '2026-11-08' }, { mula: '2026-11-02', tamat: '2026-11-07' },
  ]), [])
})
test('kedua-dua hujung disemak dan lawatan sehari tidak menggandakan peringatan', () => {
  assert.equal(peringatanSabtuJulat([{ mula: '2026-11-07', tamat: '2026-11-21' }]).length, 2)
  assert.deepEqual(peringatanSabtuJulat([{ mula: '2026-11-07', tamat: '2026-11-07' }]), [
    { tarikh: '2026-11-07', minggu: 1, kedudukan: 'Tarikh mula dan tamat' },
  ])
  assert.deepEqual(peringatanSabtuJulat([{ mula: '2026-11-14', tamat: '2026-11-28' }]), [])
  assert.deepEqual(peringatanSabtuJulat([]), [])
})

test('7 November ialah Sabtu pertama walaupun kedudukan baris kalendar berbeza', () => {
  assert.deepEqual(peringatanSabtu(['2026-11-07']), { tarikh: '2026-11-07', minggu: 1 })
  assert.deepEqual(peringatanSabtu(['2026-11-21']), { tarikh: '2026-11-21', minggu: 3 })
  assert.deepEqual(peringatanSabtu(['2026-10-31']), { tarikh: '2026-10-31', minggu: 5 })
})
test('Sabtu kedua, keempat, Ahad dan hari biasa tidak mencetuskan peringatan ini', () => {
  for (const d of ['2026-11-14', '2026-11-28', '2026-11-08', '2026-11-06']) assert.equal(peringatanSabtu([d]), null)
})
test('hanya mula keseluruhan dinilai; destinasi Sabtu di tengah perjalanan diabaikan', () => {
  assert.equal(peringatanSabtu(['2026-11-07', '2026-11-06', '2026-11-08']), null)
  assert.equal(peringatanSabtu(['2026-10-30', '2026-10-31', '2026-11-07']), null)
  assert.deepEqual(peringatanSabtu(['2026-11-08', '2026-11-07', '2026-11-07']), { tarikh: '2026-11-07', minggu: 1 })
})
test('tarikh kosong, belum lengkap dan tarikh tidak wujud tidak menghasilkan peringatan palsu', () => {
  for (const dates of [[], [''], ['2026-11'], ['2026-02-30'], ['2026-11-07', '']]) assert.equal(peringatanSabtu(dates), null)
  assert.deepEqual(peringatanSabtu(['2028-01-01']), { tarikh: '2028-01-01', minggu: 1 })
})
