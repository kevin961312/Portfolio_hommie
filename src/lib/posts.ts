import type { PostInstagram, TemaPost } from '../types';

export const tituloPost = (p: PostInstagram) =>
  p.titulo || (p.tipo === 'video' ? 'Reel para Instagram' : 'Carrusel para Instagram');

/** Temas del filtro, en el orden en que se muestran. Las claves salen de `TEMAS_POST` (esquema). */
export const TEMAS: { id: TemaPost; etiqueta: string }[] = [
  { id: 'fichas', etiqueta: 'Fichas de discos' },
  { id: 'recom', etiqueta: 'Recomendaciones' },
  { id: 'fest', etiqueta: 'Festivales' },
  { id: 'eventos', etiqueta: 'Eventos y conciertos' },
  { id: 'entrev', etiqueta: 'Entrevistas' },
  { id: 'colab', etiqueta: 'Colaboraciones' },
  { id: 'retratos', etiqueta: 'Retratos y cultura' },
];

export const ETIQUETA_TEMA = Object.fromEntries(TEMAS.map((t) => [t.id, t.etiqueta])) as Record<TemaPost, string>;

/** Cifra con la que se ordena y se compara: el alcance si existe y, si no, los likes. */
export const valorAlcance = (p: PostInstagram) => p.alcance ?? p.likes ?? 0;

/** Qué mide `valorAlcance` de esta pieza. */
export const unidadAlcance = (p: PostInstagram) =>
  p.alcance == null ? 'interacciones' : p.alcanceEstimado ? 'alcance estimado' : 'reproducciones';

export const porAlcance = (a: PostInstagram, b: PostInstagram) => valorAlcance(b) - valorAlcance(a);

export const porLikes = (a: PostInstagram, b: PostInstagram) => (b.likes ?? 0) - (a.likes ?? 0);

/* `fecha` es ISO (AAAA-MM-DD), así que compararla como texto ya ordena bien. */
export const porFecha = (a: PostInstagram, b: PostInstagram) => b.fecha.localeCompare(a.fecha);

/** Piezas con al menos este número de interacciones llevan el sello «Top». */
export const UMBRAL_TOP = 10000;

/* ── Fichas de discos: créditos sacados del pie ────────────────── */

/** Créditos de una ficha, como en el librillo de un CD. */
export interface CreditosFicha {
  disco: string;
  artista?: string;
  /** Año de lanzamiento (de la línea 🗓️ dd/mm/aaaa). */
  anio?: string;
  /** Ciudad (de la línea 📍, sin la bandera). */
  ciudad?: string;
}

/** Recorte vertical por defecto de la portada en la caja (cara, manos y CD). */
export const ENCUADRE_FICHA = 42;

/* Banderas (pares de letras regionales), emojis, selectores de variación,
   @usuarios y los paréntesis con integrantes («Aerophon Crew (Ruzto - …)»). */
const BANDERAS = /[\u{1F1E6}-\u{1F1FF}]|\p{Extended_Pictographic}/gu;
const PARENTESIS = /\s*\([^)]*\)/g;
const SELECTOR = /️/g;
const USUARIOS = /@[\w.]+/g;

/** Texto de la línea del pie que empieza con `emoji`, limpio; `undefined` si no está o queda vacía. */
function lineaPie(descripcion: string, emoji: string) {
  const linea = descripcion
    .split('\n')
    .map((l) => l.replace(SELECTOR, '').trim())
    .find((l) => l.startsWith(emoji));
  if (!linea) return undefined;
  const limpio = linea
    .slice(emoji.length)
    .replace(USUARIOS, '')
    .replace(BANDERAS, '')
    .replace(PARENTESIS, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s·:,-]+|[\s·:,-]+$/g, '');
  return limpio || undefined;
}

/**
 * Disco, artista, año y ciudad de una ficha. Salen del pie de Instagram
 * (💿 disco · 🎙️ MC o 📌 artista · 🗓️ fecha · 📍 ciudad) y, si falta
 * alguna línea, del título «DISCO · ARTISTA»; en los discos de DJ o de
 * productor, del 📀 o el 🎛️. Sin nada de eso, el título.
 */
export function creditosFicha(p: PostInstagram): CreditosFicha {
  const pie = p.descripcion ?? '';
  const [discoTitulo, artistaTitulo] = (p.titulo ?? '').split(' · ').map((t) => t.trim());
  const fecha = lineaPie(pie, '🗓');
  return {
    disco: lineaPie(pie, '💿') ?? (discoTitulo || tituloPost(p)),
    artista:
      lineaPie(pie, '🎙') ??
      lineaPie(pie, '📌') ??
      (artistaTitulo || undefined) ??
      lineaPie(pie, '📀') ??
      lineaPie(pie, '🎛'),
    anio: fecha?.match(/\b(1[89]\d\d|20\d\d)\b/)?.[1],
    ciudad: lineaPie(pie, '📍'),
  };
}
