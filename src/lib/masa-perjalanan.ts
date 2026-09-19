// Waktu tempatan lawatan: tiada penukaran UTC untuk membandingkan tarikh/jam.
export function semakMasaPerjalanan(p: {
  mula: string; pulang: string; tiba: string
  masaPergi: string; masaPulang: string; masaTiba: string; bermalam: boolean
}) {
  const lengkap = (tarikh: string, masa: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(tarikh) && /^\d{2}:\d{2}(:\d{2})?$/.test(masa)
  const pergi = `${p.mula}T${p.masaPergi.slice(0, 5)}`
  const pulang = `${p.pulang}T${p.masaPulang.slice(0, 5)}`
  const tiba = `${p.tiba}T${p.masaTiba.slice(0, 5)}`
  const urutan = (p.mula && p.pulang && p.pulang < p.mula) ||
    (p.pulang && p.tiba && p.tiba < p.pulang) ||
    (lengkap(p.mula, p.masaPergi) && lengkap(p.pulang, p.masaPulang) && pulang < pergi) ||
    (lengkap(p.pulang, p.masaPulang) && lengkap(p.tiba, p.masaTiba) && tiba < pulang)
  return {
    urutan: Boolean(urutan),
    // Tengah malam ialah 00:00 pada hari berikutnya, bukan 00:00 hari mula.
    lewat: !p.bermalam && lengkap(p.tiba, p.masaTiba) && Boolean(p.mula) && p.tiba > p.mula,
  }
}
