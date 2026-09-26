import { v4 as uuid } from 'uuid'
import {
  COSTOS_VACIOS,
  TIEMPOS_VACIOS,
  type GeoPoint,
  type Ruta,
} from '../models/types'

export function crearBorrador(destino?: GeoPoint | null, nombre?: string): Ruta {
  const now = new Date().toISOString()
  const destNombre = destino?.nombre ?? 'Sin destino'
  return {
    id: uuid(),
    nombre: nombre?.trim() || `Ruta · ${destNombre}`,
    estado: 'borrador',
    creadaEn: now,
    iniciadaEn: null,
    finalizadaEn: null,
    origen: null,
    destino: destino ?? null,
    radioLlegadaMetros: 200,
    kmAprox: 0,
    tiempos: TIEMPOS_VACIOS(),
    costos: COSTOS_VACIOS(),
    pausas: [],
    track: [],
    puntos: destino
      ? [
          {
            id: uuid(),
            tipo: 'destino',
            categoria: 'otro',
            nombre: destino.nombre,
            lat: destino.lat,
            lng: destino.lng,
            audioUrl: null,
            texto: null,
            creadoEn: now,
          },
        ]
      : [],
    gastos: [],
  }
}
