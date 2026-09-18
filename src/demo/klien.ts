// ════════════════════════════════════════════════════════════════════
// Klien demo — meniru subset supabase-js yang digunakan aplikasi,
// diterjemah kepada SQL atas Postgres dalam pelayar.
//
// Setiap permintaan berjalan sebagai peranan `authenticated` dengan
// auth.uid() pengguna log masuk, jadi RLS menapis tepat seperti
// PostgREST. Edge Functions ditiru dalam JavaScript di hujung fail.
// ════════════════════════════════════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js'

export const MOD_DEMO = true

type Enjin = typeof import('./enjin')
const enjin = (): Promise<Enjin> => import('./enjin')

type Hasil = { data: any; error: { message: string; code?: string } | null }

// ── Sesi ────────────────────────────────────────────────────────────

type Sesi = { access_token: string; user: { id: string; email: string } }
type Pendengar = (peristiwa: string, sesi: Sesi | null) => void

const KUNCI_SESI = 'elawatan-demo-sesi'
const pendengar = new Set<Pendengar>()
const kodOtp = new Map<string, string>()

function sesiSemasa(): Sesi | null {
  try {
    return JSON.parse(localStorage.getItem(KUNCI_SESI) ?? 'null')
  } catch {
    return null
  }
}

function tetapkanSesi(s: Sesi | null, peristiwa: string) {
  if (s) localStorage.setItem(KUNCI_SESI, JSON.stringify(s))
  else localStorage.removeItem(KUNCI_SESI)
  pendengar.forEach((f) => f(peristiwa, s))
}

const uidSemasa = () => sesiSemasa()?.user.id ?? null

// ── Penukaran nilai ─────────────────────────────────────────────────

const pengenal = (n: string) => {
  if (!/^[a-z_][a-z0-9_]*$/i.test(n)) throw new Error(`Nama lajur tidak sah: ${n}`)
  return `"${n}"`
}

function nilaiParam(v: unknown): unknown {
  if (Array.isArray(v)) {
    return `{${v.map((x) => `"${String(x).replace(/["\\]/g, '\\$&')}"`).join(',')}}`
  }
  if (v !== null && typeof v === 'object') return JSON.stringify(v)
  return v
}

// ── Pembina pertanyaan ──────────────────────────────────────────────

type Operasi = 'select' | 'insert' | 'update' | 'delete' | 'upsert'

class Pembina implements PromiseLike<Hasil> {
  private op: Operasi = 'select'
  private lajur = '*'
  private syarat: string[] = []
  private param: unknown[] = []
  private susunan: string[] = []
  private had: number | null = null
  private ofset = 0
  private tunggal: 'wajib' | 'mungkin' | null = null
  private nilai: Record<string, unknown>[] = []
  private konflik: string | null = null
  private pulangkan = false

  constructor(private jadual: string) {}

  private p(v: unknown) {
    this.param.push(nilaiParam(v))
    return `$${this.param.length}`
  }

  select(lajur = '*') {
    if (this.op === 'select') this.lajur = lajur
    else this.pulangkan = true
    return this
  }
  insert(v: object | object[]) {
    this.op = 'insert'
    this.nilai = (Array.isArray(v) ? v : [v]) as Record<string, unknown>[]
    return this
  }
  upsert(v: object | object[], o?: { onConflict?: string }) {
    this.insert(v)
    this.op = 'upsert'
    this.konflik = o?.onConflict ?? 'id'
    return this
  }
  update(v: object) {
    this.op = 'update'
    this.nilai = [v as Record<string, unknown>]
    return this
  }
  delete() {
    this.op = 'delete'
    return this
  }
  eq(k: string, v: unknown) {
    this.syarat.push(`${pengenal(k)} = ${this.p(v)}`)
    return this
  }
  in(k: string, senarai: unknown[]) {
    if (senarai.length === 0) this.syarat.push('false')
    else this.syarat.push(`${pengenal(k)} in (${senarai.map((v) => this.p(v)).join(', ')})`)
    return this
  }
  ilike(k: string, v: string) {
    this.syarat.push(`${pengenal(k)}::text ilike ${this.p(v)}`)
    return this
  }
  /** Sokongan terhad: `lajur.ilike.nilai,lajur.eq.nilai` */
  or(ungkapan: string) {
    const bahagian = ungkapan.split(/,(?=[a-z_]+\.(?:ilike|eq)\.)/i).map((b) => {
      const [, k, op, v] = b.match(/^([a-z_]+)\.(ilike|eq)\.(.*)$/i) ?? []
      if (!k) throw new Error(`Penapis tidak disokong: ${b}`)
      return op === 'ilike'
        ? `${pengenal(k)}::text ilike ${this.p(v)}`
        : `${pengenal(k)} = ${this.p(v)}`
    })
    this.syarat.push(`(${bahagian.join(' or ')})`)
    return this
  }
  order(k: string, o?: { ascending?: boolean; nullsFirst?: boolean }) {
    const arah = o?.ascending === false ? 'desc' : 'asc'
    const nulls = o?.nullsFirst === undefined ? '' : o.nullsFirst ? ' nulls first' : ' nulls last'
    this.susunan.push(`${pengenal(k)} ${arah}${nulls}`)
    return this
  }
  limit(n: number) {
    this.had = n
    return this
  }
  range(dari: number, hingga: number) {
    this.ofset = dari
    this.had = hingga - dari + 1
    return this
  }
  single() {
    this.tunggal = 'wajib'
    return this
  }
  maybeSingle() {
    this.tunggal = 'mungkin'
    return this
  }

  private binaSql(): string {
    const t = pengenal(this.jadual)
    const where = this.syarat.length ? ` where ${this.syarat.join(' and ')}` : ''

    if (this.op === 'select') {
      const lajur =
        this.lajur.trim() === '*' ? '*' : this.lajur.split(',').map((c) => pengenal(c.trim())).join(', ')
      const order = this.susunan.length ? ` order by ${this.susunan.join(', ')}` : ''
      const limit = this.had ? ` limit ${Math.floor(this.had)}` : ''
      const offset = this.ofset ? ` offset ${Math.floor(this.ofset)}` : ''
      return `select to_jsonb(x) as r from (select ${lajur} from ${t}${where}${order}${limit}${offset}) x`
    }

    let ubah: string
    if (this.op === 'delete') {
      ubah = `delete from ${t}${where} returning *`
    } else if (this.op === 'update') {
      const set = Object.entries(this.nilai[0])
        .map(([k, v]) => `${pengenal(k)} = ${this.p(v)}`)
        .join(', ')
      ubah = `update ${t} set ${set}${where} returning *`
    } else {
      const lajur = [...new Set(this.nilai.flatMap((b) => Object.keys(b)))]
      const baris = this.nilai
        .map((b) => `(${lajur.map((k) => (k in b ? this.p(b[k]) : 'default')).join(', ')})`)
        .join(', ')
      ubah = `insert into ${t} (${lajur.map(pengenal).join(', ')}) values ${baris}`
      if (this.op === 'upsert') {
        const set = lajur
          .filter((k) => k !== this.konflik)
          .map((k) => `${pengenal(k)} = excluded.${pengenal(k)}`)
          .join(', ')
        ubah += ` on conflict (${pengenal(this.konflik!)}) do update set ${set}`
      }
      ubah += ' returning *'
    }
    return `with x as (${ubah}) select to_jsonb(x) as r from x`
  }

  private async laksana(): Promise<Hasil> {
    try {
      const { dalamTransaksi } = await enjin()
      const sql = this.binaSql()
      const baris = await dalamTransaksi({ uid: uidSemasa() }, async (tx) =>
        (await tx.query<{ r: any }>(sql, this.param)).rows.map((x) => x.r),
      )
      if (this.op !== 'select' && !this.pulangkan && !this.tunggal) {
        return { data: null, error: null }
      }
      if (this.tunggal) {
        if (baris.length === 1) return { data: baris[0], error: null }
        if (baris.length === 0 && this.tunggal === 'mungkin') return { data: null, error: null }
        return {
          data: null,
          error: {
            code: 'PGRST116',
            message:
              baris.length === 0
                ? 'Rekod tidak dijumpai atau di luar skop capaian anda.'
                : 'Lebih daripada satu rekod dipulangkan.',
          },
        }
      }
      return { data: baris, error: null }
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : String(e) } }
    }
  }

  then<A = Hasil, B = never>(
    ok?: ((v: Hasil) => A | PromiseLike<A>) | null,
    gagal?: ((e: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return this.laksana().then(ok, gagal)
  }
}

// ── RPC ─────────────────────────────────────────────────────────────

const bentukFungsi = new Map<string, { set: boolean; komposit: boolean }>()

async function rpc(nama: string, param: Record<string, unknown> = {}): Promise<Hasil> {
  try {
    const { dalamTransaksi, sebagaiPelayan } = await enjin()
    let bentuk = bentukFungsi.get(nama)
    if (!bentuk) {
      const r = await sebagaiPelayan((tx) =>
        tx.query<{ set: boolean; komposit: boolean }>(
          `select p.proretset as set, t.typtype = 'c' as komposit
             from pg_proc p join pg_type t on t.oid = p.prorettype
            where p.proname = $1 and p.pronamespace = 'public'::regnamespace limit 1`,
          [nama],
        ),
      )
      if (!r.rows[0]) throw new Error(`Fungsi ${nama} tidak wujud`)
      bentuk = r.rows[0]
      bentukFungsi.set(nama, bentuk)
    }
    const kunci = Object.keys(param)
    const hujah = kunci.map((k, i) => `${pengenal(k)} => $${i + 1}`).join(', ')
    const nilai = kunci.map((k) => nilaiParam(param[k]))
    const panggil = `${pengenal(nama)}(${hujah})`

    const data = await dalamTransaksi({ uid: uidSemasa() }, async (tx) => {
      if (bentuk!.komposit) {
        const r = await tx.query<{ r: any }>(`select to_jsonb(x) as r from ${panggil} x`, nilai)
        return bentuk!.set ? r.rows.map((x) => x.r) : (r.rows[0]?.r ?? null)
      }
      const r = await tx.query<{ r: any }>(`select ${panggil} as r`, nilai)
      return bentuk!.set ? r.rows.map((x) => x.r) : (r.rows[0]?.r ?? null)
    })
    return { data, error: null }
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : String(e) } }
  }
}

// ── Auth ────────────────────────────────────────────────────────────

const auth = {
  async getSession() {
    return { data: { session: sesiSemasa() }, error: null }
  },

  onAuthStateChange(f: Pendengar) {
    pendengar.add(f)
    return { data: { subscription: { unsubscribe: () => pendengar.delete(f) } } }
  },

  async signInWithOtp({ email, options }: { email: string; options?: { shouldCreateUser?: boolean } }) {
    const { sebagaiPelayan } = await enjin()
    const ada = await sebagaiPelayan((tx) =>
      tx.query('select 1 from auth.users where lower(email) = lower($1)', [email]),
    )
    if (ada.rows.length === 0 && options?.shouldCreateUser === false) {
      return { data: null, error: { message: 'Signups not allowed for otp' } }
    }
    const kod = String(Math.floor(100000 + Math.random() * 900000))
    kodOtp.set(email.toLowerCase(), kod)
    window.dispatchEvent(new CustomEvent('elawatan-demo-otp', { detail: { emel: email, kod } }))
    return { data: {}, error: null }
  },

  async verifyOtp({ email, token }: { email: string; token: string }) {
    if (kodOtp.get(email.toLowerCase()) !== token) {
      return { data: null, error: { message: 'Token has expired or is invalid' } }
    }
    kodOtp.delete(email.toLowerCase())
    const sesi = await logMasukTerus(email)
    return { data: { session: sesi, user: sesi.user }, error: null }
  },

  async signOut() {
    tetapkanSesi(null, 'SIGNED_OUT')
    return { error: null }
  },

  /** Memasang sesi yang dipulangkan oleh tiruan Edge Function log-masuk. */
  async setSession({ access_token }: { access_token: string; refresh_token: string }) {
    const id = access_token.replace(/^demo\./, '')
    const { sebagaiPelayan } = await enjin()
    const r = await sebagaiPelayan((tx) =>
      tx.query<{ id: string; email: string }>('select id, email from auth.users where id = $1', [id]),
    )
    const p = r.rows[0]
    if (!p) return { data: { session: null }, error: { message: 'Sesi tidak sah' } }
    const sesi: Sesi = { access_token, user: { id: p.id, email: p.email } }
    tetapkanSesi(sesi, 'SIGNED_IN')
    return { data: { session: sesi, user: sesi.user }, error: null }
  },
}

async function logMasukTerus(email: string): Promise<Sesi> {
  const { sebagaiPelayan } = await enjin()
  const emel = email.toLowerCase()
  const id = await sebagaiPelayan(async (tx) => {
    const ada = await tx.query<{ id: string }>('select id from auth.users where lower(email) = $1', [emel])
    if (ada.rows[0]) return ada.rows[0].id
    // Mencetuskan handle_pengguna_baharu, sama seperti pengesahan OTP sebenar
    const baru = await tx.query<{ id: string }>('insert into auth.users (email) values ($1) returning id', [emel])
    return baru.rows[0].id
  })
  const sesi: Sesi = { access_token: `demo.${id}`, user: { id, email: emel } }
  tetapkanSesi(sesi, 'SIGNED_IN')
  return sesi
}

// ── Edge Functions (tiruan) ─────────────────────────────────────────

async function pegawaiSemasa() {
  const uid = uidSemasa()
  if (!uid) return null
  const { sebagaiPelayan } = await enjin()
  const r = await sebagaiPelayan((tx) =>
    tx.query<{ id: string; emel: string }>(
      'select id, emel from pegawai where user_id = $1 and aktif',
      [uid],
    ),
  )
  return r.rows[0] ?? null
}

const DOMAIN = (import.meta.env.VITE_DOMAIN_DIBENARKAN ?? 'moe-dl.edu.my,moe.edu.my,moe.gov.my')
  .split(',')
  .map((d: string) => d.trim().toLowerCase())

type Sekatan = {
  disekat: boolean
  cubaan_gagal: number
  baki_cubaan: number
  saat_lagi: number
  had: number
}

/** Cincangan ringkas untuk demo sahaja; Supabase sebenar menggunakan bcrypt. */
async function cincangKataLaluan(kata: string, garam: string): Promise<string> {
  const bait = new TextEncoder().encode(`${garam}:${kata}`)
  const c = await crypto.subtle.digest('SHA-256', bait)
  return [...new Uint8Array(c)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Mod demo tiada capaian ke perkhidmatan semakan kebocoran, jadi hanya
// senarai pendek kata laluan lazim disekat di sini.
const KATA_LALUAN_LAZIM = [
  'kata laluan', 'katalaluan123', 'password1234', '123456789012',
  'qwertyuiop12', 'abcd12345678', 'adminadmin12',
]

function semakKataLaluanDemo(kata: string, emel: string): string | null {
  if ((kata ?? '').length < 12) return 'Kata laluan mesti sekurang-kurangnya 12 aksara.'
  if (kata.trim().length < 12) return 'Kata laluan tidak boleh terdiri daripada ruang kosong.'
  if (kata.toLowerCase().includes(emel.split('@')[0].toLowerCase())) {
    return 'Kata laluan tidak boleh mengandungi nama e-mel anda.'
  }
  if (KATA_LALUAN_LAZIM.includes(kata.toLowerCase())) {
    return 'Kata laluan ini pernah bocor dalam kebocoran data awam. Sila pilih yang lain.'
  }
  return null
}

// URL blob dicache supaya imej yang sama tidak dicipta berulang kali.
const cacheImej = new Map<string, string>()

async function urlImej(kunci: string[]): Promise<Record<string, string>> {
  const { bacaFail } = await import('./stor-fail')
  const hasil: Record<string, string> = {}
  for (const k of new Set(kunci)) {
    let u = cacheImej.get(k)
    if (!u) {
      const blob = await bacaFail(k)
      if (!blob) continue
      u = URL.createObjectURL(blob)
      cacheImej.set(k, u)
    }
    hasil[k] = u
  }
  return hasil
}

const fungsi: Record<string, (b: any) => Promise<unknown>> = {
  async 'daftar-semak'({ emel }: { emel: string }) {
    const { sebagaiPelayan } = await enjin()
    const bersih = String(emel).trim().toLowerCase()
    if (!DOMAIN.includes(bersih.split('@')[1] ?? '')) {
      return {
        status: 'DOMAIN_TIDAK_SAH',
        mesej: `Hanya e-mel domain ${DOMAIN.join(' atau ')} diterima.`,
      }
    }
    return sebagaiPelayan(async (tx) => {
      const g = (
        await tx.query<any>(
          `select nama, peranan, kod_skop, jawatan, user_id, aktif, kata_laluan_ditetapkan
             from pegawai where lower(emel) = $1`,
          [bersih],
        )
      ).rows[0]
      if (g) {
        if (!g.aktif) {
          return {
            status: 'AKAUN_TIDAK_AKTIF',
            mesej: 'Akaun ini telah dinyahaktifkan. Sila hubungi pentadbir sistem.',
          }
        }
        const butiran = { nama: g.nama, peranan: g.peranan, jawatan: g.jawatan, kod_skop: g.kod_skop }
        if (g.kata_laluan_ditetapkan) {
          const s = await tx.query<{ s: Sekatan }>('select status_sekatan($1) s', [bersih])
          return {
            status: 'ADA_KATA_LALUAN',
            mesej: 'Sila masukkan kata laluan anda.',
            pegawai: butiran,
            sekatan: s.rows[0].s,
          }
        }
        return {
          status: 'PERLU_KATA_LALUAN',
          mesej: g.user_id
            ? 'Sistem kini menggunakan kata laluan. Sila cipta kata laluan anda.'
            : 'Akaun anda telah didaftarkan. Sila cipta kata laluan untuk kali pertama.',
          pegawai: butiran,
          pernah_masuk: !!g.user_id,
        }
      }
      const s = (
        await tx.query<any>(
          `select s.kod_sekolah, s.nama, s.jenis, s.kod_ppd, s.kod_jpn, s.negeri, s.aktif,
                  coalesce(d.nama, s.kod_ppd) as nama_ppd
             from sekolah s left join ppd d on d.kod_ppd = s.kod_ppd
            where lower(s.emel) = $1`,
          [bersih],
        )
      ).rows[0]
      if (!s) {
        return {
          status: 'TIADA_DALAM_SENARAI',
          mesej: 'E-mel ini tiada dalam senarai sekolah JPN. Sila hubungi pentadbir sistem.',
        }
      }
      if (!s.aktif) {
        return { status: 'SEKOLAH_TIDAK_AKTIF', mesej: 'Rekod sekolah ini tidak aktif. Sila hubungi pentadbir sistem.' }
      }
      const { aktif: _, ...sekolah } = s
      return { status: 'PADANAN_DIJUMPAI', mesej: 'Padanan dijumpai.', sekolah }
    })
  },

  async 'r2-naik'(b: { permohonan_id: string; jenis_dokumen: string; nama_fail: string; saiz: number }) {
    const g = await pegawaiSemasa()
    if (!g) return { ralat: 'Tidak dibenarkan.' }
    if (b.saiz > 10 * 1024 * 1024) return { ralat: 'Saiz fail melebihi had 10 MB.' }
    const { sebagaiPelayan } = await enjin()
    const boleh = await sebagaiPelayan((tx) =>
      tx.query<{ b: boolean }>('select boleh_sunting_permohonan_bagi($1, $2) as b', [b.permohonan_id, g.id]),
    )
    if (!boleh.rows[0]?.b) {
      return { ralat: 'Permohonan ini tidak boleh disunting oleh akaun anda pada status semasa.' }
    }
    const bersih = b.nama_fail.replace(/[^\w.\-]+/g, '_').slice(-120)
    const kunci = `permohonan/${b.permohonan_id}/${b.jenis_dokumen}/${crypto.randomUUID()}-${bersih}`
    return { url: `demo://${kunci}`, kunci_r2: kunci, tamat_dalam_saat: 900 }
  },

  async 'r2-lihat'({ dokumen_id }: { dokumen_id: string }) {
    const g = await pegawaiSemasa()
    if (!g) return { ralat: 'Tidak dibenarkan.' }
    const { sebagaiPelayan } = await enjin()
    const { bacaFail } = await import('./stor-fail')
    return sebagaiPelayan(async (tx) => {
      const d = (await tx.query<any>('select * from dokumen where id = $1', [dokumen_id])).rows[0]
      if (!d) return { ralat: 'Dokumen tidak dijumpai.' }
      const boleh = await tx.query<{ b: boolean }>(
        'select boleh_lihat_permohonan_bagi($1, $2) as b',
        [d.permohonan_id, g.id],
      )
      if (!boleh.rows[0]?.b) return { ralat: 'Dokumen ini di luar skop capaian anda.' }
      const blob = await bacaFail(d.kunci_r2)
      if (!blob) return { ralat: 'Fail demo tidak lagi tersedia dalam pelayar ini.' }
      await tx.query(
        `insert into log_audit (permohonan_id, pegawai_id, emel_pegawai, peristiwa, nilai_baharu)
         values ($1, $2, $3, 'DOKUMEN_DILIHAT', $4)`,
        [d.permohonan_id, g.id, g.emel, JSON.stringify({ dokumen_id: d.id, nama_fail: d.nama_fail })],
      )
      return {
        url: URL.createObjectURL(blob),
        tamat_dalam_saat: 300,
        dokumen: {
          nama_fail: d.nama_fail,
          jenis_mime: d.jenis_mime,
          saiz: Number(d.saiz),
          cincangan_sha256: d.cincangan_sha256,
          dimuat_naik_pada: d.dimuat_naik_pada,
        },
      }
    })
  },

  async 'log-masuk'({ emel, kata_laluan }: { emel: string; kata_laluan: string }) {
    const { sebagaiPelayan } = await enjin()
    const bersih = String(emel).trim().toLowerCase()

    const sekatan = await sebagaiPelayan((tx) =>
      tx.query<{ s: Sekatan }>('select status_sekatan($1) s', [bersih]),
    )
    const s = sekatan.rows[0].s
    if (s.disekat) {
      return {
        ralat: `Akaun disekat sementara selepas ${s.had} percubaan gagal. Cuba lagi dalam ${Math.ceil(s.saat_lagi / 60)} minit.`,
        disekat: true,
        saat_lagi: s.saat_lagi,
      }
    }

    const cincang = await cincangKataLaluan(kata_laluan, bersih)
    const pengguna = await sebagaiPelayan((tx) =>
      tx.query<{ id: string; kata_laluan: string | null; aktif: boolean | null }>(
        `select u.id, u.kata_laluan, g.aktif
           from auth.users u left join pegawai g on g.user_id = u.id
          where lower(u.email) = $1`,
        [bersih],
      ),
    )
    const p = pengguna.rows[0]

    if (!p || !p.kata_laluan || p.kata_laluan !== cincang) {
      await sebagaiPelayan((tx) => tx.query('select rekod_cubaan($1, false, null)', [bersih]))
      const selepas = await sebagaiPelayan((tx) =>
        tx.query<{ s: Sekatan }>('select status_sekatan($1) s', [bersih]),
      )
      const t = selepas.rows[0].s
      return t.disekat
        ? {
            ralat: `Akaun disekat sementara selepas ${t.had} percubaan gagal. Cuba lagi dalam ${Math.ceil(t.saat_lagi / 60)} minit.`,
            disekat: true,
            saat_lagi: t.saat_lagi,
          }
        : { ralat: 'E-mel atau kata laluan tidak betul.', baki_cubaan: t.baki_cubaan }
    }

    if (p.aktif === false) {
      return { ralat: 'Akaun ini telah dinyahaktifkan. Sila hubungi pentadbir sistem.' }
    }

    await sebagaiPelayan((tx) => tx.query('select rekod_cubaan($1, true, null)', [bersih]))
    return { sesi: { access_token: `demo.${p.id}`, refresh_token: p.id } }
  },

  async 'tetap-kata-laluan'({ kata_laluan }: { kata_laluan: string }) {
    const sesi = sesiSemasa()
    if (!sesi) return { ralat: 'Tidak dibenarkan.' }

    const masalah = semakKataLaluanDemo(kata_laluan, sesi.user.email)
    if (masalah) return { ralat: masalah }

    const cincang = await cincangKataLaluan(kata_laluan, sesi.user.email)
    const { sebagaiPelayan } = await enjin()
    await sebagaiPelayan(async (tx) => {
      await tx.query('update auth.users set kata_laluan = $1 where id = $2', [cincang, sesi.user.id])
      await tx.query(
        `update pegawai set kata_laluan_ditetapkan = true, log_masuk_terakhir = now()
          where user_id = $1`,
        [sesi.user.id],
      )
      await tx.query(
        `insert into log_audit (pegawai_id, emel_pegawai, peristiwa)
         select id, emel, 'KATA_LALUAN_DITETAPKAN' from pegawai where user_id = $1`,
        [sesi.user.id],
      )
      await tx.query('select rekod_cubaan($1, true, null)', [sesi.user.email])
    })
    return { berjaya: true }
  },

  async 'r2-tandatangan'(
    b:
      | { tujuan: 'naik'; jenis: string; jenis_mime: string; saiz: number }
      | { tujuan: 'profil' }
      | { tujuan: 'cetak'; permohonan_id: string },
  ) {
    const g = await pegawaiSemasa()
    if (!g) return { ralat: 'Tidak dibenarkan.' }
    const { sebagaiPelayan } = await enjin()

    if (b.tujuan === 'naik') {
      const ext = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' } as Record<string, string>)[
        b.jenis_mime
      ]
      if (b.jenis !== 'tandatangan' && b.jenis !== 'cop') return { ralat: 'Jenis imej tidak sah.' }
      if (!ext) return { ralat: 'Hanya imej PNG, JPEG atau WebP diterima.' }
      if (!(b.saiz > 0) || b.saiz > 1024 * 1024) return { ralat: 'Saiz imej mesti tidak melebihi 1 MB.' }
      const kunci = `profil/${g.id}/${b.jenis}/${crypto.randomUUID()}.${ext}`
      return { url: `demo://${kunci}`, kunci_r2: kunci }
    }

    let kunci: string[] = []
    if (b.tujuan === 'profil') {
      const r = await sebagaiPelayan((tx) =>
        tx.query<{ t: string | null; c: string | null }>(
          `select case when g.peranan = 'sekolah' then s.kunci_tandatangan_gb else g.kunci_tandatangan end t,
                  case when g.peranan = 'sekolah' then s.kunci_cop else g.kunci_cop end c
             from pegawai g left join sekolah s on s.kod_sekolah = g.kod_skop
            where g.id = $1`,
          [g.id],
        ),
      )
      kunci = [r.rows[0]?.t, r.rows[0]?.c].filter((x): x is string => !!x)
    } else if (b.tujuan === 'cetak') {
      const r = await sebagaiPelayan(async (tx) => {
        const boleh = await tx.query<{ b: boolean }>(
          'select boleh_lihat_permohonan_bagi($1, $2) as b',
          [b.permohonan_id, g.id],
        )
        if (!boleh.rows[0]?.b) return null
        return tx.query<{ k: string }>('select k from kunci_imej_permohonan($1) k', [b.permohonan_id])
      })
      if (!r) return { ralat: 'Permohonan ini di luar skop capaian anda.' }
      kunci = r.rows.map((x) => x.k)
    } else {
      return { ralat: 'Tujuan permintaan tidak dikenali.' }
    }
    return { imej: await urlImej(kunci) }
  },

  async 'r2-padam'({ dokumen_id }: { dokumen_id: string }) {
    const g = await pegawaiSemasa()
    if (!g) return { ralat: 'Tidak dibenarkan.' }
    const { sebagaiPelayan } = await enjin()
    const { padamFail } = await import('./stor-fail')
    return sebagaiPelayan(async (tx) => {
      const d = (await tx.query<any>('select * from dokumen where id = $1', [dokumen_id])).rows[0]
      if (!d) return { ralat: 'Dokumen tidak dijumpai.' }
      const boleh = await tx.query<{ b: boolean }>(
        'select boleh_sunting_permohonan_bagi($1, $2) as b',
        [d.permohonan_id, g.id],
      )
      if (!boleh.rows[0]?.b) return { ralat: 'Dokumen tidak boleh dipadam pada status permohonan semasa.' }
      await padamFail(d.kunci_r2)
      await tx.query('delete from dokumen where id = $1', [d.id])
      await tx.query(
        `insert into log_audit (permohonan_id, pegawai_id, emel_pegawai, peristiwa, nilai_lama)
         values ($1, $2, $3, 'DOKUMEN_DIPADAM', $4)`,
        [d.permohonan_id, g.id, g.emel, JSON.stringify({ dokumen_id: d.id, nama_fail: d.nama_fail })],
      )
      return { berjaya: true }
    })
  },
}

// ── Eksport ─────────────────────────────────────────────────────────

const klien = {
  from: (jadual: string) => new Pembina(jadual),
  rpc,
  auth,
  functions: {
    async invoke(nama: string, o?: { body?: unknown }): Promise<Hasil> {
      const f = fungsi[nama]
      if (!f) return { data: null, error: { message: `Fungsi ${nama} tiada dalam mod demo` } }
      try {
        return { data: await f(o?.body ?? {}), error: null }
      } catch (e) {
        return { data: null, error: { message: e instanceof Error ? e.message : String(e) } }
      }
    },
  },
}

export const supabase = klien as unknown as SupabaseClient

/** Pengganti muat naik R2: simpan fail dalam IndexedDB pelayar. */
export async function hantarFail(
  url: string,
  fail: File,
  onKemajuan: (peratus: number) => void,
): Promise<void> {
  const { simpanFail } = await import('./stor-fail')
  onKemajuan(0.3)
  await simpanFail(url.replace(/^demo:\/\//, ''), fail)
  onKemajuan(1)
}

/** Kawalan khas mod demo untuk baner. */
export const demo = {
  akaun: [
    { emel: 'aba1234@moe-dl.edu.my', label: 'Sekolah — SK Seri Kinta' },
    { emel: 'ppd.ku.pegawai@moe.gov.my', label: 'Pegawai PPD Kinta Utara (penyemak)' },
    { emel: 'ppd.ku.ketua@moe.gov.my', label: 'PPD Kinta Utara (pengesah, Bhg G)' },
    { emel: 'jpn.pegawai@moe.gov.my', label: 'Pegawai JPN (penyemak)' },
    { emel: 'jpn.pengarah@moe.gov.my', label: 'Pengarah JPN (pengesah, Bhg H)' },
    { emel: 'kpm.penyelaras@moe.gov.my', label: 'Bahagian Penyelaras KPM (Bhg J)' },
    { emel: 'admin.elawatan@moe.gov.my', label: 'Pentadbir Sistem' },
  ],
  logMasukSebagai: (emel: string) => logMasukTerus(emel),
  async setSemula() {
    tetapkanSesi(null, 'SIGNED_OUT')
    const { setSemula } = await enjin()
    const { kosongkanStor } = await import('./stor-fail')
    await setSemula()
    await kosongkanStor()
  },
  sedia: () => enjin().then((e) => e.pangkalan()).then(() => undefined),
}
