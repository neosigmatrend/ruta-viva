import { useEffect, useState } from 'react'
import type { Ruta } from '../models/types'
import { getRutaActiva, listRutas } from '../store/db'
import { formatCLP, formatDuration } from '../lib/geo'

type Props = {
  onNueva: () => void
  onContinuar: (id: string) => void
  onResumen: (id: string) => void
}

export function Home({ onNueva, onContinuar, onResumen }: Props) {
  const [activa, setActiva] = useState<Ruta | null>(null)
  const [historial, setHistorial] = useState<Ruta[]>([])

  useEffect(() => {
    void (async () => {
      const a = await getRutaActiva()
      const all = await listRutas()
      setActiva(a ?? null)
      setHistorial(all.filter((r) => r.estado === 'finalizada').slice(0, 10))
    })()
  }, [])

  return (
    <div className="page home">
      <header className="brand-header">
        <p className="eyebrow">Chile · moto</p>
        <h1>Ruta viva</h1>
        <p className="lede">Mapa, peajes, pausas y el costo real de tu viaje.</p>
      </header>

      <button type="button" className="btn btn-primary btn-xl" onClick={onNueva}>
        Nueva ruta
      </button>

      {activa && (
        <button
          type="button"
          className="card-action"
          onClick={() => onContinuar(activa.id)}
        >
          <span className="card-label">Continuar ruta</span>
          <strong>{activa.nombre}</strong>
          <span className="muted">
            {activa.estado === 'pausada' ? 'Pausada' : 'En curso'} ·{' '}
            {formatCLP(activa.costos.total)}
          </span>
        </button>
      )}

      <section className="section">
        <h2>Historial</h2>
        {historial.length === 0 && (
          <p className="muted">Aún no hay rutas finalizadas.</p>
        )}
        <ul className="list">
          {historial.map((r) => (
            <li key={r.id}>
              <button type="button" className="list-item" onClick={() => onResumen(r.id)}>
                <strong>{r.nombre}</strong>
                <span className="muted">
                  {formatDuration(r.tiempos.totalSeg)} · {formatCLP(r.costos.total)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
