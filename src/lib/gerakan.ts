// Gerakan semasa tatal — kad, jadual dan tajuk muncul perlahan apabila
// memasuki skrin.
//
// Reka bentuk selamat:
// - Keadaan tersembunyi hanya ditetapkan oleh skrip ini (atribut
//   data-muncul), jadi jika skrip gagal kandungan kekal kelihatan.
// - Guna atribut data, bukan kelas, supaya React tidak menimpanya apabila
//   className berubah.
// - Dimatikan sepenuhnya bagi pengguna yang memilih "kurangkan gerakan".
// - Borang cetakan (.borang-rasmi, .halaman-cetak) tidak disentuh.

const SASARAN = [
  '.kad',
  '.tajuk-seksyen',
  '[data-animasi]',
  '.jadual tbody tr',
].join(',')

const DIKECUALIKAN = '.borang-rasmi, .halaman-cetak, [role="dialog"], [data-tanpa-animasi]'

const TUNDA_MS = 55
const TUNDA_MAKS_MS = 440

export function kurangkanGerakan(): boolean {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function pasangAnimasiTatal(): () => void {
  if (kurangkanGerakan() || typeof IntersectionObserver === 'undefined') {
    return () => {}
  }

  const pemerhati = new IntersectionObserver(
    (entri) => {
      // Elemen yang muncul dalam kumpulan yang sama diberi tunda berperingkat,
      // mengikut kedudukan di skrin (atas ke bawah, kiri ke kanan).
      const kelihatan = entri
        .filter((e) => e.isIntersecting)
        .map((e) => e.target as HTMLElement)
        .sort((a, b) => {
          const ra = a.getBoundingClientRect()
          const rb = b.getBoundingClientRect()
          return ra.top - rb.top || ra.left - rb.left
        })

      kelihatan.forEach((el, i) => {
        el.style.setProperty('--tunda', `${Math.min(i * TUNDA_MS, TUNDA_MAKS_MS)}ms`)
        el.dataset.muncul = 'ya'
        pemerhati.unobserve(el)
      })
    },
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
  )

  const sediakan = (el: Element) => {
    if (!(el instanceof HTMLElement)) return
    if (el.dataset.muncul) return
    if (el.closest(DIKECUALIKAN)) return
    // Elemen bersarang di dalam kad yang belum muncul akan ikut kadnya;
    // jangan sembunyikan dua kali.
    const induk = el.parentElement?.closest('[data-muncul="sedia"]')
    if (induk && !el.matches('.jadual tbody tr, [data-animasi]')) return
    el.dataset.muncul = 'sedia'
    pemerhati.observe(el)
  }

  const imbas = (akar: ParentNode) => {
    if (akar instanceof Element && akar.matches(SASARAN)) sediakan(akar)
    akar.querySelectorAll(SASARAN).forEach(sediakan)
  }

  imbas(document)

  // Aplikasi satu halaman: kandungan baharu dirender tanpa muat semula.
  const pemerhatiDom = new MutationObserver((perubahan) => {
    for (const p of perubahan) {
      p.addedNodes.forEach((n) => {
        if (n instanceof Element) imbas(n)
      })
    }
  })
  pemerhatiDom.observe(document.body, { childList: true, subtree: true })

  return () => {
    pemerhati.disconnect()
    pemerhatiDom.disconnect()
  }
}
