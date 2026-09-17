// ════════════════════════════════════════════════════════════════════
// Enjin demo — Postgres sebenar (PGlite) dalam pelayar.
//
// Menjalankan migrasi yang SAMA seperti pengeluaran, jadi setiap
// peraturan, pencetus dan dasar RLS berkelakuan seperti sistem sebenar.
// Data disimpan dalam IndexedDB pelayar dan kekal selepas muat semula.
// ════════════════════════════════════════════════════════════════════

import { PGlite, type Transaction } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import tiruanSupabase from '../../ujian/tiruan-supabase.sql?raw'
import seed from '../../supabase/seed.sql?raw'
import { simpanFail } from './stor-fail'

const migrasi = import.meta.glob('../../supabase/migrations/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export const NAMA_DB = 'idb://elawatan-demo'

let janji: Promise<PGlite> | null = null

export function pangkalan(): Promise<PGlite> {
  janji ??= mula()
  return janji
}

async function mula(): Promise<PGlite> {
  const db = await PGlite.create(NAMA_DB, { extensions: { pgcrypto } })
  const ada = await db.query<{ ada: string | null }>(
    `select to_regclass('public.permohonan')::text as ada`,
  )
  if (!ada.rows[0]?.ada) {
    await db.exec(tiruanSupabase)
    for (const nama of Object.keys(migrasi).sort()) {
      await db.exec(migrasi[nama])
    }
    await db.exec(seed)
    await isiContoh(db)
  }
  return db
}

export type Konteks = { uid: string | null }

/**
 * Satu permintaan = satu transaksi, seperti PostgREST.
 * Peranan dan tuntutan JWT ditetapkan secara `local` supaya tidak bocor.
 */
export async function dalamTransaksi<T>(
  k: Konteks,
  kerja: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return transaksiPada(await pangkalan(), k, kerja)
}

// Menerima sambungan secara terus supaya penyediaan awal (yang berjalan
// sebelum pangkalan() selesai) tidak menunggu dirinya sendiri.
function transaksiPada<T>(
  db: PGlite,
  k: Konteks,
  kerja: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [k.uid ?? ''])
    await tx.exec(k.uid ? 'set local role authenticated' : 'set local role anon')
    return kerja(tx)
  })
}

/** Kerja pelayan (Edge Function) — peranan perkhidmatan, memintas RLS. */
export async function sebagaiPelayan<T>(kerja: (tx: Transaction) => Promise<T>): Promise<T> {
  const db = await pangkalan()
  return db.transaction(kerja)
}

export async function setSemula(): Promise<void> {
  const db = await pangkalan()
  await db.close()
  janji = null
  const semua = (await indexedDB.databases?.()) ?? []
  const nama = semua.map((d) => d.name ?? '').filter((n) => n.includes('elawatan-demo'))
  await Promise.all(
    nama.map(
      (n) =>
        new Promise<void>((selesai) => {
          const r = indexedDB.deleteDatabase(n)
          r.onsuccess = r.onerror = r.onblocked = () => selesai()
        }),
    ),
  )
}

// ── Contoh permohonan supaya papan pemuka tidak kosong ──────────────

const PDF_CONTOH = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 88>>stream
BT /F1 20 Tf 72 760 Td (Dokumen contoh - mod demo eLAWATAN) Tj 0 -30 Td (Tiada kandungan sebenar.) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`

async function isiContoh(db: PGlite) {
  const uid: Record<string, string> = {}
  for (const emel of [
    'aba1234@moe-dl.edu.my',
    'ppd.ku.pegawai@moe.gov.my',
    'ppd.ku.ketua@moe.gov.my',
    'jpn.pegawai@moe.gov.my',
    'admin.elawatan@moe.gov.my',
  ]) {
    const r = await db.query<{ id: string }>(
      'insert into auth.users (email) values ($1) returning id',
      [emel],
    )
    uid[emel] = r.rows[0].id
  }
  const sekolah = uid['aba1234@moe-dl.edu.my']

  const pdf = new Blob([PDF_CONTOH], { type: 'application/pdf' })

  async function cipta(p: {
    kategori: string
    tujuan: string
    tempat: string
    negeri?: string
    hari: number
    murid: number
    guru: number
    pengangkutan: string
  }): Promise<string> {
    return transaksiPada(db, { uid: sekolah }, async (tx) => {
      const r = await tx.query<{ id: string }>(
        `insert into permohonan (kod_sekolah, kod_ppd, kod_jpn, kategori, tujuan,
                                 pengangkutan, bil_murid, bil_guru, kutipan_murid)
         values ('ABA1234', 'PRK-KU', 'A', $1, $2, $3::pengangkutan_t[], $4, $5, $6)
         returning id`,
        [p.kategori, p.tujuan, `{${p.pengangkutan}}`, p.murid, p.guru, p.murid * 35],
      )
      const id = r.rows[0].id
      await tx.query(
        `insert into permohonan_tempat (permohonan_id, tempat, negeri, tarikh_dari, tarikh_hingga)
         values ($1, $2, $3, current_date + $4::int, current_date + $4::int)`,
        [id, p.tempat, p.negeri ?? 'Perak', p.hari],
      )
      await tx.query(
        `insert into peserta (permohonan_id, kategori, nama, kp, telefon, jawatan)
         values ($1, 'KETUA_ROMBONGAN', 'Cikgu Nurul Aini binti Hassan',
                 '850312-08-5566', '013-4455667', 'Guru Penolong Kanan Kokurikulum')`,
        [id],
      )
      const perlu = await tx.query<{ kod: string }>('select kod from dokumen_diperlukan($1)', [id])
      for (const { kod } of perlu.rows) {
        const kunci = `permohonan/${id}/${kod}/contoh.pdf`
        await simpanFail(kunci, pdf)
        await tx.query(
          `insert into dokumen (permohonan_id, jenis_dokumen, nama_fail, kunci_r2, saiz,
                                jenis_mime, cincangan_sha256)
           values ($1, $2, $3, $4, $5, 'application/pdf', encode(sha256(convert_to($6, 'UTF8')), 'hex'))`,
          [id, kod, `${kod.toLowerCase()}.pdf`, kunci, pdf.size, PDF_CONTOH],
        )
      }
      return id
    })
  }

  const hantar = (id: string) =>
    transaksiPada(db, { uid: sekolah }, (tx) => tx.query('select hantar_permohonan($1)', [id]))
  const lulus = (emel: string, id: string, catatan: string | null = null) =>
    transaksiPada(db, { uid: uid[emel] }, (tx) =>
      tx.query(`select tindakan_kelulusan($1, 'SOKONG', $2)`, [id, catatan]),
    )

  // 1. Diluluskan — surat kelulusan dan kod QR tersedia
  const a = await cipta({
    kategori: 'DALAM_DAERAH',
    tujuan: 'Lawatan sambil belajar ke Muzium Darul Ridzuan bagi tajuk Sejarah Tahun 5',
    tempat: 'Muzium Darul Ridzuan, Ipoh',
    hari: 35,
    murid: 40,
    guru: 8,
    pengangkutan: 'BAS_SEKOLAH_KPM',
  })
  await hantar(a)
  await lulus('ppd.ku.pegawai@moe.gov.my', a, 'Dokumen lengkap.')
  await lulus('ppd.ku.ketua@moe.gov.my', a, 'Diluluskan.')

  // 2. Menunggu semakan PPD — muncul dalam peti tindakan pegawai PPD
  const b = await cipta({
    kategori: 'DALAM_DAERAH',
    tujuan: 'Program perkhemahan unit beruniform di Taman Rekreasi Gunung Lang',
    tempat: 'Taman Rekreasi Gunung Lang, Ipoh',
    hari: 28,
    murid: 25,
    guru: 5,
    pengangkutan: 'BAS_PERSIARAN',
  })
  await hantar(b)

  // 3. Antara negeri — sudah melepasi PPD, menunggu semakan JPN
  const c = await cipta({
    kategori: 'ANTARA_NEGERI',
    tujuan: 'Lawatan ke Pusat Sains Negara sempena Bulan Sains, Teknologi dan Inovasi',
    tempat: 'Pusat Sains Negara, Kuala Lumpur',
    negeri: 'Wilayah Persekutuan Kuala Lumpur',
    hari: 50,
    murid: 30,
    guru: 6,
    pengangkutan: 'BAS_PERSIARAN',
  })
  await hantar(c)
  await lulus('ppd.ku.pegawai@moe.gov.my', c)
  await lulus('ppd.ku.ketua@moe.gov.my', c, 'Disokong ke JPN.')

  // 4. Draf — boleh disunting oleh sekolah
  await cipta({
    kategori: 'DALAM_DAERAH',
    tujuan: 'Lawatan ke Perpustakaan Awam Perak',
    tempat: 'Perpustakaan Awam Perak, Ipoh',
    hari: 40,
    murid: 20,
    guru: 2,
    pengangkutan: 'KENDERAAN_GURU',
  })
}
