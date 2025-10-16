export type StoreSchema = {
  keyPath?: string | string[]
  autoIncrement?: boolean
}

type VersionChangeHandler = () => void

function parseStoreSpec(spec: string): StoreSchema {
  const result: StoreSchema = {}
  const main = spec.split(',')[0]?.trim() ?? ''
  if (!main) return result
  let cursor = main
  if (cursor.startsWith('++')) {
    result.autoIncrement = true
    cursor = cursor.slice(2)
  }
  if (cursor.startsWith('&')) {
    cursor = cursor.slice(1)
  }
  if (cursor) {
    result.keyPath = cursor
  }
  return result
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as T)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB Request Fehler'))
  })
}

class DexieTable<T, Key> {
  constructor(private db: DexieLite, public name: string) {}

  private async withStore<R>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<R> | R): Promise<R> {
    return this.db.withStore(this.name, mode, fn)
  }

  async toArray(): Promise<T[]> {
    const result = await this.withStore('readonly', store => requestToPromise<T[] | undefined>(store.getAll()))
    return Array.isArray(result) ? result : []
  }

  async clear(): Promise<void> {
    await this.withStore('readwrite', store => {
      store.clear()
    })
  }

  async bulkPut(items: T[]): Promise<void> {
    if (!items.length) return
    await this.withStore('readwrite', store => {
      items.forEach(item => {
        store.put(item as any)
      })
    })
  }

  async put(item: T): Promise<void> {
    await this.withStore('readwrite', store => {
      store.put(item as any)
    })
  }

  async get(key: Key): Promise<T | undefined> {
    return this.withStore('readonly', store => requestToPromise<T | undefined>(store.get(key as any)))
  }

  async delete(key: Key): Promise<void> {
    await this.withStore('readwrite', store => {
      store.delete(key as any)
    })
  }
}

class DexieLite {
  name: string
  private versionNumber = 1
  private schema: Record<string, StoreSchema> = {}
  private db: IDBDatabase | null = null
  private opening: Promise<IDBDatabase> | null = null
  private versionHandlers = new Set<VersionChangeHandler>()

  constructor(name: string) {
    this.name = name
  }

  version(versionNumber: number) {
    this.versionNumber = versionNumber
    return {
      stores: (schema: Record<string, string>) => {
        this.schema = {}
        Object.entries(schema).forEach(([storeName, spec]) => {
          this.schema[storeName] = parseStoreSpec(spec)
        })
        return this
      },
    }
  }

  table<T, Key = unknown>(name: string): DexieTable<T, Key> {
    return new DexieTable<T, Key>(this, name)
  }

  isOpen(): boolean {
    return !!this.db
  }

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db
    if (this.opening) return this.opening
    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB ist nicht verfügbar')
    }
    this.opening = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.name, this.versionNumber)
        request.onupgradeneeded = () => {
          const database = request.result
          Object.entries(this.schema).forEach(([storeName, cfg]) => {
            if (!database.objectStoreNames.contains(storeName)) {
              database.createObjectStore(storeName, {
                keyPath: cfg.keyPath,
                autoIncrement: cfg.autoIncrement,
              })
            }
          })
        }
        request.onsuccess = () => {
          const database = request.result
          database.onversionchange = () => {
            this.versionHandlers.forEach(handler => handler())
          }
          this.db = database
          resolve(database)
        }
        request.onerror = () => {
          reject(request.error ?? new Error('IndexedDB Fehler'))
        }
      } catch (error) {
        reject(error as Error)
      }
    })
    this.opening.catch(() => {
      this.opening = null
    })
    return this.opening
  }

  close(): void {
    this.db?.close()
    this.db = null
    this.opening = null
  }

  on(event: 'versionchange', handler: VersionChangeHandler): void {
    if (event === 'versionchange') {
      this.versionHandlers.add(handler)
    }
  }

  off(event: 'versionchange', handler: VersionChangeHandler): void {
    if (event === 'versionchange') {
      this.versionHandlers.delete(handler)
    }
  }

  async withStore<R>(name: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<R> | R): Promise<R> {
    const database = await this.open()
    return new Promise<R>((resolve, reject) => {
      const tx = database.transaction(name, mode)
      const store = tx.objectStore(name)
      let result: R
      let rejected = false

      Promise.resolve()
        .then(() => fn(store))
        .then(value => {
          result = value
        })
        .catch(error => {
          rejected = true
          try {
            tx.abort()
          } catch {}
          reject(error)
        })

      const fail = () => {
        if (!rejected) reject(tx.error ?? new Error('IndexedDB Transaktion fehlgeschlagen'))
      }

      tx.oncomplete = () => {
        if (!rejected) resolve(result)
      }
      tx.onerror = fail
      tx.onabort = fail
    })
  }

  static async delete(name: string): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB ist nicht verfügbar')
    }
    await new Promise<void>((resolve, reject) => {
      try {
        const request = indexedDB.deleteDatabase(name)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error ?? new Error('Löschen fehlgeschlagen'))
        request.onblocked = () => resolve()
      } catch (error) {
        reject(error as Error)
      }
    })
  }
}

export { DexieTable as Table }
export default DexieLite
