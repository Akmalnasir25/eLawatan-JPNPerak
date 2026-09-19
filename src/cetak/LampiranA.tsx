import { RingkasanPerjalanan } from '@/komponen/RingkasanPerjalanan'
import { useParams } from 'react-router-dom'
import { BingkaiCetak, BlokTandatangan, gunaCetak, Pangkah } from './rangka'
import {
  LABEL_KATEGORI,
  LABEL_PENGANGKUTAN,
  LABEL_PESERTA,
} from '@/lib/istilah'
import { formatTarikh, formatWang } from '@/lib/guna'
import type { Kategori, Pengangkutan } from '@/lib/jenis'

const KATEGORI: Kategori[] = [
  'DALAM_DAERAH',
  'ANTARA_DAERAH',
  'ANTARA_NEGERI',
  'LUAR_NEGARA',
]

const PENGANGKUTAN: Pengangkutan[] = [
  'BAS_PERSIARAN',
  'VAN_PERSIARAN',
  'BAS_SEKOLAH_SEWA',
  'BAS_SEKOLAH_KPM',
  'VAN_KPM',
  'COASTER',
  'KENDERAAN_TENTERA',
  'KENDERAAN_POLIS',
  'KENDERAAN_GURU',
  'KENDERAAN_IBU_BAPA',
]

export function CetakLampiranA() {
  const { id } = useParams<{ id: string }>()
  const { bundel: b, ralat, url } = gunaCetak(id)

  return (
    <BingkaiCetak tajuk="Lampiran A — Borang Permohonan Lawatan Murid Sekolah" ralat={ralat} sedia={!!b}>
      {b && <Isi b={b} url={url} />}
    </BingkaiCetak>
  )
}

type Url = ReturnType<typeof gunaCetak>['url']

function Isi({ b, url }: { b: NonNullable<ReturnType<typeof gunaCetak>['bundel']>; url: Url }) {
  const p = b.permohonan
  const ketua = b.peserta.find((x) => x.kategori === 'KETUA_ROMBONGAN')
  const jumlahA =
    Number(p.kutipan_murid) + Number(p.kutipan_guru) + Number(p.sumber_lain)
  const jumlahB = b.penaja.reduce((n, x) => n + Number(x.jumlah), 0)

  // Ambil sokongan TERKINI — permohonan yang dikembalikan dan dihantar
  // semula mempunyai lebih daripada satu rekod bagi peringkat yang sama.
  const terkini = (syarat: (k: (typeof b.kelulusan)[number]) => boolean) =>
    [...b.kelulusan].reverse().find((k) => k.tindakan === 'SOKONG' && syarat(k))
  const pengesahBagi = (bahagian: string) => terkini((k) => k.bahagian === bahagian)
  const penyemakBagi = (peringkat: string) => terkini((k) => k.peringkat === peringkat)
  const sudahDihantar = !!p.dihantar_pada

  return (
    <div className="borang-rasmi">
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: '9.5pt' }}>LAMPIRAN A</div>
        <div style={{ fontWeight: 700, fontSize: '12pt', marginTop: 4 }}>
          BORANG PERMOHONAN LAWATAN MURID SEKOLAH
        </div>
        <div style={{ fontSize: '9.5pt', marginTop: 2 }}>
          Permohonan Peraturan Lawatan Sekolah 1957
        </div>
        <div style={{ fontSize: '9pt', marginTop: 2 }}>
          Jabatan Pendidikan Negeri Perak · Sektor Pengurusan Sekolah
        </div>
        {p.no_rujukan && (
          <div style={{ fontSize: '9.5pt', marginTop: 6, fontWeight: 700 }}>
            No. Rujukan: {p.no_rujukan}
          </div>
        )}
        {p.nama_pemohon && (
          <div style={{ fontSize: '9.5pt', marginTop: 2 }}>Pemohon: {p.nama_pemohon}</div>
        )}
      </div>

      {/* ── Bahagian A ─────────────────────────────────────────── */}
      <table className="elak-pecah">
        <tbody>
          <tr>
            <td className="tajuk-bahagian" colSpan={4}>
              A. Maklumat Sekolah
            </td>
          </tr>
          <tr>
            <td style={{ width: '22%' }}>Nama sekolah</td>
            <td style={{ width: '38%' }}>{b.sekolah.nama}</td>
            <td style={{ width: '18%' }}>Kod sekolah</td>
            <td style={{ width: '22%' }}>{b.sekolah.kod_sekolah}</td>
          </tr>
          <tr>
            <td>Pengetua / Guru Besar</td>
            <td colSpan={3}>{b.sekolah.nama_guru_besar ?? ''}</td>
          </tr>
          <tr>
            <td>Alamat</td>
            <td colSpan={3}>
              {[
                b.sekolah.alamat,
                b.sekolah.poskod,
                b.sekolah.bandar,
                b.sekolah.negeri,
              ]
                .filter(Boolean)
                .join(', ')}
            </td>
          </tr>
          <tr>
            <td>Telefon</td>
            <td>{b.sekolah.telefon ?? ''}</td>
            <td>Faks</td>
            <td>{b.sekolah.faks ?? ''}</td>
          </tr>
          <tr>
            <td>E-mel</td>
            <td colSpan={3}>{b.sekolah.emel}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Bahagian B1 ────────────────────────────────────────── */}
      <table style={{ marginTop: 8 }}>
        <tbody>
          <tr>
            <td className="tajuk-bahagian" colSpan={2}>
              B1. Maklumat Lawatan
            </td>
          </tr>
          <tr>
            <td style={{ width: '22%' }}>B1.1 Kategori lawatan</td>
            <td>
              {KATEGORI.map((k) => (
                <span key={k} style={{ marginRight: 14, whiteSpace: 'nowrap' }}>
                  <Pangkah ditanda={p.kategori === k} />
                  {LABEL_KATEGORI[k]}
                </span>
              ))}
            </td>
          </tr>
          <tr>
            <td>B1.2 Tujuan lawatan</td>
            <td style={{ minHeight: 40 }}>{p.tujuan ?? ''}</td>
          </tr>
          <tr>
            <td>B1.3 Jenis pengangkutan</td>
            <td>
              {PENGANGKUTAN.map((j) => (
                <span
                  key={j}
                  style={{ marginRight: 14, whiteSpace: 'nowrap', display: 'inline-block' }}
                >
                  <Pangkah ditanda={p.pengangkutan.includes(j)} />
                  {LABEL_PENGANGKUTAN[j]}
                </span>
              ))}
            </td>
          </tr>
        </tbody>
      </table>

      {/* B1.4 */}
      <table style={{ marginTop: 8 }}>
        <thead>
          <tr>
            <td className="tajuk-bahagian" colSpan={5}>
              B1.4 Tempat Dilawati dan Tempat Penginapan
            </td>
          </tr>
          <tr>
            <th style={{ width: '5%' }}>Bil</th>
            <th style={{ width: '35%' }}>Tempat dilawati</th>
            <th style={{ width: '20%' }}>Negeri / Negara</th>
            <th style={{ width: '20%' }}>Tarikh</th>
            <th style={{ width: '20%' }}>Tempat penginapan</th>
          </tr>
        </thead>
        <tbody>
          {(b.tempat.length > 0 ? b.tempat : [null, null, null]).map((t, i) => (
            <tr key={t?.id ?? `kosong-${i}`}>
              <td style={{ textAlign: 'center' }}>{i + 1}</td>
              <td>{t?.tempat ?? ''}</td>
              <td>{t ? [t.negeri, t.negara].filter(Boolean).join(' / ') : ''}</td>
              <td>
                {t
                  ? `${formatTarikh(t.tarikh_dari)}${
                      t.tarikh_hingga !== t.tarikh_dari
                        ? ` – ${formatTarikh(t.tarikh_hingga)}`
                        : ''
                    }`
                  : ''}
              </td>
              <td>{t?.penginapan ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <RingkasanPerjalanan p={p} />

      {/* B2 */}
      {p.lawatan_berperingkat && (
        <table style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <td className="tajuk-bahagian" colSpan={4}>
                B2. Maklumat Lawatan Berperingkat
              </td>
            </tr>
            <tr>
              <th style={{ width: '5%' }}>Bil</th>
              <th>Keterangan peringkat</th>
              <th style={{ width: '25%' }}>Tarikh</th>
              <th style={{ width: '15%' }}>Bil. murid</th>
            </tr>
          </thead>
          <tbody>
            {b.peringkat.map((r, i) => (
              <tr key={r.id}>
                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                <td>{r.keterangan}</td>
                <td>
                  {formatTarikh(r.tarikh_dari)} – {formatTarikh(r.tarikh_hingga)}
                </td>
                <td style={{ textAlign: 'center' }}>{r.bil_murid}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Bahagian C ─────────────────────────────────────────── */}
      <table style={{ marginTop: 8 }} className="elak-pecah">
        <tbody>
          <tr>
            <td className="tajuk-bahagian" colSpan={3}>
              C1. Maklumat Sumber Kewangan
            </td>
          </tr>
          <tr>
            <td style={{ width: '8%', textAlign: 'center' }}>i</td>
            <td>Kutipan daripada murid</td>
            <td style={{ width: '25%', textAlign: 'right' }}>
              {formatWang(Number(p.kutipan_murid))}
            </td>
          </tr>
          <tr>
            <td style={{ textAlign: 'center' }}>ii</td>
            <td>Kutipan daripada guru / anggota rombongan</td>
            <td style={{ textAlign: 'right' }}>
              {formatWang(Number(p.kutipan_guru))}
            </td>
          </tr>
          <tr>
            <td style={{ textAlign: 'center' }}>iii</td>
            <td>
              Sumber kewangan lain
              {p.sumber_lain_nota ? ` — ${p.sumber_lain_nota}` : ''}
            </td>
            <td style={{ textAlign: 'right' }}>
              {formatWang(Number(p.sumber_lain))}
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ fontWeight: 700, textAlign: 'right' }}>
              JUMLAH A
            </td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>
              {formatWang(jumlahA)}
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ marginTop: 8 }} className="elak-pecah">
        <thead>
          <tr>
            <td className="tajuk-bahagian" colSpan={4}>
              C2. Penaja Lawatan
            </td>
          </tr>
          <tr>
            <th style={{ width: '5%' }}>Bil</th>
            <th>Nama penaja</th>
            <th style={{ width: '30%' }}>Jenis tajaan</th>
            <th style={{ width: '20%' }}>Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {(b.penaja.length > 0 ? b.penaja : [null]).map((x, i) => (
            <tr key={x?.id ?? `kosong-${i}`}>
              <td style={{ textAlign: 'center' }}>{i + 1}</td>
              <td>{x?.nama_penaja ?? ''}</td>
              <td>{x?.jenis_tajaan ?? ''}</td>
              <td style={{ textAlign: 'right' }}>
                {x ? formatWang(Number(x.jumlah)) : ''}
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} style={{ fontWeight: 700, textAlign: 'right' }}>
              JUMLAH B
            </td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>
              {formatWang(jumlahB)}
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ fontWeight: 700, textAlign: 'right' }}>
              JUMLAH KESELURUHAN (A + B)
            </td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>
              {formatWang(jumlahA + jumlahB)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Bahagian D ─────────────────────────────────────────── */}
      <table style={{ marginTop: 8 }} className="elak-pecah pecah-halaman">
        <tbody>
          <tr>
            <td className="tajuk-bahagian" colSpan={4}>
              D1. Ketua Rombongan
            </td>
          </tr>
          <tr>
            <td style={{ width: '22%' }}>Nama</td>
            <td colSpan={3}>{ketua?.nama ?? ''}</td>
          </tr>
          <tr>
            <td>No. kad pengenalan</td>
            <td style={{ width: '28%' }}>{ketua?.kp ?? ''}</td>
            <td style={{ width: '18%' }}>No. pasport</td>
            <td>{ketua?.pasport ?? ''}</td>
          </tr>
          <tr>
            <td>Jawatan</td>
            <td>{ketua?.jawatan ?? ''}</td>
            <td>No. telefon</td>
            <td>{ketua?.telefon ?? ''}</td>
          </tr>
          <tr>
            <td>Alamat</td>
            <td colSpan={3}>{ketua?.alamat ?? ''}</td>
          </tr>
        </tbody>
      </table>

      <table style={{ marginTop: 8 }}>
        <tbody>
          <tr>
            <td className="tajuk-bahagian" colSpan={4}>
              D2. Senarai Anggota Rombongan
            </td>
          </tr>
          <tr>
            <td style={{ width: '40%' }}>Bilangan murid</td>
            <td style={{ width: '10%', textAlign: 'center' }}>{p.bil_murid}</td>
            <td style={{ width: '40%' }}>Bilangan guru pengiring</td>
            <td style={{ width: '10%', textAlign: 'center' }}>{p.bil_guru}</td>
          </tr>
          <tr>
            <td>Bilangan bukan guru (ibu bapa / individu)</td>
            <td style={{ textAlign: 'center' }}>{p.bil_bukan_guru}</td>
            <td style={{ fontWeight: 700 }}>JUMLAH ANGGOTA ROMBONGAN</td>
            <td style={{ textAlign: 'center', fontWeight: 700 }}>
              {p.bil_murid + p.bil_guru + p.bil_bukan_guru}
            </td>
          </tr>
        </tbody>
      </table>

      {(['GURU_PENGIRING', 'BUKAN_MURID', 'ANGGOTA_KESELAMATAN'] as const).map(
        (kat) => {
          const senarai = b.peserta.filter((x) => x.kategori === kat)
          if (senarai.length === 0) return null
          return (
            <table key={kat} style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <td className="tajuk-bahagian" colSpan={4}>
                    {LABEL_PESERTA[kat]}
                  </td>
                </tr>
                <tr>
                  <th style={{ width: '5%' }}>Bil</th>
                  <th>Nama</th>
                  <th style={{ width: '25%' }}>No. KP</th>
                  <th style={{ width: '22%' }}>Telefon</th>
                </tr>
              </thead>
              <tbody>
                {senarai.map((x, i) => (
                  <tr key={x.id}>
                    <td style={{ textAlign: 'center' }}>{i + 1}</td>
                    <td>{x.nama}</td>
                    <td>{x.kp ?? ''}</td>
                    <td>{x.telefon ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        },
      )}

      <p style={{ fontSize: '9pt', marginTop: 4, fontStyle: 'italic' }}>
        Senarai penuh murid dan anggota rombongan dilampirkan berasingan mengikut
        kategori, bersama Lampiran B (borang kebenaran ibu bapa dan pengesahan
        kesihatan murid).
      </p>

      {/* ── Bahagian E ─────────────────────────────────────────── */}
      <table style={{ marginTop: 8 }} className="elak-pecah">
        <thead>
          <tr>
            <td className="tajuk-bahagian" colSpan={4}>
              E. Nama Guru Yang Dilantik Mengutip dan Menggunakan Wang
            </td>
          </tr>
          <tr>
            <th style={{ width: '5%' }}>Bil</th>
            <th>Nama</th>
            <th style={{ width: '25%' }}>No. KP</th>
            <th style={{ width: '22%' }}>Telefon</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const senarai = b.peserta.filter(
              (x) => x.kategori === 'PEMUNGUT_BAYARAN',
            )
            const baris = senarai.length > 0 ? senarai : [null, null]
            return baris.map((x, i) => (
              <tr key={x?.id ?? `kosong-${i}`}>
                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                <td>{x?.nama ?? ''}</td>
                <td>{x?.kp ?? ''}</td>
                <td>{x?.telefon ?? ''}</td>
              </tr>
            ))
          })()}
        </tbody>
      </table>

      {/* ── Bahagian F ─────────────────────────────────────────── */}
      <table style={{ marginTop: 8 }} className="elak-pecah">
        <tbody>
          <tr>
            <td className="tajuk-bahagian">
              F. Ulasan Pengetua atau Guru Besar
            </td>
          </tr>
          <tr>
            <td style={{ height: 70 }}>
              <div style={{ marginBottom: 6 }}>
                <Pangkah ditanda={sudahDihantar} /> Disokong &nbsp;&nbsp;&nbsp;
                <Pangkah ditanda={false} /> Tidak disokong
              </div>
              <div style={{ fontSize: '9.5pt' }}>Ulasan:</div>
              {/* Dibekukan semasa dihantar; sebelum itu, profil semasa sekolah */}
              <BlokTandatangan
                nama={p.nama_guru_besar ?? b.sekolah.nama_guru_besar}
                jawatan="Pengetua / Guru Besar"
                tarikh={sudahDihantar ? formatTarikh(p.dihantar_pada) : undefined}
                tandatangan={url(p.kunci_tandatangan_gb)}
                cop={url(p.kunci_cop_sekolah)}
              />
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Bahagian G ─────────────────────────────────────────── */}
      <BahagianPelulus
        kod="G"
        tajuk="G. Ulasan Penolong Pendaftar (Pegawai Pendidikan Daerah) — Lawatan Dalam Daerah"
        nota="Jika program dalam daerah, proses kelulusan tamat di sini."
        kelulusan={pengesahBagi('G')}
        penyemak={penyemakBagi('MENUNGGU_PPD_SEMAK')}
        url={url}
      />

      {/* ── Bahagian H ─────────────────────────────────────────── */}
      <BahagianPelulus
        kod="H"
        tajuk="H. Ulasan Pendaftar (Pengarah Pendidikan Negeri) — Lawatan Antara Daerah / Antara Negeri"
        nota="Jika lawatan antara daerah atau antara negeri, proses kelulusan tamat di sini. Tidak perlu memanjangkan permohonan kepada KPM."
        kelulusan={pengesahBagi('H')}
        penyemak={penyemakBagi('MENUNGGU_JPN_SEMAK')}
        url={url}
      />

      {/* ── Bahagian I ─────────────────────────────────────────── */}
      <table style={{ marginTop: 8 }} className="elak-pecah">
        <tbody>
          <tr>
            <td className="tajuk-bahagian">
              I. Pengecualian Pelulus Berkaitan Nisbah Lawatan Murid — Jadual Keempat
            </td>
          </tr>
          <tr>
            <td style={{ minHeight: 50 }}>
              {p.justifikasi_nisbah ?? ''}
              <div style={{ fontSize: '9pt', marginTop: 6, fontStyle: 'italic' }}>
                Pelulus boleh menentukan had pengecualian nisbah pengiring murid
                kepada murid berdasarkan Jadual Keempat sekiranya difikirkan
                wajar dan suai manfaat.
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Bahagian J ─────────────────────────────────────────── */}
      {p.kategori === 'LUAR_NEGARA' && (
        <BahagianPelulus
          kod="J"
          tajuk="J. Ulasan Ketua Bahagian — Lawatan Luar Negara"
          nota="Permohonan perlu diangkat kepada Ketua Pendaftar dengan mematuhi prosedur operasi standard yang sedang berkuat kuasa."
          kelulusan={pengesahBagi('J')}
          url={url}
        />
      )}

      <p style={{ fontSize: '9pt', marginTop: 12, textAlign: 'center' }}>
        Borang ini hendaklah disediakan dalam <strong>empat (4) salinan</strong>.
      </p>
      <p style={{ fontSize: '8.5pt', marginTop: 4, textAlign: 'center', color: '#444' }}>
        Dijana oleh sistem eLAWATAN, JPN Perak · {formatTarikh(new Date().toISOString())}
        {p.no_rujukan ? ` · ${p.no_rujukan}` : ''}
      </p>
    </div>
  )
}

type RekodTindakan = {
  nama_pegawai: string
  jawatan_pegawai: string | null
  catatan: string | null
  tarikh_tindakan: string
  kunci_tandatangan: string | null
  kunci_cop: string | null
  pintasan_admin: boolean
}

function BahagianPelulus({
  kod,
  tajuk,
  nota,
  kelulusan,
  penyemak,
  url,
}: {
  kod: string
  tajuk: string
  nota: string
  kelulusan: RekodTindakan | undefined
  penyemak?: RekodTindakan | undefined
  url: Url
}) {
  return (
    <table style={{ marginTop: 8 }} className="elak-pecah">
      <tbody>
        <tr>
          <td className="tajuk-bahagian" colSpan={2}>{tajuk}</td>
        </tr>
        <tr>
          <td style={{ height: 78, width: penyemak !== undefined ? '62%' : undefined }}
              colSpan={penyemak !== undefined ? 1 : 2}>
            <div style={{ marginBottom: 6 }}>
              <Pangkah ditanda={!!kelulusan} /> Disokong / Diluluskan
              &nbsp;&nbsp;&nbsp;
              <Pangkah ditanda={false} /> Tidak disokong
            </div>
            <div style={{ fontSize: '9.5pt' }}>
              Ulasan: {kelulusan?.catatan ?? ''}
            </div>
            <BlokTandatangan
              nama={kelulusan?.nama_pegawai}
              jawatan={kelulusan?.jawatan_pegawai}
              tarikh={kelulusan ? formatTarikh(kelulusan.tarikh_tindakan) : undefined}
              tandatangan={url(kelulusan?.kunci_tandatangan)}
              cop={url(kelulusan?.kunci_cop)}
            />
            {kelulusan?.pintasan_admin && (
              <div style={{ fontSize: '8.5pt', fontStyle: 'italic' }}>
                (Direkod oleh pentadbir sistem — tandatangan tidak dicetak)
              </div>
            )}
            <div style={{ fontSize: '8.5pt', marginTop: 6, fontStyle: 'italic' }}>
              Nota ({kod}): {nota}
            </div>
          </td>
          {penyemak !== undefined && (
            <td style={{ verticalAlign: 'top' }}>
              <div style={{ fontSize: '9.5pt', fontWeight: 700 }}>Disemak oleh</div>
              <BlokTandatangan
                label="Penyemak"
                nama={penyemak?.nama_pegawai}
                jawatan={penyemak?.jawatan_pegawai}
                tarikh={penyemak ? formatTarikh(penyemak.tarikh_tindakan) : undefined}
                tandatangan={url(penyemak?.kunci_tandatangan)}
                cop={url(penyemak?.kunci_cop)}
                tanpaCop
              />
            </td>
          )}
        </tr>
      </tbody>
    </table>
  )
}
