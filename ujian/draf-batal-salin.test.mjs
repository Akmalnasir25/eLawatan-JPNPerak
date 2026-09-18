// ════════════════════════════════════════════════════════════════════
// Draf kosong, pembatalan, salin permohonan dan prestasi (migrasi 18).
// ════════════════════════════════════════════════════════════════════

import { before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { binaPangkalan, daftarPengguna, satu, sebagai } from './pangkalan.mjs'

let db
const u = {}

before(async () => {
  ;({ db } = await binaPangkalan())
  u.sekolah = await daftarPengguna(db, 'aba1234@moe-dl.edu.my')
  u.sekolahLain = await daftarPengguna(db, 'aea9012@moe-dl.edu.my')
  u.ppdPegawai = await daftarPengguna(db, 'ppd.ku.pegawai@moe.gov.my')
  u.ppdKetua = await daftarPengguna(db, 'ppd.ku.ketua@moe.gov.my')
})

async function ciptaLengkap({ hari = 45 } = {}) {
  return sebagai(db, u.sekolah, async () => {
    const p = await satu(
      db,
      `insert into permohonan (kod_sekolah, kod_ppd, kod_jpn, kategori, tujuan,
                               pengangkutan, bil_murid, bil_guru)
       values ('ABA1234', 'PRK-KU', 'A', 'DALAM_DAERAH', 'Lawatan sambil belajar ke muzium negeri',
               '{BAS_SEKOLAH_KPM}', 30, 6)
       returning id`,
    )
    await db.query(
      `insert into permohonan_tempat (permohonan_id, tempat, negeri, tarikh_dari, tarikh_hingga)
       values ($1, 'Muzium Darul Ridzuan', 'Perak', current_date + $2::int, current_date + $2::int + 1)`,
      [p.id, hari],
    )
    await db.query(
      `insert into peserta (permohonan_id, kategori, nama, kp, telefon) values
         ($1, 'KETUA_ROMBONGAN', 'Cikgu Aminah', '800101-08-1234', '012-3456789'),
         ($1, 'GURU_PENGIRING', 'Cikgu Bakar', '810202-08-2345', '013-1111111'),
         ($1, 'MURID', 'Ali bin Abu', '150101-08-1111', null)`,
      [p.id],
    )
    const perlu = await db.query('select kod from dokumen_diperlukan($1)', [p.id])
    for (const { kod } of perlu.rows) {
      await db.query(
        `insert into dokumen (permohonan_id, jenis_dokumen, nama_fail, kunci_r2, saiz, cincangan_sha256)
         values ($1, $2, $3, $4, 1024, repeat('a', 64))`,
        [p.id, kod, `${kod}.pdf`, `permohonan/${p.id}/${kod}/${crypto.randomUUID()}.pdf`],
      )
    }
    return p.id
  })
}

const hantar = (id) => sebagai(db, u.sekolah, () => db.query('select hantar_permohonan($1)', [id]))

async function sokong(uid, id) {
  const item = (await satu(db, `select nilai from tetapan where kunci = 'item_semakan'`)).nilai
  return sebagai(db, uid, () =>
    satu(db, 'select * from tindakan_kelulusan($1, $2, $3, $4)', [
      id, 'SOKONG', null, item.map((i) => i.kod),
    ]),
  )
}

const batal = (uid, id, sebab) =>
  sebagai(db, uid, () => satu(db, 'select * from batal_permohonan($1, $2)', [id, sebab]))

// ════════════════════════════════════════════════════════════════════

describe('Domain e-mel rasmi sekolah', () => {
  test('moe.edu.my dibenarkan bersama domain sedia ada', async () => {
    for (const e of ['sekolah@moe.edu.my', 'guru@moe-dl.edu.my', 'pegawai@moe.gov.my']) {
      const r = await satu(db, 'select domain_dibenarkan($1) b', [e])
      assert.equal(r.b, true, e)
    }
    const r = await satu(db, `select domain_dibenarkan('orang@gmail.com') b`)
    assert.equal(r.b, false)
  })
})

describe('Draf kosong digunakan semula', () => {
  test('draf tanpa isi dijumpai; draf berisi tidak', async () => {
    const kosong = await sebagai(db, u.sekolah, () =>
      satu(db, `insert into permohonan (kod_sekolah, kod_ppd, kod_jpn) values ('ABA1234', 'PRK-KU', 'A') returning id`),
    )
    const r = await sebagai(db, u.sekolah, () => satu(db, 'select cari_draf_kosong() id'))
    assert.equal(r.id, kosong.id)

    await sebagai(db, u.sekolah, () =>
      db.query(`update permohonan set tujuan = 'Lawatan ke zoo' where id = $1`, [kosong.id]),
    )
    const s = await sebagai(db, u.sekolah, () => satu(db, 'select cari_draf_kosong() id'))
    assert.equal(s.id, null)
  })

  test('draf sekolah lain tidak dipulangkan', async () => {
    await sebagai(db, u.sekolah, () =>
      db.query(`insert into permohonan (kod_sekolah, kod_ppd, kod_jpn) values ('ABA1234', 'PRK-KU', 'A')`),
    )
    const r = await sebagai(db, u.sekolahLain, () => satu(db, 'select cari_draf_kosong() id'))
    assert.equal(r.id, null)
  })

  test('sekolah boleh memadam draf sendiri', async () => {
    const d = await sebagai(db, u.sekolah, () => satu(db, 'select cari_draf_kosong() id'))
    const r = await sebagai(db, u.sekolah, () => db.query('delete from permohonan where id = $1', [d.id]))
    assert.equal(r.affectedRows, 1)
  })
})

describe('Pembatalan oleh sekolah', () => {
  test('sebab wajib; permohonan dihantar dibatalkan dan pegawai dimaklumkan', async () => {
    const id = await ciptaLengkap()
    await hantar(id)
    await assert.rejects(batal(u.sekolah, id, 'Bas'), /Sebab pembatalan wajib/)

    const p = await batal(u.sekolah, id, 'Syarikat bas menarik diri saat akhir.')
    assert.equal(p.status, 'BATAL')
    assert.equal(p.sebab_batal, 'Syarikat bas menarik diri saat akhir.')
    assert.ok(p.dibatalkan_pada)

    const n = await satu(
      db,
      `select n.mesej from notifikasi n join pegawai g on g.id = n.pegawai_id
        where g.emel = 'ppd.ku.pegawai@moe.gov.my' and n.permohonan_id = $1 and n.jenis = 'STATUS_BATAL'`,
      [id],
    )
    assert.match(n.mesej, /Syarikat bas/)
    const a = await satu(db, `select 1 x from log_audit where peristiwa = 'PERMOHONAN_DIBATALKAN' and permohonan_id = $1`, [id])
    assert.ok(a)
  })

  test('permohonan diluluskan boleh dibatalkan; surat QR tidak lagi sah', async () => {
    const id = await ciptaLengkap()
    await hantar(id)
    await sokong(u.ppdPegawai, id)
    await sokong(u.ppdKetua, id)
    const kod = (await satu(db, 'select kod from pengesahan_qr where permohonan_id = $1', [id])).kod
    assert.equal((await satu(db, 'select sah_lawatan($1) s', [kod])).s.sah, true)

    await batal(u.sekolah, id, 'Amaran banjir di kawasan lawatan.')
    assert.equal((await satu(db, 'select sah_lawatan($1) s', [kod])).s.sah, false)

    // Pegawai yang pernah bertindak dimaklumkan.
    const n = await satu(
      db,
      `select count(*)::int n from notifikasi n join pegawai g on g.id = n.pegawai_id
        where g.emel = 'ppd.ku.ketua@moe.gov.my' and n.permohonan_id = $1 and n.jenis = 'STATUS_BATAL'`,
      [id],
    )
    assert.equal(n.n, 1)
  })

  test('draf, sekolah lain dan lawatan yang telah berlangsung ditolak', async () => {
    const draf = await ciptaLengkap()
    await assert.rejects(batal(u.sekolah, draf, 'Tidak jadi pergi ke sana.'), /padam sahaja/)

    await hantar(draf)
    await assert.rejects(batal(u.sekolahLain, draf, 'Cubaan sekolah lain.'), /sekolah pemilik/)
    await assert.rejects(batal(u.ppdPegawai, draf, 'Cubaan pegawai PPD.'), /sekolah pemilik/)

    await sokong(u.ppdPegawai, draf)
    await sokong(u.ppdKetua, draf)
    await db.query(
      `update permohonan_tempat set tarikh_dari = current_date - 5, tarikh_hingga = current_date - 3
        where permohonan_id = $1`,
      [draf],
    )
    await assert.rejects(batal(u.sekolah, draf, 'Terlambat untuk batal.'), /telah berlangsung/)
  })
})

describe('Salin permohonan', () => {
  test('draf baharu dengan maklumat lawatan dan guru; murid dan dokumen tidak disalin', async () => {
    const asal = await ciptaLengkap()
    await hantar(asal)
    await sokong(u.ppdPegawai, asal)
    await sokong(u.ppdKetua, asal)

    const r = await sebagai(db, u.sekolah, () => satu(db, 'select salin_permohonan($1) id', [asal]))
    const p = await satu(db, 'select * from permohonan where id = $1', [r.id])
    assert.equal(p.status, 'DRAF')
    assert.equal(p.no_rujukan, null)
    assert.equal(p.tujuan, 'Lawatan sambil belajar ke muzium negeri')
    assert.equal(p.kategori, 'DALAM_DAERAH')

    const kategori = (await db.query('select kategori from peserta where permohonan_id = $1 order by kategori', [r.id]))
      .rows.map((x) => x.kategori)
    assert.deepEqual(kategori, ['KETUA_ROMBONGAN', 'GURU_PENGIRING'])
    assert.equal((await satu(db, 'select count(*)::int n from dokumen where permohonan_id = $1', [r.id])).n, 0)
    assert.equal((await satu(db, 'select count(*)::int n from kelulusan where permohonan_id = $1', [r.id])).n, 0)
    const t = await satu(db, 'select tempat from permohonan_tempat where permohonan_id = $1', [r.id])
    assert.equal(t.tempat, 'Muzium Darul Ridzuan')
  })

  test('tarikh yang sudah berlalu dianjak ke tahun hadapan', async () => {
    const asal = await ciptaLengkap()
    await db.query(
      `update permohonan_tempat set tarikh_dari = current_date - 30, tarikh_hingga = current_date - 29
        where permohonan_id = $1`,
      [asal],
    )
    const r = await sebagai(db, u.sekolah, () => satu(db, 'select salin_permohonan($1) id', [asal]))
    const p = await satu(db, 'select tarikh_mula > current_date baharu from permohonan where id = $1', [r.id])
    assert.equal(p.baharu, true)
  })

  test('hanya sekolah pemilik boleh menyalin', async () => {
    const asal = await ciptaLengkap()
    await assert.rejects(
      sebagai(db, u.sekolahLain, () => db.query('select salin_permohonan($1)', [asal])),
      /bukan milik sekolah anda/,
    )
    await assert.rejects(
      sebagai(db, u.ppdPegawai, () => db.query('select salin_permohonan($1)', [asal])),
      /Hanya akaun sekolah/,
    )
  })
})

describe('Prestasi kelulusan', () => {
  test('purata hari dan kiraan lewat mengikut peringkat dan pegawai', async () => {
    const tahun = (await satu(db, 'select extract(year from now())::int t')).t
    const r = await sebagai(db, u.ppdKetua, () => satu(db, 'select prestasi_kelulusan($1) j', [tahun]))
    const semak = r.j.peringkat.find((x) => x.peringkat === 'MENUNGGU_PPD_SEMAK')
    assert.ok(semak && semak.bil >= 2, 'peringkat semakan PPD dikira')
    assert.equal(semak.had, 5)
    assert.ok(r.j.pegawai.some((x) => x.nama_pegawai === 'Encik Hafiz bin Sulaiman'))
  })

  test('skop mengikut RLS: sekolah lain tiada data', async () => {
    const tahun = (await satu(db, 'select extract(year from now())::int t')).t
    const r = await sebagai(db, u.sekolahLain, () => satu(db, 'select prestasi_kelulusan($1) j', [tahun]))
    assert.deepEqual(r.j.peringkat, [])
  })
})
