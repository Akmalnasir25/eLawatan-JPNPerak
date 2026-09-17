// Pengganti Cloudflare R2 dalam mod demo: fail disimpan dalam IndexedDB
// pelayar supaya pratonton dokumen masih berfungsi selepas muat semula.

const NAMA = 'elawatan-demo-fail'
const STOR = 'objek'

function buka(): Promise<IDBDatabase> {
  return new Promise((selesai, gagal) => {
    const r = indexedDB.open(NAMA, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STOR)
    r.onsuccess = () => selesai(r.result)
    r.onerror = () => gagal(r.error)
  })
}

async function jalan<T>(mod: IDBTransactionMode, kerja: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await buka()
  return new Promise((selesai, gagal) => {
    const r = kerja(db.transaction(STOR, mod).objectStore(STOR))
    r.onsuccess = () => { selesai(r.result); db.close() }
    r.onerror = () => { gagal(r.error); db.close() }
  })
}

export const simpanFail = (kunci: string, fail: Blob) =>
  jalan('readwrite', (s) => s.put(fail, kunci)).then(() => undefined)

export const bacaFail = (kunci: string) =>
  jalan<Blob | undefined>('readonly', (s) => s.get(kunci))

export const padamFail = (kunci: string) =>
  jalan('readwrite', (s) => s.delete(kunci)).then(() => undefined)

export function kosongkanStor(): Promise<void> {
  return new Promise((selesai) => {
    const r = indexedDB.deleteDatabase(NAMA)
    r.onsuccess = r.onerror = r.onblocked = () => selesai()
  })
}
