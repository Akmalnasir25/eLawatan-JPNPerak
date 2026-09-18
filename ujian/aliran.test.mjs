// ════════════════════════════════════════════════════════════════════
// Ujian aliran eLAWATAN terhadap Postgres sebenar.
// Jalankan: npm run ujian:db
//
// Setiap ujian bertindak sebagai pengguna sebenar dengan RLS berkuat
// kuasa, kecuali penyediaan data yang jelas ditanda "sebagai pentadbir DB".
// ════════════════════════════════════════════════════════════════════

import { before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { binaPangkalan, daftarPengguna, satu, sebagai } from './pangkalan.mjs'

let db
const u = {} // id auth.users mengikut nama pendek

before(async () => {
  ;({ db } = await binaPangkalan())
  u.sekolah = await daftarPengguna(db, 'aba1234@moe-dl.edu.my')
  u.sekolahLain = await daftarPengguna(db, 'aea9012@moe-dl.edu.my') // PRK-KS
  u.ppdPegawai = await daftarPengguna(db, 'ppd.ku.pegawai@moe.gov.my')
  u.ppdKetua = await daftarPengguna(db, 'ppd.ku.ketua@moe.gov.my')
  u.ppdLain = await daftarPengguna(db, 'ppd.ks.pegawai@moe.gov.my')
  u.jpnPegawai = await daftarPengguna(db, 'jpn.pegawai@moe.gov.my')
  u.jpnPengarah = await daftarPengguna(db, 'jpn.pengarah@moe.gov.my')
  u.kpm = await daftarPengguna(db, 'kpm.penyelaras@moe.gov.my')
  u.admin = await daftarPengguna(db, 'admin.elawatan@moe.gov.my')
  u.orangLuar = await daftarPengguna(db, 'orang.luar@moe.gov.my')
})

// ── Bantuan ─────────────────────────────────────────────────────────

const rpc = (fn, param) =>
  `select * from ${fn}(${param.map((_, i) => `$${i + 1}`).join(', ')})`

/** Cipta permohonan lengkap sebagai sekolah. Pulangkan id. */
async function ciptaLengkap({
  kategori = 'DALAM_DAERAH',
  pengangkutan = '{BAS_SEKOLAH_KPM}',
  bilMurid = 30,
  bilGuru = 6,
  hari = 45,
  negara = 'Malaysia',
} = {}) {
  return sebagai(db, u.sekolah, async () => {
    const p = await satu(
      db,
      `insert into permohonan (kod_sekolah, kod_ppd, kod_jpn, kategori, tujuan,
                               pengangkutan, bil_murid, bil_guru)
       values ('ABA1234', 'PRK-KU', 'A', $1, 'Lawatan sambil belajar ke muzium negeri',
               $2::pengangkutan_t[], $3, $4)
       returning id`,
      [kategori, pengangkutan, bilMurid, bilGuru],
    )
    await db.query(
      `insert into permohonan_tempat (permohonan_id, tempat, negara, tarikh_dari, tarikh_hingga)
       values ($1, 'Muzium Darul Ridzuan', $2, current_date + $3::int, current_date + $3::int + 1)`,
      [p.id, negara, hari],
    )
    await db.query(
      `insert into peserta (permohonan_id, kategori, nama, kp, telefon, pasport)
       values ($1, 'KETUA_ROMBONGAN', 'Cikgu Aminah', '800101-08-1234', '012-3456789', 'A1234567')`,
      [p.id],
    )
    await muatNaikSemuaWajib(p.id)
    return p.id
  })
}

/** Tiru muat naik R2: masukkan rekod dokumen bagi setiap jenis wajib. */
async function muatNaikSemuaWajib(id) {
  const perlu = await db.query('select kod from dokumen_diperlukan($1)', [id])
  for (const { kod } of perlu.rows) {
    await db.query(
      `insert into dokumen (permohonan_id, jenis_dokumen, nama_fail, kunci_r2, saiz, cincangan_sha256)
       values ($1, $2, $3, $4, 1024, repeat('a', 64))`,
      [id, kod, `${kod}.pdf`, `permohonan/${id}/${kod}/${crypto.randomUUID()}.pdf`],
    )
  }
}

const status = async (id) =>
  (await satu(db, 'select status from permohonan where id = $1', [id])).status

/** Kod semua perkara dalam senarai semak penyemak. */
async function semuaItemSemakan() {
  const r = await satu(db, `select nilai from tetapan where kunci = 'item_semakan'`)
  return r.nilai.map((i) => i.kod)
}

/** Sokong sentiasa menanda semua perkara; hantar `semakan` untuk menguji tandaan separa. */
async function bertindak(uid, id, tindakan, catatan = null, semakan) {
  const kod = semakan ?? (tindakan === 'SOKONG' ? await semuaItemSemakan() : null)
  return sebagai(db, uid, () =>
    satu(db, rpc('tindakan_kelulusan', [1, 2, 3, 4]), [id, tindakan, catatan, kod]),
  )
}

// ════════════════════════════════════════════════════════════════════

describe('Pendaftaran — pencetus handle_pengguna_baharu', () => {
  test('e-mel dalam senarai JPN menjadi akaun sekolah', async () => {
    const g = await satu(db, 'select * from pegawai where user_id = $1', [u.sekolah])
    assert.equal(g.peranan, 'sekolah')
    assert.equal(g.kod_skop, 'ABA1234')
  })

  test('pegawai pra-daftar dipautkan, peranan tidak berubah', async () => {
    const g = await satu(db, 'select * from pegawai where user_id = $1', [u.ppdKetua])
    assert.equal(g.peranan, 'ppd_ketua')
    assert.equal(g.kod_skop, 'PRK-KU')
  })

  test('e-mel tiada dalam senarai tidak mendapat capaian', async () => {
    const g = await satu(db, 'select * from pegawai where user_id = $1', [u.orangLuar])
    assert.equal(g, null)
    const n = await sebagai(db, u.orangLuar, () =>
      satu(db, 'select count(*)::int n from permohonan'),
    )
    assert.equal(n.n, 0)
  })

  test('pendaftaran sekolah direkod dalam log audit', async () => {
    const a = await satu(
      db,
      `select * from log_audit where peristiwa = 'AKAUN_SEKOLAH_DIDAFTARKAN'
         and emel_pegawai = 'aba1234@moe-dl.edu.my'`,
    )
    assert.ok(a)
  })

  test('pengguna tidak boleh menaikkan peranan sendiri', async () => {
    await sebagai(db, u.sekolah, async () => {
      const r = await db.query(
        `update pegawai set peranan = 'admin' where user_id = $1`,
        [u.sekolah],
      )
      assert.equal(r.affectedRows, 0)
    })
    const g = await satu(db, 'select peranan from pegawai where user_id = $1', [u.sekolah])
    assert.equal(g.peranan, 'sekolah')
  })
})

describe('Penyelarasan tarikh — pencetus permohonan_tempat', () => {
  test('INSERT, UPDATE dan DELETE semuanya mengemas kini julat tarikh', async () => {
    await sebagai(db, u.sekolah, async () => {
      const p = await satu(
        db,
        `insert into permohonan (kod_sekolah, kod_ppd) values ('ABA1234', 'PRK-KU') returning id`,
      )
      const t1 = await satu(
        db,
        `insert into permohonan_tempat (permohonan_id, tempat, tarikh_dari, tarikh_hingga)
         values ($1, 'A', '2026-12-01', '2026-12-02') returning id`,
        [p.id],
      )
      await db.query(
        `insert into permohonan_tempat (permohonan_id, tempat, tarikh_dari, tarikh_hingga)
         values ($1, 'B', '2026-12-05', '2026-12-07')`,
        [p.id],
      )
      let r = await satu(db, 'select tarikh_mula::text, tarikh_tamat::text from permohonan where id = $1', [p.id])
      assert.deepEqual(r, { tarikh_mula: '2026-12-01', tarikh_tamat: '2026-12-07' })

      await db.query(`update permohonan_tempat set tarikh_dari = '2026-11-28' where id = $1`, [t1.id])
      r = await satu(db, 'select tarikh_mula::text from permohonan where id = $1', [p.id])
      assert.equal(r.tarikh_mula, '2026-11-28')

      await db.query('delete from permohonan_tempat where id = $1', [t1.id])
      r = await satu(db, 'select tarikh_mula::text, tarikh_tamat::text from permohonan where id = $1', [p.id])
      assert.deepEqual(r, { tarikh_mula: '2026-12-05', tarikh_tamat: '2026-12-07' })
    })
  })
})

describe('Enjin pengesahan — semak_kelengkapan', () => {
  test('draf kosong disekat dengan senarai ralat', async () => {
    const hasil = await sebagai(db, u.sekolah, async () => {
      const p = await satu(
        db,
        `insert into permohonan (kod_sekolah, kod_ppd) values ('ABA1234', 'PRK-KU') returning id`,
      )
      return satu(db, 'select semak_kelengkapan($1) k', [p.id])
    })
    assert.equal(hasil.k.boleh_hantar, false)
    const teks = hasil.k.ralat.join(' | ')
    for (const kata of ['Kategori', 'Tujuan', 'pengangkutan', 'tempat', 'Ketua rombongan', 'Dokumen']) {
      assert.match(teks, new RegExp(kata, 'i'))
    }
  })

  test('tempoh minimum 21 hari dikuatkuasakan', async () => {
    const id = await ciptaLengkap({ hari: 10 })
    const r = await sebagai(db, u.sekolah, () => satu(db, 'select semak_kelengkapan($1) k', [id]))
    assert.equal(r.k.boleh_hantar, false)
    assert.match(r.k.ralat.join(), /21 hari/)
  })

  test('Lampiran C: 60 murid rendah, 7 guru disekat; 10 guru perlu justifikasi', async () => {
    const n7 = await satu(db, `select kira_nisbah('f', 60, 7) n`)
    assert.equal(n7.n.perlu, 12)
    assert.equal(n7.n.had_terendah, 9)
    assert.equal(n7.n.disekat, true)

    const n10 = await satu(db, `select kira_nisbah('f', 60, 10) n`)
    assert.equal(n10.n.disekat, false)
    assert.equal(n10.n.perlu_justifikasi, true)

    const n12 = await satu(db, `select kira_nisbah('f', 60, 12) n`)
    assert.equal(n12.n.sah, true)
  })

  test('justifikasi Bahagian I membuka penghantaran dalam had pengecualian', async () => {
    const id = await ciptaLengkap({ bilMurid: 60, bilGuru: 10 })
    await sebagai(db, u.sekolah, async () => {
      let r = await satu(db, 'select semak_kelengkapan($1) k', [id])
      assert.equal(r.k.boleh_hantar, false)
      assert.match(r.k.ralat.join(), /Bahagian I/)

      await db.query(
        `update permohonan set justifikasi_nisbah = 'Dua guru berkursus; dua ibu bapa berdaftar menjadi pemantau tambahan.' where id = $1`,
        [id],
      )
      r = await satu(db, 'select semak_kelengkapan($1) k', [id])
      assert.equal(r.k.boleh_hantar, true, r.k.ralat.join(' | '))
    })
  })

  test('bas persiaran mencetuskan tujuh dokumen kenderaan', async () => {
    const r = await sebagai(db, u.sekolah, async () => {
      const p = await satu(
        db,
        `insert into permohonan (kod_sekolah, kod_ppd, pengangkutan)
         values ('ABA1234', 'PRK-KU', '{BAS_PERSIARAN}') returning id`,
      )
      return db.query(
        `select kod from dokumen_diperlukan($1) where kumpulan = 'KENDERAAN'`,
        [p.id],
      )
    })
    assert.equal(r.rows.length, 7)
  })

  test('Lampiran A (dijana sistem) tidak diminta untuk dimuat naik', async () => {
    const r = await sebagai(db, u.sekolah, async () => {
      const p = await satu(
        db,
        `insert into permohonan (kod_sekolah, kod_ppd) values ('ABA1234', 'PRK-KU') returning id`,
      )
      return db.query(`select kod from dokumen_diperlukan($1) where kod = 'LAMPIRAN_A'`, [p.id])
    })
    assert.equal(r.rows.length, 0)
  })

  test('ciri tambahan menambah dokumen yang sepadan', async () => {
    const kod = await sebagai(db, u.sekolah, async () => {
      const p = await satu(
        db,
        `insert into permohonan (kod_sekolah, kod_ppd, ada_aktiviti_air, anjuran_pihak_luar, bil_bukan_guru)
         values ('ABA1234', 'PRK-KU', true, true, 3) returning id`,
      )
      const r = await db.query('select kod from dokumen_diperlukan($1)', [p.id])
      return r.rows.map((x) => x.kod)
    })
    for (const k of ['TAULIAH_PENYELAMAT_AIR', 'SURAT_KEBENARAN_PROGRAM', 'SENARAI_BUKAN_MURID']) {
      assert.ok(kod.includes(k), `${k} sepatutnya diperlukan`)
    }
    assert.ok(!kod.includes('BORANG_RISIKO'))
  })
})

describe('Penghantaran', () => {
  test('permohonan lengkap dihantar dan mendapat nombor rujukan', async () => {
    const id = await ciptaLengkap()
    const p = await sebagai(db, u.sekolah, () => satu(db, rpc('hantar_permohonan', [1]), [id]))
    assert.equal(p.status, 'MENUNGGU_PPD_SEMAK')
    assert.match(p.no_rujukan, /^JPNPk\/LWT\/\d{4}\/PRK-KU\/ABA1234\/\d{4}$/)
  })

  test('nombor turutan meningkat', async () => {
    const a = await ciptaLengkap()
    const b = await ciptaLengkap()
    const ra = await sebagai(db, u.sekolah, () => satu(db, rpc('hantar_permohonan', [1]), [a]))
    const rb = await sebagai(db, u.sekolah, () => satu(db, rpc('hantar_permohonan', [1]), [b]))
    const na = Number(ra.no_rujukan.split('/').pop())
    const nb = Number(rb.no_rujukan.split('/').pop())
    assert.equal(nb, na + 1)
  })

  test('permohonan tidak lengkap ditolak oleh hantar_permohonan', async () => {
    await sebagai(db, u.sekolah, async () => {
      const p = await satu(
        db,
        `insert into permohonan (kod_sekolah, kod_ppd) values ('ABA1234', 'PRK-KU') returning id`,
      )
      await assert.rejects(db.query(rpc('hantar_permohonan', [1]), [p.id]), /belum lengkap/)
    })
  })

  test('sekolah tidak boleh menyunting selepas hantar', async () => {
    const id = await ciptaLengkap()
    await sebagai(db, u.sekolah, async () => {
      await db.query(rpc('hantar_permohonan', [1]), [id])
      const r = await db.query(`update permohonan set tujuan = 'diubah selepas hantar' where id = $1`, [id])
      assert.equal(r.affectedRows, 0)
      const t = await db.query(`update permohonan_tempat set tempat = 'X' where permohonan_id = $1`, [id])
      assert.equal(t.affectedRows, 0)
      const d = await db.query('delete from dokumen where permohonan_id = $1', [id])
      assert.equal(d.affectedRows, 0)
    })
  })

  test('sekolah tidak boleh melompat status sendiri', async () => {
    await sebagai(db, u.sekolah, async () => {
      await assert.rejects(
        db.query(
          `insert into permohonan (kod_sekolah, kod_ppd, status)
           values ('ABA1234', 'PRK-KU', 'DILULUSKAN')`,
        ),
        /row-level security/,
      )
    })
  })

  test('sekolah tidak boleh mencipta permohonan atas nama sekolah lain', async () => {
    await sebagai(db, u.sekolah, async () => {
      await assert.rejects(
        db.query(`insert into permohonan (kod_sekolah, kod_ppd) values ('AEA9012', 'PRK-KS')`),
        /row-level security/,
      )
    })
  })
})

describe('Skop RLS', () => {
  let id
  before(async () => {
    id = await ciptaLengkap()
    await sebagai(db, u.sekolah, () => db.query(rpc('hantar_permohonan', [1]), [id]))
  })

  const lihat = (uid) =>
    sebagai(db, uid, async () =>
      (await db.query('select id from permohonan where id = $1', [id])).rows.length,
    )

  test('PPD daerah sendiri boleh melihat', async () => {
    assert.equal(await lihat(u.ppdPegawai), 1)
  })
  test('PPD daerah lain tidak boleh melihat', async () => {
    assert.equal(await lihat(u.ppdLain), 0)
  })
  test('sekolah lain tidak boleh melihat', async () => {
    assert.equal(await lihat(u.sekolahLain), 0)
  })
  test('JPN negeri sendiri boleh melihat', async () => {
    assert.equal(await lihat(u.jpnPegawai), 1)
  })
  test('KPM tidak melihat lawatan dalam negeri', async () => {
    assert.equal(await lihat(u.kpm), 0)
  })
  test('dokumen dan peserta mengikut skop induk', async () => {
    const n = await sebagai(db, u.ppdLain, async () => {
      const d = await satu(db, 'select count(*)::int n from dokumen where permohonan_id = $1', [id])
      const p = await satu(db, 'select count(*)::int n from peserta where permohonan_id = $1', [id])
      return d.n + p.n
    })
    assert.equal(n, 0)
  })
  test('PPD daerah lain tidak boleh bertindak walaupun tahu id', async () => {
    await assert.rejects(bertindak(u.ppdLain, id, 'SOKONG'), /luar daerah/)
  })
  test('anon tidak boleh membaca apa-apa', async () => {
    const n = await sebagai(db, null, async () => {
      try {
        return (await db.query('select id from permohonan')).rows.length
      } catch {
        return 0
      }
    })
    assert.equal(n, 0)
  })
})

describe('Rantaian kelulusan', () => {
  test('Dalam Daerah: PPD semak → PPD sah → DILULUSKAN dengan kod QR', async () => {
    const id = await ciptaLengkap()
    await sebagai(db, u.sekolah, () => db.query(rpc('hantar_permohonan', [1]), [id]))

    await bertindak(u.ppdPegawai, id, 'SOKONG')
    assert.equal(await status(id), 'MENUNGGU_PPD_SAH')

    await bertindak(u.ppdKetua, id, 'SOKONG', 'Disokong dan diluluskan.')
    assert.equal(await status(id), 'DILULUSKAN')

    const k = await satu(
      db,
      `select bahagian from kelulusan where permohonan_id = $1 and peringkat = 'MENUNGGU_PPD_SAH'`,
      [id],
    )
    assert.equal(k.bahagian, 'G')

    const qr = await satu(db, 'select kod from pengesahan_qr where permohonan_id = $1', [id])
    assert.match(qr.kod, /^[0-9A-F]{12}$/)

    const sah = await sebagai(db, null, () => satu(db, 'select sah_lawatan($1) s', [qr.kod.toLowerCase()]))
    assert.equal(sah.s.sah, true)
    assert.equal(sah.s.nama_sekolah, 'SK Seri Kinta')
    assert.equal(sah.s.kp, undefined, 'data peribadi tidak didedahkan')
  })

  test('kod QR palsu tidak sah', async () => {
    const sah = await sebagai(db, null, () => satu(db, `select sah_lawatan('TIADA123') s`))
    assert.equal(sah.s.sah, false)
  })

  test('peranan salah tidak boleh bertindak pada giliran orang lain', async () => {
    const id = await ciptaLengkap()
    await sebagai(db, u.sekolah, () => db.query(rpc('hantar_permohonan', [1]), [id]))
    await assert.rejects(bertindak(u.ppdKetua, id, 'SOKONG'), /menunggu tindakan ppd_pegawai/)
    await assert.rejects(bertindak(u.jpnPengarah, id, 'SOKONG'), /menunggu tindakan/)
    await assert.rejects(bertindak(u.sekolah, id, 'SOKONG'), /menunggu tindakan/)
  })

  test('Antara Negeri: penyemak PPD terus ke JPN tanpa KPPD, Bahagian H', async () => {
    const id = await ciptaLengkap({ kategori: 'ANTARA_NEGERI' })
    await sebagai(db, u.sekolah, () => db.query(rpc('hantar_permohonan', [1]), [id]))
    await bertindak(u.ppdPegawai, id, 'SOKONG')
    assert.equal(await status(id), 'MENUNGGU_JPN_SEMAK')
    await assert.rejects(bertindak(u.ppdKetua, id, 'SOKONG'), /menunggu tindakan jpn_pegawai/)
    await bertindak(u.jpnPegawai, id, 'SOKONG')
    assert.equal(await status(id), 'MENUNGGU_JPN_SAH')
    await bertindak(u.jpnPengarah, id, 'SOKONG')
    assert.equal(await status(id), 'DILULUSKAN')
    const k = await db.query(
      `select bahagian from kelulusan where permohonan_id = $1 and bahagian is not null order by tarikh_tindakan`,
      [id],
    )
    assert.deepEqual(k.rows.map((r) => r.bahagian), ['H'])
  })

  test('Antara Daerah: KPPD tidak terlibat, Pengarah melulus', async () => {
    const id = await ciptaLengkap({ kategori: 'ANTARA_DAERAH' })
    await sebagai(db, u.sekolah, () => db.query(rpc('hantar_permohonan', [1]), [id]))
    for (const uid of [u.ppdPegawai, u.jpnPegawai, u.jpnPengarah]) {
      await bertindak(uid, id, 'SOKONG')
    }
    assert.equal(await status(id), 'DILULUSKAN')
    const peranan = await db.query(
      `select peranan from kelulusan where permohonan_id = $1 order by tarikh_tindakan`, [id])
    assert.deepEqual(peranan.rows.map((r) => r.peranan), ['ppd_pegawai', 'jpn_pegawai', 'jpn_pengarah'])
  })

  test('PPD hanya melihat sekolah di bawah seliaannya', async () => {
    const kod = (uid) =>
      sebagai(db, uid, async () =>
        (await db.query('select kod_sekolah, kod_ppd from sekolah')).rows)
    const ku = await kod(u.ppdKetua)
    assert.ok(ku.length > 0)
    assert.ok(ku.every((s) => s.kod_ppd === 'PRK-KU'))
    const ks = await kod(u.ppdLain)
    assert.ok(ks.every((s) => s.kod_ppd === 'PRK-KS'))
    assert.ok(!ks.some((s) => s.kod_sekolah === 'ABA1234'))
  })

  test('Luar Negara: diangkat ke KPM, Bahagian J, pasport wajib', async () => {
    const id = await ciptaLengkap({ kategori: 'LUAR_NEGARA', hari: 75, negara: 'Singapura' })
    await sebagai(db, u.sekolah, () => db.query(rpc('hantar_permohonan', [1]), [id]))
    for (const uid of [u.ppdPegawai, u.jpnPegawai, u.jpnPengarah]) {
      await bertindak(uid, id, 'SOKONG')
    }
    assert.equal(await status(id), 'MENUNGGU_KPM')

    const nampak = await sebagai(db, u.kpm, async () =>
      (await db.query('select id from permohonan where id = $1', [id])).rows.length,
    )
    assert.equal(nampak, 1, 'KPM mesti melihat lawatan luar negara')

    await bertindak(u.kpm, id, 'SOKONG')
    assert.equal(await status(id), 'DILULUSKAN')
  })

  test('Luar Negara memerlukan 60 hari', async () => {
    const id = await ciptaLengkap({ kategori: 'LUAR_NEGARA', hari: 45 })
    const r = await sebagai(db, u.sekolah, () => satu(db, 'select semak_kelengkapan($1) k', [id]))
    assert.match(r.k.ralat.join(), /60 hari/)
  })

  test('Luar Negara tanpa pasport ketua rombongan disekat', async () => {
    const id = await ciptaLengkap({ kategori: 'LUAR_NEGARA', hari: 75, negara: 'Singapura' })
    const r = await sebagai(db, u.sekolah, async () => {
      await db.query(
        `update peserta set pasport = null where permohonan_id = $1 and kategori = 'KETUA_ROMBONGAN'`,
        [id],
      )
      return satu(db, 'select semak_kelengkapan($1) k', [id])
    })
    assert.equal(r.k.boleh_hantar, false)
    assert.match(r.k.ralat.join(), /pasport/)
  })

  test('Kembalikan tanpa catatan ditolak; dengan catatan sekolah boleh pinda dan hantar semula', async () => {
    const id = await ciptaLengkap()
    await sebagai(db, u.sekolah, () => db.query(rpc('hantar_permohonan', [1]), [id]))
    const rujukanAsal = (await satu(db, 'select no_rujukan from permohonan where id = $1', [id])).no_rujukan

    await assert.rejects(bertindak(u.ppdPegawai, id, 'KEMBALI'), /Catatan wajib/)
    await assert.rejects(bertindak(u.ppdPegawai, id, 'KEMBALI', 'pendek'), /Catatan wajib/)

    await bertindak(u.ppdPegawai, id, 'KEMBALI', 'Sila lampirkan jadual tentatif yang lengkap.')
    assert.equal(await status(id), 'DIKEMBALIKAN')

    await sebagai(db, u.sekolah, async () => {
      const r = await db.query(`update permohonan set tujuan = 'Tujuan dipinda selepas dikembalikan' where id = $1`, [id])
      assert.equal(r.affectedRows, 1)
      const p = await satu(db, rpc('hantar_permohonan', [1]), [id])
      assert.equal(p.status, 'MENUNGGU_PPD_SEMAK')
      assert.equal(p.no_rujukan, rujukanAsal, 'nombor rujukan kekal selepas pindaan')
      assert.equal(p.catatan_kembali, null)
    })
  })

  test('Tolak menutup rekod', async () => {
    const id = await ciptaLengkap()
    await sebagai(db, u.sekolah, () => db.query(rpc('hantar_permohonan', [1]), [id]))
    await bertindak(u.ppdPegawai, id, 'TOLAK', 'Tarikh bertembung dengan peperiksaan.')
    assert.equal(await status(id), 'DITOLAK')
    await assert.rejects(bertindak(u.ppdKetua, id, 'SOKONG'), /tidak menunggu/)
    await sebagai(db, u.sekolah, () =>
      assert.rejects(db.query(rpc('hantar_permohonan', [1]), [id]), /tidak boleh dihantar/),
    )
  })

  test('pegawai tidak boleh mengubah status secara terus', async () => {
    const id = await ciptaLengkap()
    await sebagai(db, u.sekolah, () => db.query(rpc('hantar_permohonan', [1]), [id]))
    const r = await sebagai(db, u.ppdKetua, () =>
      db.query(`update permohonan set status = 'DILULUSKAN' where id = $1`, [id]),
    )
    assert.equal(r.affectedRows, 0)
    assert.equal(await status(id), 'MENUNGGU_PPD_SEMAK')
  })

  test('pegawai tidak boleh menulis baris kelulusan palsu', async () => {
    const id = await ciptaLengkap()
    await sebagai(db, u.ppdKetua, () =>
      assert.rejects(
        db.query(
          `insert into kelulusan (permohonan_id, peringkat, nama_pegawai, peranan, tindakan)
           values ($1, 'MENUNGGU_PPD_SAH', 'Palsu', 'ppd_ketua', 'SOKONG')`,
          [id],
        ),
        /row-level security/,
      ),
    )
  })
})

describe('Pentadbir', () => {
  test('pintasan pentadbir ditanda dalam kelulusan dan log audit', async () => {
    const id = await ciptaLengkap()
    await sebagai(db, u.sekolah, () => db.query(rpc('hantar_permohonan', [1]), [id]))
    await bertindak(u.admin, id, 'SOKONG')
    assert.equal(await status(id), 'MENUNGGU_PPD_SAH')

    const k = await satu(db, 'select pintasan_admin from kelulusan where permohonan_id = $1', [id])
    assert.equal(k.pintasan_admin, true)
    const a = await satu(
      db,
      `select 1 from log_audit where permohonan_id = $1 and peristiwa = 'KELULUSAN_PINTASAN_PENTADBIR'`,
      [id],
    )
    assert.ok(a)
  })

  test('tukar status manual memerlukan sebab dan hanya untuk pentadbir', async () => {
    const id = await ciptaLengkap()
    await sebagai(db, u.ppdKetua, () =>
      assert.rejects(
        db.query(rpc('tukar_status_pentadbir', [1, 2, 3]), [id, 'BATAL', 'sebab yang panjang']),
        /Hanya pentadbir/,
      ),
    )
    await sebagai(db, u.admin, async () => {
      await assert.rejects(
        db.query(rpc('tukar_status_pentadbir', [1, 2, 3]), [id, 'BATAL', 'x']),
        /Sebab/,
      )
      await db.query(rpc('tukar_status_pentadbir', [1, 2, 3]), [id, 'BATAL', 'Rekod ujian, dibatalkan.'])
    })
    assert.equal(await status(id), 'BATAL')
  })

  test('tempoh minimum boleh diubah; laluan kelulusan dikunci', async () => {
    await sebagai(db, u.admin, async () => {
      const a = await db.query(
        `update tetapan set nilai = jsonb_set(nilai, '{DALAM_DAERAH}', '14') where kunci = 'tempoh_minimum'`,
      )
      assert.equal(a.affectedRows, 1)
      const b = await db.query(`update tetapan set nilai = '{}' where kunci = 'laluan_kelulusan'`)
      assert.equal(b.affectedRows, 0)
      // pulihkan
      await db.query(
        `update tetapan set nilai = jsonb_set(nilai, '{DALAM_DAERAH}', '21') where kunci = 'tempoh_minimum'`,
      )
    })
  })

  test('pegawai biasa tidak boleh menyunting senarai sekolah', async () => {
    const r = await sebagai(db, u.ppdKetua, () =>
      db.query(`update sekolah set kod_ppd = 'PRK-KS' where kod_sekolah = 'ABA1234'`),
    )
    assert.equal(r.affectedRows, 0)
  })
})

describe('Log audit — tambah sahaja', () => {
  test('tiada peranan, termasuk pentadbir, boleh mengubah atau memadam', async () => {
    const sebelum = (await satu(db, 'select count(*)::int n from log_audit')).n
    assert.ok(sebelum > 0)
    for (const uid of [u.admin, u.sekolah, u.ppdKetua]) {
      await sebagai(db, uid, async () => {
        const up = await db.query(`update log_audit set peristiwa = 'DIUBAH'`)
        assert.equal(up.affectedRows, 0)
        const del = await db.query('delete from log_audit')
        assert.equal(del.affectedRows, 0)
      })
    }
    const selepas = (await satu(db, 'select count(*)::int n from log_audit')).n
    assert.equal(selepas, sebelum)
  })

  test('pengguna tidak boleh menulis log atas nama orang lain', async () => {
    const lain = (await satu(db, 'select id from pegawai where user_id = $1', [u.ppdKetua])).id
    await sebagai(db, u.sekolah, () =>
      assert.rejects(
        db.query(`insert into log_audit (pegawai_id, peristiwa) values ($1, 'PALSU')`, [lain]),
        /row-level security/,
      ),
    )
  })
})

describe('Laporan pasca-lawatan (Lampiran G)', () => {
  test('hanya selepas diluluskan, dan menutup rekod sebagai SELESAI', async () => {
    const id = await ciptaLengkap()
    const hantarLaporan = () =>
      sebagai(db, u.sekolah, () =>
        db.query(rpc('hantar_laporan_pasca', [1, 2, 3, 4, 5, 6, 7]), [
          id, 'Lawatan berjalan lancar dan objektif tercapai sepenuhnya.', 29, 6, false, null, null,
        ]),
      )

    await assert.rejects(hantarLaporan(), /diluluskan/)

    await sebagai(db, u.sekolah, () => db.query(rpc('hantar_permohonan', [1]), [id]))
    await bertindak(u.ppdPegawai, id, 'SOKONG')
    await bertindak(u.ppdKetua, id, 'SOKONG')

    await hantarLaporan()
    assert.equal(await status(id), 'SELESAI')

    // Kemas kini dibenarkan selepas SELESAI
    await hantarLaporan()
    const l = await satu(db, 'select bil_hadir_murid from laporan_pasca where permohonan_id = $1', [id])
    assert.equal(l.bil_hadir_murid, 29)
  })

  test('insiden memerlukan butiran', async () => {
    const id = await ciptaLengkap()
    await sebagai(db, u.sekolah, () => db.query(rpc('hantar_permohonan', [1]), [id]))
    await bertindak(u.ppdPegawai, id, 'SOKONG')
    await bertindak(u.ppdKetua, id, 'SOKONG')
    await sebagai(db, u.sekolah, () =>
      assert.rejects(
        db.query(rpc('hantar_laporan_pasca', [1, 2, 3, 4, 5, 6, 7]), [
          id, 'Lawatan berjalan dengan satu kejadian kecil.', 30, 6, true, null, null,
        ]),
        /Butiran insiden/,
      ),
    )
  })
})

describe('Pandangan v_permohonan_ringkas', () => {
  test('mematuhi RLS pemanggil (security_invoker)', async () => {
    const kira = (uid) =>
      sebagai(db, uid, async () =>
        (await satu(db, 'select count(*)::int n from v_permohonan_ringkas')).n,
      )
    const sendiri = await kira(u.ppdPegawai)
    const lain = await kira(u.ppdLain)
    assert.ok(sendiri > 0)
    assert.equal(lain, 0)
  })
})

describe('Profil, tandatangan dan cop', () => {
  const idPeg = async (uid) => (await satu(db, 'select id from pegawai where user_id = $1', [uid])).id
  const kunci = (id, jenis, n = 1) => `profil/${id}/${jenis}/${n}.png`
  const tetapkan = (uid, jenis, k) =>
    sebagai(db, uid, () => db.query('select tetapkan_imej_profil($1, $2)', [jenis, k]))
  const kemasProfil = (uid, p) =>
    sebagai(db, uid, () =>
      satu(db, 'select * from kemas_profil($1, $2, $3, $4, $5)', [
        p.nama ?? null, p.jawatan ?? null, p.telefon ?? null, p.pemohon ?? null, p.gb ?? null,
      ]),
    )

  test('sekolah mengemas kini Guru Besar dan pemohon, tetapi bukan nama sekolah', async () => {
    const g = await kemasProfil(u.sekolah, {
      nama: 'Nama Sekolah Palsu', gb: 'Puan Rosnah binti Ali', pemohon: 'Cikgu Faizal', telefon: '05-1112222',
    })
    assert.equal(g.nama, 'SK Seri Kinta')
    assert.equal(g.nama_pemohon, 'Cikgu Faizal')
    const s = await satu(db, `select nama_guru_besar from sekolah where kod_sekolah = 'ABA1234'`)
    assert.equal(s.nama_guru_besar, 'Puan Rosnah binti Ali')
  })

  test('KPPD mengemas kini nama dan jawatan sendiri sahaja', async () => {
    const g = await kemasProfil(u.ppdKetua, { nama: 'Tuan Haji Razali bin Yusof', jawatan: 'KPPD Kinta Utara' })
    assert.equal(g.nama, 'Tuan Haji Razali bin Yusof')
    assert.equal(g.peranan, 'ppd_ketua', 'peranan tidak boleh berubah melalui profil')
    const lain = await satu(db, 'select nama from pegawai where user_id = $1', [u.ppdPegawai])
    assert.notEqual(lain.nama, g.nama)
  })

  test('nama kosong ditolak', async () => {
    await assert.rejects(kemasProfil(u.ppdKetua, { nama: ' ' }), /Nama penuh wajib/)
    await assert.rejects(kemasProfil(u.sekolah, { gb: '' }), /Guru Besar/)
  })

  test('tidak boleh menunjuk kepada tandatangan orang lain', async () => {
    const idKetua = await idPeg(u.ppdKetua)
    await assert.rejects(tetapkan(u.ppdPegawai, 'tandatangan', kunci(idKetua, 'tandatangan')), /bukan milik/)
    await assert.rejects(tetapkan(u.ppdPegawai, 'cop', 'permohonan/x/y.png'), /bukan milik/)
    const idSendiri = await idPeg(u.ppdPegawai)
    await assert.rejects(tetapkan(u.ppdPegawai, 'cop', kunci(idSendiri, 'tandatangan')), /bukan milik/)
  })

  test('tandatangan dan cop dibekukan pada setiap peringkat; pintasan tanpa tandatangan', async () => {
    const [iS, iP, iK] = [await idPeg(u.sekolah), await idPeg(u.ppdPegawai), await idPeg(u.ppdKetua)]
    await tetapkan(u.sekolah, 'tandatangan', kunci(iS, 'tandatangan'))
    await tetapkan(u.sekolah, 'cop', kunci(iS, 'cop'))
    await tetapkan(u.ppdPegawai, 'tandatangan', kunci(iP, 'tandatangan'))
    await tetapkan(u.ppdKetua, 'tandatangan', kunci(iK, 'tandatangan'))
    await tetapkan(u.ppdKetua, 'cop', kunci(iK, 'cop'))

    const id = await ciptaLengkap()
    await sebagai(db, u.sekolah, () => db.query(rpc('hantar_permohonan', [1]), [id]))
    const f = await satu(db, 'select * from permohonan where id = $1', [id])
    assert.equal(f.kunci_tandatangan_gb, kunci(iS, 'tandatangan'))
    assert.equal(f.kunci_cop_sekolah, kunci(iS, 'cop'))
    assert.equal(f.nama_guru_besar, 'Puan Rosnah binti Ali')
    assert.equal(f.nama_pemohon, 'Cikgu Faizal')

    await bertindak(u.ppdPegawai, id, 'SOKONG')
    await bertindak(u.ppdKetua, id, 'SOKONG')

    // Tukar tandatangan SELEPAS kelulusan — rekod lama mesti kekal
    await tetapkan(u.ppdKetua, 'tandatangan', kunci(iK, 'tandatangan', 2))
    await tetapkan(u.sekolah, 'tandatangan', null)

    const k = await db.query(
      `select peringkat, kunci_tandatangan, kunci_cop from kelulusan
        where permohonan_id = $1 order by tarikh_tindakan`, [id])
    assert.deepEqual(k.rows, [
      { peringkat: 'MENUNGGU_PPD_SEMAK', kunci_tandatangan: kunci(iP, 'tandatangan'), kunci_cop: null },
      { peringkat: 'MENUNGGU_PPD_SAH', kunci_tandatangan: kunci(iK, 'tandatangan'), kunci_cop: kunci(iK, 'cop') },
    ])
    const f2 = await satu(db, 'select kunci_tandatangan_gb from permohonan where id = $1', [id])
    assert.equal(f2.kunci_tandatangan_gb, kunci(iS, 'tandatangan'), 'Bahagian F kekal')

    // Pintasan pentadbir: tiada tandatangan
    const id2 = await ciptaLengkap()
    await sebagai(db, u.sekolah, () => db.query(rpc('hantar_permohonan', [1]), [id2]))
    await bertindak(u.admin, id2, 'SOKONG')
    const p = await satu(db, 'select kunci_tandatangan, kunci_cop from kelulusan where permohonan_id = $1', [id2])
    assert.deepEqual(p, { kunci_tandatangan: null, kunci_cop: null })

    // Kembalikan tidak ditandatangani
    await bertindak(u.ppdKetua, id2, 'KEMBALI', 'Sila semak semula jadual tentatif.')
    const r = await satu(
      db, `select kunci_tandatangan from kelulusan where permohonan_id = $1 and tindakan = 'KEMBALI'`, [id2])
    assert.equal(r.kunci_tandatangan, null)

    // Senarai kunci untuk cetakan
    const semua = (await db.query('select * from kunci_imej_permohonan($1)', [id])).rows.map((x) => x.kunci_imej_permohonan)
    // tandatangan + cop sekolah, tandatangan penyemak, tandatangan + cop KPPD
    assert.equal(semua.length, 5)
  })

  test('Lampiran G membekukan tandatangan Guru Besar semasa laporan dihantar', async () => {
    const iS = await idPeg(u.sekolah)
    await tetapkan(u.sekolah, 'tandatangan', kunci(iS, 'tandatangan', 3))
    const id = await ciptaLengkap()
    await sebagai(db, u.sekolah, () => db.query(rpc('hantar_permohonan', [1]), [id]))
    await bertindak(u.ppdPegawai, id, 'SOKONG')
    await bertindak(u.ppdKetua, id, 'SOKONG')
    await sebagai(db, u.sekolah, () =>
      db.query(rpc('hantar_laporan_pasca', [1, 2, 3, 4, 5, 6, 7]), [
        id, 'Lawatan berjalan lancar dan objektif tercapai.', 30, 6, false, null, null,
      ]))
    const l = await satu(db, 'select kunci_tandatangan_gb, nama_guru_besar from laporan_pasca where permohonan_id = $1', [id])
    assert.equal(l.kunci_tandatangan_gb, kunci(iS, 'tandatangan', 3))
    assert.equal(l.nama_guru_besar, 'Puan Rosnah binti Ali')
  })

  test('fungsi kunci_imej_permohonan tidak boleh dipanggil terus oleh pengguna', async () => {
    await sebagai(db, u.ppdLain, () =>
      assert.rejects(db.query(`select kunci_imej_permohonan(gen_random_uuid())`), /permission denied/))
  })

  test('perubahan profil direkod dalam log audit', async () => {
    const a = await satu(db, `select count(*)::int n from log_audit where peristiwa in ('PROFIL_DIKEMASKINI','IMEJ_PROFIL_DITUKAR')`)
    assert.ok(a.n >= 5)
  })
})

describe('Identiti korporat (migrasi 6)', () => {
  test('maklumat jabatan dan slogan boleh dibaca tanpa log masuk; tetapan lain tidak', async () => {
    const r = await sebagai(db, null, () => db.query('select kunci from tetapan order by kunci'))
    // domain_dibenarkan dibaca oleh skrin log masuk sebelum log masuk (migrasi 11)
    assert.deepEqual(r.rows.map((x) => x.kunci), [
      'domain_dibenarkan',
      'maklumat_jpn',
      'slogan_surat',
    ])
  })

  test('slogan surat boleh dikemas kini pentadbir sahaja', async () => {
    const a = await sebagai(db, u.admin, () =>
      db.query(`update tetapan set nilai = '["BERKHIDMAT UNTUK NEGARA"]' where kunci = 'slogan_surat'`))
    assert.equal(a.affectedRows, 1)
    const b = await sebagai(db, u.ppdKetua, () =>
      db.query(`update tetapan set nilai = '[]' where kunci = 'slogan_surat'`))
    assert.equal(b.affectedRows, 0)
    const m = await satu(db, `select nilai from tetapan where kunci = 'maklumat_jpn'`)
    assert.equal(m.nilai.laman_web, 'https://jpnperak.moe.gov.my')
    assert.equal(m.nilai.nama, 'Jabatan Pendidikan Negeri Perak')
    assert.equal(m.nilai.telefon, '05-525 6000')
    assert.equal(m.nilai.emel, 'jpn.perak@moe.gov.my')
    assert.match(m.nilai.alamat, /Persiaran Meru Utama.*30020 Ipoh/)
  })
})

describe('Senarai semak penyemak (migrasi 8)', () => {
  test('penyemak tidak boleh memperakukan tanpa menanda semua perkara', async () => {
    const id = await ciptaLengkap()
    await sebagai(db, u.sekolah, () => db.query(rpc('hantar_permohonan', [1]), [id]))

    await assert.rejects(bertindak(u.ppdPegawai, id, 'SOKONG', null, []), /Belum ditanda/)
    const [pertama] = await semuaItemSemakan()
    await assert.rejects(bertindak(u.ppdPegawai, id, 'SOKONG', null, [pertama]), /Belum ditanda/)
    assert.equal(await status(id), 'MENUNGGU_PPD_SEMAK')
  })

  test('perakuan penyemak disimpan; pengesah tidak perlu menanda', async () => {
    const id = await ciptaLengkap()
    await sebagai(db, u.sekolah, () => db.query(rpc('hantar_permohonan', [1]), [id]))
    await bertindak(u.ppdPegawai, id, 'SOKONG', 'Semua dokumen lengkap.')

    const semak = await satu(
      db,
      `select semakan from kelulusan where permohonan_id = $1 and peringkat = 'MENUNGGU_PPD_SEMAK'`,
      [id],
    )
    assert.deepEqual(semak.semakan.map((i) => i.kod), await semuaItemSemakan())
    assert.ok(semak.semakan.every((i) => i.label))

    await bertindak(u.ppdKetua, id, 'SOKONG', null, [])
    assert.equal(await status(id), 'DILULUSKAN')
    const sah = await satu(
      db,
      `select semakan from kelulusan where permohonan_id = $1 and peringkat = 'MENUNGGU_PPD_SAH'`,
      [id],
    )
    assert.equal(sah.semakan, null)
  })

  test('penyemak masih boleh mengembalikan tanpa menanda', async () => {
    const id = await ciptaLengkap()
    await sebagai(db, u.sekolah, () => db.query(rpc('hantar_permohonan', [1]), [id]))
    await bertindak(u.ppdPegawai, id, 'KEMBALI', 'Sila lengkapkan senarai peserta.')
    assert.equal(await status(id), 'DIKEMBALIKAN')
  })
})
