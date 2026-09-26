import { useState } from 'react'
import type { CategoriaGasto } from '../models/types'
import { detectarMontoDesdeImagen } from '../lib/ocrBoleta'
import { formatCLP } from '../lib/geo'

type CategoriaManual = Exclude<CategoriaGasto, 'peaje'>

const CATS: CategoriaManual[] = [
  'bencina',
  'comida',
  'alojamiento',
  'taller',
  'otro',
]

type Props = {
  onCancel: () => void
  onSave: (data: {
    categoria: CategoriaManual
    monto: number
    nombre: string
    fotoUrl: string | null
  }) => void
}

export function GastoForm({ onCancel, onSave }: Props) {
  const [categoria, setCategoria] = useState<CategoriaManual>('comida')
  const [monto, setMonto] = useState('')
  const [nombre, setNombre] = useState('')
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle')
  const [candidatos, setCandidatos] = useState<number[]>([])
  const [sugerido, setSugerido] = useState<number | null>(null)

  const onFile = (file: File | null) => {
    if (!file) {
      setFotoUrl(null)
      setOcrStatus('idle')
      setCandidatos([])
      setSugerido(null)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result)
      setFotoUrl(url)
      void correrOcr(url)
    }
    reader.readAsDataURL(file)
  }

  const correrOcr = async (url: string) => {
    setOcrStatus('loading')
    setCandidatos([])
    setSugerido(null)
    try {
      const { sugerido: s, candidatos: c } = await detectarMontoDesdeImagen(url)
      setCandidatos(c)
      setSugerido(s)
      if (s != null) {
        setMonto(String(s))
        setOcrStatus('ok')
      } else {
        setOcrStatus('fail')
      }
    } catch {
      setOcrStatus('fail')
    }
  }

  const submit = () => {
    const n = Number(monto.replace(/\./g, '').replace(',', '.'))
    if (!Number.isFinite(n) || n <= 0) return
    onSave({
      categoria,
      monto: Math.round(n),
      nombre: nombre.trim() || categoria,
      fotoUrl,
    })
  }

  return (
    <div className="sheet">
      <h2>Agregar gasto</h2>
      <p className="muted">Solo detenido · foto opcional · OCR sugiere monto</p>

      <label>
        Foto boleta
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </label>
      {fotoUrl && <img src={fotoUrl} alt="Boleta" className="foto-preview" />}

      {ocrStatus === 'loading' && (
        <p className="hint">Leyendo boleta… (puede tardar unos segundos)</p>
      )}
      {ocrStatus === 'ok' && sugerido != null && (
        <div className="ocr-box">
          <p>
            Detectado: <strong>{formatCLP(sugerido)}</strong>
          </p>
          <p className="muted">Confirmá o corregí el monto abajo.</p>
          {candidatos.length > 1 && (
            <div className="ocr-candidates">
              {candidatos.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="btn chip-btn"
                  onClick={() => setMonto(String(c))}
                >
                  {formatCLP(c)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {ocrStatus === 'fail' && (
        <p className="error">No pude leer el monto. Escribilo a mano.</p>
      )}

      <label>
        Categoría
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as CategoriaManual)}
        >
          {CATS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label>
        Monto (CLP)
        <input
          inputMode="numeric"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="12000"
        />
      </label>

      <label>
        Nombre
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Almuerzo"
        />
      </label>

      <div className="row-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={submit}>
          Confirmar y guardar
        </button>
      </div>
    </div>
  )
}
