import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { BingkaiCetak, gunaCetak } from './rangka'
import { dapatTetapan } from '@/lib/api'
import { URL_SISTEM } from '@/lib/supabase'
import { LABEL_KATEGORI } from '@/lib/istilah'
import { formatTarikh } from '@/lib/guna'

export function CetakSuratKelulusan() {
  const { id } = useParams<{ id: string }>()
  const { bundel: b, jpn, ralat } = gunaCetak(id)
  const [syarat, setSyarat] = useState<string[] | null>(null)
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    void dapatTetapan<string[]>('syarat_kelulusan').then((s) => setSyarat(s ?? []))
  }, [])

  useEffect(() => {
    if (!b?.kodQr) return
    QRCode.toDataURL(`${URL_SISTEM}/sah/${b.kodQr}`, {
      margin: 1,
      width: 320,
      errorCorrectionLevel: 'M',
    })
      .then(setQr)
      .catch(() => setQr(null))
  }, [b?.kodQr])

  const sedia = !!b && !!jpn && !!syarat

  if (b && b.permohonan.status !== 'DILULUSKAN' && b.permohonan.status !== 'SELESAI') {
    return (
      <BingkaiCetak tajuk="Surat Kelulusan" ralat="Surat kelulusan hanya tersedia bagi permohonan yang telah diluluskan." sedia={false}>
        {null}
      </BingkaiCetak>
    )
  }

  return (
    <BingkaiCetak tajuk="Surat Kelulusan Lawatan Murid Sekolah" ralat={ralat} sedia={sedia}>
      {sedia && b && jpn && syarat && (
        <div className="borang-rasmi">
          {/* Kepala surat */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: '13pt', letterSpacing: '0.02em' }}>
              {jpn.nama.toUpperCase()}
            </div>
            <div style={{ fontSize: '10pt', marginTop: 2 }}>{jpn.sektor}</div>
            <div style={{ fontSize: '9.5pt', marginTop: 2 }}>{jpn.alamat}</div>
            <div style={{ fontSize: '9.5pt' }}>
              Tel: {jpn.telefon} · E-mel: {jpn.emel}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
            <div style={{ fontSize: '10pt' }}>
              <div>
                <strong>Rujukan kami:</strong> {b.permohonan.no_rujukan}
              </div>
              <div>
                <strong>Tarikh:</strong>{' '}
                {formatTarikh(b.permohonan.diluluskan_pada ?? new Date().toISOString())}
              </div>
            </div>
            {qr && (
              <div style={{ textAlign: 'center' }}>
                <img src={qr} alt="Kod QR pengesahan" style={{ width: 84, height: 84 }} />
                <div style={{ fontSize: '7.5pt', marginTop: 2 }}>
                  Sahkan di {URL_SISTEM.replace(/^https?:\/\//, '')}/sah
                </div>
                <div style={{ fontSize: '8pt', fontWeight: 700, letterSpacing: '0.08em' }}>
                  {b.kodQr}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16, fontSize: '10.5pt' }}>
            <div>Pengetua / Guru Besar,</div>
            <div style={{ fontWeight: 700 }}>{b.sekolah.nama}</div>
            <div>
              {[b.sekolah.alamat, b.sekolah.poskod, b.sekolah.bandar, b.sekolah.negeri]
                .filter(Boolean)
                .join(', ')}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>Tuan/Puan,</div>

          <div
            style={{
              marginTop: 12,
              fontWeight: 700,
              textDecoration: 'underline',
              textTransform: 'uppercase',
              fontSize: '11pt',
            }}
          >
            Kelulusan Permohonan Lawatan Murid Sekolah
          </div>

          <p style={{ marginTop: 12, textAlign: 'justify' }}>
            Dengan segala hormatnya perkara di atas adalah dirujuk.
          </p>

          <p style={{ marginTop: 8, textAlign: 'justify' }}>
            2. Sukacita dimaklumkan bahawa permohonan lawatan murid sekolah
            yang dikemukakan oleh pihak tuan/puan adalah{' '}
            <strong>DILULUSKAN</strong> menurut Surat Pekeliling Ikhtisas
            Kementerian Pendidikan Malaysia Bilangan 9 Tahun 2023 dan Peraturan
            Lawatan Sekolah 1957, dengan butiran seperti berikut:
          </p>

          <table style={{ marginTop: 10 }}>
            <tbody>
              <tr>
                <td style={{ width: '30%' }}>Kategori lawatan</td>
                <td>
                  {b.permohonan.kategori
                    ? LABEL_KATEGORI[b.permohonan.kategori]
                    : '—'}
                </td>
              </tr>
              <tr>
                <td>Tujuan lawatan</td>
                <td>{b.permohonan.tujuan}</td>
              </tr>
              <tr>
                <td>Tempat dilawati</td>
                <td>
                  {b.tempat.map((t) => t.tempat).filter(Boolean).join('; ')}
                </td>
              </tr>
              <tr>
                <td>Tarikh lawatan</td>
                <td>
                  {formatTarikh(b.permohonan.tarikh_mula)}
                  {b.permohonan.tarikh_tamat !== b.permohonan.tarikh_mula
                    ? ` hingga ${formatTarikh(b.permohonan.tarikh_tamat)}`
                    : ''}
                </td>
              </tr>
              <tr>
                <td>Ketua rombongan</td>
                <td>
                  {b.peserta.find((x) => x.kategori === 'KETUA_ROMBONGAN')?.nama ??
                    '—'}
                </td>
              </tr>
              <tr>
                <td>Bilangan peserta</td>
                <td>
                  {b.permohonan.bil_murid} murid, {b.permohonan.bil_guru} guru
                  pengiring
                  {b.permohonan.bil_bukan_guru > 0
                    ? `, ${b.permohonan.bil_bukan_guru} bukan guru`
                    : ''}
                </td>
              </tr>
            </tbody>
          </table>

          <p style={{ marginTop: 12, textAlign: 'justify' }}>
            3. Kelulusan ini adalah tertakluk kepada syarat-syarat berikut:
          </p>

          <ol style={{ marginTop: 6, paddingLeft: 24 }}>
            {syarat.map((s, i) => (
              <li key={i} style={{ marginTop: 4, textAlign: 'justify' }}>
                {s}
              </li>
            ))}
          </ol>

          <p style={{ marginTop: 12, textAlign: 'justify' }}>
            4. Kerjasama dan perhatian pihak tuan/puan dalam memastikan
            keselamatan murid sepanjang tempoh lawatan amatlah dihargai.
          </p>

          <p style={{ marginTop: 14 }}>Sekian, terima kasih.</p>
          <p style={{ marginTop: 10, fontWeight: 700 }}>
            &ldquo;BERKHIDMAT UNTUK NEGARA&rdquo;
          </p>

          <p style={{ marginTop: 12 }}>Saya yang menjalankan amanah,</p>

          {(() => {
            const akhir = [...b.kelulusan]
              .filter((k) => k.tindakan === 'SOKONG')
              .pop()
            return (
              <div style={{ marginTop: 44 }}>
                <div style={{ borderTop: '1px solid #000', width: '62%', paddingTop: 3 }}>
                  <div style={{ fontWeight: 700 }}>
                    {akhir?.nama_pegawai ?? '________________________'}
                  </div>
                  <div style={{ fontSize: '10pt' }}>
                    {akhir?.jawatan_pegawai ?? ''}
                  </div>
                  <div style={{ fontSize: '10pt' }}>
                    {b.permohonan.kategori === 'DALAM_DAERAH'
                      ? (b.ppd?.nama ?? '')
                      : jpn.nama}
                  </div>
                </div>
              </div>
            )
          })()}

          <div
            style={{
              marginTop: 24,
              borderTop: '1px solid #999',
              paddingTop: 6,
              fontSize: '8pt',
              color: '#444',
              textAlign: 'center',
            }}
          >
            Surat ini dijana oleh sistem eLAWATAN dan sah tanpa tandatangan
            basah. Kesahihannya boleh disemak dalam talian menggunakan kod QR
            atau kod pengesahan <strong>{b.kodQr}</strong> di{' '}
            {URL_SISTEM}/sah
          </div>
        </div>
      )}
    </BingkaiCetak>
  )
}
