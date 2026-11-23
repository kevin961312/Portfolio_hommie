import type { Cuenta, PerfilContenido, PerfilId, PostConTema, Sitio, VideoTiktok } from '../types';
import type { FuentesContenido } from './esquema';
import { calcularValores, resolverPerfil } from '../lib/calculos';
import type { ValoresCalculados } from '../lib/calculos';

/* ──────────────────────────────────────────────────────────────
   De los JSON de `contenido/` a lo que pintan las páginas.
   Función pura: el sitio la llama una vez con los archivos
   publicados; una vista previa podría llamarla con un borrador.
   ────────────────────────────────────────────────────────────── */

export interface Contenido {
  sitio: Sitio;
  /** Cuentas de Instagram por usuario (sin `@`): nombre visible e iniciales. */
  cuentas: Record<string, Cuenta>;
  perfiles: Record<PerfilId, PerfilContenido>;
  /** Posts del muro y del Top 20. */
  posts: PostConTema[];
  /** Videos de TikTok (aún sin sección en el sitio). */
  tiktok: VideoTiktok[];
  /** Todas las cifras calculadas (las mismas que usan las métricas). */
  valores: ValoresCalculados;
}

/** Enlace wa.me a partir del número visible y el indicativo del país (57 por defecto). */
export function enlaceWhatsapp(numero: string, indicativo = '57'): string {
  const digitos = numero.replace(/\D/g, '');
  return digitos ? `https://wa.me/${indicativo}${digitos}` : '';
}

export function armarContenido(f: FuentesContenido): Contenido {
  const { cuentas: listaCuentas, contacto, ...restoSitio } = f.sitio;
  const numero = contacto.whatsapp.numero ?? '';
  const sitio: Sitio = {
    ...restoSitio,
    contacto: {
      correo: contacto.correo,
      telefono: contacto.telefono,
      ciudad: contacto.ciudad,
      whatsapp: { numero, url: enlaceWhatsapp(numero, contacto.whatsapp.indicativo) },
    },
  };

  const cuentas = Object.fromEntries(listaCuentas.map((c) => [c.usuario, { nombre: c.nombre, iniciales: c.iniciales }]));
  const posts = f.posts.posts;
  const tiktok = f.tiktok.videos;
  const valores = calcularValores({ posts, tiktok });

  const p = f.perfiles.perfiles;
  const perfiles: Record<PerfilId, PerfilContenido> = {
    principal: resolverPerfil('principal', p.principal, valores, sitio.nombre),
    secundario: resolverPerfil('secundario', p.secundario, valores, sitio.nombre),
    terciario: resolverPerfil('terciario', p.terciario, valores, sitio.nombre),
  };

  return { sitio, cuentas, perfiles, posts, tiktok, valores };
}
