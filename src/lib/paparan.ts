// Tetapan paparan pengguna — saiz teks dan kontras tinggi.
// Keperluan biasa laman web sektor awam; disimpan dalam pelayar sahaja.

import { useCallback, useEffect, useState } from 'react'

export type SaizTeks = 'kecil' | 'biasa' | 'besar'

const SAIZ_PX: Record<SaizTeks, string> = { kecil: '14px', biasa: '16px', besar: '18px' }
const KUNCI = 'elawatan-paparan'

type Pilihan = { saiz: SaizTeks; kontras: boolean }

function baca(): Pilihan {
  try {
    const p = JSON.parse(localStorage.getItem(KUNCI) ?? 'null')
    if (p && p.saiz in SAIZ_PX) return { saiz: p.saiz, kontras: !!p.kontras }
  } catch {
    // storan tidak tersedia — guna lalai
  }
  return { saiz: 'biasa', kontras: false }
}

function terap(p: Pilihan) {
  const akar = document.documentElement
  akar.style.setProperty('--saiz-teks', SAIZ_PX[p.saiz])
  akar.classList.toggle('kontras-tinggi', p.kontras)
}

/** Terapkan pilihan tersimpan sebelum paparan pertama. */
export function terapPaparanTersimpan() {
  terap(baca())
}

export function gunaPaparan() {
  const [pilihan, setPilihan] = useState<Pilihan>(baca)

  useEffect(() => {
    terap(pilihan)
    try {
      localStorage.setItem(KUNCI, JSON.stringify(pilihan))
    } catch {
      // abaikan
    }
  }, [pilihan])

  const setSaiz = useCallback((saiz: SaizTeks) => setPilihan((p) => ({ ...p, saiz })), [])
  const togolKontras = useCallback(() => setPilihan((p) => ({ ...p, kontras: !p.kontras })), [])

  return { ...pilihan, setSaiz, togolKontras }
}
