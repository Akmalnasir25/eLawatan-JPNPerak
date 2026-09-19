/** Makluman sahaja, berdasarkan tarikh mula keseluruhan; bukan setiap hari perjalanan. */
export function peringatanSabtu(tarikhMulaTempat: string[]): { tarikh: string; minggu: number } | null {
  if (!tarikhMulaTempat.length) return null
  for (const tarikh of tarikhMulaTempat) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tarikh)) return null
    const d = new Date(`${tarikh}T00:00:00Z`)
    if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== tarikh) return null
  }
  const tarikh = [...tarikhMulaTempat].sort()[0]
  const d = new Date(`${tarikh}T00:00:00Z`)
  const minggu = Math.ceil(d.getUTCDate() / 7)
  return d.getUTCDay() === 6 && [1, 3, 5].includes(minggu) ? { tarikh, minggu } : null
}

/** Semak kedua-dua hujung julat keseluruhan, tanpa memeriksa hari di antaranya. */
export function peringatanSabtuJulat(tempat: { mula: string; tamat: string }[]) {
  if (!tempat.length) return []
  const mula = tempat.map((t) => t.mula).sort()[0]
  const tamat = tempat.map((t) => t.tamat).sort().at(-1)!
  const hasil: { tarikh: string; minggu: number; kedudukan: string }[] = []
  const awal = peringatanSabtu([mula])
  const akhir = peringatanSabtu([tamat])
  if (awal) hasil.push({ ...awal, kedudukan: mula === tamat ? 'Tarikh mula dan tamat' : 'Tarikh mula' })
  if (akhir && mula !== tamat) hasil.push({ ...akhir, kedudukan: 'Tarikh tamat' })
  return hasil
}
