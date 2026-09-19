import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import ts from 'typescript'

// Replace only network/environment adapters. The actual handler/auth/iteration run unchanged.
let code = await fs.readFile(new URL('../supabase/functions/selaras-cuti/index.ts', import.meta.url), 'utf8')
code = code.replace(/^import .*$/gm, '')
code = 'const { klienPentadbir, muatCuti, tahunSasaran, Deno } = globalThis.__cutiHandlerAdapters;\n' + code
const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const secret = 'ab'.repeat(32)
let instance = 0

async function harness(options = {}) {
  const calls = []
  const sourceCalls = []
  let served
  const adapters = {
    Deno: {
      env: { get: (name) => name === 'CUTI_CRON_TOKEN' ? (options.secret ?? secret) : undefined },
      serve: (handler) => { served = handler },
    },
    klienPentadbir: () => ({
      rpc: async (name, args) => {
        calls.push({ name, args })
        if (options.failRpc === name && (!options.failJenis || args?.p_jenis === options.failJenis)) return { error: { message: 'PRIVATE_DB_DETAIL' } }
        if (name === 'mula_selaras_cuti') return { data: options.busy ? null : 'lease-token-private' }
        return { data: name === 'simpan_selaras_cuti' ? 1 : null }
      },
    }),
    // The real timezone conversion is separately tested in cuti-api.test.mjs.
    tahunSasaran: (now) => {
      assert.ok(now instanceof Date)
      return [2027, 2028]
    },
    muatCuti: async (tahun, jenis) => {
      sourceCalls.push({ tahun, jenis })
      if (options.partial && tahun === 2028) throw new Error(jenis === 'sekolah' ? 'Data tahun ini belum tersedia.' : 'PRIVATE_SOURCE_DETAIL')
      return [{ id: 'PRIVATE_HOLIDAY_ID', nama: 'PRIVATE_HOLIDAY_NAME', mula: `${tahun}-01-01`, tamat: `${tahun}-01-01`, amaran: [] }]
    },
  }
  globalThis.__cutiHandlerAdapters = adapters
  const mod = await import('data:text/javascript;base64,' + Buffer.from(js + `\n// instance ${++instance}`).toString('base64'))
  delete globalThis.__cutiHandlerAdapters
  assert.equal(served, mod.kendali, 'Supabase entrypoint registers its handler unconditionally')
  return {
    calls, sourceCalls,
    run: (token = secret, method = 'POST') => served(new Request('https://example.test/functions/v1/selaras-cuti', { method, headers: { 'x-cuti-token': token } })),
  }
}

test('kaedah selain POST ditolak sebelum mengakses DB atau API', async () => {
  const h = await harness()
  const response = await h.run(secret, 'GET')
  assert.equal(response.status, 405)
  assert.equal(response.headers.get('allow'), 'POST')
  assert.deepEqual(h.calls, [])
  assert.deepEqual(h.sourceCalls, [])
})

test('konfigurasi kosong atau token pendek tidak membenarkan pintasan autentikasi', async () => {
  for (const configured of ['', 'short']) {
    const h = await harness({ secret: configured })
    assert.equal((await h.run(configured)).status, 503)
    assert.deepEqual(h.calls, [])
  }
})

test('token hilang, tidak sepadan dan terlalu panjang ditolak tanpa mengakses sumber', async () => {
  for (const token of ['', 'wrong', 'x'.repeat(1025)]) {
    const h = await harness()
    assert.equal((await h.run(token)).status, 401)
    assert.deepEqual(h.calls, [])
    assert.deepEqual(h.sourceCalls, [])
  }
})

test('kunci aktif menghasilkan 202 dan tidak mengambil data atau melepaskan kunci kerja lain', async () => {
  const h = await harness({ busy: true })
  assert.equal((await h.run()).status, 202)
  assert.deepEqual(h.calls.map((c) => c.name), ['mula_selaras_cuti'])
  assert.deepEqual(h.sourceCalls, [])
})

test('empat kombinasi tahun sasaran dan jenis disimpan dengan token serta dilepaskan', async () => {
  const h = await harness()
  const response = await h.run()
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const body = await response.json()
  assert.deepEqual(body, { status: 'selesai', sumber: { berjaya: 4, belum_tersedia: 0, gagal: 0 }, calon_baharu: 4 })
  const expected = [2027, 2028].flatMap((tahun) => ['umum', 'sekolah'].map((jenis) => ({ tahun, jenis })))
  assert.deepEqual(h.sourceCalls, expected)
  const writes = h.calls.filter((c) => c.name === 'simpan_selaras_cuti')
  assert.deepEqual(writes.map(({ args }) => ({ tahun: args.p_tahun, jenis: args.p_jenis })), expected)
  assert.ok(writes.every(({ args }) => args.p_token === 'lease-token-private' && args.p_status === 'berjaya' && args.p_data.length === 1))
  assert.deepEqual(h.calls.at(-1), { name: 'tamat_selaras_cuti', args: { p_token: 'lease-token-private' } })
  assert.doesNotMatch(JSON.stringify(body), /PRIVATE|lease-token/)
  assert.equal(JSON.stringify(body).includes(secret), false)
})

test('kegagalan separa masih menyimpan semua hasil tanpa mendedahkan ralat sumber', async () => {
  const h = await harness({ partial: true })
  const response = await h.run()
  const body = await response.json()
  assert.equal(response.status, 200)
  assert.deepEqual(body.sumber, { berjaya: 2, belum_tersedia: 1, gagal: 1 })
  assert.equal(body.status, 'separa')
  const writes = h.calls.filter((c) => c.name === 'simpan_selaras_cuti')
  assert.equal(writes.length, 4)
  assert.deepEqual(writes.slice(2).map(({ args }) => args.p_status), ['gagal', 'belum_tersedia'])
  assert.ok(writes.slice(2).every(({ args }) => args.p_data.length === 0 && args.p_mesej.length > 0))
  assert.doesNotMatch(JSON.stringify(writes), /PRIVATE_SOURCE_DETAIL/)
  assert.doesNotMatch(JSON.stringify(body), /PRIVATE|lease-token/)
  assert.equal(h.calls.at(-1).name, 'tamat_selaras_cuti')
})

test('gagal memperoleh kunci menghasilkan 500 tanpa menyentuh API', async () => {
  const h = await harness({ failRpc: 'mula_selaras_cuti' })
  const response = await h.run()
  assert.equal(response.status, 500)
  assert.deepEqual(h.sourceCalls, [])
  assert.deepEqual(h.calls.map((c) => c.name), ['mula_selaras_cuti'])
  assert.doesNotMatch(await response.text(), /PRIVATE_DB_DETAIL/)
})

test('kegagalan simpan masih mencuba sumber lain dan akhirnya melepaskan kunci', async () => {
  const h = await harness({ failRpc: 'simpan_selaras_cuti', failJenis: 'umum' })
  const response = await h.run()
  assert.equal(response.status, 500)
  assert.equal(h.calls.filter((c) => c.name === 'simpan_selaras_cuti').length, 4)
  assert.equal(h.calls.at(-1).name, 'tamat_selaras_cuti')
  const body = await response.json()
  assert.equal(body.sumber.berjaya, 2)
  assert.doesNotMatch(JSON.stringify(body), /PRIVATE|lease-token/)
})

test('kegagalan melepaskan kunci tidak dilaporkan sebagai kejayaan', async () => {
  const h = await harness({ failRpc: 'tamat_selaras_cuti' })
  const response = await h.run()
  assert.equal(response.status, 500)
  assert.equal(h.calls.at(-1).name, 'tamat_selaras_cuti')
  assert.equal((await response.json()).status, 'gagal_pangkalan_data')
})
