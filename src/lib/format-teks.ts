const KATA_KECIL = new Set(['di', 'ke', 'dari', 'daripada', 'dan', 'atau', 'untuk', 'bagi', 'dengan', 'yang', 'pada', 'dalam', 'sebagai', 'oleh', 'serta', 'hingga', 'kepada'])
const SINGKATAN = new Set(['AEON', 'KPM', 'PPD', 'JPN', 'IPG', 'IPGM', 'UPSI', 'UKM', 'UM', 'USM', 'UTM', 'UUM', 'UITM', 'UIAM', 'MARA', 'MRSM', 'SK', 'SJK', 'SJKT', 'SJKC', 'SMK', 'SMKA', 'SMJK', 'KV', 'PPR', 'KLCC', 'KLIA', 'PETRONAS', 'IKEA', 'STEM', 'TVET', 'ICT', 'SJK(T)', 'SJK(C)'])
const HUBUNG_NAMA = new Set(['bin', 'binti', 'b.', 'bt.', 'a/l', 'a/p', 'anak'])
const huruf = (s: string) => s.replace(/[^\p{L}]/gu, '')
const hurufBesar = (s: string) => !!huruf(s) && s === s.toUpperCase()
const awalBesar = (s: string) => s.replace(/\p{L}[\p{L}\p{M}]*/gu, w => w[0].toUpperCase() + w.slice(1).toLowerCase())

/** Cadangan sahaja: tiada pengembangan/pembuangan perkataan atau singkatan. */
export function cadanganNamaMalaysia(teks: string): string {
  return teks.replace(/[^\s]+/gu, (w, offset: number) => {
    const kecil = w.toLowerCase()
    if (HUBUNG_NAMA.has(kecil)) return offset === 0 ? awalBesar(kecil) : kecil
    // Inisial bertitik dan ejaan bercampur seperti McDonald tidak dirosakkan.
    if (/^(?:\p{L}\.)+$/u.test(w)) return w.toUpperCase()
    if (!hurufBesar(w) && w !== kecil) return w
    return awalBesar(w)
  })
}

/** Format tajuk selepas suntingan. Pemohon boleh memulihkan teks asal. */
export function formatTujuanLawatan(teks: string): string {
  const semuaBesar = hurufBesar(teks)
  let bil = 0
  return teks.replace(/[\p{L}\p{M}][\p{L}\p{M}\d.'’/-]*/gu, w => {
    const pertama = bil++ === 0
    const kecil = w.toLowerCase()
    if (KATA_KECIL.has(kecil)) return pertama ? awalBesar(kecil) : kecil
    if (/^(?:\p{L}\.){2,}\p{L}?$/u.test(w)) return w.toUpperCase()
    if (SINGKATAN.has(w.toUpperCase()) && hurufBesar(w)) return w
    // Tajuk bercampur: kekalkan nama/singkatan yang memang ditulis huruf besar.
    // Tajuk seluruhnya besar: singkatan pendek yang tidak dikenali dikekalkan
    // untuk semakan pemohon, bukan diteka pengembangannya.
    if (hurufBesar(w) && (!semuaBesar || huruf(w).length <= 3)) return w
    if (!hurufBesar(w) && w !== kecil) return w // i-City, UiTM, McDonald
    return awalBesar(w)
  })
}
