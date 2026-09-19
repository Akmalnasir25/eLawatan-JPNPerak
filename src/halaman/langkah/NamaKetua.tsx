import { useState } from 'react'
import { Medan } from '@/komponen/ui'
import { cadanganNamaMalaysia } from '@/lib/format-teks'

export function NamaKetua({ nama, simpan }: { nama: string; simpan: (nama: string) => Promise<boolean> }) {
  const [nilai, setNilai] = useState(nama)
  const [disimpan, setDisimpan] = useState(nama)
  const [cadangan, setCadangan] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [gagal, setGagal] = useState(false)

  async function hantar(teks: string, terima = false) {
    setSibuk(true)
    setGagal(false)
    try {
      if (!await simpan(teks)) { setGagal(true); return }
      setDisimpan(teks)
      if (terima) { setNilai(teks); setCadangan(null) }
      else {
        const saranan = cadanganNamaMalaysia(teks)
        setCadangan(saranan !== teks ? saranan : null)
      }
    } catch { setGagal(true) }
    finally { setSibuk(false) }
  }
  return <div>
    <Medan label="Nama penuh" perlu nota="Pastikan ejaan nama sepadan dengan dokumen pengenalan.">
      <input className="medan" value={nilai} disabled={sibuk}
        onChange={e => { setNilai(e.target.value); setCadangan(null); setGagal(false) }}
        onBlur={() => { if (nilai !== disimpan) void hantar(nilai) }} />
    </Medan>
    {sibuk && <p role="status" className="mt-2 text-xs text-slate-500">Menyimpan nama…</p>}
    {gagal && <div role="alert" className="mt-2 text-sm text-rose-700">
      Nama belum berjaya disimpan. Semak sambungan dan cuba semula.
      <button type="button" className="ml-2 underline" onClick={() => void hantar(nilai)}>Cuba simpan semula</button>
    </div>}
    {cadangan && !sibuk && <div className="mt-3 rounded-lg bg-jata-50 p-3 text-sm" aria-live="polite">
      <p>Cadangan format nama: <strong>{cadangan}</strong></p>
      <p className="mt-1 text-xs text-slate-600">Semak nama khas dan inisial. Nama asal kekal sehingga cadangan diterima.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="btn-kedua btn-kecil" onClick={() => void hantar(cadangan, true)}>Gunakan cadangan</button>
        <button type="button" className="btn-halus" onClick={() => setCadangan(null)}>Kekalkan nama asal</button>
      </div>
    </div>}
  </div>
}
