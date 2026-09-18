// ════════════════════════════════════════════════════════════════════
// Pendaftaran pegawai, sekatan log masuk dan tandatangan peringkat
// sekolah (migrasi 11), diuji terhadap Postgres sebenar.
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
  u.ppdLain = await daftarPengguna(db, 'ppd.ks.ketua@moe.gov.my')
  u.jpnPengarah = await daftarPengguna(db, 'jpn.pengarah@moe.gov.my')
  u.kpm = await daftarPengguna(db, 'kpm.penyelaras@moe.gov.my')
  u.admin = await daftarPengguna(db, 'admin.elawatan@moe.gov.my')
})

const daftar = (uid, p) =>
  sebagai(db, uid, () =>
    satu(db, 'select * from daftar_pegawai($1, $2, $3, $4, $5)', [
      p.nama, p.emel, p.peranan, p.jawatan ?? null, p.kod_skop ?? null,
    ]),
  )

const idPeg = async (emel) =>
  (await satu(db, 'select id from pegawai where emel = $1', [emel])).id

describe('Pendaftaran pegawai — peraturan peranan', () => {
  test('KPPD mendaftar penyemak dalam daerahnya', async () => {
    const g = await daftar(u.ppdKetua, {
      nama: 'Encik Zaidi bin Omar',
      emel: 'Zaidi.PPD@moe.gov.my',
      peranan: 'ppd_pegawai',
      jawatan: 'Pegawai Unit Pengurusan Sekolah',
    })
    assert.equal(g.emel, 'zaidi.ppd@moe.gov.my', 'e-mel disimpan huruf kecil')
    assert.equal(g.peranan, 'ppd_pegawai')
    assert.equal(g.kod_skop, 'PRK-KU')
    assert.equal(g.kata_laluan_ditetapkan, false)
    assert.equal(g.aktif, true)
    assert.equal(g.user_id, null, 'belum pernah log masuk')
    const pendaftar = await satu(db, 'select emel from pegawai where id = $1', [g.didaftar_oleh])
    assert.equal(pendaftar.emel, 'ppd.ku.ketua@moe.gov.my')
  })

  test('kod skop dipaksa mengikut pendaftar, bukan borang', async () => {
    const g = await daftar(u.ppdKetua, {
      nama: 'Puan Halimah binti Saad',
      emel: 'halimah@moe.gov.my',
      peranan: 'ppd_pegawai',
      kod_skop: 'PRK-KS', // cuba daerah lain
    })
    assert.equal(g.kod_skop, 'PRK-KU')
  })

  test('penyemak boleh mendaftar penyemak lain, tetapi bukan pengesah', async () => {
    const g = await daftar(u.ppdPegawai, {
      nama: 'Encik Rizal bin Kamal',
      emel: 'rizal@moe.gov.my',
      peranan: 'ppd_pegawai',
    })
    assert.equal(g.kod_skop, 'PRK-KU')
    await assert.rejects(
      daftar(u.ppdPegawai, { nama: 'Cubaan Naik Taraf', emel: 'naik@moe.gov.my', peranan: 'ppd_ketua' }),
      /tidak boleh didaftarkan/,
    )
  })

  test('pengesah tidak boleh mencipta pentadbir atau peranan JPN', async () => {
    await assert.rejects(
      daftar(u.ppdKetua, { nama: 'Pentadbir Palsu', emel: 'palsu@moe.gov.my', peranan: 'admin' }),
      /tidak boleh didaftarkan/,
    )
    await assert.rejects(
      daftar(u.ppdKetua, { nama: 'Pegawai JPN Palsu', emel: 'jpnpalsu@moe.gov.my', peranan: 'jpn_pegawai' }),
      /tidak boleh didaftarkan/,
    )
  })

  test('Pengarah JPN mendaftar penyemak JPN dalam negerinya', async () => {
    const g = await daftar(u.jpnPengarah, {
      nama: 'Puan Sarimah binti Ahmad',
      emel: 'sarimah.jpn@moe.gov.my',
      peranan: 'jpn_pegawai',
    })
    assert.equal(g.kod_skop, 'A')
    await assert.rejects(
      daftar(u.jpnPengarah, { nama: 'Pengarah Kedua', emel: 'pengarah2@moe.gov.my', peranan: 'jpn_pengarah' }),
      /tidak boleh didaftarkan/,
    )
  })

  test('sekolah mendaftar pengguna tambahan untuk sekolahnya sendiri', async () => {
    const g = await daftar(u.sekolah, {
      nama: 'Cikgu Faridah binti Yusof',
      emel: 'faridah.aba1234@moe-dl.edu.my',
      peranan: 'sekolah',
      jawatan: 'Guru Penyelaras Lawatan',
    })
    assert.equal(g.peranan, 'sekolah')
    assert.equal(g.kod_skop, 'ABA1234')
  })

  test('Bahagian KPM tidak boleh mendaftar sesiapa', async () => {
    await assert.rejects(
      daftar(u.kpm, { nama: 'Pegawai KPM', emel: 'kpm2@moe.gov.my', peranan: 'kpm' }),
      /tidak boleh didaftarkan/,
    )
  })

  test('pentadbir boleh mendaftar mana-mana peranan dengan skop pilihan', async () => {
    const g = await daftar(u.admin, {
      nama: 'Tuan Azhar bin Ibrahim',
      emel: 'azhar.ks@moe.gov.my',
      peranan: 'ppd_ketua',
      kod_skop: 'PRK-KS',
    })
    assert.equal(g.kod_skop, 'PRK-KS')
  })

  test('domain, e-mel berganda dan nama pendek ditolak', async () => {
    await assert.rejects(
      daftar(u.ppdKetua, { nama: 'Nama Sah', emel: 'orang@gmail.com', peranan: 'ppd_pegawai' }),
      /domain rasmi/,
    )
    await assert.rejects(
      daftar(u.ppdKetua, { nama: 'Nama Sah', emel: 'bukan-emel', peranan: 'ppd_pegawai' }),
      /tidak sah/,
    )
    await assert.rejects(
      daftar(u.ppdKetua, { nama: 'Nama Sah', emel: 'ppd.ku.pegawai@moe.gov.my', peranan: 'ppd_pegawai' }),
      /sudah berdaftar/,
    )
    await assert.rejects(
      daftar(u.ppdKetua, { nama: 'Ab', emel: 'ab@moe.gov.my', peranan: 'ppd_pegawai' }),
      /Nama pegawai wajib/,
    )
  })

  test('setiap pendaftaran direkod dalam log audit', async () => {
    const a = await satu(
      db,
      `select count(*)::int n from log_audit
        where peristiwa = 'PEGAWAI_DIDAFTARKAN' and emel_pegawai = 'ppd.ku.ketua@moe.gov.my'`,
    )
    assert.ok(a.n >= 2)
  })
})

describe('Senarai dan status pegawai dalam skop', () => {
  test('setiap peranan melihat skopnya sahaja', async () => {
    const kuKetua = await sebagai(db, u.ppdKetua, () => db.query('select * from senarai_pegawai_skop()'))
    const skop = new Set(kuKetua.rows.map((r) => r.kod_skop))
    assert.deepEqual([...skop], ['PRK-KU'])

    const sekolah = await sebagai(db, u.sekolah, () => db.query('select * from senarai_pegawai_skop()'))
    assert.ok(sekolah.rows.length >= 2)
    assert.ok(sekolah.rows.every((r) => r.peranan === 'sekolah' && r.kod_skop === 'ABA1234'))

    const admin = await sebagai(db, u.admin, () => db.query('select * from senarai_pegawai_skop()'))
    assert.ok(admin.rows.length > kuKetua.rows.length)
  })

  test('KPPD boleh menyahaktifkan penyemak daerahnya', async () => {
    const id = await idPeg('zaidi.ppd@moe.gov.my')
    const g = await sebagai(db, u.ppdKetua, () =>
      satu(db, 'select * from tukar_status_pegawai($1, $2)', [id, false]),
    )
    assert.equal(g.aktif, false)
    const a = await satu(
      db, `select 1 from log_audit where peristiwa = 'PEGAWAI_DINYAHAKTIFKAN'`)
    assert.ok(a)
  })

  test('tidak boleh menyentuh pegawai luar skop, peranan setara, atau diri sendiri', async () => {
    const luar = await idPeg('ppd.ks.pegawai@moe.gov.my')
    await sebagai(db, u.ppdKetua, () =>
      assert.rejects(db.query('select tukar_status_pegawai($1, false)', [luar]), /luar skop/),
    )
    const ketuaLain = await idPeg('azhar.ks@moe.gov.my')
    await sebagai(db, u.ppdKetua, () =>
      assert.rejects(db.query('select tukar_status_pegawai($1, false)', [ketuaLain]), /luar skop|tidak boleh/),
    )
    const diri = await idPeg('ppd.ku.ketua@moe.gov.my')
    await sebagai(db, u.ppdKetua, () =>
      assert.rejects(db.query('select tukar_status_pegawai($1, false)', [diri]), /akaun anda sendiri/),
    )
  })

  test('penyemak tidak boleh menyahaktifkan pengesah', async () => {
    const ketua = await idPeg('ppd.ku.ketua@moe.gov.my')
    await sebagai(db, u.ppdPegawai, () =>
      assert.rejects(db.query('select tukar_status_pegawai($1, false)', [ketua]), /tidak boleh/),
    )
  })
})

describe('Sekatan sementara log masuk', () => {
  const emel = 'ppd.ku.pegawai@moe.gov.my'
  const status = async () => (await satu(db, 'select status_sekatan($1) s', [emel])).s

  test('lima percubaan gagal menyekat akaun; kejayaan memadam sejarah', async () => {
    let s = await status()
    assert.equal(s.disekat, false)
    assert.equal(s.baki_cubaan, 5)

    for (let i = 0; i < 4; i++) await db.query('select rekod_cubaan($1, false)', [emel])
    s = await status()
    assert.equal(s.disekat, false)
    assert.equal(s.baki_cubaan, 1, 'amaran sebelum disekat')

    await db.query('select rekod_cubaan($1, false)', [emel])
    s = await status()
    assert.equal(s.disekat, true)
    assert.ok(s.saat_lagi > 0 && s.saat_lagi <= 15 * 60)

    await db.query('select rekod_cubaan($1, true)', [emel])
    s = await status()
    assert.equal(s.disekat, false)
    assert.equal(s.cubaan_gagal, 0)
    const g = await satu(db, 'select log_masuk_terakhir from pegawai where emel = $1', [emel])
    assert.ok(g.log_masuk_terakhir, 'masa log masuk direkod')
  })

  test('percubaan lama di luar tetingkap tidak dikira', async () => {
    const lain = 'jpn.pengarah@moe.gov.my'
    for (let i = 0; i < 5; i++) await db.query('select rekod_cubaan($1, false)', [lain])
    assert.equal((await satu(db, 'select status_sekatan($1) s', [lain])).s.disekat, true)
    await db.query(
      `update cubaan_masuk set masa = now() - interval '20 minutes' where lower(emel) = $1`, [lain])
    assert.equal((await satu(db, 'select status_sekatan($1) s', [lain])).s.disekat, false)
  })

  test('jadual percubaan tidak boleh dibaca pengguna', async () => {
    await sebagai(db, u.admin, async () => {
      const r = await db.query('select * from cubaan_masuk')
      assert.equal(r.rows.length, 0, 'RLS tanpa dasar menyembunyikan semua baris')
      await assert.rejects(db.query('select status_sekatan($1)', ['x@moe.gov.my']), /permission denied/)
    })
  })
})

describe('Tandatangan di peringkat sekolah', () => {
  test('imej disimpan pada rekod sekolah, dikongsi semua pengguna sekolah', async () => {
    const id = await idPeg('aba1234@moe-dl.edu.my')
    const kunci = `profil/${id}/tandatangan/gb.png`
    await sebagai(db, u.sekolah, () =>
      db.query('select tetapkan_imej_profil($1, $2)', ['tandatangan', kunci]),
    )
    const s = await satu(db, `select kunci_tandatangan_gb from sekolah where kod_sekolah = 'ABA1234'`)
    assert.equal(s.kunci_tandatangan_gb, kunci)
    const g = await satu(db, 'select kunci_tandatangan from pegawai where id = $1', [id])
    assert.equal(g.kunci_tandatangan, null, 'tidak disimpan pada akaun individu')
  })

  test('pengguna sekolah kedua menghantar permohonan dengan tandatangan yang sama', async () => {
    const kunciCop = `profil/${await idPeg('aba1234@moe-dl.edu.my')}/cop/sekolah.png`
    await sebagai(db, u.sekolah, () => db.query('select tetapkan_imej_profil($1, $2)', ['cop', kunciCop]))

    // Pengguna kedua sekolah yang sama, log masuk kali pertama
    const uid2 = await daftarPengguna(db, 'faridah.aba1234@moe-dl.edu.my')
    await sebagai(db, uid2, () =>
      db.query('select kemas_profil($1, $2, $3, $4, $5)', [
        null, null, '05-1234567', 'Cikgu Faridah binti Yusof', 'Puan Rosnah binti Ali',
      ]),
    )

    const id = await sebagai(db, uid2, async () => {
      const p = await satu(
        db,
        `insert into permohonan (kod_sekolah, kod_ppd, kod_jpn, kategori, tujuan,
                                 pengangkutan, bil_murid, bil_guru)
         values ('ABA1234', 'PRK-KU', 'A', 'DALAM_DAERAH',
                 'Lawatan ujian oleh pengguna kedua sekolah',
                 '{BAS_SEKOLAH_KPM}'::pengangkutan_t[], 20, 4)
         returning id`,
      )
      await db.query(
        `insert into permohonan_tempat (permohonan_id, tempat, tarikh_dari, tarikh_hingga)
         values ($1, 'Muzium', current_date + 40, current_date + 40)`, [p.id])
      await db.query(
        `insert into peserta (permohonan_id, kategori, nama, kp, telefon)
         values ($1, 'KETUA_ROMBONGAN', 'Cikgu Faridah', '880202-08-1122', '012-9998888')`, [p.id])
      const perlu = await db.query('select kod from dokumen_diperlukan($1)', [p.id])
      for (const { kod } of perlu.rows) {
        await db.query(
          `insert into dokumen (permohonan_id, jenis_dokumen, nama_fail, kunci_r2, saiz, cincangan_sha256)
           values ($1, $2, $3, $4, 10, repeat('b', 64))`,
          [p.id, kod, `${kod}.pdf`, `permohonan/${p.id}/${kod}/x.pdf`])
      }
      await db.query('select hantar_permohonan($1)', [p.id])
      return p.id
    })

    const f = await satu(
      db,
      `select nama_guru_besar, nama_pemohon, kunci_tandatangan_gb, kunci_cop_sekolah
         from permohonan where id = $1`, [id])
    assert.equal(f.kunci_tandatangan_gb, `profil/${await idPeg('aba1234@moe-dl.edu.my')}/tandatangan/gb.png`)
    assert.equal(f.kunci_cop_sekolah, kunciCop)
    assert.equal(f.nama_guru_besar, 'Puan Rosnah binti Ali')
    assert.equal(f.nama_pemohon, 'Cikgu Faridah binti Yusof', 'pemohon ialah pengguna yang menghantar')
  })
})
