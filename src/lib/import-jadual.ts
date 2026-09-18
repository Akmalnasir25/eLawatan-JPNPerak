// Hurai jadual yang ditampal dari Excel (dipisah tab) atau fail CSV.

import { huraiCsv } from './guna'

/** Baris sel. Tampalan Excel dikesan melalui aksara tab. */
export function huraiJadual(teks: string): string[][] {
  const t = teks.replace(/^﻿/, '').trim()
  if (!t) return []
  if (!t.includes('\t')) return huraiCsv(t)
  return t
    .split(/\r?\n/)
    .map((b) => b.split('\t').map((s) => s.trim().replace(/^"(.*)"$/, '$1')))
    .filter((b) => b.some((s) => s !== ''))
}

/** Nama lajur untuk padanan: huruf kecil, tanpa ruang dan tanda baca. */
export const normalLajur = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Cari indeks lajur pertama yang sepadan dengan mana-mana alias. */
export function indeksLajur(kepala: string[], alias: string[]): number {
  const k = kepala.map(normalLajur)
  for (const a of alias) {
    const i = k.indexOf(normalLajur(a))
    if (i >= 0) return i
  }
  return -1
}

export async function bacaFailTeks(fail: File): Promise<string> {
  return fail.text()
}
