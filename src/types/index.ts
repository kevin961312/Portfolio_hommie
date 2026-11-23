import type { z } from 'zod';
import type {
  CATEGORIAS_METRICA,
  ID_PERFILES,
  TEMAS_POST,
  esquemaCuenta,
  esquemaMetrica,
  esquemaPerfil,
  esquemaPostInstagram,
  esquemaPostMuro,
  esquemaRed,
  esquemaSitio,
  esquemaVideoTiktok,
} from '../contenido/esquema';

/* ──────────────────────────────────────────────────────────────
   Tipos del contenido. Los que describen un archivo de `contenido/`
   salen del esquema (`src/contenido/esquema.ts`) con `z.infer`; los
   demás son la forma ya preparada que reciben las páginas.
   ────────────────────────────────────────────────────────────── */

/* ── Tal como se escriben en contenido/*.json ── */

/** Tema editorial de un post. */
export type TemaPost = (typeof TEMAS_POST)[number];

export type PostInstagram = z.infer<typeof esquemaPostInstagram>;

/** Post del muro: aquí el tema es obligatorio. */
export type PostConTema = z.infer<typeof esquemaPostMuro>;

export type RedSocial = z.infer<typeof esquemaRed>;
export type CuentaFuente = z.infer<typeof esquemaCuenta>;
export type SitioFuente = z.infer<typeof esquemaSitio>;
export type MetricaFuente = z.infer<typeof esquemaMetrica>;
export type PerfilFuente = z.infer<typeof esquemaPerfil>;
export type VideoTiktok = z.infer<typeof esquemaVideoTiktok>;

/** Identificador de perfil. En la URL va abreviado (`?perf=uno|dos|tres`, ver `CODIGO_PERFIL`). */
export type PerfilId = (typeof ID_PERFILES)[number];

/** Categoría de la métrica; define el ícono y el acento de color de la tarjeta. */
export type CategoriaMetrica = (typeof CATEGORIAS_METRICA)[number];

/* ── Ya preparados para pintar (ver `src/contenido/armar.ts`) ── */

/** Datos generales del sitio, con el enlace de WhatsApp ya armado. */
export interface Sitio extends Omit<SitioFuente, 'contacto' | 'cuentas'> {
  contacto: Omit<SitioFuente['contacto'], 'whatsapp'> & {
    /** `numero` vacío = no se muestra WhatsApp. */
    whatsapp: { numero: string; url: string };
  };
}

/** Nombre visible e iniciales (avatar) de una cuenta de Instagram. */
export interface Cuenta {
  nombre: string;
  iniciales: string;
}

export interface Metrica {
  id: string;
  /** Valor numérico crudo: el contador anima desde 0 hasta aquí. */
  valor: number;
  categoria: CategoriaMetrica;
  /** Título de la tarjeta. */
  etiqueta: string;
  /** Línea de apoyo que explica de dónde sale el número (marcadores ya resueltos). */
  detalle: string;
  /** Sufijo opcional pegado al número ya formateado (p. ej. `+`). */
  sufijo?: string;
  /** `true` → 287335 se muestra como «287K». `false` → «287.335». */
  compacto?: boolean;
}

export interface PerfilContenido {
  id: PerfilId;
  /** Etiqueta corta usada en el selector de perfil. */
  nombreCorto: string;
  /** Rol mostrado sobre el nombre en el hero. */
  rol: string;
  /** Frase gancho de una línea. */
  titular: string;
  /** Párrafos del bloque «Sobre mí». */
  sobreMi: string[];
  /** Métricas con su número final (calculado o escrito a mano). */
  metricas: Metrica[];
  /**
   * Rutas visibles para este perfil. Filtra el menú y bloquea el acceso
   * directo a las demás.
   */
  secciones: string[];
  /** `document.title` de la pestaña para este perfil. */
  tituloDocumento: string;
}
