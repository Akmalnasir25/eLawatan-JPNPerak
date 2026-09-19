import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import ts from 'typescript'

async function muat(fail, ubah = s => s) {
  const kod = ubah(await fs.readFile(new URL(fail, import.meta.url), 'utf8'))
  const js = ts.transpileModule(kod, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))
}
const { dalamTapisPapan: tapis, kenalTapisPapan } = await muat('../src/lib/tapis-papan-pemuka.ts')
const hari = '2026-11-13'
const p = { status: 'DILULUSKAN', tarikh_tamat: '2026-11-12', laporan_dihantar: false }
test('laporan perlu hanya selepas tamat: bukan hari ini, masa hadapan, batal atau ditolak', () => {
  assert.equal(tapis(p, 'laporan_perlu', hari), true)
  for (const tarikh_tamat of [null, hari, '2026-11-14']) assert.equal(tapis({ ...p, tarikh_tamat }, 'laporan_perlu', hari), false)
  for (const status of ['DRAF', 'DITOLAK', 'BATAL', 'MENUNGGU_PPD']) assert.equal(tapis({ ...p, status }, 'laporan_perlu', hari), false)
  assert.equal(tapis({ ...p, laporan_dihantar: true }, 'laporan_perlu', hari), false)
  assert.equal(tapis({ ...p, laporan_dihantar: undefined }, 'laporan_perlu', hari), false)
})
test('siap berdasarkan laporan sebenar, bukan status SELESAI semata-mata', () => {
  assert.equal(tapis({ ...p, laporan_dihantar: true }, 'laporan_siap', hari), true)
  assert.equal(tapis({ ...p, status: 'SELESAI' }, 'laporan_siap', hari), false)
})
test('kad status dan peti tindakan termasuk status pemangku; penapis tidak sah selamat', () => {
  for (const status of ['DRAF', 'DIKEMBALIKAN']) assert.equal(tapis({ ...p, status }, 'draf', hari), true)
  assert.equal(tapis({ ...p, status: 'MENUNGGU_PPD' }, 'proses', hari), true)
  assert.equal(tapis({ ...p, status: 'MENUNGGU_PPD' }, 'tindakan', hari, ['MENUNGGU_PPD']), true)
  assert.equal(tapis({ ...p, status: 'MENUNGGU_JPN' }, 'tindakan', hari, ['MENUNGGU_PPD']), false)
  assert.equal(tapis(p, 'lulus', hari), true)
  assert.equal(kenalTapisPapan('laporan_perlu'), 'laporan_perlu')
  assert.equal(kenalTapisPapan('__proto__'), null)
  assert.equal(kenalTapisPapan('asing'), null)
})
test('API mengambil lebih 500 permohonan/laporan dan tidak menukar kegagalan laporan kepada sifar', async () => {
  const rows = Array.from({ length: 1201 }, (_, i) => ({ id: String(i), ...p }))
  const reports = rows.slice(0, 601).map(r => ({ permohonan_id: r.id }))
  let gagal = false
  globalThis.__papanSupabase = { from(table) {
    return { select() { return this }, order() { return this }, async range(a, b) {
      return table === 'laporan_pasca' && gagal ? { data: null, error: { message: 'Gagal membaca laporan' } }
        : { data: (table === 'laporan_pasca' ? reports : rows).slice(a, b + 1), error: null }
    } }
  } }
  try {
    const api = await muat('../src/lib/api.ts', s => s.replace("import { supabase } from './supabase'", 'const supabase = globalThis.__papanSupabase'))
    const semua = await api.permohonanDenganLaporan()
    assert.equal(semua.length, 1201)
    assert.equal(semua.filter(r => tapis(r, 'laporan_siap', hari)).length, 601)
    assert.equal(semua.filter(r => tapis(r, 'laporan_perlu', hari)).length, 600)
    gagal = true
    await assert.rejects(api.permohonanDenganLaporan(), /Gagal membaca laporan/)
  } finally { delete globalThis.__papanSupabase }
})
