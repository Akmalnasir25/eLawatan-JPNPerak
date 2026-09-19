// Ujian integrasi atas Supabase LOCAL sahaja. Mencipta rekod contoh baharu;
// tidak memadam rekod sedia ada. OTP dibaca daripada Mailpit local.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/)
  .filter(x => x.includes('=')).map(x => [x.slice(0, x.indexOf('=')), x.slice(x.indexOf('=') + 1)]))
const url = env.VITE_SUPABASE_URL
assert.equal(url, 'http://127.0.0.1:55321', 'Ujian ini hanya untuk backend local.')
const anon = env.VITE_SUPABASE_ANON_KEY
const mail = 'http://127.0.0.1:55324'
const client = () => createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
function ok(result) { assert.ifError(result.error); return result.data }
async function login(email, role) {
  const db = client()
  const before = new Set((await (await fetch(`${mail}/api/v1/messages`)).json()).messages.map(m => m.ID))
  ok(await db.auth.signInWithOtp({ email }))
  let token
  for (let n = 0; n < 15 && !token; n++) {
    const list = await (await fetch(`${mail}/api/v1/messages`)).json()
    for (const m of list.messages.filter(m => !before.has(m.ID))) {
      if (!m.To.some(t => t.Address === email)) continue
      const message = await (await fetch(`${mail}/api/v1/message/${m.ID}`)).json()
      token = (message.Text || message.HTML).match(/\b\d{6}\b/)?.[0]
    }
    if (!token) await new Promise(r => setTimeout(r, 500))
  }
  assert.ok(token, `OTP local tidak diterima: ${email}`)
  const auth = ok(await db.auth.verifyOtp({ email, token, type: 'email' }))
  const pegawai = ok(await db.from('pegawai').select('*').eq('user_id', auth.user.id).single())
  assert.equal(pegawai.peranan, role)
  return { db, pegawai, jwt: auth.session.access_token }
}
async function edge(user, name, body, expected = 200) {
  const res = await fetch(`${url}/functions/v1/${name}`, { method: 'POST',
    headers: { apikey: anon, Authorization: `Bearer ${user?.jwt ?? anon}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body) })
  const data = await res.json()
  assert.equal(res.status, expected, `${name}: ${JSON.stringify(data)}`)
  return data
}
const sekolah = await login('aba1234@moe-dl.edu.my', 'sekolah')
const lain = await login('ppd.ks.pegawai@moe.gov.my', 'ppd_pegawai')
const penyemak = await login('ppd.ku.pegawai@moe.gov.my', 'ppd_pegawai')
const pengesah = await login('ppd.ku.ketua@moe.gov.my', 'ppd_ketua')
console.log('PASS OTP local: sekolah, PPD luar skop, penyemak dan pengesah.')

const p = ok(await sekolah.db.from('permohonan').insert({ kod_sekolah: 'ABA1234', kod_ppd: 'PRK-KU', kod_jpn: 'A',
  kategori: 'DALAM_DAERAH', tujuan: 'UJIAN LOCAL - lawatan contoh, bukan permohonan sebenar',
  pengangkutan: ['BAS_SEKOLAH_KPM'], bil_murid: 30, bil_guru: 6 }).select().single())
const hari = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10)
ok(await sekolah.db.from('permohonan_tempat').insert({ permohonan_id: p.id, tempat: 'Muzium contoh', negara: 'Malaysia', tarikh_dari: hari, tarikh_hingga: hari }))
ok(await sekolah.db.from('peserta').insert({ permohonan_id: p.id, kategori: 'KETUA_ROMBONGAN', nama: 'GURU UJIAN LOCAL', kp: '800101-08-1234', telefon: '012-3456789' }))
assert.equal(ok(await sekolah.db.from('permohonan').select('status').eq('id', p.id).single()).status, 'DRAF')
const perlu = ok(await sekolah.db.rpc('dokumen_diperlukan', { p_permohonan_id: p.id }))
assert.ok(perlu.length)
// PDF satu halaman yang boleh dibuka, dengan kandungan jelas sebagai ujian.
const stream = 'BT /F1 18 Tf 50 780 Td (DOKUMEN UJIAN LOCAL SAHAJA) Tj ET'
const objects = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
]
let pdf = '%PDF-1.4\n'
const offsets = [0]
objects.forEach((object, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${object}\nendobj\n` })
const xref = pdf.length
pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
const bytes = Buffer.from(pdf)
async function upload(kod) {
  const body = { permohonan_id: p.id, jenis_dokumen: kod, nama_fail: 'ujian-local.pdf', jenis_mime: 'application/pdf', saiz: bytes.length }
  await edge(null, 'r2-naik', body, 401)
  await edge(lain, 'r2-naik', body, 403)
  const signed = await edge(sekolah, 'r2-naik', body)
  assert.equal(new URL(signed.url).origin, url)
  const put = await fetch(signed.url, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: bytes })
  assert.ok(put.ok, `PUT: ${put.status} ${await put.text()}`)
  const doc = ok(await sekolah.db.from('dokumen').insert({ permohonan_id: p.id, jenis_dokumen: kod, nama_fail: body.nama_fail,
    jenis_mime: body.jenis_mime, kunci_r2: signed.kunci_r2, saiz: bytes.length,
    cincangan_sha256: createHash('sha256').update(bytes).digest('hex'), dimuat_naik_oleh: sekolah.pegawai.id }).select().single())
  await edge(lain, 'r2-lihat', { dokumen_id: doc.id }, 403)
  await edge(lain, 'r2-padam', { dokumen_id: doc.id }, 403)
  const view = await edge(sekolah, 'r2-lihat', { dokumen_id: doc.id })
  assert.deepEqual(Buffer.from(await (await fetch(view.url)).arrayBuffer()), bytes)
  const unsigned = await fetch(`${url}/storage/v1/object/public/elawatan-dokumen-local/${signed.kunci_r2}`)
  assert.ok(!unsigned.ok, 'Bucket private tidak boleh dibaca secara public.')
  return doc
}
const disposable = await upload(perlu[0].kod)
await edge(sekolah, 'r2-padam', { dokumen_id: disposable.id })
assert.equal(ok(await sekolah.db.from('dokumen').select('id').eq('id', disposable.id)).length, 0)
const docs = []
for (const d of perlu) docs.push(await upload(d.kod))
console.log('PASS dokumen: PUT/GET/padam, bucket private, anon dan PPD luar skop disekat.')

ok(await sekolah.db.rpc('hantar_permohonan', { p_permohonan_id: p.id }))
for (const user of [penyemak, pengesah]) ok(await user.db.rpc('tindakan_kelulusan', {
  p_permohonan_id: p.id, p_tindakan: 'SOKONG', p_catatan: 'UJIAN LOCAL SAHAJA' }))
const approved = ok(await sekolah.db.from('v_permohonan_ringkas').select('*').eq('id', p.id).single())
assert.equal(approved.status, 'DILULUSKAN')
await edge(sekolah, 'r2-padam', { dokumen_id: docs[0].id }, 403)
const qr = ok(await client().rpc('sah_lawatan', { p_kod: approved.kod_qr }))
assert.equal(qr.sah, true)
assert.equal(qr.kp, undefined)
console.log('PASS draf, hantar, semak PPD, sah PPD, QR anon dan kunci dokumen selepas hantar.')
console.log(JSON.stringify({ permohonan_id: p.id, no_rujukan: approved.no_rujukan, kod_qr: approved.kod_qr, status: approved.status }))
