import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import ts from 'typescript'
import { PGlite } from '@electric-sql/pglite'

const modul = (kod) => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(kod, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText).toString('base64')

test('API semuaPermohonan dan pagination demo mengambil 502 rekod tanpa hilang atau pendua', async () => {
  const db = new PGlite()
  try {
    // Fixture untuk pagination sahaja; RLS diuji oleh suite DB berasingan.
    await db.exec(`create table v_permohonan_ringkas(id text primary key);
      insert into v_permohonan_ringkas select lpad(n::text,4,'0') from generate_series(1,502) n;`)
    globalThis.__enjinPagination = { dalamTransaksi: async (_k, kerja) => kerja(db) }
    const klien = await fs.readFile(new URL('../src/demo/klien.ts', import.meta.url), 'utf8')
    const klienUrl = modul(klien
      .replace("const enjin = (): Promise<Enjin> => import('./enjin')", 'const enjin = () => Promise.resolve(globalThis.__enjinPagination)')
      .replaceAll('import.meta.env', '({})'))
    const api = await fs.readFile(new URL('../src/lib/api.ts', import.meta.url), 'utf8')
    const { semuaPermohonan } = await import(modul(api.replace("'./supabase'", JSON.stringify(klienUrl))))
    const hasil = await semuaPermohonan()
    assert.equal(hasil.length, 502)
    assert.equal(new Set(hasil.map((x) => x.id)).size, 502)
    assert.equal(hasil[0].id, '0001')
    assert.equal(hasil.at(-1).id, '0502')
  } finally {
    delete globalThis.__enjinPagination
    await db.close()
  }
})
