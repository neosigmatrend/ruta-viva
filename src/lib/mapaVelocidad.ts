/** Zoom del mapa según velocidad (moto/auto). */
export function zoomPorVelocidad(velKmh: number, pausada: boolean): number {
  if (pausada || velKmh < 8) return 15.2
  if (velKmh < 35) return 14.2
  if (velKmh < 70) return 13.2
  if (velKmh < 110) return 12.4
  return 11.6
}

/** Rumbo en grados (0 = norte) entre dos puntos. */
export function bearingEntre(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const Δλ = toRad(lng2 - lng1)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const θ = Math.atan2(y, x)
  return ((θ * 180) / Math.PI + 360) % 360
}

export function rumboDesdeTrack(
  track: { lat: number; lng: number }[],
): number | null {
  if (track.length < 2) return null
  const a = track[track.length - 2]
  const b = track[track.length - 1]
  const dLat = Math.abs(a.lat - b.lat)
  const dLng = Math.abs(a.lng - b.lng)
  if (dLat < 0.00005 && dLng < 0.00005) return null
  return bearingEntre(a.lat, a.lng, b.lat, b.lng)
}
