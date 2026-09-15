import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BingkaiCetak, BlokTandatangan, gunaCetak, Pangkah } from './rangka'
import { dokumenDiperlukan, dapatTetapan } from '@/lib/api'
import { LABEL_KUMPULAN_DOKUMEN } from '@/lib/istilah'
import { formatHari, formatTarikh, hariLagi } from '@/lib/guna'
import type { JenisDokumen } from '@/lib/jenis'

export function CetakSenaraiSemak() {
  const { id } = useParams<{ id: string }>()
  const { bundel: b, ralat } = gunaCetak(id)
  const [perlu, setPerlu] = useState<JenisDokumen[] | null>(null)
  const [tempoh, setTempoh] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    if (!id) return
    void dokumenDiperlukan(id).then(setPerlu)
    void dapatTetapan<Record<string, number>>('tempoh_minimum').then(setTempoh)
  }, [id])

  return (
    <BingkaiCetak
      tajuk="Senarai Semak Permohonan Lawatan Murid Sekolah — BSS Pin.1/2023"
      ralat={ralat}
      sedia={!!b && !!perlu}
    >
      {b && perlu && <Isi b={b} perlu={perlu} tempoh={tempoh} />}
    </BingkaiCetak>
  )
}

function Isi({
  b,
  perlu,
  tempoh,
}: {
  b: NonNullable<ReturnType<typeof gunaCetak>['bundel']>
  perlu: JenisDokumen[]
  tempoh: Record<string, number> | null
}) {
  const p = b.permohonan
  const ketua = b.peserta.find((x) => x.kategori === 'KETUA_ROMBONGAN')
  const ada = (kod: string) => b.dokumen.some((d) => d.jenis_dokumen === kod)

  const tempohMin = p.kategori ? (tempoh?.[p.kategori] ?? 21) : 21
  const hariSebelum =
    p.dihantar_pada && p.tarikh_mula
      ? Math.round(
          (new Date(p.tarikh_mula).getTime() -
            new Date(p.dihantar_pada).getTime()) /
            86_400_000,
        )
      : (hariLagi(p.tarikh_mula) ?? 0)

  const kumpulan = [...new Set(perlu.map((d) => d.kumpulan))]
  let bil = 0

  return (
    <div className="borang-rasmi">
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: '9.5pt' }}>BSS Pin.1/2023</div>
        <div style={{ fontWeight: 700, fontSize: '12pt', marginTop: 4 }}>
          SENARAI SEMAK PERMOHONAN LAWATAN MURID SEKOLAH
        </div>
        <div style={{ fontSize: '9pt', marginTop: 2 }}>
          Jabatan Pendidikan Negeri Perak · Diisi oleh Ketua Rombongan
        </div>
      </div>

      {/* Kepala borang */}
      <table className="elak-pecah">
        <tbody>
          <tr>
            <td style={{ width: '25%' }}>Nama &amp; kod sekolah</td>
            <td colSpan={3}>
              {b.sekolah.nama} ({b.sekolah.kod_sekolah})
            </td>
          </tr>
          <tr>
            <td>Nama Ketua Rombongan</td>
            <td style={{ width: '30%' }}>{ketua?.nama ?? ''}</td>
            <td style={{ width: '15%' }}>No. KP</td>
            <td>{ketua?.kp ?? ''}</td>
          </tr>
          <tr>
            <td>No. telefon bimbit</td>
            <td colSpan={3}>{ketua?.telefon ?? ''}</td>
          </tr>
          <tr>
            <td>Tempat lawatan</td>
            <td colSpan={3}>
              {b.tempat.map((t) => t.tempat).filter(Boolean).join('; ') || ''}
            </td>
          </tr>
          <tr>
            <td>Tarikh / hari lawatan</td>
            <td colSpan={3}>
              {formatTarikh(p.tarikh_mula)} ({formatHari(p.tarikh_mula)})
              {p.tarikh_tamat && p.tarikh_tamat !== p.tarikh_mula
                ? ` hingga ${formatTarikh(p.tarikh_tamat)} (${formatHari(p.tarikh_tamat)})`
                : ''}
            </td>
          </tr>
          <tr>
            <td>Bilangan peserta</td>
            <td colSpan={3}>
              Guru: <strong>{p.bil_guru}</strong> &nbsp;·&nbsp; Murid:{' '}
              <strong>{p.bil_murid}</strong> &nbsp;·&nbsp; Bukan Guru:{' '}
              <strong>{p.bil_bukan_guru}</strong>
            </td>
          </tr>
          {p.no_rujukan && (
            <tr>
              <td>No. rujukan sistem</td>
              <td colSpan={3}>{p.no_rujukan}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Senarai perkara */}
      {kumpulan.map((k) => (
        <table key={k} style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <td className="tajuk-bahagian" colSpan={4}>
                {LABEL_KUMPULAN_DOKUMEN[k] ?? k}
              </td>
            </tr>
            <tr>
              <th style={{ width: '6%' }}>Bil</th>
              <th>Perkara</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Salinan</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Ada</th>
            </tr>
          </thead>
          <tbody>
            {perlu
              .filter((d) => d.kumpulan === k)
              .map((d) => {
                bil += 1
                return (
                  <tr key={d.kod}>
                    <td style={{ textAlign: 'center' }}>{bil}</td>
                    <td>
                      {d.nama}
                      {d.perlu_sah_kj && (
                        <span style={{ fontSize: '8.5pt', fontStyle: 'italic' }}>
                          {' '}
                          — perlu disahkan Ketua Jabatan
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>{d.bil_salinan}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>
                      {ada(d.kod) ? '✓' : '✗'}
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      ))}

      {/* Dokumen janaan sistem */}
      <table style={{ marginTop: 8 }} className="elak-pecah">
        <tbody>
          <tr>
            <td className="tajuk-bahagian" colSpan={3}>
              Dokumen Dijana Sistem
            </td>
          </tr>
          <tr>
            <td style={{ width: '6%', textAlign: 'center' }}>—</td>
            <td>Borang Permohonan Lawatan Murid Sekolah (Lampiran A)</td>
            <td style={{ width: '10%', textAlign: 'center', fontWeight: 700 }}>
              ✓
            </td>
          </tr>
        </tbody>
      </table>

      {/* Semakan tempoh */}
      <table style={{ marginTop: 8 }} className="elak-pecah">
        <tbody>
          <tr>
            <td className="tajuk-bahagian" colSpan={2}>
              Semakan Tempoh Permohonan
            </td>
          </tr>
          <tr>
            <td style={{ width: '60%' }}>
              Tempoh minimum bagi kategori ini
            </td>
            <td>
              <strong>{tempohMin} hari</strong> sebelum tarikh lawatan
            </td>
          </tr>
          <tr>
            <td>Tempoh sebenar permohonan dikemukakan</td>
            <td>
              <strong>{hariSebelum} hari</strong> sebelum tarikh lawatan{' '}
              <Pangkah ditanda={hariSebelum >= tempohMin} />
              {hariSebelum >= tempohMin ? 'Patuh' : 'Tidak patuh'}
            </td>
          </tr>
        </tbody>
      </table>

      <p style={{ fontSize: '8.5pt', marginTop: 6, fontStyle: 'italic' }}>
        Permohonan hendaklah dihantar tidak kurang 21 hari (Dalam Daerah),
        30 hari (Antara Daerah / Antara Negeri) atau 60 hari (Antarabangsa /
        Luar Negara) dari tarikh lawatan yang dipohon.
      </p>

      <table style={{ marginTop: 10 }} className="elak-pecah">
        <tbody>
          <tr>
            <td className="tajuk-bahagian">
              Pengesahan dan Semakan Pegawai Pendidikan Daerah
            </td>
          </tr>
          <tr>
            <td style={{ height: 76 }}>
              <BlokTandatangan jawatan="Pegawai Pendidikan Daerah" />
            </td>
          </tr>
        </tbody>
      </table>

      <p style={{ fontSize: '8.5pt', marginTop: 8, textAlign: 'center', color: '#444' }}>
        Ditanda automatik daripada data borang eLAWATAN ·{' '}
        {formatTarikh(new Date().toISOString())}
      </p>
    </div>
  )
}
