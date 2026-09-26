import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Ruta } from '../models/types'

interface RutaVivaDB extends DBSchema {
  rutas: {
    key: string
    value: Ruta
    indexes: { 'by-estado': string; 'by-creada': string }
  }
}

const DB_NAME = 'ruta-viva'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<RutaVivaDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<RutaVivaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('rutas', { keyPath: 'id' })
        store.createIndex('by-estado', 'estado')
        store.createIndex('by-creada', 'creadaEn')
      },
    })
  }
  return dbPromise
}

export async function listRutas(): Promise<Ruta[]> {
  const db = await getDb()
  const all = await db.getAll('rutas')
  return all.sort((a, b) => (a.creadaEn < b.creadaEn ? 1 : -1))
}

export async function getRuta(id: string): Promise<Ruta | undefined> {
  const db = await getDb()
  return db.get('rutas', id)
}

export async function saveRuta(ruta: Ruta): Promise<void> {
  const db = await getDb()
  await db.put('rutas', ruta)
}

export async function deleteRuta(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('rutas', id)
}

export async function getRutaActiva(): Promise<Ruta | undefined> {
  const all = await listRutas()
  return all.find((r) => r.estado === 'en_curso' || r.estado === 'pausada')
}
