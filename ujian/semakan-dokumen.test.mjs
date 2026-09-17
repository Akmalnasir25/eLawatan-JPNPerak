import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { binaPangkalan, daftarPengguna, sebagai, satu } from './pangkalan.mjs'

let db, p, d
const u = {}
const hash = 'a'.repeat(64)
const rekod = (uid, status = 'DIBUKA', catatan = '', dok = d.id, cincangan = hash) =>
  sebagai(db, uid, () => satu(db, 'select * from rekod_semakan_dokumen($1,$2,$3,$4)', [dok, cincangan, status, catatan]))

before(async () => {
  ;({ db } = await binaPangkalan())
  for (const [nama, emel] of Object.entries({
    ppd: 'ppd.ku.pegawai@moe.gov.my', lain: 'ppd.ks.pegawai@moe.gov.my',
    sekolah: 'aba1234@moe-dl.edu.my', jpn: 'jpn.pegawai@moe.gov.my',
  })) u[nama] = await daftarPengguna(db, emel)
  p = await satu(db, `insert into permohonan(kod_sekolah,kod_ppd,kod_jpn,status)
    values ('ABA1234','PRK-KU','A','MENUNGGU_PPD_SEMAK') returning *`)
  const jenis = await satu(db, 'select kod from jenis_dokumen limit 1')
  d = await satu(db, `insert into dokumen(permohonan_id,jenis_dokumen,nama_fail,kunci_r2,saiz,cincangan_sha256)
    values($1,$2,'Ujian.pdf','ujian/semakan.pdf',100,$3) returning *`, [p.id, jenis.kod, hash])
})
after(async () => { await db?.close() })

test('keputusan memerlukan pembukaan versi semasa dahulu', async () => {
  await assert.rejects(rekod(u.ppd, 'PATUH'), /Buka dokumen/)
})
test('identiti dan masa pembukaan ditentukan pelayan', async () => {
  const r = await rekod(u.ppd)
  const g = await satu(db, 'select * from pegawai where user_id=$1', [u.ppd])
  assert.equal(r.pegawai_id, g.id)
  assert.equal(r.nama_pegawai, g.nama)
  assert.equal(r.status, 'DIBUKA')
  assert.equal(r.cincangan_sha256, hash)
  assert.ok(r.masa)
})
test('PPD luar daerah dan anon tidak boleh merekod atau membaca sejarah', async () => {
  await assert.rejects(rekod(u.lain), /luar skop/)
  await assert.rejects(rekod(null), /permission denied/)
  const r = await sebagai(db, u.lain, () => satu(db, 'select count(*)::int n from semakan_dokumen'))
  assert.equal(r.n, 0)
})
test('catatan wajib bagi pembetulan; keputusan dan panjang input disahkan', async () => {
  await assert.rejects(rekod(u.ppd, 'PEMBETULAN', '  '), /Nyatakan pembetulan/)
  await assert.rejects(rekod(u.ppd, 'SALAH'), /keputusan semakan/)
  await assert.rejects(rekod(u.ppd, 'PATUH', 'a'.repeat(2001)), /2000/)
})
test('keputusan disimpan dan retry sama tidak menggandakan rekod', async () => {
  const a = await rekod(u.ppd, 'PEMBETULAN', 'Surat belum ditandatangani.')
  const b = await rekod(u.ppd, 'PEMBETULAN', 'Surat belum ditandatangani.')
  assert.equal(a.id, b.id)
  assert.equal(a.catatan, 'Surat belum ditandatangani.')
})
test('membuka semula mengekalkan sejarah keputusan; keputusan baharu ditambah', async () => {
  await rekod(u.ppd)
  await rekod(u.ppd, 'PATUH', 'Disemak.')
  const r = await satu(db, `select count(*)::int n from semakan_dokumen where dokumen_id=$1 and status <> 'DIBUKA'`, [d.id])
  assert.equal(r.n, 2)
})
test('sekolah boleh membaca catatan tetapi tidak memberi keputusan', async () => {
  await rekod(u.sekolah)
  await assert.rejects(rekod(u.sekolah, 'PATUH'), /giliran semasa/)
  const r = await sebagai(db, u.sekolah, () => satu(db, `select count(*)::int n from semakan_dokumen where status='PEMBETULAN'`))
  assert.equal(r.n, 1)
})
test('penyemak JPN belum boleh membuat keputusan pada giliran PPD', async () => {
  await rekod(u.jpn)
  await assert.rejects(rekod(u.jpn, 'PATUH'), /giliran semasa/)
})
test('klien tidak boleh memalsukan, mengubah atau memadam rekod', async () => {
  await sebagai(db, u.ppd, async () => {
    await assert.rejects(db.query(`update semakan_dokumen set catatan='palsu'`), /permission denied/)
    await assert.rejects(db.query('delete from semakan_dokumen'), /permission denied/)
    await assert.rejects(db.query('insert into semakan_dokumen default values'), /permission denied/)
  })
})
test('cincangan salah ditolak dan fail gantian tidak mewarisi pembukaan', async () => {
  await assert.rejects(rekod(u.ppd, 'PATUH', '', d.id, 'b'.repeat(64)), /Dokumen telah berubah/)
  const ganti = await satu(db, `insert into dokumen(permohonan_id,jenis_dokumen,nama_fail,kunci_r2,saiz,cincangan_sha256)
    values($1,$2,'Gantian.pdf','ujian/gantian.pdf',100,$3) returning *`, [p.id, d.jenis_dokumen, hash])
  await assert.rejects(rekod(u.ppd, 'PATUH', '', ganti.id), /Buka dokumen/)
})
