import { useState } from 'react'
import { Home } from './pages/Home'
import { ArmarRuta } from './pages/ArmarRuta'
import { RutaActiva } from './pages/RutaActiva'
import { Resumen } from './pages/Resumen'

type Screen =
  | { name: 'home' }
  | { name: 'armar' }
  | { name: 'activa'; rutaId: string }
  | { name: 'resumen'; rutaId: string }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })

  if (screen.name === 'armar') {
    return (
      <ArmarRuta
        onCancel={() => setScreen({ name: 'home' })}
        onIniciada={(id) => setScreen({ name: 'activa', rutaId: id })}
      />
    )
  }

  if (screen.name === 'activa') {
    return (
      <RutaActiva
        rutaId={screen.rutaId}
        onHome={() => setScreen({ name: 'home' })}
        onFinalizada={(id) => setScreen({ name: 'resumen', rutaId: id })}
      />
    )
  }

  if (screen.name === 'resumen') {
    return (
      <Resumen
        rutaId={screen.rutaId}
        onHome={() => setScreen({ name: 'home' })}
      />
    )
  }

  return (
    <Home
      onNueva={() => setScreen({ name: 'armar' })}
      onContinuar={(id) => setScreen({ name: 'activa', rutaId: id })}
      onResumen={(id) => setScreen({ name: 'resumen', rutaId: id })}
    />
  )
}
