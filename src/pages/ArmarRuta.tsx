import { useState } from 'react'
import { Mapa } from '../components/Mapa'
import { PEAJES_DEMO } from '../data/peajes-demo'
import { crearBorrador } from '../lib/rutaFactory'
import { formatCLP } from '../lib/geo'
import { saveRuta } from '../store/db'
import type { GeoPoint } from '../models/types'

type Props = {
  onCancel: () => void
  onIniciada: (id: string) => void
}

async function getGps(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS no disponible'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          nombre: 'Origen',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => reject(new Error('No se pudo leer GPS')),
      { enableHighAccuracy: true, timeout: 12000 },
    )
  })
}

export function ArmarRuta({ onCancel, onIniciada }: Props) {
  const [nombre, setNombre] = useState('')
  const [destino, setDestino] = useState<GeoPoint | null>(null)
  const [destLabel, setDestLabel] = useState('Destino')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const peajesEst = PEAJES_DEMO.reduce((s, p) => s + p.tarifaMotoNormal, 0)

  const onMapClick = (lat: number, lng: number) => {
    setDestino({ nombre: destLabel.trim() || 'Destino', lat, lng })
  }

  const iniciar = async () => {
    if (!destino) {
      setError('Tocá el mapa para fijar el destino.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      let origen: GeoPoint
      try {
        origen = await getGps()
      } catch {
        origen = { nombre: 'Origen', lat: -33.45, lng: -70.66 }
      }
      const ruta = crearBorrador(
        { ...destino, nombre: destLabel.trim() || destino.nombre },
        nombre,
      )
      const now = new Date().toISOString()
      ruta.origen = origen
      ruta.estado = 'en_curso'
      ruta.iniciadaEn = now
      await saveRuta(ruta)
      onIniciada(ruta.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al iniciar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page armar">
      <header className="bar">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          ← Atrás
        </button>
        <h1>Armar ruta</h1>
      </header>

      <div className="form-block">
        <label>
          Nombre (opcional)
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Finde costa"
          />
        </label>
        <label>
          Nombre del destino
          <input
            value={destLabel}
            onChange={(e) => setDestLabel(e.target.value)}
            placeholder="Destino"
          />
        </label>
        <p className="hint">Tocá el mapa para fijar el destino.</p>
        {destino && (
          <p className="ok">
            Destino: {destino.lat.toFixed(4)}, {destino.lng.toFixed(4)}
          </p>
        )}
        <p className="muted">
          Peajes demo en zona: {PEAJES_DEMO.length} · estimado moto{' '}
          {formatCLP(peajesEst)}
        </p>
      </div>

      <Mapa
        className="mapa mapa-armar"
        destino={destino}
        peajes={PEAJES_DEMO}
        onMapClick={onMapClick}
        zoom={11}
      />

      {error && <p className="error">{error}</p>}

      <div className="footer-actions">
        <button
          type="button"
          className="btn btn-primary btn-xl"
          disabled={busy}
          onClick={() => void iniciar()}
        >
          {busy ? 'Iniciando…' : 'Iniciar ruta'}
        </button>
      </div>
    </div>
  )
}
