import { createWorker } from 'tesseract.js'

/** Extrae candidatos de monto CLP desde texto OCR de boleta/voucher. */
export function parseMontosCLP(texto: string): number[] {
  const encontrados = new Set<number>()
  const lines = texto
    .toUpperCase()
    .replace(/[|]/g, 'I')
    .split(/\n+/)

  const patterns = [
    /(?:TOTAL|TOTAL\s*A\s*PAGAR|MONTO|PAGO|VALOR|EFECTIVO|DEBITO|CREDITO|TARJETA)\s*[:$]?\s*\$?\s*([\d.]+(?:,\d{1,2})?)/g,
    /\$\s*([\d.]+(?:,\d{1,2})?)/g,
  ]

  for (const line of lines) {
    for (const re of patterns) {
      re.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(line))) {
        const n = normalizarMonto(m[1])
        if (n != null) encontrados.add(n)
      }
    }
  }

  // Números sueltos con formato chileno 1.234 o 12.345
  for (const m of texto.matchAll(/\b(\d{1,3}(?:\.\d{3})+|\d{3,7})\b/g)) {
    const n = normalizarMonto(m[1])
    if (n != null && n >= 100) encontrados.add(n)
  }

  return [...encontrados].sort((a, b) => b - a)
}

function normalizarMonto(raw: string): number | null {
  let s = raw.trim()
  if (!s) return null
  // 12.500,50 → 12500.50 ; 12.500 → 12500
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (s.includes(',')) {
    const parts = s.split(',')
    s = parts[1]?.length === 2 ? `${parts[0].replace(/\./g, '')}.${parts[1]}` : s.replace(/,/g, '')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '')
  }
  const n = Number(s)
  if (!Number.isFinite(n) || n <= 0 || n > 5_000_000) return null
  return Math.round(n)
}

export async function detectarMontoDesdeImagen(
  dataUrl: string,
): Promise<{ sugerido: number | null; candidatos: number[]; texto: string }> {
  const worker = await createWorker('spa+eng', 1, {
    logger: () => {},
  })
  try {
    const {
      data: { text },
    } = await worker.recognize(dataUrl)
    const candidatos = parseMontosCLP(text)
    // Preferir el mayor razonable cerca de "TOTAL" si hay varios
    const sugerido = candidatos[0] ?? null
    return { sugerido, candidatos: candidatos.slice(0, 5), texto: text }
  } finally {
    await worker.terminate()
  }
}
