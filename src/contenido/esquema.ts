import { z } from 'zod';

/* ──────────────────────────────────────────────────────────────
   Esquema del contenido editable (`contenido/*.json`).

   Es la única fuente de verdad de la forma de los datos:
   - los tipos del sitio salen de aquí con `z.infer` (ver `src/types`);
   - `scripts/validar-contenido.ts` lo usa antes de cada build y en CI;
   - el sitio lo usa solo en desarrollo (no entra al bundle de producción);
   - los campos del editor (`public/admin/config.yml`) lo replican a mano:
     si cambias algo aquí, cámbialo también allí.

   Se ejecuta en el navegador y en Node (type stripping), así que no usa
   alias, `enum` ni imports sin extensión.
   ────────────────────────────────────────────────────────────── */

/* ── Catálogos cerrados ─────────────────────────────────────── */

/** Cifras que el sitio calcula solo a partir del contenido (ver `src/lib/calculos.ts`). */
export const IDS_CALCULO = [
  'totalPosts',
  'totalReels',
  'totalCarruseles',
  'totalInteracciones',
  'medianaInteracciones',
  'picoInteracciones',
  'mediaReels',
  'picoCarrusel',
  'totalVideosTiktok',
  'totalReproduccionesTiktok',
  'totalLikesTiktok',
  'totalFichas',
  'picoAlcance',
] as const;

/** Rutas del portafolio que un perfil puede mostrar. */
export const SECCIONES = ['/', '/top-20', '/posts-instagram'] as const;

export const ID_PERFILES = ['principal', 'secundario', 'terciario'] as const;
export const CATEGORIAS_METRICA = ['alcance', 'publicaciones', 'interacciones', 'destacado'] as const;
/** Temas del filtro del muro (etiquetas en `src/lib/posts.ts`). */
export const TEMAS_POST = ['fichas', 'recom', 'fest', 'eventos', 'entrev', 'colab', 'retratos'] as const;
export const TIPOS_POST = ['carrusel', 'video', 'imagen'] as const;
export const TIPOS_RED = ['instagram', 'tiktok', 'otra'] as const;
export const TIPOS_TIKTOK = ['video', 'carrusel'] as const;

/* ── Piezas comunes ─────────────────────────────────────────── */

/**
 * Campo opcional tolerante: el editor puede guardar un campo vacío como
 * `""` o `null`; aquí ambos cuentan como «no está». `cargar.ts` hace la
 * misma limpieza en el sitio para que los tipos coincidan.
 */
const opcional = <T extends z.ZodType>(esquema: T) =>
  z.preprocess((v) => (v === '' || v === null ? undefined : v), esquema.optional());

const texto = (campo: string) =>
  z.string({ error: `«${campo}» debe ser un texto.` }).regex(/\S/, `«${campo}» no puede quedar vacío.`);

const fecha = z
  .string({ error: 'La fecha debe ser un texto con formato AAAA-MM-DD.' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD (por ejemplo 2025-08-16).');

const entero = (campo: string) =>
  z.number({ error: `«${campo}» debe ser un número.` }).int(`«${campo}» debe ser un número entero.`).min(0, `«${campo}» no puede ser negativo.`);

const urlInstagram = z
  .string()
  .regex(/^https:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[\w-]+\/?/, 'Pega el enlace completo del post de Instagram (https://www.instagram.com/p/…/).');

const urlTiktok = z
  .string()
  .regex(/^https:\/\/(www\.|vm\.)?tiktok\.com\//, 'Pega el enlace completo del video de TikTok (https://www.tiktok.com/@…/video/…).');

const urlWeb = z.string().regex(/^https?:\/\/\S+$/, 'El enlace debe empezar por https://');

/** Ruta de un archivo dentro de `public/` (empieza por `/`). */
const rutaPublica = z.string().regex(/^\/[^\s]*$/, 'La ruta de la imagen debe empezar por «/» (por ejemplo /images/subidas/foto.jpg).');

/** Marcadores `{asi}` dentro de un texto. */
const marcadores = (t: string) => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

/* ── sitio.json ─────────────────────────────────────────────── */

export const esquemaRed = z.object({
  tipo: z.enum(TIPOS_RED, { error: 'El tipo de red debe ser instagram, tiktok u otra.' }),
  nombre: texto('Nombre de la red'),
  usuario: texto('Usuario').regex(/^[^@\s]+$/, 'Escribe el usuario sin @ y sin espacios.'),
  url: opcional(urlWeb),
});

export const esquemaCuenta = z.object({
  usuario: texto('Usuario de la cuenta').regex(/^[^@\s]+$/, 'Escribe el usuario sin @ y sin espacios.'),
  nombre: texto('Nombre visible de la cuenta'),
  iniciales: texto('Iniciales').max(3, 'Las iniciales llevan como máximo 3 letras.'),
});

export const esquemaSitio = z
  .object({
    nombre: texto('Nombre del sitio'),
    portada: z.object({
      nombre: texto('Nombre en la portada'),
      apellido: texto('Parte resaltada del nombre'),
    }),
    profesion: texto('Profesión'),
    contacto: z.object({
      whatsapp: z.object({
        numero: opcional(z.string().regex(/^[\d\s]+$/, 'El WhatsApp lleva solo números y espacios (sin + ni guiones).')),
        indicativo: opcional(z.string().regex(/^\d{1,4}$/, 'El indicativo del país lleva solo números (57 para Colombia).')),
      }),
      correo: opcional(z.email('El correo no parece válido.')),
      telefono: opcional(z.string().regex(/^[\d\s+]+$/, 'El teléfono lleva solo números, espacios y +.')),
      ciudad: opcional(z.string()),
    }),
    redes: z.array(esquemaRed),
    cuentas: z.array(esquemaCuenta).min(1, 'Debe haber al menos una cuenta.'),
    cuentaPersonal: texto('Cuenta personal'),
  })
  .superRefine((s, ctx) => {
    const usuarios = s.cuentas.map((c) => c.usuario);
    if (!usuarios.includes(s.cuentaPersonal)) {
      ctx.addIssue({
        code: 'custom',
        path: ['cuentaPersonal'],
        message: `La cuenta personal «${s.cuentaPersonal}» no está en la lista de cuentas.`,
      });
    }
    usuarios.forEach((u, i) => {
      if (usuarios.indexOf(u) !== i) {
        ctx.addIssue({ code: 'custom', path: ['cuentas', i, 'usuario'], message: `La cuenta «${u}» está repetida.` });
      }
    });
  });

/* ── perfiles.json ──────────────────────────────────────────── */

export const esquemaMetrica = z
  .object({
    id: texto('Id de la métrica'),
    categoria: z.enum(CATEGORIAS_METRICA, { error: 'La categoría debe ser alcance, publicaciones, interacciones o destacado.' }),
    etiqueta: texto('Título de la métrica'),
    detalle: z.string({ error: '«Detalle» debe ser un texto.' }),
    /** Cifra calculada sola a partir del contenido. */
    calculo: opcional(z.enum(IDS_CALCULO, { error: 'Ese cálculo automático no existe.' })),
    /** Número escrito a mano. Si está, manda sobre `calculo`. */
    valor: opcional(z.number({ error: '«Valor» debe ser un número.' }).min(0, '«Valor» no puede ser negativo.')),
    sufijo: opcional(z.string().max(3, 'El sufijo lleva como máximo 3 caracteres (por ejemplo +).')),
    compacto: opcional(z.boolean()),
  })
  .superRefine((m, ctx) => {
    if (m.valor === undefined && m.calculo === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['valor'],
        message: `La métrica «${m.etiqueta}» necesita un número escrito a mano o un cálculo automático.`,
      });
    }
    for (const marcador of marcadores(m.detalle)) {
      if (!(IDS_CALCULO as readonly string[]).includes(marcador)) {
        ctx.addIssue({
          code: 'custom',
          path: ['detalle'],
          message: `El marcador {${marcador}} no existe. Usa uno de: ${IDS_CALCULO.map((i) => `{${i}}`).join(', ')}.`,
        });
      }
    }
  });

export const esquemaPerfil = z.object({
  nombreCorto: texto('Nombre corto del perfil'),
  rol: texto('Rol'),
  titular: texto('Titular'),
  sobreMi: z.array(texto('Párrafo de «Sobre mí»')).min(1, '«Sobre mí» necesita al menos un párrafo.'),
  metricas: opcional(z.array(esquemaMetrica)),
  secciones: z
    .array(z.enum(SECCIONES, { error: `La sección debe ser una de: ${SECCIONES.join(', ')}.` }))
    .refine((s) => s.includes('/'), 'Las secciones deben incluir la portada «/».'),
  tituloDocumento: texto('Título de la pestaña').refine(
    (t) => marcadores(t).every((m) => m === 'nombre'),
    'En el título de la pestaña solo se puede usar el marcador {nombre}.',
  ),
});

export const esquemaPerfiles = z.object({
  perfiles: z.object({
    principal: esquemaPerfil,
    secundario: esquemaPerfil,
    terciario: esquemaPerfil,
  }),
});

/* ── posts.json ─────────────────────────────────────────────── */

/** Post de Instagram (forma común del muro y del Top 20). */
export const esquemaPostInstagram = z.object({
  id: texto('Id del post'),
  /** Vacío = «Reel/Carrusel para Instagram». */
  titulo: opcional(z.string()),
  url: urlInstagram,
  tipo: z.enum(TIPOS_POST, { error: 'El tipo debe ser carrusel, video o imagen.' }),
  fecha,
  descripcion: opcional(z.string()),
  likes: opcional(entero('Interacciones')),
  /** Alcance: reproducciones de TikTok si la pieza existe allí, o estimado desde los likes. Ordena el Top 20. */
  alcance: opcional(entero('Alcance')),
  /** `true` si `alcance` es una estimación (se muestra con «~» y «alcance estimado»). */
  alcanceEstimado: opcional(z.boolean()),
  /** Cuenta que lo publicó, sin `@`. */
  cuenta: opcional(z.string().regex(/^[^@\s]+$/, 'Escribe la cuenta sin @.')),
  /** Imagen de portada en `public/`. Sin ella se dibuja una portada con el título. */
  portada: opcional(rutaPublica),
  /** Id numérico del mismo video en TikTok: con él el reel se reproduce en el sitio (el embed de reels de Instagram está bloqueado). */
  tiktok: opcional(z.string().regex(/^\d{15,25}$/, 'El id de TikTok son solo números (los que van al final del enlace del video, después de /video/).')),
  /** `'horizontal'` para videos 16:9; sin el campo, vertical 4:5. */
  orientacion: opcional(z.enum(['horizontal'], { error: 'La orientación solo puede ser horizontal o quedar vacía.' })),
  tema: opcional(z.enum(TEMAS_POST, { error: `El tema debe ser uno de: ${TEMAS_POST.join(', ')}.` })),
  /** Altura del recorte de la portada en la caja de CD o el digipak (0 = arriba, 100 = abajo). Sin el campo, 42. */
  encuadre: opcional(entero('Encuadre de la portada').max(100, '«Encuadre de la portada» va de 0 (arriba) a 100 (abajo).')),
  /** Carruseles: cuántas fotos trae. Se ve en el digipak del muro («12 fotos»). */
  fotos: opcional(entero('Fotos del carrusel').min(1, '«Fotos del carrusel» debe ser 1 o más.')),
});

/** Post del muro: aquí el tema es obligatorio. */
export const esquemaPostMuro = esquemaPostInstagram.extend({
  tema: z.enum(TEMAS_POST, { error: `Cada post necesita un tema: ${TEMAS_POST.join(', ')}.` }),
});

export const esquemaPosts = z.object({
  posts: z.array(esquemaPostMuro).superRefine((posts, ctx) => {
    const ids = posts.map((p) => p.id);
    ids.forEach((id, i) => {
      if (ids.indexOf(id) !== i) ctx.addIssue({ code: 'custom', path: [i, 'id'], message: `El id «${id}» está repetido.` });
    });
  }),
});

/* ── tiktok.json (preparado: aún sin sección en el sitio) ───── */

export const esquemaVideoTiktok = z.object({
  id: texto('Id del video'),
  url: urlTiktok,
  tipo: z.enum(TIPOS_TIKTOK, { error: 'El tipo debe ser video o carrusel.' }),
  fecha,
  descripcion: opcional(z.string()),
  reproducciones: opcional(entero('Reproducciones')),
  likes: opcional(entero('Likes')),
  comentarios: opcional(entero('Comentarios')),
  compartidos: opcional(entero('Compartidos')),
  portada: opcional(rutaPublica),
});

export const esquemaTiktok = z.object({ videos: z.array(esquemaVideoTiktok) });

/* ── Todo junto ─────────────────────────────────────────────── */

/** Archivo de `contenido/` → su esquema. */
export const ESQUEMAS = {
  'sitio.json': esquemaSitio,
  'perfiles.json': esquemaPerfiles,
  'posts.json': esquemaPosts,
  'tiktok.json': esquemaTiktok,
} as const;

export type ArchivoContenido = keyof typeof ESQUEMAS;

/** Formato de cada archivo tal como queda después de validar. */
export interface FuentesContenido {
  sitio: z.infer<typeof esquemaSitio>;
  perfiles: z.infer<typeof esquemaPerfiles>;
  posts: z.infer<typeof esquemaPosts>;
  tiktok: z.infer<typeof esquemaTiktok>;
}

/** Une la ruta de Zod en algo legible: `posts[3].likes`. */
function rutaLegible(ruta: PropertyKey[]): string {
  return ruta.reduce<string>((acc, p) => (typeof p === 'number' ? `${acc}[${p}]` : acc ? `${acc}.${String(p)}` : String(p)), '');
}

/**
 * Valida los cuatro archivos y las referencias entre ellos. Devuelve una
 * lista de errores en español (vacía si todo está bien). `datos` es el
 * JSON crudo de cada archivo, con la misma clave que en `ESQUEMAS`.
 */
export function validarContenido(datos: Record<ArchivoContenido, unknown>): string[] {
  z.config(z.locales.es());
  const errores: string[] = [];
  const validos: Partial<Record<ArchivoContenido, unknown>> = {};

  for (const archivo of Object.keys(ESQUEMAS) as ArchivoContenido[]) {
    const resultado = ESQUEMAS[archivo].safeParse(datos[archivo]);
    if (resultado.success) {
      validos[archivo] = resultado.data;
    } else {
      for (const issue of resultado.error.issues) {
        const donde = rutaLegible(issue.path);
        errores.push(`contenido/${archivo}${donde ? ` → ${donde}` : ''}: ${issue.message}`);
      }
    }
  }

  // Referencias entre archivos: las cuentas de los posts deben existir en sitio.json.
  const sitio = validos['sitio.json'] as FuentesContenido['sitio'] | undefined;
  if (sitio) {
    const cuentas = new Set(sitio.cuentas.map((c) => c.usuario));
    const posts = validos['posts.json'] as FuentesContenido['posts'] | undefined;
    posts?.posts.forEach((p, i) => {
      if (p.cuenta && !cuentas.has(p.cuenta)) {
        errores.push(`contenido/posts.json → posts[${i}].cuenta: la cuenta «${p.cuenta}» no está en las cuentas de sitio.json.`);
      }
    });
  }

  return errores;
}
