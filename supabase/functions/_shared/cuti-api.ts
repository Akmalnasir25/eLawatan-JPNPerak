export type JenisCuti = 'umum' | 'sekolah'
export type RekodCuti = { id: string; nama: string; mula: string; tamat: string; amaran: string[] }

const HAD_SAIZ = 512 * 1024
const TIADA_DATA = 'Data tahun ini belum tersedia.'

function gagal(): never {
  throw new Error('Format data cuti tidak sah. Salinan terakhir dikekalkan.')
}

function objek(nilai: unknown): Record<string, unknown> {
  if (!nilai || typeof nilai !== 'object' || Array.isArray(nilai)) gagal()
  return nilai as Record<string, unknown>
}

function teks(nilai: unknown): string {
  if (typeof nilai !== 'string' || !nilai.trim() || nilai.length > 200) gagal()
  return nilai.trim()
}

function tahunSah(tahun: number): void {
  if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2200) gagal()
}

function tarikh(nilai: unknown, tahun: number): string {
  if (typeof nilai !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(nilai)) gagal()
  const parsed = new Date(`${nilai}T00:00:00Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== nilai || parsed.getUTCFullYear() !== tahun) gagal()
  return nilai
}

function negeri(nilai: unknown, wajib = false): string[] | undefined {
  if (nilai === undefined && !wajib) return undefined
  if (!Array.isArray(nilai) || (wajib && !nilai.length) || nilai.some((n) => typeof n !== 'string' || !n.trim() || n.length > 100)) gagal()
  return nilai.map((n: string) => n.toLowerCase().trim())
}

/** Validate the complete batch before it can become an admin review candidate. */
export function normalizeCuti(payload: unknown, tahun: number, jenis: JenisCuti): RekodCuti[] {
  tahunSah(tahun)
  if (jenis !== 'umum' && jenis !== 'sekolah') gagal()
  const badan = objek(payload)
  const meta = badan.meta === undefined ? {} : objek(badan.meta)
  if (!Array.isArray(badan.data) || badan.data.length > 200) gagal()
  if (meta.dataAvailable === false || !badan.data.length) throw new Error(TIADA_DATA)
  if (meta.year !== undefined && meta.year !== tahun) gagal()
  const ids = new Set<string>()
  const hasil: RekodCuti[] = []

  for (const nilai of badan.data) {
    const item = objek(nilai)
    const id = teks(item.id)
    if (ids.has(id)) gagal()
    ids.add(id)
    const nama = teks(objek(item.name).ms)
    const mula = tarikh(jenis === 'umum' ? item.date : item.startDate, tahun)
    const tamat = jenis === 'umum' ? mula : tarikh(item.endDate, tahun)
    if (mula > tamat) gagal()
    const amaran: string[] = []
    let termasuk = true

    if (jenis === 'umum') {
      const states = negeri(item.states, true)!
      if (typeof item.isPublicHoliday !== 'boolean') gagal()
      if (item.status !== 'confirmed' && item.status !== 'tentative') gagal()
      teks(item.source)
      if (item.isEstimated !== undefined && typeof item.isEstimated !== 'boolean') gagal()
      termasuk = item.isPublicHoliday && (states.includes('perak') || states.includes('*'))
      if (item.source === 'community') amaran.push('Sumber komuniti; semak rujukan rasmi.')
      if (item.status === 'tentative' || item.isEstimated === true) amaran.push('Tarikh anggaran atau belum muktamad.')
    } else {
      if (item.year !== undefined && item.year !== tahun) gagal()
      if (item.group !== 'A' && item.group !== 'B') gagal()
      const states = negeri(item.states)
      const excludeStates = negeri(item.excludeStates)
      termasuk = item.group === 'B' && (!states || states.includes('perak') || states.includes('*')) && !excludeStates?.some((n) => n === 'perak' || n === '*')
      const bilHari = (Date.parse(tamat) - Date.parse(mula)) / 86_400_000 + 1
      if (!Number.isInteger(item.days) || (item.days as number) <= 0) gagal()
      // A non-contiguous range cannot safely colour every day between its endpoints.
      if (termasuk && item.days !== bilHari) {
        throw new Error('Julat cuti sekolah tidak sepadan dengan bilangan hari. Semakan sumber diperlukan; salinan terakhir dikekalkan.')
      }
    }
    if (termasuk) hasil.push({ id, nama, mula, tamat, amaran })
  }
  if (!hasil.length) throw new Error(TIADA_DATA)
  return hasil.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

export function tahunSasaran(now: Date): number[] {
  if (!Number.isFinite(now.getTime())) gagal()
  const tahun = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric' }).format(now))
  return [tahun, tahun + 1]
}

/** Bound downloaded bytes as well as request duration, without trusting response headers. */
export async function muatCuti(tahun: number, jenis: JenisCuti, fetcher: typeof fetch = fetch): Promise<RekodCuti[]> {
  tahunSah(tahun)
  if (jenis !== 'umum' && jenis !== 'sekolah') gagal()
  const laluan = jenis === 'umum' ? `/holidays?year=${tahun}&state=perak` : `/school/holidays?year=${tahun}&group=B`
  const response = await fetcher(`https://mycal-api.huijun00100101.workers.dev/v1${laluan}`, { signal: AbortSignal.timeout(15_000), redirect: 'error', headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Sumber cuti tidak tersedia (HTTP ${response.status}). Salinan terakhir dikekalkan.`)
  if (Number(response.headers.get('content-length')) > HAD_SAIZ) {
    await response.body?.cancel()
    gagal()
  }
  if (!response.body) gagal()
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let jumlah = 0
  let kandungan = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      jumlah += value.byteLength
      if (jumlah > HAD_SAIZ) {
        await reader.cancel()
        gagal()
      }
      kandungan += decoder.decode(value, { stream: true })
    }
    kandungan += decoder.decode()
  } finally {
    reader.releaseLock()
  }
  let parsed: unknown
  try { parsed = JSON.parse(kandungan) } catch { gagal() }
  return normalizeCuti(parsed, tahun, jenis)
}
