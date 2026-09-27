import { useEffect, useRef } from 'react'
import {
  Map,
  Marker,
  NavigationControl,
  type MapMouseEvent,
  type GeoJSONSource,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { GeoPoint, PeajeCatalogo, TrackPoint } from '../models/types'

type Props = {
  center?: { lat: number; lng: number }
  zoom?: number
  bearing?: number
  pitch?: number
  follow?: boolean
  destino?: GeoPoint | null
  peajes?: PeajeCatalogo[]
  track?: TrackPoint[]
  user?: { lat: number; lng: number } | null
  onMapClick?: (lat: number, lng: number) => void
  className?: string
}

/** Raster OSM: más confiable en local que estilos vectoriales remotos. */
const STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster' as const,
      source: 'osm',
    },
  ],
}

export function Mapa({
  center = { lat: -33.45, lng: -70.66 },
  zoom = 11,
  bearing = 0,
  pitch = 0,
  follow = false,
  destino,
  peajes = [],
  track = [],
  user,
  onMapClick,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const markersRef = useRef<Marker[]>([])
  const userMarkerRef = useRef<Marker | null>(null)
  const onClickRef = useRef(onMapClick)
  onClickRef.current = onMapClick

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new Map({
      container: containerRef.current,
      style: STYLE,
      center: [center.lng, center.lat],
      zoom,
      bearing,
      pitch,
      attributionControl: { compact: true },
    })
    map.addControl(new NavigationControl({ showCompass: true }), 'top-right')
    map.on('click', (e: MapMouseEvent) => {
      onClickRef.current?.(e.lngLat.lat, e.lngLat.lng)
    })
    const onReady = () => {
      map.resize()
    }
    map.on('load', onReady)
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(containerRef.current)
    mapRef.current = map

    return () => {
      ro.disconnect()
      markersRef.current.forEach((m) => m.remove())
      userMarkerRef.current?.remove()
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, [])

  // Cámara: sigue GPS + zoom/rumbo por velocidad
  useEffect(() => {
    const map = mapRef.current
    if (!map || !follow) return
    const lat = user?.lat ?? center.lat
    const lng = user?.lng ?? center.lng
    map.easeTo({
      center: [lng, lat],
      zoom,
      bearing,
      pitch,
      duration: 600,
      essential: true,
    })
  }, [follow, user?.lat, user?.lng, zoom, bearing, pitch, center.lat, center.lng])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    if (destino) {
      const el = document.createElement('div')
      el.className = 'marker marker-destino'
      el.title = destino.nombre
      markersRef.current.push(
        new Marker({ element: el }).setLngLat([destino.lng, destino.lat]).addTo(map),
      )
    }

    for (const p of peajes) {
      const el = document.createElement('div')
      el.className = 'marker marker-peaje'
      el.title = `${p.nombre} · $${p.tarifaMotoNormal}`
      markersRef.current.push(
        new Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map),
      )
    }
  }, [destino, peajes])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !user) return

    if (!userMarkerRef.current) {
      const el = document.createElement('div')
      el.className = 'marker marker-user'
      userMarkerRef.current = new Marker({ element: el })
        .setLngLat([user.lng, user.lat])
        .addTo(map)
    } else {
      userMarkerRef.current.setLngLat([user.lng, user.lat])
    }
  }, [user])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const draw = () => {
      const sourceId = 'track'
      const coords = track.map((t) => [t.lng, t.lat] as [number, number])
      if (map.getSource(sourceId)) {
        ;(map.getSource(sourceId) as GeoJSONSource).setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords },
        })
      } else if (coords.length >= 2) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: coords },
          },
        })
        map.addLayer({
          id: 'track-line',
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#c45c26',
            'line-width': 4,
            'line-opacity': 0.85,
          },
        })
      }
    }

    if (map.isStyleLoaded()) draw()
    else map.once('load', draw)
  }, [track])

  return <div ref={containerRef} className={className ?? 'mapa'} />
}
