import { useEffect, useState } from 'react'
import { Memuat, Mesej } from '@/komponen/ui'
import { formatMasa, formatTarikh } from '@/lib/guna'
import { MOD_DEMO } from '@/lib/supabase'
import { CUTI_PERAK, SUMBER_CUTI } from '@/lib/cuti-kalendar'
import { putuskanCuti, tarikBalikCuti, statusCuti, type CalonCuti, type RekodCuti, type StatusCuti } from '@/lib/cuti-auto'

const labelJenis = (jenis: string) => jenis === 'umum' ? 'Cuti umum Perak' : 'Cuti sekolah Kumpulan B'
const masa = (nilai: string | null | undefined) => nilai ? formatMasa(nilai) : 'Belum ada'
const key = (c: CalonCuti) => `${c.tahun}:${c.jenis}:${c.id}:${c.versi}`

export function PanelKalendar() {
  const tahunKini = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric' }).format(new Date()))
  const [data, setData] = useState<StatusCuti | null>(null)
  const [ralat, setRalat] = useState<string | null>(null)
  const [nota, setNota] = useState<string | null>(null)
  const [memuat, setMemuat] = useState(true)
  const [sibuk, setSibuk] = useState(false)
  const [tahun, setTahun] = useState(tahunKini)
  const [tapisan, setTapisan] = useState('menunggu')
  const [disemak, setDisemak] = useState<Record<string, boolean>>({})
  const [tarik, setTarik] = useState<string | null>(null)

  async function muat() {
    setMemuat(true)
    setRalat(null)
    try { setData(await statusCuti()) }
    catch { setRalat('Status cuti tidak dapat dimuatkan. Pastikan sesi admin dan sambungan masih aktif, kemudian cuba lagi.') }
    finally { setMemuat(false) }
  }
  useEffect(() => { void muat() }, [])

  async function putuskan(c: CalonCuti, terima: boolean) {
    if (sibuk || (terima && !disemak[key(c)])) return
    setSibuk(true); setRalat(null); setNota(null)
    try {
      await putuskanCuti(c, terima)
      setNota(terima ? `${c.data.nama} diterima. Rekod kini tersedia pada kalendar.` : `${c.data.nama} ditolak. Data yang pernah diterima dikekalkan.`)
      await muat()
    } catch (e) { setRalat(e instanceof Error ? e.message : 'Keputusan belum disimpan. Muat semula status sebelum mencuba lagi.') }
    finally { setSibuk(false) }
  }

  async function tarikBalik(c: CalonCuti) {
    if (sibuk) return
    setSibuk(true); setRalat(null); setNota(null)
    try {
      await tarikBalikCuti(c)
      setTarik(null)
      setNota('Rekod API ditarik balik daripada kalendar. Sejarah semakan dikekalkan.')
      await muat()
    } catch (e) { setRalat(e instanceof Error ? e.message : 'Penarikan balik gagal. Muat semula status dan cuba lagi.') }
    finally { setSibuk(false) }
  }

  const tahunPilihan = [...new Set([2026, tahunKini, tahunKini + 1, ...(data?.sumber.map((s) => s.tahun) ?? [])])].sort((a, b) => b - a)
  const rekod = data?.calon.filter((c) => c.tahun === tahun && (tapisan === 'semua' || c.keputusan === tapisan)) ?? []
  const belumBerjalan = !data?.kerja.cubaan_pada
  const lewat = data?.kerja.cubaan_pada && Date.now() - Date.parse(data.kerja.cubaan_pada) > 48 * 60 * 60 * 1000
  const terganggu = data?.kerja.cubaan_pada && !data.kerja.selesai_pada && !data.kerja.sedang_berjalan

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-bold text-jata-900">Kalendar Cuti</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">Pengambilan tahun semasa dan tahun hadapan dijadualkan setiap hari pada 3 pagi. Data baharu hanya dipaparkan selepas diterima admin.</p></div>
      <button type="button" className="btn-kedua" disabled={memuat || sibuk} onClick={() => void muat()}>Muat semula status</button>
    </div>
    {MOD_DEMO && <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Mod demo: jadual automatik tidak berjalan dalam pelayar. Pengaktifan sekali diperlukan pada backend sebenar.</p>}
    {ralat && <Mesej jenis="ralat">{ralat}</Mesej>}
    {nota && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{nota}</p>}
    {memuat && <Memuat />}
    {data && <>
      <section className="kad p-4 text-sm" aria-label="Status penyelarasan">
        <p className="font-semibold">{belumBerjalan ? 'Belum ada rekod penyelarasan' : data.kerja.sedang_berjalan ? 'Pengambilan sedang berjalan' : lewat || terganggu ? 'Penyelarasan perlu diperiksa' : 'Cubaan penyelarasan telah direkodkan'}</p>
        <p className="mt-1 text-slate-600">Cubaan terakhir: {masa(data.kerja.cubaan_pada)} · Selesai: {masa(data.kerja.selesai_pada)}</p>
        {(belumBerjalan || lewat || terganggu) && <p className="mt-2 text-amber-900">{belumBerjalan ? 'Minta penyelenggara mengaktifkan jadual pada backend sekali sahaja.' : 'Semak jadual backend dan log penyelarasan. Salinan cuti terakhir masih dikekalkan.'}</p>}
        <p className="mt-2 text-xs text-slate-500">Status kejayaan setiap sumber ditunjukkan di bawah. Cubaan selesai tidak semestinya semua sumber berjaya.</p>
      </section>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium">Tahun<select className="medan mt-1" value={tahun} onChange={(e) => setTahun(Number(e.target.value))}>{tahunPilihan.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="text-sm font-medium">Status rekod<select className="medan mt-1" value={tapisan} onChange={(e) => setTapisan(e.target.value)}>
          <option value="menunggu">Menunggu semakan</option><option value="diterima">Diterima</option><option value="ditolak">Ditolak</option><option value="semua">Semua rekod</option>
        </select></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{(['umum', 'sekolah'] as const).map((jenis) => {
        const s = data.sumber.find((s) => s.tahun === tahun && s.jenis === jenis)
        const calon = data.calon.filter((c) => c.tahun === tahun && c.jenis === jenis)
        return <section key={jenis} className="kad p-4 text-sm">
          <h3 className="font-semibold">{labelJenis(jenis)} · {tahun}</h3>
          <p className="mt-2">{s?.status === 'berjaya' ? 'Data API diperoleh' : s?.status === 'belum_tersedia' ? 'Belum diterbitkan oleh sumber' : s?.status === 'gagal' ? 'Pengambilan gagal' : 'Belum diambil'}</p>
          <p className="mt-1 text-slate-600">Berjaya diambil: {masa(s?.berjaya_pada)}</p>
          <p className="mt-1 text-slate-600">Cubaan sumber: {masa(s?.cubaan_pada)}</p>
          <p className="mt-2">{calon.filter((c) => c.keputusan === 'menunggu').length} menunggu · {calon.filter((c) => c.diterbitkan).length} rekod API diterbitkan</p>
          {tahun === 2026 && <p className="mt-1 text-xs text-slate-600">Salinan rujukan rasmi 2026 turut digunakan pada kalendar.</p>}
          {s?.mesej && <p className="mt-2 text-amber-900">{s.mesej}</p>}
        </section>
      })}</div>
      <p className="text-sm text-slate-600">Semak tarikh dengan <a className="underline" href="https://www.kabinet.gov.my/" target="_blank" rel="noreferrer">BKPP JPM</a> atau <a className="underline" href="https://www.moe.gov.my/" target="_blank" rel="noreferrer">KPM</a>. Label “confirmed” API bukan pengesahan rasmi. Senarai API mungkin belum lengkap; rekod yang hilang daripada sumber tidak dipadam automatik.</p>
      {!rekod.length && <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">Tiada rekod untuk tapisan ini. Pengambilan berikutnya akan menyemak sumber semula.</p>}
      <div className="space-y-3">{rekod.map((c) => {
        const asal = CUTI_PERAK.filter((r) => r.jenis === c.jenis && r.mula <= c.data.tamat && c.data.mula <= r.tamat)
        return <details key={key(c)} className="kad p-4">
          <summary className="cursor-pointer text-sm"><span className="font-semibold">{c.data.nama}</span><span className="ml-2 text-slate-600">{formatTarikh(c.data.mula)} · {c.keputusan === 'menunggu' ? 'Menunggu semakan' : c.keputusan === 'diterima' ? 'Diterima' : 'Ditolak'}</span></summary>
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-slate-600">{labelJenis(c.jenis)}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-3"><h4 className="mb-1 font-semibold">Rekod API yang sedang digunakan</h4>{c.diterbitkan ? <Butiran rekod={c.diterbitkan} /> : <p>Belum ada rekod diterima.</p>}</div>
              <div className="rounded-lg bg-yellow-50 p-3"><h4 className="mb-1 font-semibold">Data daripada sumber</h4><Butiran rekod={c.data} />{c.data.amaran.map((a) => <p key={a} className="mt-2 font-medium text-amber-900">{a}</p>)}</div>
            </div>
            {asal.length > 0 && <div className="rounded-lg border border-slate-200 p-3"><p className="font-semibold">Rujukan rasmi 2026 pada tarikh ini</p>{asal.map((r) => <p key={`${r.mula}-${r.nama}`}><a href={SUMBER_CUTI[r.sumber].url} target="_blank" rel="noreferrer" className="underline">{r.nama}</a> · {formatTarikh(r.mula)} – {formatTarikh(r.tamat)}</p>)}<p className="mt-1 text-xs text-slate-600">Rujukan ini dikekalkan; padanan jenis dan julat yang sama tidak menggandakan label kalendar.</p></div>}
            {c.keputusan !== 'diterima' && <>
              <label className="flex items-start gap-2 py-2"><input type="checkbox" className="mt-1 h-4 w-4" checked={!!disemak[key(c)]} disabled={sibuk || memuat} onChange={(e) => setDisemak((lama) => ({ ...lama, [key(c)]: e.target.checked }))} /><span>Saya telah menyemak nama, tarikh dan kesesuaian Perak/Kumpulan B dengan rujukan rasmi.</span></label>
              <div className="flex flex-wrap gap-2"><button type="button" className="btn-utama" disabled={sibuk || memuat || !disemak[key(c)]} onClick={() => void putuskan(c, true)}>{c.keputusan === 'ditolak' ? 'Terima selepas semakan semula' : 'Terima untuk kalendar'}</button>{c.keputusan === 'menunggu' && <button type="button" className="btn-kedua" disabled={sibuk || memuat} onClick={() => void putuskan(c, false)}>Tolak data ini</button>}</div>
            </>}
            {c.diterbitkan && (tarik === key(c) ? <div className="rounded-lg border border-amber-300 p-3">
              <p>Tarik balik rekod API ini daripada kalendar? Rujukan rasmi 2026 dan sejarah semakan dikekalkan.</p>
              <div className="mt-2 flex flex-wrap gap-2"><button type="button" className="btn-kedua" disabled={sibuk || memuat} onClick={() => void tarikBalik(c)}>Ya, tarik balik</button><button type="button" className="btn-kedua" disabled={sibuk} onClick={() => setTarik(null)}>Batal</button></div>
            </div> : <button type="button" className="btn-kedua" disabled={sibuk || memuat} onClick={() => setTarik(key(c))}>Tarik balik rekod API</button>)}
            <p className="text-xs text-slate-500">Keputusan direkodkan dalam log audit. Menolak pindaan mengekalkan rekod terdahulu.</p>
          </div>
        </details>
      })}</div>
    </>}
  </div>
}

function Butiran({ rekod }: { rekod: RekodCuti }) {
  return <><p>{rekod.nama}</p><p className="mt-1">{formatTarikh(rekod.mula)}{rekod.mula !== rekod.tamat && ` – ${formatTarikh(rekod.tamat)}`}</p></>
}
