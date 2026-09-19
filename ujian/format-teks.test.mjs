import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import ts from 'typescript'
const kod = await fs.readFile(new URL('../src/lib/format-teks.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(kod, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { formatTujuanLawatan: tujuan, cadanganNamaMalaysia: nama } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))

test('tujuan: format tajuk dengan kata sendi dan hubung kecil', () => {
  assert.equal(tujuan('lawatan sambil belajar ke muzium darul ridzuan bagi tajuk sejarah tahun 5'),
    'Lawatan Sambil Belajar ke Muzium Darul Ridzuan bagi Tajuk Sejarah Tahun 5')
  assert.equal(tujuan('ke muzium dan perpustakaan'), 'Ke Muzium dan Perpustakaan')
})
test('nama khas huruf besar, singkatan bertitik dan ejaan bercampur dikekalkan', () => {
  for (const khas of ['AEON', 'A.E.O.N', 'A.E.O.N.', 'KPM', 'PPD', 'UiTM', 'i-City', 'McDonald', 'XYZ']) {
    assert.equal(tujuan(`lawatan ke ${khas}`), `Lawatan ke ${khas}`)
  }
})
test('tajuk seluruhnya huruf besar diselaraskan dan nombor/tanda baca kekal', () => {
  assert.equal(tujuan('LAWATAN KE MUZIUM DARUL RIDZUAN DAN AEON'), 'Lawatan ke Muzium Darul Ridzuan dan AEON')
  assert.equal(tujuan('LAWATAN KE A.E.O.N. BAGI TAHUN 5'), 'Lawatan ke A.E.O.N. bagi Tahun 5')
  assert.equal(tujuan('lawatan 2026: muzium, galeri & i-City'), 'Lawatan 2026: Muzium, Galeri & i-City')
})
test('cadangan nama Malaysia tidak mengembangkan singkatan', () => {
  const contoh = [
    ['AHMAD FAIZ BIN ABDULLAH', 'Ahmad Faiz bin Abdullah'],
    ['nur aisyah binti mohd ali', 'Nur Aisyah binti Mohd Ali'],
    ['TAN AH KOW', 'Tan Ah Kow'],
    ['RAJ KUMAR A/L SUBRAMANIAM', 'Raj Kumar a/l Subramaniam'],
    ['SITI A/P ALI', 'Siti a/p Ali'],
    ['MARY ANAK JOSEPH', 'Mary anak Joseph'],
    ['NURUL AIN BT. AHMAD', 'Nurul Ain bt. Ahmad'],
    ['S. RAJAN', 'S. Rajan'],
    ['McDonald bin Devan', 'McDonald bin Devan'],
  ]
  for (const [asal, hasil] of contoh) assert.equal(nama(asal), hasil)
})
test('teks kosong, Unicode dan ruang dikekalkan; format stabil apabila diulang', () => {
  for (const asal of ['', '  ', 'ÉMILIE ANAK JOSEPH', "O'NEILL", '李小明', 'AHMAD  BIN ALI']) {
    assert.equal(nama(nama(asal)), nama(asal))
    assert.equal(tujuan(tujuan(asal)), tujuan(asal))
    assert.equal(nama(asal).split(/\s/).length, asal.split(/\s/).length)
  }
})
