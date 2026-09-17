import { useParams } from 'react-router-dom'
import { BingkaiCetak, BlokTandatangan, gunaCetak, Pangkah } from './rangka'
import { LABEL_KATEGORI } from '@/lib/istilah'
import { formatTarikh } from '@/lib/guna'

export function CetakLampiranG() {
  const { id } = useParams<{ id: string }>()
  const { bundel: b, ralat, url } = gunaCetak(id)

  return (
    <BingkaiCetak
      tajuk="Lampiran G — Borang Laporan Lawatan Murid Sekolah"
      ralat={ralat}
      sedia={!!b}
    >
      {b && (
        <div className="borang-rasmi">
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: '9.5pt' }}>LAMPIRAN G</div>
            <div style={{ fontWeight: 700, fontSize: '12pt', marginTop: 4 }}>
              BORANG LAPORAN LAWATAN MURID SEKOLAH
            </div>
            <div style={{ fontSize: '9pt', marginTop: 2 }}>
              Dikemukakan dalam tempoh tujuh (7) hari selepas lawatan tamat
            </div>
            {b.permohonan.no_rujukan && (
              <div style={{ fontSize: '9.5pt', marginTop: 6, fontWeight: 700 }}>
                No. Rujukan: {b.permohonan.no_rujukan}
              </div>
            )}
          </div>

          <table className="elak-pecah">
            <tbody>
              <tr>
                <td className="tajuk-bahagian" colSpan={4}>
                  1. Maklumat Lawatan
                </td>
              </tr>
              <tr>
                <td style={{ width: '25%' }}>Sekolah</td>
                <td colSpan={3}>
                  {b.sekolah.nama} ({b.sekolah.kod_sekolah})
                </td>
              </tr>
              <tr>
                <td>Kategori</td>
                <td style={{ width: '30%' }}>
                  {b.permohonan.kategori
                    ? LABEL_KATEGORI[b.permohonan.kategori]
                    : '—'}
                </td>
                <td style={{ width: '15%' }}>Tarikh</td>
                <td>
                  {formatTarikh(b.permohonan.tarikh_mula)}
                  {b.permohonan.tarikh_tamat !== b.permohonan.tarikh_mula
                    ? ` – ${formatTarikh(b.permohonan.tarikh_tamat)}`
                    : ''}
                </td>
              </tr>
              <tr>
                <td>Tempat dilawati</td>
                <td colSpan={3}>
                  {b.tempat.map((t) => t.tempat).filter(Boolean).join('; ')}
                </td>
              </tr>
              <tr>
                <td>Tujuan</td>
                <td colSpan={3}>{b.permohonan.tujuan}</td>
              </tr>
              <tr>
                <td>Ketua rombongan</td>
                <td colSpan={3}>
                  {b.peserta.find((x) => x.kategori === 'KETUA_ROMBONGAN')?.nama ??
                    ''}
                </td>
              </tr>
            </tbody>
          </table>

          <table style={{ marginTop: 8 }} className="elak-pecah">
            <thead>
              <tr>
                <td className="tajuk-bahagian" colSpan={3}>
                  2. Kehadiran
                </td>
              </tr>
              <tr>
                <th>Kategori</th>
                <th style={{ width: '22%', textAlign: 'center' }}>Dipohon</th>
                <th style={{ width: '22%', textAlign: 'center' }}>Hadir</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Murid</td>
                <td style={{ textAlign: 'center' }}>{b.permohonan.bil_murid}</td>
                <td style={{ textAlign: 'center' }}>
                  {b.laporan?.bil_hadir_murid ?? ''}
                </td>
              </tr>
              <tr>
                <td>Guru pengiring</td>
                <td style={{ textAlign: 'center' }}>{b.permohonan.bil_guru}</td>
                <td style={{ textAlign: 'center' }}>
                  {b.laporan?.bil_hadir_guru ?? ''}
                </td>
              </tr>
              <tr>
                <td>Bukan guru</td>
                <td style={{ textAlign: 'center' }}>
                  {b.permohonan.bil_bukan_guru}
                </td>
                <td style={{ textAlign: 'center' }}>—</td>
              </tr>
            </tbody>
          </table>

          <table style={{ marginTop: 8 }}>
            <tbody>
              <tr>
                <td className="tajuk-bahagian">3. Ringkasan Pelaksanaan</td>
              </tr>
              <tr>
                <td style={{ height: 130, verticalAlign: 'top' }}>
                  {b.laporan?.ringkasan ?? ''}
                </td>
              </tr>
            </tbody>
          </table>

          <table style={{ marginTop: 8 }} className="elak-pecah">
            <tbody>
              <tr>
                <td className="tajuk-bahagian">4. Insiden</td>
              </tr>
              <tr>
                <td style={{ height: 96, verticalAlign: 'top' }}>
                  <div style={{ marginBottom: 6 }}>
                    <Pangkah ditanda={b.laporan?.ada_insiden === false} /> Tiada
                    insiden &nbsp;&nbsp;&nbsp;
                    <Pangkah ditanda={b.laporan?.ada_insiden === true} /> Ada
                    insiden
                  </div>
                  {b.laporan?.butiran_insiden ?? ''}
                </td>
              </tr>
            </tbody>
          </table>

          <table style={{ marginTop: 8 }} className="elak-pecah">
            <tbody>
              <tr>
                <td className="tajuk-bahagian">5. Cadangan Penambahbaikan</td>
              </tr>
              <tr>
                <td style={{ height: 90, verticalAlign: 'top' }}>
                  {b.laporan?.cadangan ?? ''}
                </td>
              </tr>
            </tbody>
          </table>

          <table style={{ marginTop: 10 }} className="elak-pecah">
            <tbody>
              <tr>
                <td className="tajuk-bahagian" style={{ width: '50%' }}>
                  Disediakan oleh Ketua Rombongan
                </td>
                <td className="tajuk-bahagian">
                  Disahkan oleh Pengetua / Guru Besar
                </td>
              </tr>
              <tr>
                <td style={{ height: 82, verticalAlign: 'top' }}>
                  <BlokTandatangan
                    nama={
                      b.peserta.find((x) => x.kategori === 'KETUA_ROMBONGAN')
                        ?.nama
                    }
                    jawatan="Ketua Rombongan"
                    tarikh={
                      b.laporan ? formatTarikh(b.laporan.dihantar_pada) : undefined
                    }
                  />
                </td>
                <td style={{ verticalAlign: 'top' }}>
                  <BlokTandatangan
                    nama={b.laporan?.nama_guru_besar ?? b.sekolah.nama_guru_besar}
                    jawatan="Pengetua / Guru Besar"
                    tarikh={b.laporan ? formatTarikh(b.laporan.dihantar_pada) : undefined}
                    tandatangan={url(b.laporan?.kunci_tandatangan_gb)}
                    cop={url(b.laporan?.kunci_cop_sekolah)}
                  />
                </td>
              </tr>
            </tbody>
          </table>

          <p
            style={{
              fontSize: '8.5pt',
              marginTop: 8,
              textAlign: 'center',
              color: '#444',
            }}
          >
            Dijana oleh sistem eLAWATAN, JPN Perak ·{' '}
            {formatTarikh(new Date().toISOString())}
          </p>
        </div>
      )}
    </BingkaiCetak>
  )
}
