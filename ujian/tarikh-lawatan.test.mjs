import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import ts from 'typescript'

// Gunakan compiler projek supaya ujian tidak bergantung pada sokongan
// type-stripping Node atau lokasi salinan checkout.
const kod = await fs.readFile(new URL('../src/lib/tarikh-lawatan.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(kod, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const { hariMalaysia, paparanTarikhLawatan, susunTarikhLawatan } = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
)

const hari = '2026-09-17'
const lawatan = (id, mula, tamat = mula, status = 'MENUNGGU_PPD_SEMAK') =>
  ({ id, tarikh_mula: mula, tarikh_tamat: tamat, status })

test('hari Malaysia bertukar pada 16:00 UTC, bukan tengah malam UTC', () => {
  assert.equal(hariMalaysia(new Date('2026-09-17T15:59:59Z')), '2026-09-17')
  assert.equal(hariMalaysia(new Date('2026-09-17T16:00:00Z')), '2026-09-18')
})
test('susunan sedang berlangsung, hari ini, akan datang, lepas dan tanpa tarikh', () => {
  const asal = [lawatan('tiada', null), lawatan('lama', '2026-08-01'),
    lawatan('jauh', '2026-10-01'), lawatan('esok', '2026-09-18'),
    lawatan('baru-lepas', '2026-09-15'), lawatan('hari-ini', hari),
    lawatan('berlangsung', '2026-09-16', '2026-09-18')]
  assert.deepEqual(susunTarikhLawatan(asal, hari).map((p) => p.id),
    ['berlangsung', 'hari-ini', 'esok', 'jauh', 'baru-lepas', 'lama', 'tiada'])
  assert.equal(asal[0].id, 'tiada')
})
test('kiraan hari kalendar, label esok/hari ini dan julat beberapa hari', () => {
  assert.equal(paparanTarikhLawatan(lawatan('a', '2026-09-25'), hari).kiraan, '8 hari lagi')
  assert.equal(paparanTarikhLawatan(lawatan('a', '2026-09-18'), hari).kiraan, 'Esok')
  assert.equal(paparanTarikhLawatan(lawatan('a', hari), hari).kiraan, 'Hari ini')
  const p = paparanTarikhLawatan(lawatan('a', '2026-09-16', '2026-09-18'), hari)
  assert.equal(p.kiraan, 'Sedang berlangsung')
  assert.equal(p.tarikh, '16–18 September 2026')
  assert.equal(paparanTarikhLawatan(lawatan('a', '2026-09-15'), hari).kiraan, 'Tarikh telah berlalu')
})
test('tarikh tamat termasuk dalam tempoh berlangsung; kiraan berubah selepas tamat', () => {
  const p = lawatan('a', '2026-09-16', '2026-09-18')
  assert.equal(paparanTarikhLawatan(p, '2026-09-18').kiraan, 'Sedang berlangsung')
  assert.equal(paparanTarikhLawatan(p, '2026-09-19').kiraan, 'Tarikh telah berlalu')
})
test('batal/ditolak/selesai tidak menunjukkan countdown atau amaran', () => {
  for (const s of ['BATAL', 'DITOLAK', 'SELESAI']) {
    const p = paparanTarikhLawatan(lawatan('a', '2026-09-18', '2026-09-18', s), hari)
    assert.equal(p.kiraan, null)
    assert.equal(p.mendesak, false)
  }
})
test('amaran tujuh hari hanya bagi permohonan menunggu', () => {
  assert.equal(paparanTarikhLawatan(lawatan('a', '2026-09-24'), hari).mendesak, true)
  assert.equal(paparanTarikhLawatan(lawatan('a', '2026-09-25'), hari).mendesak, false)
  assert.equal(paparanTarikhLawatan(lawatan('a', hari, hari, 'DILULUSKAN'), hari).mendesak, false)
})
test('tarikh kosong/tidak sah dan tahun lompat tidak menghasilkan kiraan salah', () => {
  for (const t of [null, '', '2026-02-30', 'bukan-tarikh']) {
    assert.equal(paparanTarikhLawatan(lawatan('a', t), hari).tarikh, 'Belum ditetapkan')
  }
  assert.equal(paparanTarikhLawatan(lawatan('a', '2028-03-01'), '2028-02-28').kiraan, '2 hari lagi')
  assert.equal(paparanTarikhLawatan(lawatan('a', '2026-12-31', '2027-01-02'), hari).tarikh,
    '31 Disember 2026 – 2 Januari 2027')
})
test('susunan stabil untuk tarikh sama dan merangkumi rekod melebihi 500', () => {
  const banyak = Array.from({ length: 501 }, (_, i) => lawatan(String(i).padStart(3, '0'), '2026-10-01'))
  banyak.push(lawatan('terdekat', '2026-09-18'))
  const hasil = susunTarikhLawatan(banyak.reverse(), hari)
  assert.equal(hasil.length, 502)
  assert.equal(hasil[0].id, 'terdekat')
  assert.equal(hasil[1].id, '000')
})
