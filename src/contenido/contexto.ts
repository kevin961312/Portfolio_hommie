import { createContext } from 'react';
import type { Contenido } from './armar';
import { contenido } from './cargar';

/**
 * Contenido que leen las páginas y los componentes (con `useContenido()`).
 * Por defecto es el publicado; `ProveedorContenido` permite pasar otro
 * (por ejemplo, un borrador en una vista previa).
 */
export const ContextoContenido = createContext<Contenido>(contenido);
