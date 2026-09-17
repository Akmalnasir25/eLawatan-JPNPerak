import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { BingkaiCetak, gunaCetak, ImejTandatangan } from './rangka'
import { dapatTetapan } from '@/lib/api'
import { URL_SISTEM } from '@/lib/supabase'
import { LABEL_KATEGORI } from '@/lib/istilah'
import { formatTarikh } from '@/lib/guna'
import { LogoRasmi } from '@/komponen/LogoRasmi'

// Format surat rasmi sektor awam: kepala surat berlogo, "Ruj. Kami" dan
// tarikh di kanan, perenggan bernombor, slogan, tandatangan, dan s.k.

const kecil: React.CSSProperties = { fontSize: '9pt', lineHeight: 1.35 }

/** "PPD Kinta Utara" → "PEJABAT PENDIDIKAN DAERAH KINTA UTARA" */
const namaPenuhPpd = (n: string) =>
  n.replace(/^PPD\s+/i, 'Pejabat Pendidikan Daerah ').toUpperCase()

export function CetakSuratKelulusan() {
  const { id } = useParams<{ id: string }>()
  const { bundel: b, jpn, slogan, ralat, url } = gunaCetak(id)
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

  if (b && b.permohonan.status !== 'DILULUSKAN' && b.permohonan.status !== 'SELESAI') {
    return (
      <BingkaiCetak
        tajuk="Surat Kelulusan"
        ralat="Surat kelulusan hanya tersedia bagi permohonan yang telah diluluskan."
        sedia={false}
      >
        {null}
      </BingkaiCetak>
    )
  }

  const sedia = !!b && !!jpn && !!syarat
  if (!sedia || !b || !jpn || !syarat) {
    return (
      <BingkaiCetak tajuk="Surat Kelulusan Lawatan Murid Sekolah" ralat={ralat} sedia={false}>
        {null}
      </BingkaiCetak>
    )
  }

  const p = b.permohonan
  const olehPpd = p.kategori === 'DALAM_DAERAH'
  const akhir = [...b.kelulusan].filter((k) => k.tindakan === 'SOKONG').pop()
  const ketua = b.peserta.find((x) => x.kategori === 'KETUA_ROMBONGAN')
  const kategori = p.kategori ? LABEL_KATEGORI[p.kategori] : '—'

  // Lawatan Dalam Daerah diluluskan dan dikeluarkan oleh PPD (Bahagian G);
  // selainnya oleh JPN (Bahagian H) atau selepas sokongan KPM.
  const pengeluar = olehPpd
    ? {
        nama: namaPenuhPpd(b.ppd?.nama ?? p.kod_ppd),
        induk: jpn.nama,
        alamat: '',
        telefon: b.ppd?.telefon ?? '',
        faks: '',
        emel: b.ppd?.emel ?? '',
        laman: '',
      }
    : {
        nama: jpn.nama.toUpperCase(),
        induk: jpn.kementerian,
        alamat: jpn.alamat,
        telefon: jpn.telefon,
        faks: jpn.faks,
        emel: jpn.emel,
        laman: jpn.laman_web,
      }

  const kontak = [
    ['Telefon', pengeluar.telefon],
    ['Faks', pengeluar.faks],
    ['E-mel', pengeluar.emel],
    ['Laman Web', pengeluar.laman.replace(/^https?:\/\//, '')],
  ].filter(([, v]) => v)

  const tanpaSempadan: React.CSSProperties = { border: 0, padding: '1px 0' }

  return (
    <BingkaiCetak tajuk="Surat Kelulusan Lawatan Murid Sekolah" ralat={ralat} sedia>
      <div className="borang-rasmi" style={{ fontSize: '11pt' }}>
        {/* ── Kepala surat ───────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            gap: 14,
            alignItems: 'center',
            paddingBottom: 8,
            borderBottom: '2.5px solid #000',
          }}
        >
          <LogoRasmi varian="penuh" saiz={80} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '13pt', letterSpacing: '0.02em', lineHeight: 1.2 }}>
              {pengeluar.nama}
            </div>
            <div style={{ ...kecil, fontWeight: 600, textTransform: 'uppercase' }}>
              {pengeluar.induk}
            </div>
            {pengeluar.alamat && <div style={kecil}>{pengeluar.alamat}</div>}
          </div>
          {kontak.length > 0 && (
            <table style={{ width: 'auto' }}>
              <tbody>
                {kontak.map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ ...tanpaSempadan, paddingRight: 6, fontSize: '9pt', whiteSpace: 'nowrap' }}>{k}</td>
                    <td style={{ ...tanpaSempadan, fontSize: '9pt', whiteSpace: 'nowrap' }}>: {v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ borderBottom: '0.75px solid #000', marginTop: 2 }} />

        {/* ── Penerima, rujukan dan tarikh ─────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, gap: 16 }}>
          <div style={{ paddingTop: 30 }}>
            <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>Pengetua / Guru Besar</div>
            <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>{b.sekolah.nama}</div>
            {[
              b.sekolah.alamat,
              [b.sekolah.poskod, b.sekolah.bandar].filter(Boolean).join(' '),
              b.sekolah.negeri,
            ]
              .filter(Boolean)
              .map((l, i) => (
                <div key={i} style={{ textTransform: 'uppercase' }}>{l}</div>
              ))}
          </div>
          <div style={{ textAlign: 'right' }}>
            <table style={{ width: 'auto', marginLeft: 'auto' }}>
              <tbody>
                <tr>
                  <td style={{ ...tanpaSempadan, paddingRight: 6, textAlign: 'left' }}>Ruj. Kami</td>
                  <td style={{ ...tanpaSempadan, textAlign: 'left' }}>: {p.no_rujukan}</td>
                </tr>
                <tr>
                  <td style={{ ...tanpaSempadan, paddingRight: 6, textAlign: 'left' }}>Tarikh</td>
                  <td style={{ ...tanpaSempadan, textAlign: 'left' }}>
                    : {formatTarikh(p.diluluskan_pada ?? new Date().toISOString())}
                  </td>
                </tr>
              </tbody>
            </table>
            {qr && (
              <div style={{ display: 'inline-block', textAlign: 'center', marginTop: 6 }}>
                <img src={qr} alt="Kod QR pengesahan" style={{ width: 78, height: 78 }} />
                <div style={{ fontSize: '7pt' }}>Kod pengesahan</div>
                <div style={{ fontSize: '8pt', fontWeight: 700, letterSpacing: '0.1em' }}>{b.kodQr}</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>Tuan/Puan,</div>

        <div style={{ marginTop: 12, fontWeight: 700, textTransform: 'uppercase' }}>
          Kelulusan Permohonan Lawatan Murid Sekolah ({kategori})
        </div>
        <div style={{ borderBottom: '1px solid #000', marginTop: 2 }} />

        <p style={{ marginTop: 12, textAlign: 'justify' }}>
          Dengan segala hormatnya perkara di atas adalah dirujuk.
        </p>

        <p style={{ marginTop: 10, textAlign: 'justify', display: 'flex', gap: 14 }}>
          <span>2.</span>
          <span>
            Sukacita dimaklumkan bahawa permohonan lawatan murid sekolah yang dikemukakan
            oleh pihak tuan/puan adalah <strong>DILULUSKAN</strong> menurut Surat Pekeliling
            Ikhtisas Kementerian Pendidikan Malaysia Bilangan 9 Tahun 2023 dan Peraturan
            Lawatan Sekolah 1957, dengan butiran seperti berikut:
          </span>
        </p>

        <table style={{ marginTop: 10, marginLeft: 28, width: 'calc(100% - 28px)' }}>
          <tbody>
            {[
              ['Kategori lawatan', kategori],
              ['Tujuan lawatan', p.tujuan],
              ['Tempat dilawati', b.tempat.map((t) => t.tempat).filter(Boolean).join('; ')],
              [
                'Tarikh lawatan',
                `${formatTarikh(p.tarikh_mula)}${
                  p.tarikh_tamat !== p.tarikh_mula ? ` hingga ${formatTarikh(p.tarikh_tamat)}` : ''
                }`,
              ],
              ['Ketua rombongan', ketua?.nama ?? '—'],
              [
                'Bilangan peserta',
                `${p.bil_murid} murid, ${p.bil_guru} guru pengiring${
                  p.bil_bukan_guru > 0 ? `, ${p.bil_bukan_guru} bukan guru` : ''
                }`,
              ],
            ].map(([k, v]) => (
              <tr key={k}>
                <td style={{ width: '32%', fontWeight: 600 }}>{k}</td>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ marginTop: 12, textAlign: 'justify', display: 'flex', gap: 14 }}>
          <span>3.</span>
          <span>Kelulusan ini adalah tertakluk kepada syarat-syarat berikut:</span>
        </p>
        <ol style={{ marginTop: 4, paddingLeft: 56, listStyle: 'lower-roman' }}>
          {syarat.map((s, i) => (
            <li key={i} style={{ marginTop: 3, paddingLeft: 4, textAlign: 'justify' }}>{s}</li>
          ))}
        </ol>

        <p style={{ marginTop: 12, textAlign: 'justify', display: 'flex', gap: 14 }}>
          <span>4.</span>
          <span>
            Kerjasama dan perhatian pihak tuan/puan dalam memastikan keselamatan murid
            sepanjang tempoh lawatan amatlah dihargai.
          </span>
        </p>

        <p style={{ marginTop: 14 }}>Sekian, terima kasih.</p>

        <div style={{ marginTop: 10 }}>
          {slogan.map((s) => (
            <div key={s} style={{ fontWeight: 700 }}>&ldquo;{s.toUpperCase()}&rdquo;</div>
          ))}
        </div>

        <p style={{ marginTop: 12 }}>Saya yang menjalankan amanah,</p>

        <div className="elak-pecah" style={{ width: '60%' }}>
          <ImejTandatangan tandatangan={url(akhir?.kunci_tandatangan)} cop={url(akhir?.kunci_cop)} />
          <div style={{ fontWeight: 700, marginTop: 2 }}>
            ({akhir?.nama_pegawai ? akhir.nama_pegawai.toUpperCase() : '..........................................'})
          </div>
          {akhir?.jawatan_pegawai && <div>{akhir.jawatan_pegawai}</div>}
          <div>{olehPpd ? namaPenuhPpd(b.ppd?.nama ?? '') : jpn.nama}</div>
        </div>

        <div className="elak-pecah" style={{ marginTop: 18, ...kecil }}>
          <div style={{ fontWeight: 700 }}>s.k.</div>
          <ol style={{ paddingLeft: 22, listStyle: 'decimal' }}>
            {!olehPpd && b.ppd && (
              <li>Pegawai Pendidikan Daerah, {b.ppd.nama.replace(/^PPD\s+/i, '')}</li>
            )}
            <li>Fail rujukan {p.no_rujukan}</li>
          </ol>
        </div>

        <div
          style={{
            marginTop: 18,
            borderTop: '0.75px solid #666',
            paddingTop: 5,
            fontSize: '7.5pt',
            color: '#333',
            textAlign: 'center',
          }}
        >
          Surat ini dijana oleh sistem eLAWATAN. Kesahihannya boleh disemak di{' '}
          {URL_SISTEM.replace(/^https?:\/\//, '')}/sah menggunakan kod pengesahan{' '}
          <strong>{b.kodQr}</strong> atau kod QR di atas.
        </div>
      </div>
    </BingkaiCetak>
  )
}
