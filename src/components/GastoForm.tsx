import { useState } from 'react'
import type { CategoriaGasto } from '../models/types'

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

  const onFile = (file: File | null) => {
    if (!file) {
      setFotoUrl(null)
      return
    }
    const reader = new FileReader()
    reader.onload = () => setFotoUrl(String(reader.result))
    reader.readAsDataURL(file)
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
      <p className="muted">Solo detenido · foto opcional</p>

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

      <div className="row-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={submit}>
          Guardar
        </button>
      </div>
    </div>
  )
}
