// ════════════════════════════════════════════════════════════════════
// Notifikasi, pemangku, had masa, privasi dan kalendar (migrasi 13–17),
// diuji terhadap Postgres sebenar.
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
  u.ppdLain = await daftarPengguna(db, 'ppd.ks.pegawai@moe.gov.my')
  u.jpnPegawai = await daftarPengguna(db, 'jpn.pegawai@moe.gov.my')
  u.jpnPengarah = await daftarPengguna(db, 'jpn.pengarah@moe.gov.my')
  u.admin = await daftarPengguna(db, 'admin.elawatan@moe.gov.my')

  // Penyemak kedua di PPD Kinta Utara — calon pemangku KPPD.
  await sebagai(db, u.ppdKetua, () =>
    db.query(`select daftar_pegawai('Encik Rizal bin Kamal', 'rizal@moe.gov.my', 'ppd_pegawai',
                                    'Penolong PPD', null)`),
  )
  u.rizal = await daftarPengguna(db, 'rizal@moe.gov.my')
})

// ── Bantuan ─────────────────────────────────────────────────────────

const idPeg = async (emel) =>
  (await satu(db, 'select id from pegawai where emel = $1', [emel])).id

async function ciptaLengkap({ kategori = 'DALAM_DAERAH', hari = 45 } = {}) {
  return sebagai(db, u.sekolah, async () => {
    const p = await satu(
      db,
      `insert into permohonan (kod_sekolah, kod_ppd, kod_jpn, kategori, tujuan,
                               pengangkutan, bil_murid, bil_guru)
       values ('ABA1234', 'PRK-KU', 'A', $1, 'Lawatan sambil belajar ke muzium negeri',
               '{BAS_SEKOLAH_KPM}', 30, 6)
       returning id`,
      [kategori],
    )
    await db.query(
      `insert into permohonan_tempat (permohonan_id, tempat, negeri, tarikh_dari, tarikh_hingga)
       values ($1, 'Muzium Darul Ridzuan', 'Perak', current_date + $2::int, current_date + $2::int + 1)`,
      [p.id, hari],
    )
    await db.query(
      `insert into peserta (permohonan_id, kategori, nama, kp, telefon)
       values ($1, 'KETUA_ROMBONGAN', 'Cikgu Aminah', '800101-08-1234', '012-3456789')`,
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

const hantar = (id) =>
  sebagai(db, u.sekolah, () => db.query('select hantar_permohonan($1)', [id]))

async function bertindak(uid, id, tindakan, catatan = null) {
  const item = (await satu(db, `select nilai from tetapan where kunci = 'item_semakan'`)).nilai
  const kod = tindakan === 'SOKONG' ? item.map((i) => i.kod) : null
  return sebagai(db, uid, () =>
    satu(db, 'select * from tindakan_kelulusan($1, $2, $3, $4)', [id, tindakan, catatan, kod]),
  )
}

const notifikasiUntuk = async (emel, id, jenis) =>
  (
    await db.query(
      `select n.* from notifikasi n join pegawai g on g.id = n.pegawai_id
        where g.emel = $1 and n.permohonan_id = $2 and ($3::text is null or n.jenis = $3)
        order by n.id`,
      [emel, id, jenis ?? null],
    )
  ).rows

const hariIni = async () => (await satu(db, 'select tarikh_my()::text t')).t

// ════════════════════════════════════════════════════════════════════

describe('Notifikasi pertukaran status', () => {
  let id

  test('permohonan dihantar memaklumkan semua penyemak PPD dalam daerah', async () => {
    id = await ciptaLengkap()
    await hantar(id)
    const a = await notifikasiUntuk('ppd.ku.pegawai@moe.gov.my', id, 'TINDAKAN_DIPERLUKAN')
    const b = await notifikasiUntuk('rizal@moe.gov.my', id, 'TINDAKAN_DIPERLUKAN')
    assert.equal(a.length, 1)
    assert.equal(b.length, 1)
    assert.match(a[0].mesej, /Menunggu Semakan PPD/)
    assert.equal(a[0].pautan, `/permohonan/${id}`)
    assert.equal(a[0].emel_status, 'MENUNGGU')
    const luar = await notifikasiUntuk('ppd.ks.pegawai@moe.gov.my', id)
    assert.equal(luar.length, 0, 'PPD lain tidak dimaklumkan')
  })

  test('sekolah dimaklumkan apabila dikembalikan, dengan catatan', async () => {
    await bertindak(u.ppdPegawai, id, 'KEMBALI', 'Sila lengkapkan senarai murid.')
    const n = await notifikasiUntuk('aba1234@moe-dl.edu.my', id, 'STATUS_DIKEMBALIKAN')
    assert.equal(n.length, 1)
    assert.match(n[0].mesej, /Sila lengkapkan senarai murid/)
  })

  test('sekolah dimaklumkan apabila diluluskan', async () => {
    await hantar(id)
    await bertindak(u.ppdPegawai, id, 'SOKONG')
    const kppd = await notifikasiUntuk('ppd.ku.ketua@moe.gov.my', id, 'TINDAKAN_DIPERLUKAN')
    assert.equal(kppd.length, 1)
    await bertindak(u.ppdKetua, id, 'SOKONG')
    const n = await notifikasiUntuk('aba1234@moe-dl.edu.my', id, 'STATUS_DILULUSKAN')
    assert.equal(n.length, 1)
  })

  test('pengguna hanya membaca notifikasi sendiri dan boleh menanda dibaca', async () => {
    const milik = await sebagai(db, u.sekolah, () =>
      db.query('select pegawai_id from notifikasi'),
    )
    const idSekolah = await idPeg('aba1234@moe-dl.edu.my')
    assert.ok(milik.rows.length >= 2)
    assert.ok(milik.rows.every((r) => r.pegawai_id === idSekolah))

    const sebelum = await sebagai(db, u.sekolah, () =>
      satu(db, 'select kiraan_notifikasi_belum_baca() n'),
    )
    assert.ok(sebelum.n >= 2)
    await sebagai(db, u.sekolah, () => db.query('select tandai_notifikasi_dibaca(null)'))
    const selepas = await sebagai(db, u.sekolah, () =>
      satu(db, 'select kiraan_notifikasi_belum_baca() n'),
    )
    assert.equal(selepas.n, 0)
  })

  test('pengguna tidak boleh menulis atau memadam notifikasi', async () => {
    await sebagai(db, u.sekolah, async () => {
      const r = await db.query('delete from notifikasi')
      assert.equal(r.affectedRows, 0)
      await assert.rejects(
        db.query(`select cipta_notifikasi(id_pegawai_saya(), null, 'PALSU', 'x', 'y')`),
        /permission denied/,
      )
    })
  })

  test('baris gilir e-mel hanya untuk peranan perkhidmatan', async () => {
    await sebagai(db, u.admin, () =>
      assert.rejects(db.query('select ambil_notifikasi_emel(10)'), /permission denied/),
    )
    const r = await db.query('select ambil_notifikasi_emel(5) j')
    assert.ok(r.rows.length > 0)
    const j = r.rows[0].j
    assert.ok(j.emel && j.tajuk && j.mesej)
    await db.query('select tanda_emel_notifikasi($1, true)', [j.id])
    const n = await satu(db, 'select emel_status, emel_cubaan from notifikasi where id = $1', [j.id])
    assert.equal(n.emel_status, 'DIHANTAR')
    assert.equal(n.emel_cubaan, 1)
  })

  test('e-mel gagal dicuba semula sehingga tiga kali', async () => {
    const x = (await db.query('select ambil_notifikasi_emel(1) j')).rows[0].j
    await db.query('select tanda_emel_notifikasi($1, false, $2)', [x.id, 'SMTP tiada'])
    let n = await satu(db, 'select emel_status from notifikasi where id = $1', [x.id])
    assert.equal(n.emel_status, 'MENUNGGU')
    await db.query('update notifikasi set emel_cubaan = 3 where id = $1', [x.id])
    await db.query('select tanda_emel_notifikasi($1, false, $2)', [x.id, 'SMTP tiada'])
    n = await satu(db, 'select emel_status, emel_ralat from notifikasi where id = $1', [x.id])
    assert.equal(n.emel_status, 'GAGAL')
    assert.equal(n.emel_ralat, 'SMTP tiada')
  })

  test('e-mel dimatikan: notifikasi masih dicipta, e-mel dilangkau', async () => {
    await db.query(`update tetapan set nilai = '{"aktif": false}' where kunci = 'notifikasi_emel'`)
    const id2 = await ciptaLengkap()
    await hantar(id2)
    const n = await notifikasiUntuk('ppd.ku.pegawai@moe.gov.my', id2, 'TINDAKAN_DIPERLUKAN')
    assert.equal(n.length, 1)
    assert.equal(n[0].emel_status, 'DILANGKAU')
    await db.query(`update tetapan set nilai = '{"aktif": true}' where kunci = 'notifikasi_emel'`)
  })
})

describe('Pemangku pengesah', () => {
  const lantik = (uid, pemangku, mula, tamat, asal = null) =>
    sebagai(db, uid, () =>
      satu(db, 'select * from lantik_pemangku($1, $2::date, $3::date, $4, $5)', [
        pemangku, mula, tamat, 'Cuti rehat', asal,
      ]),
    )
  const tambahHari = async (n) => (await satu(db, 'select (tarikh_my() + $1::int)::text t', [n])).t

  test('penyemak tidak boleh melantik pemangku', async () => {
    const rizal = await idPeg('rizal@moe.gov.my')
    await assert.rejects(
      lantik(u.ppdPegawai, rizal, await hariIni(), await tambahHari(3)),
      /Hanya KPPD dan Pengarah JPN/,
    )
  })

  test('pemangku mesti penyemak dalam pejabat yang sama', async () => {
    const luar = await idPeg('ppd.ks.pegawai@moe.gov.my')
    await assert.rejects(
      lantik(u.ppdKetua, luar, await hariIni(), await tambahHari(3)),
      /pejabat yang sama/,
    )
    const jpn = await idPeg('jpn.pegawai@moe.gov.my')
    await assert.rejects(
      lantik(u.ppdKetua, jpn, await hariIni(), await tambahHari(3)),
      /pejabat yang sama/,
    )
  })

  test('tarikh lampau dan tempoh melebihi 90 hari ditolak', async () => {
    const rizal = await idPeg('rizal@moe.gov.my')
    await assert.rejects(lantik(u.ppdKetua, rizal, await tambahHari(-1), await tambahHari(2)), /sebelum hari ini/)
    await assert.rejects(lantik(u.ppdKetua, rizal, await hariIni(), await tambahHari(91)), /90 hari/)
  })

  test('KPPD melantik pemangku; pertindihan ditolak', async () => {
    const rizal = await idPeg('rizal@moe.gov.my')
    const m = await lantik(u.ppdKetua, rizal, await hariIni(), await tambahHari(5))
    assert.equal(m.pegawai_asal, await idPeg('ppd.ku.ketua@moe.gov.my'))
    const pegawai = await idPeg('ppd.ku.pegawai@moe.gov.my')
    await assert.rejects(
      lantik(u.ppdKetua, pegawai, await tambahHari(2), await tambahHari(8)),
      /bertindih/,
    )
    const saya = await sebagai(db, u.rizal, () => db.query('select pemangkuan_saya() j'))
    assert.equal(saya.rows.length, 1)
    assert.equal(saya.rows[0].j.peranan, 'ppd_ketua')
  })

  test('pemangku dimaklumkan dan mengesahkan dengan b.p. serta cop pejabat', async () => {
    await db.query(`update pegawai set kunci_cop = 'profil/cop-ppd.png' where emel = 'ppd.ku.ketua@moe.gov.my'`)
    await db.query(`update pegawai set kunci_tandatangan = 'profil/tt-rizal.png' where emel = 'rizal@moe.gov.my'`)

    const id = await ciptaLengkap()
    await hantar(id)
    await bertindak(u.ppdPegawai, id, 'SOKONG')
    const n = await notifikasiUntuk('rizal@moe.gov.my', id, 'TINDAKAN_DIPERLUKAN')
    assert.ok(n.some((x) => /Pengesahan PPD/.test(x.mesej)), 'pemangku menerima notifikasi pengesahan')

    const p = await bertindak(u.rizal, id, 'SOKONG')
    assert.equal(p.status, 'DILULUSKAN')
    const k = await satu(
      db,
      `select * from kelulusan where permohonan_id = $1 and peringkat = 'MENUNGGU_PPD_SAH'`,
      [id],
    )
    assert.equal(k.nama_pegawai, 'Encik Rizal bin Kamal')
    assert.equal(k.peranan, 'ppd_ketua')
    assert.match(k.jawatan_pegawai, /^b\.p\. /)
    assert.equal(k.pemangku_bagi, await idPeg('ppd.ku.ketua@moe.gov.my'))
    assert.equal(k.kunci_tandatangan, 'profil/tt-rizal.png')
    assert.equal(k.kunci_cop, 'profil/cop-ppd.png')
  })

  test('pemangku tidak boleh mengesahkan permohonan yang disemaknya sendiri', async () => {
    const id = await ciptaLengkap()
    await hantar(id)
    await bertindak(u.rizal, id, 'SOKONG') // Rizal menyemak sebagai penyemak
    await assert.rejects(bertindak(u.rizal, id, 'SOKONG'), /disemaknya sendiri/)
    // KPPD sendiri masih boleh mengesahkan
    const p = await bertindak(u.ppdKetua, id, 'SOKONG')
    assert.equal(p.status, 'DILULUSKAN')
  })

  test('pemangku tidak boleh bertindak di luar peringkat pengesah yang dipangku', async () => {
    const id = await ciptaLengkap({ kategori: 'ANTARA_DAERAH' })
    await hantar(id)
    await bertindak(u.ppdPegawai, id, 'SOKONG') // → MENUNGGU_JPN_SEMAK
    await assert.rejects(bertindak(u.rizal, id, 'SOKONG'), /menunggu tindakan jpn_pegawai/)
  })

  test('selepas dibatalkan, pemangku kehilangan kuasa', async () => {
    const m = (await sebagai(db, u.ppdKetua, () => db.query('select senarai_pemangkuan() j'))).rows
      .map((r) => r.j).find((j) => j.status === 'AKTIF')
    assert.ok(m)
    await assert.rejects(
      sebagai(db, u.rizal, () => db.query('select batal_pemangku($1)', [m.id])),
      /Hanya pegawai asal/,
    )
    await sebagai(db, u.ppdKetua, () => db.query('select batal_pemangku($1)', [m.id]))

    const id = await ciptaLengkap()
    await hantar(id)
    await bertindak(u.ppdPegawai, id, 'SOKONG')
    await assert.rejects(bertindak(u.rizal, id, 'SOKONG'), /menunggu tindakan ppd_ketua/)
  })

  test('pentadbir boleh melantik pemangku bagi Pengarah', async () => {
    const pengarah = await idPeg('jpn.pengarah@moe.gov.my')
    const jpn = await idPeg('jpn.pegawai@moe.gov.my')
    const m = await lantik(u.admin, jpn, await tambahHari(1), await tambahHari(3), pengarah)
    assert.equal(m.pegawai_asal, pengarah)
    // Belum aktif — bermula esok.
    const saya = await sebagai(db, u.jpnPegawai, () => db.query('select pemangkuan_saya() j'))
    assert.equal(saya.rows.length, 0)
  })
})

describe('Had masa tindakan dan peringatan', () => {
  test('hari bekerja mengecualikan hujung minggu dan cuti umum', async () => {
    // Jumaat 18 Sept 2026, 10 pagi → Isnin 21 Sept = 1 hari bekerja
    const a = await satu(db, `select hari_bekerja('2026-09-18 10:00+08', '2026-09-21 09:00+08') n`)
    assert.equal(a.n, 1)
    const b = await satu(db, `select hari_bekerja('2026-09-18 10:00+08', '2026-09-25 09:00+08') n`)
    assert.equal(b.n, 5)
    await db.query(`update tetapan set nilai = '["2026-09-22"]' where kunci = 'cuti_umum'`)
    const c = await satu(db, `select hari_bekerja('2026-09-18 10:00+08', '2026-09-25 09:00+08') n`)
    assert.equal(c.n, 4)
    await db.query(`update tetapan set nilai = '[]' where kunci = 'cuti_umum'`)
  })

  test('status_sejak bertukar mengikut status', async () => {
    const id = await ciptaLengkap()
    await db.query(`update permohonan set status_sejak = now() - interval '30 days' where id = $1`, [id])
    await hantar(id)
    const p = await satu(db, 'select status_sejak > now() - interval $$1 minute$$ baharu from permohonan where id = $1', [id])
    assert.equal(p.baharu, true)
  })

  test('pandangan ringkas memaparkan hari menunggu dan had', async () => {
    const id = await ciptaLengkap()
    await hantar(id)
    await db.query(`update permohonan set status_sejak = now() - interval '21 days' where id = $1`, [id])
    const v = await sebagai(db, u.ppdPegawai, () =>
      satu(db, 'select hari_menunggu, had_hari from v_permohonan_ringkas where id = $1', [id]),
    )
    assert.equal(v.had_hari, 5)
    assert.ok(v.hari_menunggu >= 14, `hari_menunggu ${v.hari_menunggu}`)
  })

  test('peringatan: lewat kepada penyemak, eskalasi kepada KPPD, tanpa pendua', async () => {
    const id = await ciptaLengkap()
    await hantar(id)
    await db.query(`update permohonan set status_sejak = now() - interval '21 days' where id = $1`, [id])

    await db.query('select jana_peringatan()')
    const lewat = await notifikasiUntuk('ppd.ku.pegawai@moe.gov.my', id, 'LEWAT_TINDAKAN')
    const naik = await notifikasiUntuk('ppd.ku.ketua@moe.gov.my', id, 'ESKALASI')
    assert.equal(lewat.length, 1)
    assert.equal(naik.length, 1)

    await db.query('select jana_peringatan()')
    assert.equal((await notifikasiUntuk('ppd.ku.pegawai@moe.gov.my', id, 'LEWAT_TINDAKAN')).length, 1)
    assert.equal((await notifikasiUntuk('ppd.ku.ketua@moe.gov.my', id, 'ESKALASI')).length, 1)
  })

  test('peringatan tarikh akhir hantar kepada sekolah', async () => {
    // Tempoh minimum Dalam Daerah 21 hari: lawatan 22 hari lagi → tarikh akhir esok.
    const id = await ciptaLengkap({ hari: 22 })
    await db.query('select jana_peringatan()')
    const n = await notifikasiUntuk('aba1234@moe-dl.edu.my', id, 'TARIKH_TUTUP_HAMPIR')
    assert.equal(n.length, 1)
    assert.match(n[0].pautan, /\/sunting$/)
  })

  test('peringatan laporan pasca bagi lawatan yang sudah tamat', async () => {
    const id = await ciptaLengkap()
    await hantar(id)
    await bertindak(u.ppdPegawai, id, 'SOKONG')
    await bertindak(u.ppdKetua, id, 'SOKONG')
    await db.query(`update permohonan_tempat set tarikh_dari = current_date - 5, tarikh_hingga = current_date - 3
                     where permohonan_id = $1`, [id])
    await db.query('select jana_peringatan()')
    const n = await notifikasiUntuk('aba1234@moe-dl.edu.my', id, 'LAPORAN_PASCA')
    assert.equal(n.length, 1)
  })

  test('hanya pentadbir boleh menjalankan peringatan secara manual', async () => {
    await sebagai(db, u.ppdKetua, () =>
      assert.rejects(db.query('select jana_peringatan_pentadbir()'), /Hanya pentadbir/),
    )
    await sebagai(db, u.ppdKetua, () =>
      assert.rejects(db.query('select jana_peringatan()'), /permission denied/),
    )
    const r = await sebagai(db, u.admin, () => satu(db, 'select jana_peringatan_pentadbir() j'))
    assert.ok('lewat' in r.j)
  })
})

describe('Privasi dan tempoh simpanan', () => {
  test('persetujuan notis privasi direkod dengan versi', async () => {
    const g = await sebagai(db, u.sekolah, () => satu(db, `select * from setuju_privasi('2026-09-18')`))
    assert.equal(g.privasi_versi, '2026-09-18')
    assert.ok(g.privasi_dipersetujui_pada)
    const a = await satu(db, `select 1 x from log_audit where peristiwa = 'PRIVASI_DIPERSETUJUI'`)
    assert.ok(a)
  })

  test('rekod luput dan anonimkan hanya untuk pentadbir', async () => {
    await sebagai(db, u.ppdKetua, () =>
      assert.rejects(db.query('select rekod_luput()'), /Hanya pentadbir/),
    )
    const id = await ciptaLengkap()
    await sebagai(db, u.admin, () =>
      assert.rejects(db.query('select anonimkan_permohonan($1)', [id]), /belum melepasi tempoh/),
    )
  })

  test('rekod lama yang ditutup dianonimkan, rekod lawatan kekal', async () => {
    const id = await ciptaLengkap()
    await db.query('alter table permohonan disable trigger permohonan_selaras')
    await db.query(
      `update permohonan set status = 'SELESAI', dikemaskini_pada = now() - interval '8 years' where id = $1`,
      [id],
    )
    await db.query('alter table permohonan enable trigger permohonan_selaras')

    const luput = await sebagai(db, u.admin, () => db.query('select rekod_luput() j'))
    assert.ok(luput.rows.some((r) => r.j.id === id))

    const h = await sebagai(db, u.admin, () => satu(db, 'select anonimkan_permohonan($1) j', [id]))
    assert.equal(h.j.bil_peserta, 1)
    assert.ok(h.j.dokumen.length > 0)

    const k = await satu(db, `select nama, kp, telefon from peserta where permohonan_id = $1`, [id])
    assert.equal(k.nama, 'Peserta 1')
    assert.equal(k.kp, null)
    assert.equal(k.telefon, null)
    const p = await satu(db, 'select tujuan, dianonimkan_pada from permohonan where id = $1', [id])
    assert.ok(p.tujuan)
    assert.ok(p.dianonimkan_pada)
    await sebagai(db, u.admin, () =>
      assert.rejects(db.query('select anonimkan_permohonan($1)', [id]), /sudah dianonimkan/),
    )
  })
})

describe('Kalendar lawatan', () => {
  const kalendar = (uid, dari = 0, hingga = 62) =>
    sebagai(db, uid, () =>
      db.query('select kalendar_lawatan(current_date + $1::int, current_date + $2::int) j', [dari, hingga]),
    )

  test('draf tidak dipapar; permohonan dihantar dipapar bersama tempat dan ketua', async () => {
    const draf = await ciptaLengkap({ hari: 40 })
    const hantarId = await ciptaLengkap({ hari: 41 })
    await hantar(hantarId)
    const r = (await kalendar(u.jpnPengarah)).rows.map((x) => x.j)
    assert.ok(!r.some((j) => j.id === draf))
    const j = r.find((x) => x.id === hantarId)
    assert.ok(j)
    assert.equal(j.tempat[0].tempat, 'Muzium Darul Ridzuan')
    assert.equal(j.ketua.telefon, '012-3456789')
  })

  test('skop mengikut RLS: sekolah lain dan PPD lain tidak melihatnya', async () => {
    const lain = (await kalendar(u.sekolahLain)).rows
    assert.ok(lain.every((x) => x.j.kod_sekolah !== 'ABA1234'))
    const ppdLain = (await kalendar(u.ppdLain)).rows
    assert.ok(ppdLain.every((x) => x.j.kod_ppd !== 'PRK-KU'))
    const jpn = (await kalendar(u.jpnPegawai)).rows
    assert.ok(jpn.some((x) => x.j.kod_sekolah === 'ABA1234'))
  })

  test('julat melebihi 62 hari ditolak', async () => {
    await assert.rejects(kalendar(u.jpnPengarah, 0, 90), /62 hari/)
  })
})
