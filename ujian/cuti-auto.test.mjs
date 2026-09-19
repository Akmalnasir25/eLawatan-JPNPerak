import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { binaPangkalan, daftarPengguna, sebagai, satu } from './pangkalan.mjs'

let db, admin, sekolah, token
const cuti = { id: '2027-a', nama: 'Cuti ujian', mula: '2027-01-01', tamat: '2027-01-01', amaran: [] }
before(async () => {
  ;({ db } = await binaPangkalan())
  admin = await daftarPengguna(db, 'admin.elawatan@moe.gov.my')
  sekolah = await daftarPengguna(db, 'aba1234@moe-dl.edu.my')
})
after(async () => { await db?.close() })
async function service(kerja) {
  await db.exec('set role service_role')
  try { return await kerja() } finally { await db.exec('reset role') }
}
const simpan = (data = [cuti], status = 'berjaya', jenis = 'umum') => service(() => satu(db,
  'select simpan_selaras_cuti($1,2027,$2,$3::jsonb,$4,null) as n', [token, jenis, JSON.stringify(data), status]))
const calon = () => satu(db, "select * from cuti_calon where tahun=2027 and jenis='umum' and id=$1", [cuti.id])
const putus = (uid, versi, terima = true) => sebagai(db, uid, () => db.query(
  "select putuskan_cuti(2027,'umum',$1,$2,$3)", [cuti.id, versi, terima]))
const baca = () => sebagai(db, sekolah, () => satu(db, 'select cuti_diterima(2027,2027) as data'))

test('RPC pengambilan hanya service; kunci serentak, token salah dan tamat selamat', async () => {
  for (const uid of [null, sekolah, admin]) {
    await assert.rejects(sebagai(db, uid, () => db.query('select mula_selaras_cuti()')), /permission denied/)
    await assert.rejects(sebagai(db, uid, () => db.query('select token from cuti_kerja')), /permission denied/)
  }
  token = (await service(() => satu(db, 'select mula_selaras_cuti() as token'))).token
  assert.ok(token)
  assert.equal((await service(() => satu(db, 'select mula_selaras_cuti() as token'))).token, null)
  await assert.rejects(service(() => db.query("select simpan_selaras_cuti(gen_random_uuid(),2027,'umum','[]','berjaya',null)")), /Kunci/)
  await service(() => db.query('select tamat_selaras_cuti(gen_random_uuid())'))
  assert.equal((await satu(db, 'select token from cuti_kerja')).token, token)
})

test('muatan sama idempotent: tiada penerbitan automatik atau notifikasi pendua', async () => {
  assert.equal((await simpan()).n, 1)
  assert.equal((await simpan()).n, 0)
  assert.deepEqual((await baca()).data, [])
  const count = await satu(db, "select count(*)::int as n from notifikasi where jenis='CUTI_PERLU_SEMAKAN'")
  assert.equal(count.n, 1)
  assert.equal((await satu(db, "select emel_status from notifikasi where jenis='CUTI_PERLU_SEMAKAN'")).emel_status, 'DILANGKAU')
})

test('bukan admin tidak boleh membaca calon, mengubah data atau memutuskan; admin tidak boleh bypass RPC', async () => {
  for (const uid of [null, sekolah]) {
    await assert.rejects(putus(uid, (await calon()).versi), /admin|permission denied/)
    await assert.rejects(sebagai(db, uid, () => db.query('select status_cuti_admin()')), /admin|permission denied/)
  }
  assert.deepEqual((await sebagai(db, sekolah, () => db.query('select * from cuti_calon'))).rows, [])
  for (const uid of [admin, sekolah]) await assert.rejects(sebagai(db, uid, () => db.query("update cuti_calon set keputusan='diterima'")), /permission denied/)
  await assert.rejects(sebagai(db, null, () => db.query('select cuti_diterima(2027,2027)')), /permission denied/)
})

test('admin menerima dan mengaudit sekali; bacaan pengguna hanya data diterbitkan', async () => {
  const versi = (await calon()).versi
  await putus(admin, versi)
  await putus(admin, versi)
  const hasil = (await baca()).data
  assert.equal(hasil.length, 1)
  assert.deepEqual(hasil[0].data, cuti)
  assert.ok(!('versi' in hasil[0]))
  assert.equal((await satu(db, 'select count(*)::int as n from cuti_keputusan')).n, 1)
  assert.equal((await satu(db, "select count(*)::int as n from log_audit where peristiwa='CUTI_DISEMAK'")).n, 1)
})

test('pindaan memerlukan semakan baru; versi lapuk ditolak dan penolakan mengekalkan salinan diterima', async () => {
  const lama = (await calon()).versi
  const baharu = { ...cuti, mula: '2027-01-02', tamat: '2027-01-02' }
  await simpan([baharu])
  await assert.rejects(putus(admin, lama), /telah berubah/)
  await assert.rejects(putus(admin, null), /telah berubah/)
  assert.deepEqual((await baca()).data[0].data, cuti)
  await putus(admin, (await calon()).versi, false)
  assert.equal((await simpan([baharu])).n, 0)
  assert.equal((await calon()).keputusan, 'ditolak')
  assert.deepEqual((await baca()).data[0].data, cuti)
})

test('respons gagal/kosong mengekalkan kejayaan dan rekod; kelompok rosak digulung balik', async () => {
  const sebelum = (await satu(db, "select berjaya_pada from cuti_sumber where tahun=2027 and jenis='umum'")).berjaya_pada
  await simpan([], 'gagal')
  assert.equal((await satu(db, "select status from cuti_sumber where tahun=2027 and jenis='umum'")).status, 'gagal')
  assert.deepEqual((await baca()).data[0].data, cuti)
  assert.deepEqual((await satu(db, "select berjaya_pada from cuti_sumber where tahun=2027 and jenis='umum'")).berjaya_pada, sebelum)
  await simpan([], 'belum_tersedia', 'sekolah')
  await assert.rejects(simpan([]), /kosong/)
  await assert.rejects(simpan([cuti, { ...cuti, id: 'buruk', mula: '2027-02-30' }]), /date|tarikh|range/)
  assert.equal((await calon()).keputusan, 'ditolak')
  await assert.rejects(simpan([cuti, cuti]), /berulang/)
  assert.equal((await satu(db, 'select count(*)::int as n from cuti_calon')).n, 1)
})

test('rekod hilang daripada API tidak dipadam; kunci luput boleh dipulihkan dan admin tidak aktif disekat', async () => {
  await simpan([{ ...cuti, id: '2027-b', mula: '2027-08-31', tamat: '2027-08-31' }])
  assert.deepEqual((await baca()).data[0].data, cuti)
  await db.exec("update cuti_kerja set luput=now()-interval '1 second'")
  await assert.rejects(simpan(), /Kunci/)
  const lama = token
  token = (await service(() => satu(db, 'select mula_selaras_cuti() as token'))).token
  assert.notEqual(token, lama)
  await service(() => db.query('select tamat_selaras_cuti($1)', [lama]))
  assert.equal((await satu(db, 'select token from cuti_kerja')).token, token)
  await service(() => db.query('select tamat_selaras_cuti($1)', [token]))
  assert.equal((await satu(db, 'select token from cuti_kerja')).token, null)
  const versi = (await calon()).versi
  const tarik = (uid, v) => sebagai(db, uid, () => db.query("select tarik_balik_cuti(2027,'umum',$1,$2)", [cuti.id, v]))
  await assert.rejects(tarik(sekolah, versi), /admin aktif/)
  await assert.rejects(tarik(admin, 'lapuk'), /berubah/)
  await tarik(admin, versi)
  await tarik(admin, versi)
  assert.deepEqual((await baca()).data, [])
  assert.equal((await satu(db, "select count(*)::int as n from cuti_keputusan where keputusan='ditarik_balik'")).n, 1)
  await putus(admin, versi)
  assert.equal((await baca()).data.length, 1)
  await db.query('update pegawai set aktif=false where user_id=$1', [admin])
  await assert.rejects(putus(admin, (await calon()).versi), /admin aktif/)
})
