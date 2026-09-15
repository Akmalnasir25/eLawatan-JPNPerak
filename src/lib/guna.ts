// Fungsi bantuan am.

const BULAN = [
  'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
  'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember',
]

const HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu']

export function formatTarikh(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`
}

export function formatHari(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return HARI[d.getDay()]
}

export function formatMasa(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const jam = String(d.getHours()).padStart(2, '0')
  const minit = String(d.getMinutes()).padStart(2, '0')
  return `${formatTarikh(iso)}, ${jam}:${minit}`
}

export function formatWang(nilai: number | null | undefined): string {
  return `RM ${Number(nilai ?? 0).toLocaleString('ms-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatSaiz(bait: number): string {
  if (bait < 1024) return `${bait} B`
  if (bait < 1024 * 1024) return `${(bait / 1024).toFixed(1)} KB`
  return `${(bait / (1024 * 1024)).toFixed(1)} MB`
}

/** Bilangan hari dari hari ini hingga tarikh diberi. */
export function hariLagi(iso: string | null | undefined): number | null {
  if (!iso) return null
  const sasaran = new Date(iso)
  if (Number.isNaN(sasaran.getTime())) return null
  const kini = new Date()
  kini.setHours(0, 0, 0, 0)
  sasaran.setHours(0, 0, 0, 0)
  return Math.round((sasaran.getTime() - kini.getTime()) / 86_400_000)
}

/** Tarikh hari ini dalam format input tarikh HTML. */
export function tarikhHariIni(): string {
  return new Date().toISOString().slice(0, 10)
}

export function tarikhTambahHari(hari: number): string {
  const d = new Date()
  d.setDate(d.getDate() + hari)
  return d.toISOString().slice(0, 10)
}

/** Cantum kelas CSS bersyarat. */
export function kelas(...bahagian: (string | false | null | undefined)[]): string {
  return bahagian.filter(Boolean).join(' ')
}

/** Cincangan SHA-256 fail, dikira dalam pelayar sebelum muat naik. */
export async function cincangFail(fail: File): Promise<string> {
  const bait = await fail.arrayBuffer()
  const cincang = await crypto.subtle.digest('SHA-256', bait)
  return Array.from(new Uint8Array(cincang))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Baca CSV ringkas — menyokong medan berpetikan dan koma di dalamnya. */
export function huraiCsv(teks: string): string[][] {
  const baris: string[][] = []
  let medan = ''
  let semasa: string[] = []
  let dalamPetikan = false

  for (let i = 0; i < teks.length; i++) {
    const c = teks[i]
    if (dalamPetikan) {
      if (c === '"') {
        if (teks[i + 1] === '"') { medan += '"'; i++ } else { dalamPetikan = false }
      } else medan += c
    } else if (c === '"') {
      dalamPetikan = true
    } else if (c === ',') {
      semasa.push(medan.trim()); medan = ''
    } else if (c === '\n') {
      semasa.push(medan.trim()); medan = ''
      if (semasa.some((m) => m !== '')) baris.push(semasa)
      semasa = []
    } else if (c !== '\r') {
      medan += c
    }
  }
  semasa.push(medan.trim())
  if (semasa.some((m) => m !== '')) baris.push(semasa)
  return baris
}

/** Muat turun data sebagai fail. */
export function muatTurun(nama: string, kandungan: string, jenis: string) {
  const blob = new Blob([kandungan], { type: jenis })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nama
  a.click()
  URL.revokeObjectURL(url)
}

/** Tukar tatasusunan objek kepada CSV untuk eksport laporan. */
export function keCsv(baris: Record<string, unknown>[]): string {
  if (baris.length === 0) return ''
  const kepala = Object.keys(baris[0])
  const petik = (n: unknown) => {
    const s = n === null || n === undefined ? '' : String(n)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [
    kepala.join(','),
    ...baris.map((b) => kepala.map((k) => petik(b[k])).join(',')),
  ].join('\n')
}
