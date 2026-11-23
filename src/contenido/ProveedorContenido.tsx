import type { ReactNode } from 'react';
import type { Contenido } from './armar';
import { contenido } from './cargar';
import { ContextoContenido } from './contexto';

/** Envuelve la app con el contenido publicado (o con `valor`, si se pasa). */
export default function ProveedorContenido({ valor = contenido, children }: { valor?: Contenido; children: ReactNode }) {
  return <ContextoContenido.Provider value={valor}>{children}</ContextoContenido.Provider>;
}
