import { useState } from 'react'
import { kelas } from '@/lib/guna'

/**
 * Logo jabatan. Letakkan fail logo rasmi yang diluluskan di
 * `public/logo-jabatan.png` — ia dipaparkan secara automatik.
 *
 * Sebelum fail itu wujud, lambang neutral dipaparkan. Sistem ini tidak
 * melukis semula Jata Negara atau logo rasmi mana-mana agensi.
 */
export function LogoRasmi({
  saiz = 48,
  className,
  terang = false,
}: {
  saiz?: number
  className?: string
  /** Versi untuk latar gelap. */
  terang?: boolean
}) {
  const [gagal, setGagal] = useState(false)

  if (!gagal) {
    return (
      <img
        src="/logo-jabatan.png"
        alt="Logo Jabatan Pendidikan Negeri Perak"
        width={saiz}
        height={saiz}
        className={kelas('shrink-0 object-contain', className)}
        style={{ width: saiz, height: saiz }}
        onError={() => setGagal(true)}
      />
    )
  }

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
