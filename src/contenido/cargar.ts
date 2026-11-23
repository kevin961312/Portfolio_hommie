import sitioJson from '../../contenido/sitio.json';
import perfilesJson from '../../contenido/perfiles.json';
import postsJson from '../../contenido/posts.json';
import tiktokJson from '../../contenido/tiktok.json';
import type { FuentesContenido } from './esquema';
import { armarContenido } from './armar';
import type { Contenido } from './armar';

/* ──────────────────────────────────────────────────────────────
   Único punto que importa los JSON de `contenido/`.
   Las páginas y los componentes los leen con `useContenido()`;
   `src/lib` y `src/hooks` pueden usar `contenido` directamente.

   El contenido se lee en build (no en runtime): cada cambio publicado
   recompila el sitio. La validación con Zod corre en `npm run validar`
   (antes de cada build y en CI) y aquí solo en desarrollo, para que Zod
   no pese en el sitio publicado.
   ────────────────────────────────────────────────────────────── */

/**
 * Quita los campos vacíos (`""` o `null`) de los objetos: el editor puede
 * guardarlos así y el esquema los trata como «no está».
 */
function limpiarVacios<T>(valor: T): T {
  if (Array.isArray(valor)) return valor.map(limpiarVacios) as T;
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor)
        .filter(([, v]) => v !== '' && v !== null)
        .map(([k, v]) => [k, limpiarVacios(v)]),
    ) as T;
  }
  return valor;
}

const crudos = {
  'sitio.json': sitioJson,
  'perfiles.json': perfilesJson,
  'posts.json': postsJson,
  'tiktok.json': tiktokJson,
};

/* Los JSON ya pasaron por `npm run validar`; aquí solo se les da su tipo. */
const fuentes = {
  sitio: limpiarVacios(sitioJson),
  perfiles: limpiarVacios(perfilesJson),
  posts: limpiarVacios(postsJson),
  tiktok: limpiarVacios(tiktokJson),
} as unknown as FuentesContenido;

/** Contenido publicado, listo para pintar. */
export const contenido: Contenido = armarContenido(fuentes);

if (import.meta.env.DEV) {
  // Import diferido: en producción esta rama desaparece y Zod no entra al bundle.
  void import('./esquema').then(({ validarContenido }) => {
    const errores = validarContenido(crudos);
    if (errores.length) {
      console.error(`Hay ${errores.length} error(es) en contenido/ (corre «npm run validar»):\n- ${errores.join('\n- ')}`);
    }
  });
}
