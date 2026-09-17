// Maklumat jabatan untuk kepala laman, kaki laman dan surat rasmi.
// Boleh dibaca sebelum log masuk (migrasi 6) dan dikemas kini pentadbir.

import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type MaklumatJabatan = {
  nama: string
  nama_ringkas: string
  kementerian: string
  sektor: string
  alamat: string
  telefon: string
  faks: string
  emel: string
  laman_web: string
}

export const MAKLUMAT_LALAI: MaklumatJabatan = {
  nama: 'Jabatan Pendidikan Negeri Perak',
  nama_ringkas: 'JPN Perak',
  kementerian: 'Kementerian Pendidikan Malaysia',
  sektor: 'Sektor Pengurusan Sekolah',
  alamat: '',
  telefon: '',
  faks: '',
  emel: '',
  laman_web: '',
}

let cache: Promise<{ jabatan: MaklumatJabatan; slogan: string[] }> | null = null

export function muatJabatan() {
  cache ??= (async () => {
    const { data } = await supabase
      .from('tetapan')
      .select('kunci, nilai')
      .in('kunci', ['maklumat_jpn', 'slogan_surat'])
    const baris = (data ?? []) as { kunci: string; nilai: unknown }[]
    const j = baris.find((b) => b.kunci === 'maklumat_jpn')?.nilai as Partial<MaklumatJabatan> | undefined
    const s = baris.find((b) => b.kunci === 'slogan_surat')?.nilai as string[] | undefined
    return {
      jabatan: { ...MAKLUMAT_LALAI, ...(j ?? {}) },
      slogan: s ?? ['BERKHIDMAT UNTUK NEGARA'],
    }
  })().catch(() => {
    cache = null
    return { jabatan: MAKLUMAT_LALAI, slogan: ['BERKHIDMAT UNTUK NEGARA'] }
  })
  return cache
}

/** Buang cache selepas pentadbir mengemas kini tetapan. */
export function segarJabatan() {
  cache = null
}

export function gunaJabatan() {
  const [nilai, setNilai] = useState<{ jabatan: MaklumatJabatan; slogan: string[] }>({
    jabatan: MAKLUMAT_LALAI,
    slogan: ['BERKHIDMAT UNTUK NEGARA'],
  })
  useEffect(() => {
    let hidup = true
    muatJabatan().then((v) => hidup && setNilai(v))
    return () => {
      hidup = false
    }
  }, [])
  return nilai
}
