import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Pegawai, Peranan, Sekolah } from './jenis'

type Konteks = {
  sesi: Session | null
  pegawai: Pegawai | null
  sekolah: Sekolah | null
  memuat: boolean
  /** Pengguna disahkan tetapi tiada baris pegawai — tiada capaian. */
  tanpaCapaian: boolean
  keluar: () => Promise<void>
  muatSemula: () => Promise<void>
  ada: (...peranan: Peranan[]) => boolean
}

const KonteksAuth = createContext<Konteks | null>(null)

export function PembekalAuth({ children }: { children: ReactNode }) {
  const [sesi, setSesi] = useState<Session | null>(null)
  const [pegawai, setPegawai] = useState<Pegawai | null>(null)
  const [sekolah, setSekolah] = useState<Sekolah | null>(null)
  const [memuat, setMemuat] = useState(true)
  const [sudahSemak, setSudahSemak] = useState(false)

  const muatProfil = useCallback(async (s: Session | null) => {
    if (!s) {
      setPegawai(null)
      setSekolah(null)
      setSudahSemak(true)
      setMemuat(false)
      return
    }

    const { data: p } = await supabase
      .from('pegawai')
      .select('*')
      .eq('user_id', s.user.id)
      .eq('aktif', true)
      .maybeSingle()

    setPegawai((p as Pegawai) ?? null)

    if (p && (p as Pegawai).peranan === 'sekolah' && (p as Pegawai).kod_skop) {
      const { data: sk } = await supabase
        .from('sekolah')
        .select('*')
        .eq('kod_sekolah', (p as Pegawai).kod_skop!)
        .maybeSingle()
      setSekolah((sk as Sekolah) ?? null)
    } else {
      setSekolah(null)
    }

    setSudahSemak(true)
    setMemuat(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesi(data.session)
      void muatProfil(data.session)
    })

    const { data: langgan } = supabase.auth.onAuthStateChange((peristiwa, s) => {
      setSesi(s)
      if (peristiwa === 'SIGNED_OUT') {
        setPegawai(null)
        setSekolah(null)
        setMemuat(false)
        return
      }
      if (peristiwa === 'SIGNED_IN' || peristiwa === 'USER_UPDATED') {
        setMemuat(true)
        void muatProfil(s)
      }
    })

    return () => langgan.subscription.unsubscribe()
  }, [muatProfil])

  const keluar = useCallback(async () => {
    await supabase.auth.signOut()
    setPegawai(null)
    setSekolah(null)
  }, [])

  const muatSemula = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    await muatProfil(data.session)
  }, [muatProfil])

  const ada = useCallback(
    (...peranan: Peranan[]) => !!pegawai && peranan.includes(pegawai.peranan),
    [pegawai],
  )

  const nilai = useMemo<Konteks>(
    () => ({
      sesi,
      pegawai,
      sekolah,
      memuat,
      tanpaCapaian: !!sesi && sudahSemak && !pegawai,
      keluar,
      muatSemula,
      ada,
    }),
    [sesi, pegawai, sekolah, memuat, sudahSemak, keluar, muatSemula, ada],
  )

  return <KonteksAuth.Provider value={nilai}>{children}</KonteksAuth.Provider>
}

export function gunaAuth(): Konteks {
  const k = useContext(KonteksAuth)
  if (!k) throw new Error('gunaAuth mesti digunakan dalam PembekalAuth')
  return k
}

/** Peranan yang boleh mengambil tindakan kelulusan. */
export const PERANAN_PELULUS: Peranan[] = [
  'ppd_pegawai',
  'ppd_ketua',
  'jpn_pegawai',
  'jpn_pengarah',
  'kpm',
]
