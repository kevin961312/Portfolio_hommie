import type { IDS_CALCULO } from '../contenido/esquema';
import type { Metrica, MetricaFuente, PerfilContenido, PerfilFuente, PerfilId, PostInstagram, VideoTiktok } from '../types';
import { formatearMetrica } from './formato';

/* ──────────────────────────────────────────────────────────────
   Cifras derivadas del contenido. Son funciones puras: reciben los
   datos y devuelven números, sin leer nada por su cuenta (así sirven
   igual para el sitio que para una vista previa del editor).

   En `contenido/perfiles.json` cada métrica elige:
     - `"calculo": "totalInteracciones"` → el número sale de aquí y se
       actualiza solo al agregar posts;
     - `"valor": 2` → número escrito a mano (manda sobre el cálculo).
   Los textos (`detalle`) pueden llevar marcadores `{totalReels}` que se
   reemplazan por la cifra ya formateada.
   ────────────────────────────────────────────────────────────── */

export type IdCalculo = (typeof IDS_CALCULO)[number];
export type ValoresCalculados = Record<IdCalculo, number>;

/** Lo mínimo que necesitan los cálculos. */
export interface DatosCalculo {
  posts: PostInstagram[];
  tiktok: VideoTiktok[];
}

const suma = (lista: number[]) => lista.reduce((s, n) => s + n, 0);
const maximo = (lista: number[]) => (lista.length ? Math.max(...lista) : 0);
const media = (lista: number[]) => (lista.length === 0 ? 0 : Math.round(suma(lista) / lista.length));

/** Mediana; con un número par de datos, el promedio redondeado de los dos del centro. */
export function mediana(lista: number[]): number {
  if (lista.length === 0) return 0;
  const ordenados = [...lista].sort((a, b) => a - b);
  const mitad = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 !== 0 ? ordenados[mitad] : Math.round((ordenados[mitad - 1] + ordenados[mitad]) / 2);
}

/** Calcula todas las cifras del catálogo (`IDS_CALCULO`) de una vez. */
export function calcularValores({ posts, tiktok }: DatosCalculo): ValoresCalculados {
  const likes = posts.map((p) => p.likes ?? 0);
  const likesReels = posts.filter((p) => p.tipo === 'video').map((p) => p.likes ?? 0);
  const likesCarruseles = posts.filter((p) => p.tipo === 'carrusel').map((p) => p.likes ?? 0);

  return {
    totalPosts: posts.length,
    totalReels: likesReels.length,
    totalCarruseles: likesCarruseles.length,
    totalInteracciones: suma(likes),
    medianaInteracciones: mediana(likes),
    picoInteracciones: maximo(likes),
    mediaReels: media(likesReels),
    picoCarrusel: maximo(likesCarruseles),
    totalVideosTiktok: tiktok.length,
    totalReproduccionesTiktok: suma(tiktok.map((v) => v.reproducciones ?? 0)),
    totalLikesTiktok: suma(tiktok.map((v) => v.likes ?? 0)),
    totalFichas: posts.filter((p) => p.tema === 'fichas').length,
    picoAlcance: maximo(posts.map((p) => p.alcance ?? p.likes ?? 0)),
  };
}

/**
 * Reemplaza los marcadores `{clave}` de un texto. Los números salen con
 * `formatearMetrica` (12 → «12», 54623 → «54.623»); un marcador que no
 * existe se deja tal cual (el validador ya avisa).
 */
export function interpolar(texto: string, valores: Record<string, number | string>): string {
  return texto.replace(/\{(\w+)\}/g, (marca, clave: string) => {
    const v = valores[clave];
    if (v === undefined) return marca;
    return typeof v === 'number' ? formatearMetrica(v) : v;
  });
}

/** Número final de una métrica: el escrito a mano o, si no hay, el calculado. */
export function resolverValor(m: Pick<MetricaFuente, 'valor' | 'calculo'>, valores: ValoresCalculados): number {
  if (m.valor !== undefined) return m.valor;
  return m.calculo ? valores[m.calculo] : 0;
}

export function resolverMetrica(m: MetricaFuente, valores: ValoresCalculados): Metrica {
  const metrica: Metrica = {
    id: m.id,
    valor: resolverValor(m, valores),
    categoria: m.categoria,
    etiqueta: m.etiqueta,
    detalle: interpolar(m.detalle, valores),
  };
  if (m.sufijo !== undefined) metrica.sufijo = m.sufijo;
  if (m.compacto !== undefined) metrica.compacto = m.compacto;
  return metrica;
}

/** Perfil listo para pintar: métricas con número y textos con los marcadores resueltos. */
export function resolverPerfil(
  id: PerfilId,
  p: PerfilFuente,
  valores: ValoresCalculados,
  nombreSitio: string,
): PerfilContenido {
  return {
    id,
    nombreCorto: p.nombreCorto,
    rol: p.rol,
    titular: p.titular,
    sobreMi: p.sobreMi,
    metricas: (p.metricas ?? []).map((m) => resolverMetrica(m, valores)),
    secciones: p.secciones,
    tituloDocumento: interpolar(p.tituloDocumento, { nombre: nombreSitio }),
  };
}
