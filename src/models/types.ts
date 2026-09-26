export type EstadoRuta = 'borrador' | 'en_curso' | 'pausada' | 'finalizada'

export type CategoriaGasto =
  | 'peaje'
  | 'bencina'
  | 'comida'
  | 'alojamiento'
  | 'taller'
  | 'otro'

export type CategoriaPunto =
  | 'bencina'
  | 'mirador'
  | 'taller'
  | 'alojamiento'
  | 'peligro'
  | 'tip'
  | 'otro'

export type MotivoPausa = 'descanso' | 'comida' | 'bencina' | 'otro'

export interface GeoPoint {
  nombre: string
  lat: number
  lng: number
}

export interface Costos {
  peaje: number
  bencina: number
  comida: number
  alojamiento: number
  taller: number
  otro: number
  total: number
}

export interface Tiempos {
  totalSeg: number
  movimientoSeg: number
  pausasSeg: number
}

export interface Pausa {
  id: string
  inicio: string
  fin: string | null
  lat: number
  lng: number
  motivo: MotivoPausa | null
}

export interface TrackPoint {
  t: string
  lat: number
  lng: number
  velKmh: number
}

export interface Punto {
  id: string
  tipo: 'destino' | 'poi' | 'tip'
  categoria: CategoriaPunto
  nombre: string
  lat: number
  lng: number
  audioUrl: string | null
  texto: string | null
  creadoEn: string
}

export interface PeajeCatalogo {
  id: string
  nombre: string
  lat: number
  lng: number
  radioMetros: number
  tarifaMotoNormal: number
  tarifaMotoPunta: number
  tipo: 'tag' | 'plaza' | 'free_flow'
}

export interface Gasto {
  id: string
  categoria: CategoriaGasto
  monto: number
  nombre: string
  lat: number
  lng: number
  fotoUrl: string | null
  peajeId: string | null
  automatico: boolean
  creadoEn: string
  pausaId: string | null
}

export interface Ruta {
  id: string
  nombre: string
  estado: EstadoRuta
  creadaEn: string
  iniciadaEn: string | null
  finalizadaEn: string | null
  origen: GeoPoint | null
  destino: GeoPoint | null
  radioLlegadaMetros: number
  kmAprox: number
  tiempos: Tiempos
  costos: Costos
  pausas: Pausa[]
  track: TrackPoint[]
  puntos: Punto[]
  gastos: Gasto[]
}

export const COSTOS_VACIOS = (): Costos => ({
  peaje: 0,
  bencina: 0,
  comida: 0,
  alojamiento: 0,
  taller: 0,
  otro: 0,
  total: 0,
})

export const TIEMPOS_VACIOS = (): Tiempos => ({
  totalSeg: 0,
  movimientoSeg: 0,
  pausasSeg: 0,
})

export function recalcularCostos(gastos: Gasto[]): Costos {
  const c = COSTOS_VACIOS()
  for (const g of gastos) {
    c[g.categoria] += g.monto
    c.total += g.monto
  }
  return c
}
