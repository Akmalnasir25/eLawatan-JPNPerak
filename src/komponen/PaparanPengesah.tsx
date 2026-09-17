import type { BundelPermohonan } from '@/lib/api'
import {
  LABEL_KATEGORI,
  LABEL_PENGANGKUTAN,
  LABEL_PERANAN,
  LABEL_STATUS,
  LABEL_TINDAKAN,
  PERINGKAT_SEMAK,
  SEMAKAN_BAGI_PENGESAH,
  labelSokong,
} from '@/lib/istilah'
import { formatMasa, formatTarikh, formatWang } from '@/lib/guna'
import { Baris, Mesej } from '@/komponen/ui'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from 'lucide-react'
import type { Peranan, Tindakan } from '@/lib/jenis'

/**
 * Paparan ringkas untuk pengesah (KPPD dan Pengarah JPN). Butiran penuh
 * telah disemak oleh penyemak; pengesah membaca maklumat umum dan
 * perakuan penyemak, kemudian bertindak.
 */
export function PaparanPengesah({
  b,
  peranan,
  pintasan,
  onTindakan,
  onPaparPenuh,
}: {
  b: BundelPermohonan
  peranan: Peranan
  /** Pentadbir bertindak bagi pihak pengesah. */
  pintasan: boolean
  onTindakan: (t: Tindakan) => void
  onPaparPenuh: () => void
}) {
  const p = b.permohonan
  const ketua = b.peserta.find((x) => x.kategori === 'KETUA_ROMBONGAN')
  const jumlahKos =
    Number(p.kutipan_murid) +
    Number(p.kutipan_guru) +
    Number(p.sumber_lain) +
    b.penaja.reduce((n, x) => n + Number(x.jumlah), 0)

  const peringkatSemak = SEMAKAN_BAGI_PENGESAH[p.status]
  const perakuan = [...b.kelulusan]
    .reverse()
    .find((k) => k.peringkat === peringkatSemak && k.tindakan === 'SOKONG')
  const terdahulu = b.kelulusan.filter((k) => k !== perakuan)

  const ciri = [
    p.ada_penginapan && 'Penginapan',
    p.ada_risiko_tinggi && 'Aktiviti berisiko tinggi',
    p.ada_aktiviti_air && 'Aktiviti air',
    p.anjuran_pihak_luar && `Anjuran pihak luar (${p.nama_penganjur_luar ?? '—'})`,
    p.ada_anggota_keselamatan && 'Pengiring anggota keselamatan',
    p.lawatan_berperingkat && 'Lawatan berperingkat',
  ].filter(Boolean) as string[]

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ── Maklumat umum ─────────────────────────────────────── */}
      <section className="kad">
        <div className="kad-tajuk">
          <h2>Maklumat Umum Permohonan</h2>
          <button type="button" className="btn-halus btn-kecil" onClick={onPaparPenuh}>
            <Eye className="h-3.5 w-3.5" aria-hidden />
            Lihat butiran penuh
          </button>
        </div>
        <div className="kad-isi">
          <dl>
            <Baris label="Sekolah">
              {b.sekolah.nama} ({b.sekolah.kod_sekolah})
              <span className="block text-xs text-slate-500">{b.ppd?.nama ?? p.kod_ppd}</span>
            </Baris>
            <Baris label="Kategori">{p.kategori ? LABEL_KATEGORI[p.kategori] : '—'}</Baris>
            <Baris label="Tujuan">{p.tujuan ?? '—'}</Baris>
            <Baris label="Tempat & tarikh">
              {b.tempat.length === 0 ? (
                '—'
              ) : (
                <ul className="space-y-1">
                  {b.tempat.map((t) => (
                    <li key={t.id}>
                      {t.tempat || '—'}
                      <span className="text-xs text-slate-500">
                        {' '}· {formatTarikh(t.tarikh_dari)}
                        {t.tarikh_hingga !== t.tarikh_dari && ` – ${formatTarikh(t.tarikh_hingga)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Baris>
            <Baris label="Peserta">
              <strong>{p.bil_murid + p.bil_guru + p.bil_bukan_guru}</strong> orang
              <span className="text-slate-500">
                {' '}({p.bil_murid} murid · {p.bil_guru} guru · {p.bil_bukan_guru} bukan guru)
              </span>
            </Baris>
            <Baris label="Ketua rombongan">
              {ketua ? `${ketua.nama}${ketua.telefon ? ` · ${ketua.telefon}` : ''}` : '—'}
            </Baris>
            <Baris label="Pengangkutan">
              {p.pengangkutan.map((x) => LABEL_PENGANGKUTAN[x]).join(', ') || '—'}
            </Baris>
            <Baris label="Ciri lawatan">
              {ciri.length === 0 ? (
                'Tiada'
              ) : (
                <span className="flex flex-wrap gap-1.5">
                  {ciri.map((c) => (
                    <span key={c} className="lencana bg-amber-50 text-amber-800 ring-amber-200">
                      {c}
                    </span>
                  ))}
                </span>
              )}
            </Baris>
            <Baris label="Jumlah kos">{formatWang(jumlahKos)}</Baris>
            <Baris label="Dokumen sokongan">{b.dokumen.length} fail dimuat naik</Baris>
          </dl>
          {p.justifikasi_nisbah && (
            <div className="mt-3">
              <Mesej jenis="amaran" tajuk="Pengecualian nisbah guru pengiring">
                {p.justifikasi_nisbah}
              </Mesej>
            </div>
          )}
        </div>
      </section>

      {/* ── Perakuan penyemak ─────────────────────────────────── */}
      <section className="kad">
        <div className="kad-tajuk">
          <h2 className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-biru-500" aria-hidden />
            Perakuan Penyemak
          </h2>
        </div>
        <div className="kad-isi">
          {!perakuan ? (
            <Mesej jenis="amaran">Tiada rekod perakuan penyemak bagi peringkat ini.</Mesej>
          ) : (
            <>
              <p className="text-sm text-slate-700">
                Diperakukan oleh <strong>{perakuan.nama_pegawai}</strong>
                {perakuan.jawatan_pegawai && `, ${perakuan.jawatan_pegawai}`}
                <span className="block text-xs text-slate-500">
                  {formatMasa(perakuan.tarikh_tindakan)}
                  {perakuan.pintasan_admin && ' · pintasan pentadbir'}
                </span>
              </p>
              {perakuan.semakan ? (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {perakuan.semakan.map((i) => (
                    <li key={i.kod} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                      {i.label}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 flex items-center gap-2 text-xs text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                  Diperakukan sebelum senarai semak diwajibkan.
                </p>
              )}
              {perakuan.catatan && (
                <p className="mt-4 rounded-lg bg-latar px-3 py-2.5 text-sm text-slate-700">
                  <span className="block text-xs font-semibold text-slate-500">Catatan penyemak</span>
                  {perakuan.catatan}
                </p>
              )}
            </>
          )}

          {terdahulu.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tindakan terdahulu
              </p>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {terdahulu.map((k) => (
                  <li key={k.id}>
                    <strong className="text-slate-800">
                      {k.tindakan !== 'SOKONG'
                        ? LABEL_TINDAKAN[k.tindakan]
                        : PERINGKAT_SEMAK.includes(k.peringkat)
                          ? 'Diperakukan'
                          : 'Disahkan'}
                    </strong>
                    {' '}· {k.nama_pegawai} ({LABEL_PERANAN[k.peranan]}) · {formatMasa(k.tarikh_tindakan)}
                    {k.catatan && <span className="block pl-3 text-slate-500">“{k.catatan}”</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ── Tindakan ──────────────────────────────────────────── */}
      <section className="kad border-2 border-biru-200">
        <div className="kad-isi">
          <p className="flex items-center gap-2 text-sm font-bold text-jata-900">
            {pintasan && <ShieldAlert className="h-4 w-4 text-amber-600" aria-hidden />}
            {pintasan
              ? `Pintasan pentadbir bagi ${LABEL_PERANAN[peranan]}`
              : `Keputusan anda · ${LABEL_STATUS[p.status]}`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-hijau" onClick={() => onTindakan('SOKONG')}>
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {labelSokong(p.status, p.kategori)}
            </button>
            <button type="button" className="btn-jingga" onClick={() => onTindakan('KEMBALI')}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              {LABEL_TINDAKAN.KEMBALI}
            </button>
            <button type="button" className="btn-merah" onClick={() => onTindakan('TOLAK')}>
              <XCircle className="h-4 w-4" aria-hidden />
              {LABEL_TINDAKAN.TOLAK}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
