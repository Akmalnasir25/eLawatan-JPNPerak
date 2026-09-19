// ════════════════════════════════════════════════════════════════════
// Pangkalan data ujian — Postgres sebenar (PGlite/WASM), tanpa Docker.
//
// Meniru bahagian Supabase yang migrasi bergantung padanya: skema auth,
// auth.uid(), peranan anon/authenticated dan keizinan lalai. Kemudian
// menjalankan migrasi dan seed.sql sebenar tanpa sebarang perubahan.
// ════════════════════════════════════════════════════════════════════

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const akar = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dirMigrasi = path.join(akar, 'supabase', 'migrations')

const TIRUAN_SUPABASE = fs.readFileSync(path.join(akar, 'ujian', 'tiruan-supabase.sql'), 'utf8')

export async function binaPangkalan() {
  const db = new PGlite({ extensions: { pgcrypto } })
  await db.exec('create schema extensions; create extension pgcrypto with schema extensions;')
  await db.exec(TIRUAN_SUPABASE)

  const fail = fs.readdirSync(dirMigrasi).filter((f) => f.endsWith('.sql')).sort()
  for (const f of fail) {
    try {
      await db.exec(fs.readFileSync(path.join(dirMigrasi, f), 'utf8'))
    } catch (e) {
      throw new Error(`Migrasi ${f} gagal: ${e.message}`)
    }
  }
  try {
    await db.exec(fs.readFileSync(path.join(akar, 'supabase', 'seed.sql'), 'utf8'))
  } catch (e) {
    throw new Error(`seed.sql gagal: ${e.message}`)
  }
  return { db, migrasi: fail }
}

/** Daftar pengguna auth — mencetuskan handle_pengguna_baharu. */
export async function daftarPengguna(db, emel) {
  await db.exec('reset role')
  const r = await db.query('insert into auth.users (email) values ($1) returning id', [emel])
  return r.rows[0].id
}

/**
 * Jalankan kerja sebagai pengguna tertentu, dengan RLS berkuat kuasa.
 * `uid` null = peranan anon.
 */
export async function sebagai(db, uid, kerja) {
  await db.exec('reset role')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid ?? ''])
  await db.exec(uid ? 'set role authenticated' : 'set role anon')
  try {
    return await kerja()
  } finally {
    await db.exec('reset role')
    await db.query("select set_config('request.jwt.claim.sub', '', false)")
  }
}

/** Satu baris atau null. */
export async function satu(db, sql, param = []) {
  const r = await db.query(sql, param)
  return r.rows[0] ?? null
}
