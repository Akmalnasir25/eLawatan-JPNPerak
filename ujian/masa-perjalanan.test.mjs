import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import ts from 'typescript'
import { binaPangkalan, daftarPengguna, sebagai, satu } from './pangkalan.mjs'

const kod = await fs.readFile(new URL('../src/lib/masa-perjalanan.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(kod, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { semakMasaPerjalanan: semak } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))
const asas = { mula: '2026-11-02', pulang: '2026-11-02', tiba: '2026-11-02', masaPergi: '07:00', masaPulang: '22:00', masaTiba: '23:59', bermalam: false }
test('23:59 hari yang sama tidak memberi amaran lewat; 00:00 hari berikutnya memberi amaran', () => {
  assert.deepEqual(semak(asas), { urutan: false, lewat: false })
  assert.deepEqual(semak({ ...asas, tiba: '2026-11-03', masaTiba: '00:00' }), { urutan: false, lewat: true })
  assert.equal(semak({ ...asas, tiba: '2026-11-03', masaTiba: '01:00' }).lewat, true)
})
test('lawatan bermalam dan waktu belum diisi tidak dianggap pelanggaran waktu aktiviti', () => {
  assert.equal(semak({ ...asas, tiba: '2026-11-03', masaTiba: '01:00', bermalam: true }).lewat, false)
  assert.equal(semak({ ...asas, tiba: '2026-11-03', masaTiba: '' }).lewat, false)
})
test('tarikh dan masa terbalik ditandakan, perjalanan merentas tengah malam sah', () => {
  assert.equal(semak({ ...asas, masaTiba: '01:00' }).urutan, true)
  assert.equal(semak({ ...asas, masaPulang: '06:00' }).urutan, true)
  assert.equal(semak({ ...asas, pulang: '2026-11-01' }).urutan, true)
  assert.equal(semak({ ...asas, tiba: '2026-11-03', masaTiba: '01:00' }).urutan, false)
})
test('migration, simpan/baca semula masa dan RLS sekolah lain', async () => {
  const { db } = await binaPangkalan()
  try {
    const uid = await daftarPengguna(db, 'aba1234@moe-dl.edu.my')
    const p = await satu(db, "insert into permohonan(kod_sekolah,kod_ppd,kod_jpn) select kod_sekolah,kod_ppd,kod_jpn from sekolah where kod_sekolah='ABA1234' returning id")
    assert.ok(p)
    await sebagai(db, uid, () => db.query("update permohonan set masa_bertolak='07:00',tarikh_pulang='2026-11-02',masa_pulang='22:00',tarikh_tiba='2026-11-03',masa_tiba='00:00' where id=$1", [p.id]))
    const saved = await sebagai(db, uid, () => satu(db, 'select masa_tiba,tarikh_tiba::text from permohonan where id=$1', [p.id]))
    assert.equal(saved.masa_tiba, '00:00:00')
    assert.equal(saved.tarikh_tiba, '2026-11-03')
    const other = await daftarPengguna(db, 'sekolah-lain-test@example.com')
    assert.equal(await sebagai(db, other, () => satu(db, 'select masa_tiba from permohonan where id=$1', [p.id])), null)
    await assert.rejects(db.query("update permohonan set masa_tiba='24:00' where id=$1", [p.id]), /masa_perjalanan_jam_sah/)
  } finally { await db.close() }
})
