import { Medan, Mesej } from '@/komponen/ui'
import { formatTarikh } from '@/lib/guna'
import { semakMasaPerjalanan } from '@/lib/masa-perjalanan'
import type { Permohonan } from '@/lib/jenis'

export function PerjalananLawatan({ p, mula, tamat, simpan }: {
  p: Permohonan; mula: string; tamat: string
  simpan: (ubah: Partial<Permohonan>) => void
}) {
  const pulang = p.tarikh_pulang || tamat
  const tiba = p.tarikh_tiba || pulang
  const semakan = semakMasaPerjalanan({ mula, pulang, tiba,
    masaPergi: p.masa_bertolak || '', masaPulang: p.masa_pulang || '',
    masaTiba: p.masa_tiba || '', bermalam: p.ada_penginapan })
  return <div className="space-y-4 border-t border-slate-200 pt-5">
    <div>
      <h3 className="font-semibold text-slate-800">Perjalanan pergi dan pulang</h3>
      <p className="mt-1 text-sm text-slate-500">Isi sekali untuk keseluruhan lawatan. Lokasi pergi dan pulang boleh di sekolah, PPD atau tempat lain yang ditetapkan. Gunakan waktu Malaysia.</p>
    </div>
    <fieldset className="rounded-lg border border-slate-200 p-4">
      <legend className="px-2 text-sm font-semibold text-slate-700">1. Perjalanan pergi</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Medan label="Tarikh mula lawatan" nota="Diambil daripada tarikh destinasi paling awal di atas.">
          <input aria-label="Tarikh mula lawatan" type="date" className="medan bg-slate-50" value={mula} readOnly />
        </Medan>
        <Medan label="Masa bertolak dari sekolah/lokasi ditetapkan">
          <input aria-label="Masa bertolak dari sekolah/lokasi ditetapkan" type="time" className="medan" value={p.masa_bertolak?.slice(0, 5) || ''}
            onChange={e => simpan({ masa_bertolak: e.target.value || null })} />
        </Medan>
      </div>
    </fieldset>
    <fieldset className="rounded-lg border border-slate-200 p-4">
      <legend className="px-2 text-sm font-semibold text-slate-700">2. Perjalanan pulang</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Medan label="Tarikh bertolak pulang" nota="Lalai mengikut tarikh akhir destinasi. Boleh diubah.">
          <input aria-label="Tarikh bertolak pulang" type="date" className="medan" value={pulang}
            onChange={e => simpan({ tarikh_pulang: e.target.value || null })} />
        </Medan>
        <Medan label="Masa bertolak pulang">
          <input aria-label="Masa bertolak pulang" type="time" className="medan" value={p.masa_pulang?.slice(0, 5) || ''}
            onChange={e => simpan({ masa_pulang: e.target.value || null })} />
        </Medan>
        <Medan label="Tarikh tiba semula di sekolah/lokasi ditetapkan" nota="Lalai sama dengan tarikh pulang. Ubah jika tiba pada hari berikutnya.">
          <input aria-label="Tarikh tiba semula di sekolah/lokasi ditetapkan" type="date" className="medan" value={tiba}
            onChange={e => simpan({ tarikh_tiba: e.target.value || null })} />
        </Medan>
        <Medan label="Anggaran masa tiba semula di sekolah/lokasi ditetapkan">
          <input aria-label="Anggaran masa tiba semula di sekolah/lokasi ditetapkan" type="time" className="medan" value={p.masa_tiba?.slice(0, 5) || ''}
            onChange={e => simpan({ masa_tiba: e.target.value || null })} />
        </Medan>
      </div>
    </fieldset>
    <div className="rounded-lg bg-jata-50 p-4 text-sm text-slate-700" aria-live="polite">
      <p><strong>Bertolak dari sekolah/lokasi ditetapkan:</strong> {formatTarikh(mula)} · {p.masa_bertolak?.slice(0, 5) || 'Masa belum diisi'}</p>
      <p className="mt-1"><strong>Bertolak pulang:</strong> {formatTarikh(pulang)} · {p.masa_pulang?.slice(0, 5) || 'Masa belum diisi'}</p>
      <p className="mt-1"><strong>Tiba semula di sekolah/lokasi ditetapkan:</strong> {formatTarikh(tiba)} · {p.masa_tiba?.slice(0, 5) || 'Masa belum diisi'}</p>
    </div>
    <div aria-live="polite">
      {semakan.urutan && <Mesej jenis="amaran" tajuk="Semak urutan perjalanan">
        Tarikh atau masa pulang/tiba lebih awal daripada perjalanan sebelumnya. Semak semula tarikh, terutama jika perjalanan melangkaui tengah malam.
      </Mesej>}
      {semakan.lewat && <Mesej jenis="amaran" tajuk="Semak masa ketibaan semula di sekolah/lokasi ditetapkan">
        <p>Rombongan dijangka tiba pada <strong>{formatTarikh(tiba)}, {p.masa_tiba?.slice(0, 5)}</strong>. Berdasarkan SPI KPM Bil. 9 Tahun 2023, perkara 4.1.3, lawatan tanpa bermalam hendaklah tamat dan tiba semula di sekolah sebelum 12.00 tengah malam.</p>
        <p className="mt-2">Lanjutan waktu tertakluk kepada pertimbangan pelulus berdasarkan keperluan dan lokasi aktiviti. Anda masih boleh meneruskan permohonan untuk pertimbangan; ini bukan kelulusan lanjutan waktu.</p>
      </Mesej>}
    </div>
  </div>
}
