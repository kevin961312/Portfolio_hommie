import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { inicializarPerfil } from './lib/perfilStore'
import ProveedorContenido from './contenido/ProveedorContenido'

// Fija `?perf=` en la URL inicial (con replaceState, sin ensuciar el
// historial) y engancha los botones Atrás/Adelante del navegador.
// El perfil se resuelve como: query param → PERFIL_POR_DEFECTO (src/lib/perfilStore.ts).
inicializarPerfil();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProveedorContenido>
      <App />
    </ProveedorContenido>
  </StrictMode>,
)
