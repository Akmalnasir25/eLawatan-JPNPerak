import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Download, Eye, Files, History, X } from 'lucide-react'
import type { Dokumen, Pegawai } from '@/lib/jenis'
import { formatMasa, formatSaiz, kelas } from '@/lib/guna'
import { LABEL_PERANAN } from '@/lib/istilah'
import { lihatDokumen } from '@/lib/r2'
import { LABEL_SEMAKAN, rekodSemakanDokumen, semakanSendiri, semakanUntukPaparan, penyemakBagiPengesah, senaraiSemakanDokumen, type SemakanDokumen as Rekod, type StatusSemakan } from '@/lib/semakan-dokumen'
import { Berputar, Mesej } from './ui'

const WARNA = {
  DIBUKA: 'border-blue-200 bg-blue-50 text-blue-900',
  PATUH: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  PEMBETULAN: 'border-amber-200 bg-amber-50 text-amber-950',
}

export function SemakanDokumen({ permohonanId, dokumen, pegawai, bolehSemak, notaSemakan, dipilih, pilih, butiran }: {
  permohonanId: string
  dokumen: Dokumen[]
  pegawai: Pegawai
  bolehSemak: boolean
  notaSemakan: string
  dipilih: Dokumen | null
  pilih: (d: Dokumen | null) => void
  butiran: (d: Dokumen) => void
}) {
  const [rekod, setRekod] = useState<Rekod[]>([])
  const [memuat, setMemuat] = useState(true)
  const [ralat, setRalat] = useState('')
  const muat = useCallback(async () => {
    setMemuat(true)
    setRalat('')
    try { setRekod(await senaraiSemakanDokumen(permohonanId)) }
    catch (e) { setRalat((e as Error).message) }
    finally { setMemuat(false) }
  }, [permohonanId])
  useEffect(() => { void muat() }, [muat])
  const segarLog = useCallback(async () => {
    const baharu = await senaraiSemakanDokumen(permohonanId)
    // Gabung supaya respons bacaan yang bermula sebelum simpan tidak
    // menghilangkan rekod yang baru ditambah dalam panel.
    setRekod((lama) => [...new Map([...lama, ...baharu].map((r) => [r.id, r])).values()]
      .sort((a, b) => b.masa.localeCompare(a.masa) || a.id.localeCompare(b.id)))
  }, [permohonanId])
  const tambah = (r: Rekod) => setRekod((lama) => [r, ...lama.filter((x) => x.id !== r.id)])
  const penyemak = penyemakBagiPengesah(pegawai.peranan)
  const labelPenyemak = penyemak === 'ppd_pegawai' ? 'penyemak PPD' : 'penyemak JPN'
  const selesai = dokumen.filter((d) => {
    const s = semakanUntukPaparan(rekod, d, pegawai)?.status
    return s === 'PATUH' || s === 'PEMBETULAN'
  }).length
  return <section className="kad">
    <div className="kad-tajuk flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2"><Files className="h-4 w-4" aria-hidden />Dokumen Sokongan ({dokumen.length})</h2>
      {!ralat && !memuat && <span className="text-xs font-normal">{penyemak ? `Semakan ${labelPenyemak}` : 'Semakan anda'}: {selesai}/{dokumen.length} mempunyai keputusan</span>}
    </div>
    <div className="kad-isi">
      <p className="mb-4 text-sm text-slate-600">{penyemak
        ? `Warna dan catatan merujuk semakan ${labelPenyemak}. Pembukaan oleh pengesah hanya direkodkan dalam Log bersama.`
        : 'Buka dokumen untuk membaca dan menyemak. Keputusan serta catatan disimpan bagi setiap fail.'}</p>
      {!bolehSemak && <p className="mb-4 text-sm text-slate-600">{notaSemakan}</p>}
      {ralat && <div className="mb-3"><Mesej jenis="ralat">{ralat} <button type="button" onClick={() => void muat()} className="underline">Cuba lagi</button></Mesej></div>}
      {!dokumen.length && <p className="text-sm text-slate-600">Tiada dokumen dimuat naik.</p>}
      <ul className="space-y-3">
        {dokumen.map((d) => {
          const s = semakanUntukPaparan(rekod, d, pegawai)
          const pembukaan = rekod.filter((r) => r.dokumen_id === d.id &&
            r.cincangan_sha256 === d.cincangan_sha256 && r.status === 'DIBUKA')
          const terakhir = pembukaan[0]
          const Ikon = s?.status === 'PATUH' ? CheckCircle2 : s?.status === 'PEMBETULAN' ? AlertCircle : Eye
          return <li key={d.id} className={kelas('rounded-lg border p-3', !ralat && !memuat && s ? WARNA[s.status] : 'border-slate-200 bg-white text-slate-800')}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1 basis-48">
                <p className="break-words text-sm font-semibold">{d.nama_fail}</p>
                <p className="mt-1 text-xs">{formatSaiz(d.saiz)} · {formatMasa(d.dimuat_naik_pada)}</p>
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium"><Ikon className="h-4 w-4 shrink-0" aria-hidden />
                  {memuat ? 'Memuatkan status…' : ralat ? 'Status belum tersedia' : s ? LABEL_SEMAKAN[s.status] : penyemak ? `Belum ada rekod semakan ${labelPenyemak}` : 'Belum dibuka oleh anda'}
                </p>
                {!memuat && !ralat && penyemak && s && <p className="mt-1 text-xs">
                  {s.status === 'DIBUKA' ? 'Dibuka' : 'Disemak'} oleh {s.nama_pegawai} · {LABEL_PERANAN[s.peranan]} · {formatMasa(s.masa)}
                </p>}
                {!memuat && !ralat && terakhir && <p className="mt-2 text-xs">
                  Dibuka oleh {new Set(pembukaan.map((r) => r.pegawai_id)).size} pengguna · Terakhir: {terakhir.nama_pegawai} ({LABEL_PERANAN[terakhir.peranan]}) · {formatMasa(terakhir.masa)}
                </p>}
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-kedua min-h-11 px-3 text-xs" onClick={() => butiran(d)}>Butiran</button>
                <button type="button" disabled={memuat} className="btn-utama min-h-11 px-4 text-xs" onClick={() => pilih(d)}>{bolehSemak ? 'Semak' : 'Lihat'}</button>
              </div>
            </div>
            {s?.catatan && <p className="mt-3 whitespace-pre-wrap break-words border-t border-current/10 pt-2 text-sm">{penyemak ? 'Catatan penyemak' : 'Catatan anda'}: {s.catatan}</p>}
          </li>
        })}
      </ul>
    </div>
    {dipilih && !memuat && createPortal(<PanelDokumen key={`${dipilih.id}:${pegawai.id}`} dokumen={dipilih}
      senarai={dokumen} rekod={rekod} pegawai={pegawai} bolehSemak={bolehSemak && !ralat}
      notaSemakan={ralat || notaSemakan}
      pilih={pilih} tambah={tambah} segarLog={segarLog} />, document.body)}
  </section>
}

function PanelDokumen({ dokumen: d, senarai, rekod, pegawai, bolehSemak, notaSemakan, pilih, tambah, segarLog }: {
  dokumen: Dokumen; senarai: Dokumen[]; rekod: Rekod[]; pegawai: Pegawai; bolehSemak: boolean
  pilih: (d: Dokumen | null) => void; tambah: (r: Rekod) => void
  segarLog: () => Promise<void>
  notaSemakan: string
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const asal = semakanSendiri(rekod, d, pegawai.id)
  const penyemak = penyemakBagiPengesah(pegawai.peranan)
  const semakanPenyemak = semakanUntukPaparan(rekod, d, pegawai)
  const [keputusan, setKeputusan] = useState<StatusSemakan | ''>(asal?.status === 'DIBUKA' ? '' : asal?.status ?? '')
  const [catatan, setCatatan] = useState(asal?.catatan ?? '')
  const [kotor, setKotor] = useState(false)
  const [sibuk, setSibuk] = useState(false)
  const [ralat, setRalat] = useState('')
  const [berjaya, setBerjaya] = useState('')
  const [url, setUrl] = useState('')
  const [jenis, setJenis] = useState('')
  const [memuat, setMemuat] = useState(true)
  const [ralatFail, setRalatFail] = useState('')
  const [cubaan, setCubaan] = useState(0)
  const [dibuka, setDibuka] = useState(false)
  const [log, setLog] = useState(false)
  const [memuatLog, setMemuatLog] = useState(false)
  const [ralatLog, setRalatLog] = useState('')
  const tambahRef = useRef(tambah)
  tambahRef.current = tambah
  const kedudukan = senarai.findIndex((x) => x.id === d.id)
  const sejarah = rekod.filter((r) => r.dokumen_id === d.id && r.cincangan_sha256 === d.cincangan_sha256)
  async function muatLogBersama() {
    setMemuatLog(true); setRalatLog('')
    try { await segarLog() }
    catch { setRalatLog('Log terkini belum dapat dimuatkan. Rekod yang ada dikekalkan; cuba muat semula log.') }
    finally { setMemuatLog(false) }
  }

  useEffect(() => {
    const pencetus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.current?.showModal()
    const lama = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = lama; pencetus?.focus() }
  }, [])
  useEffect(() => {
    const halang = (e: BeforeUnloadEvent) => { if (kotor) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', halang)
    return () => window.removeEventListener('beforeunload', halang)
  }, [kotor])
  useEffect(() => {
    let aktif = true
    let blobUrl = ''
    let sumberUrl = ''
    const kawal = new AbortController()
    const masa = window.setTimeout(() => kawal.abort(), 30000)
    setMemuat(true); setRalatFail(''); setRalat(''); setUrl(''); setDibuka(false)
    void (async () => {
      try {
        const hasil = await lihatDokumen(d.id)
        sumberUrl = hasil.url
        if (!aktif) return
        if (hasil.dokumen.cincangan_sha256 !== d.cincangan_sha256) throw new Error('Versi fail berubah.')
        const res = await fetch(hasil.url, { signal: kawal.signal })
        if (!res.ok) throw new Error('Fail tidak tersedia.')
        const blob = await res.blob()
        if (!blob.size) throw new Error('Fail kosong.')
        if (!aktif) return
        // Jangan benam HTML/SVG atau kandungan aktif daripada muat naik.
        const mime = (d.jenis_mime ?? '').toLowerCase()
        const dibenar = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(mime)
        blobUrl = URL.createObjectURL(new Blob([blob], { type: dibenar ? mime : 'application/octet-stream' }))
        setJenis(dibenar ? mime : ''); setUrl(blobUrl)
        try {
          const r = await rekodSemakanDokumen(d, 'DIBUKA')
          if (aktif) { tambahRef.current(r); setDibuka(true) }
        } catch {
          if (aktif) setRalat('Fail tersedia, tetapi rekod pembukaan gagal disimpan. Tekan Cuba rekod semula sebelum menyimpan keputusan.')
        }
      } catch {
        if (aktif) setRalatFail('Dokumen tidak dapat dimuatkan. Sambungan mungkin terputus atau fail sudah diganti. Cuba lagi atau muat semula halaman.')
      } finally {
        if (sumberUrl.startsWith('blob:')) URL.revokeObjectURL(sumberUrl)
        window.clearTimeout(masa)
        if (aktif) setMemuat(false)
      }
    })()
    return () => { aktif = false; kawal.abort(); window.clearTimeout(masa); if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [d, cubaan])

  function beralih(sasaran: Dokumen | null) {
    if (sibuk) return
    if (kotor && !window.confirm('Catatan atau keputusan belum disimpan. Keluar tanpa menyimpan?')) return
    pilih(sasaran)
  }
  async function simpan() {
    setBerjaya(''); setRalat('')
    if (!keputusan || keputusan === 'DIBUKA') { setRalat('Pilih keputusan semakan dahulu.'); return }
    if (keputusan === 'PEMBETULAN' && !catatan.trim()) { setRalat('Nyatakan pembetulan yang diperlukan dalam catatan.'); return }
    setSibuk(true)
    try {
      const r = await rekodSemakanDokumen(d, keputusan, catatan.trim())
      tambah(r); setKotor(false); setBerjaya('Semakan disimpan. Anda boleh terus ke dokumen seterusnya.')
    } catch (e) { setRalat((e as Error).message) }
    finally { setSibuk(false) }
  }
  async function ulangRekod() {
    setSibuk(true)
    try { tambah(await rekodSemakanDokumen(d, 'DIBUKA')); setDibuka(true); setRalat('') }
    catch (e) { setRalat((e as Error).message) }
    finally { setSibuk(false) }
  }
  return <dialog ref={dialog} className="panel-dokumen" aria-labelledby="tajuk-semakan-dokumen"
    onCancel={(e) => { e.preventDefault(); beralih(null) }}>
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h2 id="tajuk-semakan-dokumen" className="break-words text-base font-semibold text-jata-900">{d.nama_fail}</h2>
          <p className="mt-1 text-xs text-slate-600">Dokumen {kedudukan + 1} daripada {senarai.length} · {formatSaiz(d.saiz)}</p>
        </div>
        <button type="button" className="btn-kedua min-h-11 min-w-11 shrink-0 px-2" onClick={() => beralih(null)} disabled={sibuk} aria-label="Tutup panel dokumen"><X className="h-5 w-5" /></button>
      </header>
      <div className="panel-dokumen-kawalan shrink-0 overflow-y-auto border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        {penyemak && <div className={kelas('mb-3 rounded-md border p-3 text-sm', semakanPenyemak ? WARNA[semakanPenyemak.status] : 'border-slate-200 text-slate-700')}>
          <p className="font-semibold">Semakan {penyemak === 'ppd_pegawai' ? 'penyemak PPD' : 'penyemak JPN'}: {semakanPenyemak ? LABEL_SEMAKAN[semakanPenyemak.status] : 'Belum ada rekod'}</p>
          {semakanPenyemak && <>
            <p className="mt-1 text-xs">{semakanPenyemak.nama_pegawai} · {LABEL_PERANAN[semakanPenyemak.peranan]} · {formatMasa(semakanPenyemak.masa)}</p>
            {semakanPenyemak.catatan && <p className="mt-2 whitespace-pre-wrap break-words">Catatan penyemak: {semakanPenyemak.catatan}</p>}
          </>}
        </div>}
        {bolehSemak ? <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <label htmlFor="catatan-dokumen" className="mb-1 block text-sm font-medium text-slate-800">Catatan {keputusan === 'PEMBETULAN' ? '(wajib)' : '(pilihan)'}</label>
            <textarea id="catatan-dokumen" rows={2} maxLength={2000} value={catatan} disabled={sibuk}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jata-500 focus:outline-none focus:ring-2 focus:ring-jata-200"
              placeholder="Contoh: Surat kebenaran belum ditandatangani."
              onChange={(e) => { setCatatan(e.target.value); setKotor(true); setBerjaya('') }} />
          </div>
          <div className="flex flex-col justify-end gap-2">
            <fieldset disabled={sibuk} className="flex flex-wrap gap-2">
              <legend className="mb-1 text-sm font-medium text-slate-800">Keputusan semakan</legend>
              {(['PATUH', 'PEMBETULAN'] as const).map((s) => <label key={s} className={kelas('flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm', keputusan === s ? WARNA[s] : 'border-slate-300 text-slate-800')}>
                <input type="radio" name="keputusan-dokumen" value={s} checked={keputusan === s}
                  onChange={() => { setKeputusan(s); setKotor(true); setBerjaya('') }} />{LABEL_SEMAKAN[s]}
              </label>)}
            </fieldset>
            <button type="button" onClick={() => void simpan()} disabled={sibuk || !dibuka || memuat} className="btn-utama min-h-11">{sibuk ? <Berputar /> : <CheckCircle2 className="h-4 w-4" />}Simpan semakan</button>
          </div>
        </div> : <p className="text-sm text-slate-600">{notaSemakan}</p>}
        {ralat && <div role="alert" className="mt-2 text-sm text-red-700">{ralat} {url && !dibuka && <button type="button" disabled={sibuk} className="underline" onClick={() => void ulangRekod()}>Cuba rekod semula</button>}</div>}
        {berjaya && <p role="status" className="mt-2 text-sm text-emerald-800">{berjaya}</p>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button type="button" className="btn-halus min-h-11 text-xs" aria-expanded={log} onClick={() => {
            setLog(!log)
            if (!log) void muatLogBersama()
          }}><History className="h-4 w-4" />Log bersama ({sejarah.length})</button>
          {url && <a href={url} download={d.nama_fail} className="btn-halus min-h-11 text-xs"><Download className="h-4 w-4" />Muat turun</a>}
          <div className="flex gap-2">
            <button type="button" className="btn-kedua min-h-11 px-3 text-xs" disabled={sibuk || kedudukan < 1} onClick={() => beralih(senarai[kedudukan - 1])}><ChevronLeft className="h-4 w-4" />Sebelumnya</button>
            <button type="button" className="btn-kedua min-h-11 px-3 text-xs" disabled={sibuk || kedudukan >= senarai.length - 1} onClick={() => beralih(senarai[kedudukan + 1])}>Seterusnya<ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        {log && <div className="mt-2 max-h-48 overflow-y-auto border-t border-slate-200 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-600">Pembukaan dan keputusan semua pengguna yang mempunyai akses kepada versi dokumen ini.</p>
            <button type="button" disabled={memuatLog} className="btn-halus min-h-11 text-xs" onClick={() => void muatLogBersama()}>{memuatLog ? 'Memuatkan log…' : 'Muat semula log'}</button>
          </div>
          {ralatLog && <p role="alert" className="text-sm text-red-700">{ralatLog}</p>}
          {!memuatLog && !ralatLog && !sejarah.length && <p className="text-sm text-slate-600">Belum ada rekod untuk versi dokumen ini.</p>}
          <ol className="divide-y divide-slate-200">{sejarah.map((r) => <li key={r.id} className="py-2 text-sm">
            <p className="font-medium text-slate-800">{r.status === 'DIBUKA' ? 'Dokumen dibuka' : LABEL_SEMAKAN[r.status]} · {r.nama_pegawai}</p>
            <p className="text-xs text-slate-600">{LABEL_PERANAN[r.peranan]} · {formatMasa(r.masa)}</p>
            {r.catatan && <p className="mt-1 whitespace-pre-wrap break-words text-slate-700">{r.catatan}</p>}
          </li>)}</ol>
        </div>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-2 sm:p-4" aria-label="Pratonton dokumen" aria-busy={memuat}>
        {memuat ? <p role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-700"><Berputar />Memuatkan dokumen…</p>
          : ralatFail ? <div className="p-6"><Mesej jenis="ralat">{ralatFail}</Mesej><button type="button" className="btn-kedua mt-3" onClick={() => setCubaan((n) => n + 1)}>Cuba lagi</button></div>
          : jenis === 'application/pdf' ? <object data={url} type="application/pdf" className="h-full min-h-64 w-full" aria-label={`Pratonton ${d.nama_fail}`}>
            <p className="p-6 text-sm">Pelayar ini tidak menyokong pratonton PDF. Gunakan Muat turun untuk membaca dokumen.</p>
          </object>
          : jenis.startsWith('image/') ? <img src={url} alt={`Dokumen ${d.nama_fail}`} className="mx-auto h-auto max-w-full bg-white" onError={() => setRalatFail('Imej tidak dapat dipaparkan. Cuba muatkan semula atau muat turun fail.')} />
          : <p className="p-6 text-sm text-slate-700">Format ini tidak menyokong pratonton. Gunakan Muat turun untuk membaca fail, kemudian simpan semakan di atas.</p>}
      </div>
    </div>
  </dialog>
}
