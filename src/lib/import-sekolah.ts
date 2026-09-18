// Padanan baris import sekolah — format sistem (kod_sekolah, nama, emel,
// kod_ppd, ...) dan format senarai rasmi KPM (KODSEKOLAH, NAMASEKOLAH,
// PPD, PERINGKAT, JENIS/LABEL, EMAIL, POSKODSURAT, BANDARSURAT, NOTELEFON).

import { indeksLajur } from './import-jadual'
import type { Ppd, Sekolah } from './jenis'

export const ALIAS_SEKOLAH: Record<string, string[]> = {
  kod_sekolah: ['kod_sekolah', 'kodsekolah', 'kod sekolah'],
  nama: ['nama', 'namasekolah', 'nama sekolah'],
  emel: ['emel', 'email', 'e-mel'],
  kod_ppd: ['kod_ppd', 'ppd'],
  jenis: ['jenis'],
  peringkat: ['peringkat'],
  label: ['jenis/label', 'label'],
  nama_guru_besar: ['nama_guru_besar', 'guru besar', 'pengetua'],
  poskod: ['poskod', 'poskodsurat'],
  bandar: ['bandar', 'bandarsurat'],
  telefon: ['telefon', 'notelefon', 'no telefon'],
}

export const LAJUR_WAJIB_SEKOLAH = ['kod_sekolah', 'nama', 'emel', 'kod_ppd']

/** Nama PPD untuk padanan: "PPD LARUT/MATANG/SELAMA" = "PPD Larut, Matang dan Selama". */
const normalPpd = (s: string) =>
  s.toUpperCase().replace(/[^A-Z0-9]+/g, ' ').replace(/\bDAN\b/g, ' ').replace(/\s+/g, ' ').trim()

export function cariKodPpd(nilai: string, ppd: Ppd[]): string | null {
  const v = nilai.trim()
  if (!v) return null
  const kod = ppd.find((d) => d.kod_ppd.toUpperCase() === v.toUpperCase())
  if (kod) return kod.kod_ppd
  const n = normalPpd(v)
  return ppd.find((d) => normalPpd(d.nama) === n || normalPpd(`PPD ${d.nama}`) === n)?.kod_ppd ?? null
}

/** Jenis sekolah sistem daripada peringkat dan label KPM. */
export function jenisSekolah(jenis: string, peringkat: string, label: string): string {
  const j = jenis.trim().toUpperCase()
  if (['RENDAH', 'MENENGAH', 'PRASEKOLAH', 'KHAS', 'TEKNIK', 'SBP', 'AGAMA'].includes(j)) return j
  const l = label.trim().toUpperCase()
  if (l.includes('KHAS') && !l.includes('MODEL')) return 'KHAS'
  if (l === 'SBP') return 'SBP'
  if (l === 'KV') return 'TEKNIK'
  if (l.includes('SABK') || l === 'SMKA') return 'AGAMA'
  return peringkat.trim().toLowerCase().startsWith('menengah') ? 'MENENGAH' : 'RENDAH'
}

/** 56237109 → 05-6237109; "TIADA" → null. */
export function normalTelefon(s: string): string | null {
  const d = s.replace(/\D/g, '')
  if (d.length < 7) return null
  const penuh = d.startsWith('0') ? d : `0${d}`
  return `${penuh.slice(0, 2)}-${penuh.slice(2)}`
}

export type HasilBaris = { sekolah: Partial<Sekolah> | null; masalah: string | null }

export function petaSekolah(
  kepala: string[],
  b: string[],
  ppd: Ppd[],
  domain: string[],
): HasilBaris {
  const sel = (lajur: string) => {
    const i = indeksLajur(kepala, ALIAS_SEKOLAH[lajur])
    return i >= 0 ? (b[i] ?? '').trim() : ''
  }
  for (const l of LAJUR_WAJIB_SEKOLAH) {
    if (!sel(l)) return { sekolah: null, masalah: `Lajur ${l} kosong` }
  }
  const emel = sel('emel').toLowerCase()
  if (!domain.includes(emel.split('@')[1] ?? '')) return { sekolah: null, masalah: 'Domain e-mel tidak sah' }
  const kodPpd = cariKodPpd(sel('kod_ppd'), ppd)
  if (!kodPpd) return { sekolah: null, masalah: `PPD "${sel('kod_ppd')}" tidak dikenali` }
  return {
    sekolah: {
      kod_sekolah: sel('kod_sekolah').toUpperCase(),
      nama: sel('nama'),
      emel,
      kod_ppd: kodPpd,
      jenis: jenisSekolah(sel('jenis'), sel('peringkat'), sel('label')),
      nama_guru_besar: sel('nama_guru_besar') || null,
      poskod: sel('poskod') || null,
      bandar: sel('bandar') || null,
      telefon: normalTelefon(sel('telefon')),
    },
    masalah: null,
  }
}

export function kepalaSekolahSah(kepala: string[]): boolean {
  return LAJUR_WAJIB_SEKOLAH.every((l) => indeksLajur(kepala, ALIAS_SEKOLAH[l]) >= 0)
}
