// ════════════════════════════════════════════════════════════════════
// hantar-notifikasi — Hantar baris gilir notifikasi melalui e-mel
//
// Dipanggil oleh jadual (pg_cron + pg_net) setiap beberapa minit dengan
// kunci peranan perkhidmatan. Bukan untuk pelayar. Penyedia e-mel ialah
// Resend (https://resend.com); tanpa RESEND_API_KEY fungsi ini tidak
// menyentuh baris gilir, jadi tiada notifikasi hilang.
// ════════════════════════════════════════════════════════════════════

import { jawapan, kendaliOptions, ralat } from '../_shared/cors.ts'
import { klienPentadbir } from '../_shared/supabase.ts'

const KUNCI_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const KUNCI_RESEND = Deno.env.get('RESEND_API_KEY') ?? ''
const DARIPADA = Deno.env.get('EMEL_DARIPADA') ?? 'eLAWATAN Perak <no-reply@example.com>'
const URL_SISTEM = (Deno.env.get('URL_SISTEM') ?? '').replace(/\/$/, '')

type Baris = { id: number; emel: string; nama: string; tajuk: string; mesej: string; pautan: string | null }

const lepas = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function html(b: Baris): string {
  const pautan = b.pautan && URL_SISTEM ? `${URL_SISTEM}${b.pautan}` : URL_SISTEM
  return `<!doctype html><html lang="ms"><body style="margin:0;background:#f4f6fa;font-family:Arial,sans-serif;color:#1e293b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="background:#1b2a5e;color:#fff;padding:16px 24px;font-weight:bold">eLAWATAN · Jabatan Pendidikan Negeri Perak</td></tr>
<tr><td style="padding:24px">
<p style="margin:0 0 8px">Assalamualaikum dan salam sejahtera ${lepas(b.nama)},</p>
<h1 style="font-size:18px;margin:16px 0 8px">${lepas(b.tajuk)}</h1>
<p style="margin:0 0 20px;line-height:1.5">${lepas(b.mesej)}</p>
${pautan ? `<a href="${lepas(pautan)}" style="display:inline-block;background:#1f5fbf;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:bold">Buka dalam sistem</a>` : ''}
</td></tr>
<tr><td style="padding:16px 24px;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0">
E-mel ini dijana secara automatik. Jangan balas e-mel ini.</td></tr>
</table></td></tr></table></body></html>`
}

async function hantar(b: Baris): Promise<string | null> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KUNCI_RESEND}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: DARIPADA,
      to: [b.emel],
      subject: `[eLAWATAN] ${b.tajuk}`,
      html: html(b),
      text: `${b.tajuk}\n\n${b.mesej}\n\n${b.pautan && URL_SISTEM ? URL_SISTEM + b.pautan : ''}`,
    }),
  })
  if (res.ok) return null
  return `${res.status} ${(await res.text()).slice(0, 300)}`
}

Deno.serve(async (req) => {
  const pra = kendaliOptions(req)
  if (pra) return pra

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!KUNCI_SERVICE || token !== KUNCI_SERVICE) return ralat('Tidak dibenarkan.', 401)
  if (!KUNCI_RESEND) return ralat('RESEND_API_KEY belum ditetapkan; baris gilir tidak disentuh.', 503)

  try {
    const db = klienPentadbir()
    const { data, error } = await db.rpc('ambil_notifikasi_emel', { p_had: 50 })
    if (error) throw error

    let dihantar = 0
    let gagal = 0
    for (const b of (data ?? []) as Baris[]) {
      let masalah: string | null
      try {
        masalah = await hantar(b)
      } catch (e) {
        masalah = e instanceof Error ? e.message : String(e)
      }
      await db.rpc('tanda_emel_notifikasi', { p_id: b.id, p_berjaya: !masalah, p_ralat: masalah })
      if (masalah) gagal++
      else dihantar++
    }
    return jawapan({ dihantar, gagal })
  } catch (e) {
    console.error('hantar-notifikasi', e)
    return ralat('Ralat pelayan semasa menghantar notifikasi.', 500)
  }
})
