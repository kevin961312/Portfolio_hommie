import { useContext } from 'react';
import { ContextoContenido } from '../contenido/contexto';
import type { Contenido } from '../contenido/armar';

/**
 * Todo el contenido editable del sitio (de `contenido/*.json`), ya
 * preparado: sitio, cuentas, perfiles, posts y TikTok.
 * Las páginas y los componentes leen los datos solo por aquí.
 */
export function useContenido(): Contenido {
  return useContext(ContextoContenido);
}
