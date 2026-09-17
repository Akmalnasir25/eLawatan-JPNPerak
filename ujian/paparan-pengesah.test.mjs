import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import ts from 'typescript'

const kod = (await fs.readFile(new URL('../src/lib/semakan-dokumen.ts', import.meta.url), 'utf8'))
  .replace("import { supabase } from './supabase'", 'const supabase = {}')
const js = ts.transpileModule(kod, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { semakanUntukPaparan } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))
const dok = { id: 'dok-1', cincangan_sha256: 'versi-1' }
const peg = (peranan, id = 'pengesah') => ({ peranan, id })
const log = (id, peranan, status, masa, pegawai_id = id) => ({
  id, dokumen_id: dok.id, cincangan_sha256: dok.cincangan_sha256,
  peranan, status, masa, pegawai_id, nama_pegawai: id, catatan: `Catatan ${id}`,
})
const ppd = log('ppd', 'ppd_pegawai', 'PATUH', '2026-09-17T10:00:00Z')
const jpn = log('jpn', 'jpn_pegawai', 'PEMBETULAN', '2026-09-17T11:00:00Z')

test('pengesah PPD melihat keputusan dan catatan penyemak PPD', () => {
  assert.equal(semakanUntukPaparan([jpn, ppd], dok, peg('ppd_ketua')), ppd)
})
test('Pengarah JPN melihat keputusan JPN; tidak mewarisi keputusan PPD', () => {
  assert.equal(semakanUntukPaparan([jpn, ppd], dok, peg('jpn_pengarah')), jpn)
  assert.equal(semakanUntukPaparan([ppd], dok, peg('jpn_pengarah')), undefined)
})
test('pembukaan pengesah tidak mengubah status keputusan penyemak', () => {
  const buka = log('buka', 'ppd_ketua', 'DIBUKA', '2026-09-17T12:00:00Z', 'pengesah')
  assert.equal(semakanUntukPaparan([buka, ppd], dok, peg('ppd_ketua')), ppd)
  assert.equal(semakanUntukPaparan([buka], dok, peg('ppd_ketua')), undefined)
})
test('pembukaan penyemak tanpa keputusan berstatus DIBUKA', () => {
  const buka = log('buka', 'ppd_pegawai', 'DIBUKA', '2026-09-17T12:00:00Z')
  assert.equal(semakanUntukPaparan([buka], dok, peg('ppd_ketua')), buka)
  assert.equal(semakanUntukPaparan([buka, ppd], dok, peg('ppd_ketua')), ppd)
})
test('keputusan terkini antara penyemak peringkat sama dipilih walaupun input tidak tersusun', () => {
  const terkini = log('ppd-2', 'ppd_pegawai', 'PEMBETULAN', '2026-09-17T12:00:00Z')
  assert.equal(semakanUntukPaparan([ppd, terkini, jpn], dok, peg('ppd_ketua')), terkini)
})
test('fail gantian dan dokumen lain tidak mewarisi warna atau catatan', () => {
  assert.equal(semakanUntukPaparan([ppd], { ...dok, cincangan_sha256: 'versi-2' }, peg('ppd_ketua')), undefined)
  assert.equal(semakanUntukPaparan([ppd], { ...dok, id: 'dok-2' }, peg('ppd_ketua')), undefined)
})
test('penyemak masih melihat keputusan sendiri, bukan keputusan rakan', () => {
  assert.equal(semakanUntukPaparan([jpn, ppd], dok, peg('ppd_pegawai', 'ppd')), ppd)
  assert.equal(semakanUntukPaparan([jpn, ppd], dok, peg('ppd_pegawai', 'ppd-2')), undefined)
})
