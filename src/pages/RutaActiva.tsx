import { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { Mapa } from '../components/Mapa'
import { GastoForm } from '../components/GastoForm'
import { PEAJES_DEMO } from '../data/peajes-demo'
import { distanciaMetros, formatCLP, formatDuration } from '../lib/geo'
import {
  recalcularCostos,
  type CategoriaGasto,
  type Ruta,
} from '../models/types'
import { getRuta, saveRuta } from '../store/db'

type Props = {
  rutaId: string
  onFinalizada: (id: string) => void
  onHome: () => void
}

type Pos = { lat: number; lng: number; velKmh: number }

export function RutaActiva({ rutaId, onFinalizada, onHome }: Props) {
  const [ruta, setRuta] = useState<Ruta | null>(null)
  const [pos, setPos] = useState<Pos | null>(null)
  const [tick, setTick] = useState(0)
  const [showGasto, setShowGasto] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const rutaRef = useRef<Ruta | null>(null)

  const persist = useCallback(async (next: Ruta) => {
    rutaRef.current = next
    setRuta(next)
    await saveRuta(next)
  }, [])

  useEffect(() => {
    void getRuta(rutaId).then((r) => {
      if (r) {
        rutaRef.current = r
        setRuta(r)
      }
    })
  }, [rutaId])

  // Reloj de tiempos
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const r = rutaRef.current
    if (!r || !r.iniciadaEn || r.estado === 'finalizada') return
    const now = Date.now()
    const totalSeg = Math.floor((now - new Date(r.iniciadaEn).getTime()) / 1000)
    let pausasSeg = r.pausas.reduce((acc, p) => {
      const fin = p.fin ? new Date(p.fin).getTime() : now
      return acc + Math.floor((fin - new Date(p.inicio).getTime()) / 1000)
    }, 0)
    const movimientoSeg = Math.max(0, totalSeg - pausasSeg)
    if (
      r.tiempos.totalSeg !== totalSeg ||
      r.tiempos.pausasSeg !== pausasSeg ||
      r.tiempos.movimientoSeg !== movimientoSeg
    ) {
      void persist({
        ...r,
        tiempos: { totalSeg, pausasSeg, movimientoSeg },
      })
    }
  }, [tick, persist])

  const maybePeajeYDestino = useCallback(
    async (lat: number, lng: number) => {
      const r = rutaRef.current
      if (!r || r.estado !== 'en_curso') return

      let next = r
      let changed = false

      for (const peaje of PEAJES_DEMO) {
        const d = distanciaMetros(lat, lng, peaje.lat, peaje.lng)
        if (d <= peaje.radioMetros && !next.gastos.some((g) => g.peajeId === peaje.id)) {
          const gasto = {
            id: uuid(),
            categoria: 'peaje' as const,
            monto: peaje.tarifaMotoNormal,
            nombre: peaje.nombre,
            lat: peaje.lat,
            lng: peaje.lng,
            fotoUrl: null,
            peajeId: peaje.id,
            automatico: true,
            creadoEn: new Date().toISOString(),
            pausaId: null,
          }
          const gastos = [...next.gastos, gasto]
          next = { ...next, gastos, costos: recalcularCostos(gastos) }
          changed = true
          setToast(`Peaje ${peaje.nombre} · ${formatCLP(peaje.tarifaMotoNormal)}`)
          window.setTimeout(() => setToast(null), 3500)
        }
      }

      if (next.destino) {
        const dDest = distanciaMetros(lat, lng, next.destino.lat, next.destino.lng)
        if (dDest <= next.radioLlegadaMetros) {
          next = {
            ...next,
            estado: 'finalizada',
            finalizadaEn: new Date().toISOString(),
          }
          changed = true
          await persist(next)
          onFinalizada(next.id)
          return
        }
      }

      if (changed) await persist(next)
    },
    [onFinalizada, persist],
  )

  // GPS watch
  useEffect(() => {
    if (!navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        const lat = p.coords.latitude
        const lng = p.coords.longitude
        const velKmh = (p.coords.speed ?? 0) * 3.6
        setPos({ lat, lng, velKmh })
        const r = rutaRef.current
        if (!r || r.estado !== 'en_curso') return
        const track = [
          ...r.track,
          { t: new Date().toISOString(), lat, lng, velKmh },
        ].slice(-2000)
        void persist({ ...r, track }).then(() => maybePeajeYDestino(lat, lng))
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000 },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [maybePeajeYDestino, persist])

  const pausar = async () => {
    const r = rutaRef.current
    if (!r || r.estado !== 'en_curso') return
    const lat = pos?.lat ?? r.origen?.lat ?? -33.45
    const lng = pos?.lng ?? r.origen?.lng ?? -70.66
    await persist({
      ...r,
      estado: 'pausada',
      pausas: [
        ...r.pausas,
        {
          id: uuid(),
          inicio: new Date().toISOString(),
          fin: null,
          lat,
          lng,
          motivo: null,
        },
      ],
    })
  }

  const reanudar = async () => {
    const r = rutaRef.current
    if (!r || r.estado !== 'pausada') return
    const pausas = r.pausas.map((p, i) =>
      i === r.pausas.length - 1 && !p.fin
        ? { ...p, fin: new Date().toISOString() }
        : p,
    )
    await persist({ ...r, estado: 'en_curso', pausas })
  }

  const finalizar = async () => {
    const r = rutaRef.current
    if (!r) return
    let pausas = r.pausas
    if (r.estado === 'pausada') {
      pausas = pausas.map((p, i) =>
        i === pausas.length - 1 && !p.fin
          ? { ...p, fin: new Date().toISOString() }
          : p,
      )
    }
    const next = {
      ...r,
      pausas,
      estado: 'finalizada' as const,
      finalizadaEn: new Date().toISOString(),
    }
    await persist(next)
    onFinalizada(next.id)
  }

  const simularPeaje = async () => {
    const r = rutaRef.current
    if (!r) return
    const pending = PEAJES_DEMO.find((p) => !r.gastos.some((g) => g.peajeId === p.id))
    if (!pending) {
      setToast('No quedan peajes demo')
      return
    }
    await maybePeajeYDestino(pending.lat, pending.lng)
    setPos({ lat: pending.lat, lng: pending.lng, velKmh: 60 })
  }

  const simularLlegada = async () => {
    const r = rutaRef.current
    if (!r?.destino) {
      setToast('Sin destino')
      return
    }
    setPos({ lat: r.destino.lat, lng: r.destino.lng, velKmh: 0 })
    await maybePeajeYDestino(r.destino.lat, r.destino.lng)
  }

  const guardarGasto = async (data: {
    categoria: Exclude<CategoriaGasto, 'peaje'>
    monto: number
    nombre: string
    fotoUrl: string | null
  }) => {
    const r = rutaRef.current
    if (!r) return
    const pausaAbierta = [...r.pausas].reverse().find((p) => !p.fin)
    const gastos = [
      ...r.gastos,
      {
        id: uuid(),
        categoria: data.categoria,
        monto: data.monto,
        nombre: data.nombre,
        lat: pos?.lat ?? pausaAbierta?.lat ?? 0,
        lng: pos?.lng ?? pausaAbierta?.lng ?? 0,
        fotoUrl: data.fotoUrl,
        peajeId: null,
        automatico: false,
        creadoEn: new Date().toISOString(),
        pausaId: pausaAbierta?.id ?? null,
      },
    ]
    await persist({ ...r, gastos, costos: recalcularCostos(gastos) })
    setShowGasto(false)
  }

  const toggleTip = async () => {
    if (recording) {
      mediaRef.current?.stop()
      setRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => chunksRef.current.push(e.data)
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onload = () => {
          const r = rutaRef.current
          if (!r) return
          const audioUrl = String(reader.result)
          const puntos = [
            ...r.puntos,
            {
              id: uuid(),
              tipo: 'tip' as const,
              categoria: 'tip' as const,
              nombre: 'Tip de voz',
              lat: pos?.lat ?? 0,
              lng: pos?.lng ?? 0,
              audioUrl,
              texto: null,
              creadoEn: new Date().toISOString(),
            },
          ]
          void persist({ ...r, puntos })
          setToast('Tip guardado')
          window.setTimeout(() => setToast(null), 2500)
        }
        reader.readAsDataURL(blob)
        stream.getTracks().forEach((t) => t.stop())
      }
      mediaRef.current = rec
      rec.start()
      setRecording(true)
    } catch {
      setToast('No se pudo usar el micrófono')
    }
  }

  if (!ruta) {
    return (
      <div className="page">
        <p>Cargando ruta…</p>
        <button type="button" className="btn" onClick={onHome}>
          Home
        </button>
      </div>
    )
  }

  const pausada = ruta.estado === 'pausada'
  const proxPeaje = PEAJES_DEMO.find((p) => !ruta.gastos.some((g) => g.peajeId === p.id))

  return (
    <div className="page ruta-activa">
      <div className="hud">
        <div>
          <strong>{ruta.nombre}</strong>
          <span className="muted">
            {pausada ? 'Pausada' : 'En curso'} · {formatDuration(ruta.tiempos.totalSeg)} ·{' '}
            {formatCLP(ruta.costos.total)}
          </span>
        </div>
        {ruta.destino && (
          <span className="chip">→ {ruta.destino.nombre}</span>
        )}
        {proxPeaje && pos && (
          <span className="chip chip-peaje">
            Peaje {proxPeaje.nombre} ·{' '}
            {Math.round(distanciaMetros(pos.lat, pos.lng, proxPeaje.lat, proxPeaje.lng) / 100) /
              10}{' '}
            km · {formatCLP(proxPeaje.tarifaMotoNormal)}
          </span>
        )}
      </div>

      <Mapa
        className="mapa mapa-activa"
        center={pos ?? ruta.origen ?? { lat: -33.45, lng: -70.66 }}
        zoom={12}
        destino={ruta.destino}
        peajes={PEAJES_DEMO}
        track={ruta.track}
        user={pos}
      />

      {toast && <div className="toast">{toast}</div>}

      {!pausada && (
        <div className="footer-actions stack">
          <button type="button" className="btn btn-primary btn-xl" onClick={() => void pausar()}>
            Pausa
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void finalizar()}>
            Finalizar ruta
          </button>
        </div>
      )}

      {pausada && !showGasto && (
        <div className="footer-actions stack">
          <button
            type="button"
            className="btn btn-primary btn-xl"
            onClick={() => setShowGasto(true)}
          >
            Agregar gasto
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => void toggleTip()}>
            {recording ? 'Detener tip' : 'Tip de voz'}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void reanudar()}>
            Reanudar
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void finalizar()}>
            Finalizar ruta
          </button>
        </div>
      )}

      {showGasto && (
        <GastoForm onCancel={() => setShowGasto(false)} onSave={(d) => void guardarGasto(d)} />
      )}

      <details className="debug">
        <summary>Debug</summary>
        <button type="button" className="btn" onClick={() => void simularPeaje()}>
          Simular peaje
        </button>
        <button type="button" className="btn" onClick={() => void simularLlegada()}>
          Simular llegada
        </button>
      </details>
    </div>
  )
}
