import Dexie, { Table } from './dexie-lite'

const DB_NAME = 'endo-mini-storage'
const DB_VERSION = 1
const STORAGE_KEY = 'endo_mini_v1_data'
const SETTINGS_KEY = 'endo_mini_v1_settings'
const ENC_KEY = 'endo_mini_v1_cipher'

export type SettingsRecord = {
  quickMode: boolean
  encryption: boolean
  kdfStrong: boolean
  compactPdf: boolean
}

export const DEFAULT_SETTINGS: SettingsRecord = {
  quickMode: true,
  encryption: false,
  kdfStrong: false,
  compactPdf: false,
}

export type EntryRecord = {
  date: string
  [key: string]: any
}

type MetaValue = any

type MetaRecord = {
  key: string
  value: MetaValue
}

type CipherBundle = {
  mode: 'gcm' | 'plain'
  iv?: number[]
  salt?: number[]
  iter?: number
  version: number
  data: string
}

class EndoDatabase extends Dexie {
  entries!: Table<EntryRecord, string>
  meta!: Table<MetaRecord, string>

  constructor() {
    super(DB_NAME)
    this.version(DB_VERSION).stores({
      entries: '&date',
      meta: '&key',
    })
    this.entries = this.table('entries')
    this.meta = this.table('meta')
  }
}

let dbInstance: EndoDatabase | null = null

function getDbInstance(): EndoDatabase {
  if (!dbInstance) {
    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB ist nicht verfügbar')
    }
    dbInstance = new EndoDatabase()
    dbInstance.on('versionchange', () => {
      dbInstance?.close()
    })
  }
  return dbInstance
}

async function ensureDb(): Promise<EndoDatabase> {
  const db = getDbInstance()
  if (!db.isOpen()) {
    try {
      await db.open()
    } catch (error) {
      db.close()
      dbInstance = null
      throw error
    }
  }
  return db
}

function sanitizeEntries(entries: any[]): EntryRecord[] {
  if (!Array.isArray(entries)) return []
  const seen = new Set<string>()
  const cleaned: EntryRecord[] = []
  entries.forEach(raw => {
    if (!raw || typeof raw !== 'object') return
    const date = (raw as any).date
    if (typeof date !== 'string' || !date) return
    if (seen.has(date)) return
    seen.add(date)
    cleaned.push({ ...(raw as Record<string, any>), date })
  })
  return cleaned
}

function getCrypto(): Crypto | null {
  if (typeof window === 'undefined') return null
  return window.crypto ?? null
}

async function deriveKey(pass: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const crypto = getCrypto()
  if (!crypto?.subtle) throw new Error('WebCrypto nicht verfügbar')
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk)
    binary += String.fromCharCode(...slice)
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function encryptEntries(entries: EntryRecord[], pass: string, iterations: number): Promise<CipherBundle> {
  const crypto = getCrypto()
  if (!crypto?.subtle || !pass) {
    return { mode: 'plain', version: 1, data: JSON.stringify(entries) }
  }
  const enc = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveKey(pass, salt, iterations)
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(entries)))
  return {
    mode: 'gcm',
    iv: Array.from(iv),
    salt: Array.from(salt),
    iter: iterations,
    version: 1,
    data: bytesToBase64(new Uint8Array(cipher)),
  }
}

async function decryptEntries(bundle: CipherBundle, pass: string): Promise<EntryRecord[] | null> {
  if (!bundle) return null
  if (bundle.mode !== 'gcm') {
    try {
      return bundle.data ? sanitizeEntries(JSON.parse(bundle.data)) : []
    } catch {
      return []
    }
  }
  try {
    const crypto = getCrypto()
    if (!crypto?.subtle) return null
    const iv = new Uint8Array(bundle.iv ?? [])
    const salt = new Uint8Array(bundle.salt ?? [])
    const iterations = bundle.iter ?? 120000
    const key = await deriveKey(pass, salt, iterations)
    const bytes = base64ToBytes(bundle.data)
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, bytes)
    const dec = new TextDecoder()
    return sanitizeEntries(JSON.parse(dec.decode(plain)))
  } catch {
    return null
  }
}

async function getMetaValue<T = MetaValue>(key: string): Promise<T | undefined> {
  const db = await ensureDb()
  const record = await db.meta.get(key)
  return record?.value as T | undefined
}

async function putMetaValue(key: string, value: MetaValue): Promise<void> {
  const db = await ensureDb()
  await db.meta.put({ key, value })
}

async function deleteMetaValue(key: string): Promise<void> {
  const db = await ensureDb()
  await db.meta.delete(key)
}

async function readAllEntries(): Promise<EntryRecord[]> {
  const db = await ensureDb()
  return db.entries.toArray()
}

async function clearEntries(): Promise<void> {
  const db = await ensureDb()
  await db.entries.clear()
}

async function bulkPutEntries(entries: EntryRecord[]): Promise<void> {
  if (!entries.length) return
  const db = await ensureDb()
  await db.entries.bulkPut(entries)
}

export async function loadSettings(): Promise<SettingsRecord> {
  try {
    const stored = await getMetaValue<Partial<SettingsRecord>>('settings')
    if (stored && typeof stored === 'object') {
      return { ...DEFAULT_SETTINGS, ...stored }
    }
  } catch (error) {
    console.warn('Einstellungen konnten nicht geladen werden', error)
  }
  return { ...DEFAULT_SETTINGS }
}

export async function saveSettings(settings: Partial<SettingsRecord>): Promise<void> {
  const next = { ...DEFAULT_SETTINGS, ...settings }
  await putMetaValue('settings', next)
}

export async function loadEntries(
  pass: string,
  settings: Partial<SettingsRecord>
): Promise<{ entries: EntryRecord[]; locked: boolean }> {
  try {
    const bundle = (await getMetaValue<CipherBundle>('enc_bundle')) ?? null
    if (bundle) {
      if (!pass || pass.length < 4) {
        return { entries: [], locked: true }
      }
      const decrypted = await decryptEntries(bundle, pass)
      if (!decrypted) {
        return { entries: [], locked: true }
      }
      return { entries: sanitizeEntries(decrypted), locked: false }
    }
    const plainEntries = await readAllEntries()
    return { entries: sanitizeEntries(plainEntries), locked: false }
  } catch (error) {
    console.error('Einträge konnten nicht geladen werden', error)
    return { entries: [], locked: false }
  }
}

export async function saveEntries(
  entries: EntryRecord[],
  pass: string,
  settings: Partial<SettingsRecord>
): Promise<'plain' | 'encrypted' | 'skip'> {
  const currentSettings = { ...DEFAULT_SETTINGS, ...settings }
  const sanitized = sanitizeEntries(entries)

  if (currentSettings.encryption && (!pass || pass.length < 4)) {
    return 'skip'
  }

  const db = await ensureDb()

  await db.meta.put({ key: 'version', value: 1 })

  if (currentSettings.encryption) {
    const iterations = currentSettings.kdfStrong ? 310000 : 120000
    const bundle = await encryptEntries(sanitized, pass, iterations)
    await db.meta.put({ key: 'enc_bundle', value: bundle })
    await db.entries.clear()
    return 'encrypted'
  }

  await db.meta.delete('enc_bundle')
  await db.entries.clear()
  if (sanitized.length) {
    await db.entries.bulkPut(sanitized)
  }
  return 'plain'
}

export async function migrateFromLocalStorage(): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    await ensureDb()
  } catch (error) {
    console.error('IndexedDB konnte nicht geöffnet werden', error)
    return
  }

  try {
    const version = await getMetaValue<number>('version')
    if (version) return

    const rawSettings = window.localStorage?.getItem(SETTINGS_KEY)
    const rawEntries = window.localStorage?.getItem(STORAGE_KEY)
    const rawBundle = window.localStorage?.getItem(ENC_KEY)
    let migrated = false

    if (rawSettings) {
      try {
        const parsed = JSON.parse(rawSettings)
        if (parsed && typeof parsed === 'object') {
          await saveSettings(parsed)
          migrated = true
        }
      } catch (error) {
        console.warn('Einstellungen konnten nicht migriert werden', error)
      }
    }

    if (rawBundle) {
      try {
        const parsed = JSON.parse(rawBundle)
        if (parsed) {
          parsed.version = parsed.version ?? 1
          await putMetaValue('enc_bundle', parsed)
          await clearEntries()
          migrated = true
        }
      } catch (error) {
        console.warn('Verschlüsseltes Bundle konnte nicht migriert werden', error)
      }
    } else if (rawEntries) {
      try {
        const parsed = JSON.parse(rawEntries)
        const sanitized = sanitizeEntries(parsed)
        await clearEntries()
        if (sanitized.length) {
          await bulkPutEntries(sanitized)
        }
        migrated = true
      } catch (error) {
        console.warn('Einträge konnten nicht migriert werden', error)
      }
    }

    if (migrated) {
      window.localStorage?.removeItem(STORAGE_KEY)
      window.localStorage?.removeItem(ENC_KEY)
      window.localStorage?.removeItem(SETTINGS_KEY)
    }

    await putMetaValue('version', 1)
  } catch (error) {
    console.error('Migration fehlgeschlagen', error)
  }
}

export async function clearDatabase(): Promise<void> {
  if (dbInstance?.isOpen()) {
    dbInstance.close()
  }
  dbInstance = null
  try {
    await Dexie.delete(DB_NAME)
  } catch (error) {
    console.error('Löschen der Datenbank fehlgeschlagen', error)
    throw error
  }
}
