import { useState } from 'react'
import { kelas, laluan } from '@/lib/guna'

// Logo Korporat KPM (versi BM, tulisan hitam), dipangkas daripada fail
// asal Logo-Korporat-KPM-BM-Tulisan-Hitam.png:
//   public/logo-kpm.png      — lambang + "KEMENTERIAN PENDIDIKAN" (598×360)
//   public/logo-jabatan.png  — lambang sahaja (325×256)
// Tulisan hitam tidak kelihatan di atas latar gelap, jadi guna varian
// 'lambang' di situ.
const FAIL = {
  penuh: { src: 'logo-kpm.png', nisbah: 598 / 360 },
  lambang: { src: 'logo-jabatan.png', nisbah: 325 / 256 },
} as const

export function LogoRasmi({
  saiz = 48,
  varian = 'lambang',
  className,
  terang = false,
}: {
  /** Tinggi dalam piksel; lebar mengikut nisbah logo. */
  saiz?: number
  varian?: keyof typeof FAIL
  className?: string
  /** Lambang ganti untuk latar gelap jika fail logo tiada. */
  terang?: boolean
}) {
  const [gagal, setGagal] = useState(false)
  const f = FAIL[varian]

  if (!gagal) {
    return (
      <img
        src={laluan(f.src)}
        alt="Logo Kementerian Pendidikan Malaysia"
        height={saiz}
        width={Math.round(saiz * f.nisbah)}
        className={kelas('shrink-0 object-contain', className)}
        style={{ height: saiz, width: Math.round(saiz * f.nisbah) }}
        onError={() => setGagal(true)}
      />
    )
  }

  // Ganti neutral jika fail logo tidak dapat dimuatkan.
  return (
    <svg
      viewBox="0 0 64 64"
      width={saiz}
      height={saiz}
      className={kelas('shrink-0', className)}
      role="img"
      aria-label="eLAWATAN"
    >
      <path
        d="M32 3 L57 12 V30 C57 45 46 56 32 61 C18 56 7 45 7 30 V12 Z"
        fill={terang ? '#ffffff' : '#17386b'}
      />
      <path
        d="M32 8 L52 15.5 V30 C52 42 43.5 51 32 55.5 C20.5 51 12 42 12 30 V15.5 Z"
        fill="none"
        stroke="#e2b13c"
        strokeWidth="2"
      />
      <path d="M20 40 L32 20 L44 40 Z" fill="none" stroke={terang ? '#17386b' : '#ffffff'} strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="32" cy="34" r="3.2" fill="#e2b13c" />
    </svg>
  )
}
