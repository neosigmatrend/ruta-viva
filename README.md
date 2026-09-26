# Ruta viva (prototipo v0)

PWA de viaje en moto (Chile): mapa, destino, peajes demo automáticos, pausas, gastos detenido, tip de voz detenido, cierre al destino o manual, resumen de tiempos y costos.

## Desarrollo (Mac)

```bash
cd ruta-viva
npm install
npm run dev
```

En el iPhone (misma WiFi): abrí `http://<IP-del-Mac>:5173` en Safari.  
Opcional: Compartir → Agregar a pantalla de inicio.

## Scripts

- `npm run dev` — desarrollo (escucha en la red local)
- `npm run build` — build producción
- `npm run preview` — servir el build

## Debug en ruta activa

- **Simular peaje** — registra el siguiente peaje demo
- **Simular llegada** — finaliza por radio de destino

## Stack

React + Vite + TypeScript · MapLibre · IndexedDB · sin backend
