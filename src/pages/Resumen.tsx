import { useEffect, useState } from 'react'
import type { Ruta } from '../models/types'
import { getRuta } from '../store/db'
import { formatCLP, formatDuration } from '../lib/geo'

type Props = {
  rutaId: string
  onHome: () => void
}

export function Resumen({ rutaId, onHome }: Props) {
  const [ruta, setRuta] = useState<Ruta | null>(null)

  useEffect(() => {
    void getRuta(rutaId).then((r) => setRuta(r ?? null))
  }, [rutaId])

  if (!ruta) {
    return (
      <div className="page">
        <p>Cargando…</p>
        <button type="button" className="btn" onClick={onHome}>
          Home
        </button>
      </div>
    )
  }

  const peajes = ruta.gastos.filter((g) => g.categoria === 'peaje')
  const tips = ruta.puntos.filter((p) => p.tipo === 'tip')

  return (
    <div className="page resumen">
      <header className="brand-header">
        <p className="eyebrow">Ruta finalizada</p>
        <h1>{ruta.nombre}</h1>
        <p className="lede">
          {ruta.origen?.nombre ?? 'Origen'} → {ruta.destino?.nombre ?? 'Sin destino'}
        </p>
      </header>

      <div className="stats">
        <div>
          <span className="muted">Tiempo total</span>
          <strong>{formatDuration(ruta.tiempos.totalSeg)}</strong>
        </div>
        <div>
          <span className="muted">Movimiento</span>
          <strong>{formatDuration(ruta.tiempos.movimientoSeg)}</strong>
        </div>
        <div>
          <span className="muted">Pausas</span>
          <strong>
            {ruta.pausas.length} · {formatDuration(ruta.tiempos.pausasSeg)}
          </strong>
        </div>
        <div>
          <span className="muted">Total</span>
          <strong className="total">{formatCLP(ruta.costos.total)}</strong>
        </div>
      </div>

      <section className="section">
        <h2>Costos</h2>
        <ul className="kv">
          {(
            [
              'peaje',
              'bencina',
              'comida',
              'alojamiento',
              'taller',
              'otro',
            ] as const
          ).map((k) =>
            ruta.costos[k] > 0 ? (
              <li key={k}>
                <span>{k}</span>
                <span>{formatCLP(ruta.costos[k])}</span>
              </li>
            ) : null,
          )}
        </ul>
      </section>

      <section className="section">
        <h2>Peajes ({peajes.length})</h2>
        {peajes.length === 0 && <p className="muted">Ninguno registrado.</p>}
        <ul className="list">
          {peajes.map((g) => (
            <li key={g.id} className="list-static">
              <strong>{g.nombre}</strong>
              <span>{formatCLP(g.monto)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2>Gastos manuales</h2>
        <ul className="list">
          {ruta.gastos
            .filter((g) => !g.automatico)
            .map((g) => (
              <li key={g.id} className="list-static">
                <strong>
                  {g.nombre} · {g.categoria}
                </strong>
                <span>{formatCLP(g.monto)}</span>
              </li>
            ))}
        </ul>
      </section>

      <section className="section">
        <h2>Tips ({tips.length})</h2>
        {tips.map((t) => (
          <div key={t.id} className="tip-row">
            <span>{t.nombre}</span>
            {t.audioUrl && <audio controls src={t.audioUrl} />}
          </div>
        ))}
      </section>

      <button type="button" className="btn btn-primary btn-xl" onClick={onHome}>
        Listo
      </button>
    </div>
  )
}
