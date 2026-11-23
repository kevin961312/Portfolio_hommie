/* ──────────────────────────────────────────────────────────────
   Índice de componentes reutilizables. En un sitio nuevo basta con:
     import { TarjetaPost, VisorPost, EncabezadoPagina } from './components';
   Cada carpeta trae su `.module.css` al lado: copiar la carpeta entera.
   Catálogo con props y ejemplos en el README («Componentes»).
   ────────────────────────────────────────────────────────────── */

/* Estructura de página */
export { default as Navbar } from './layout/Navbar';
export { default as Footer } from './layout/Footer';
export { default as EncabezadoPagina, Contador } from './layout/EncabezadoPagina';
export type { DatoEncabezado } from './layout/EncabezadoPagina';

/* Marca: logo tocadiscos, cortina de carga y escenario de portada */
export { default as LogoDisco } from './marca/LogoDisco';
export { default as CortinaCarga } from './marca/CortinaCarga';
export { default as FondoOndas } from './marca/FondoOndas';
export { default as DiscoCargando } from './marca/DiscoCargando';
export { default as PortadaDisco } from './marca/PortadaDisco';
export { entrada, TIEMPOS_ENTRADA } from './marca/entrada';
export type { FaseEntrada } from './marca/entrada';
export { suscribirAcople, RECORRIDO_ACOPLE, UMBRAL_OCULTAR } from './marca/acople';
export type { EstadoAcople } from './marca/acople';
export type { LogoPiezas, PiezaLogo } from './marca/tipos';

/* Métricas con contador animado */
export { default as MetricasImpacto } from './metricas/MetricasImpacto';
export { default as MetricaCard } from './metricas/MetricaCard';

/* Posts de Instagram (cajas, embeds y visor) */
export { default as TarjetaPost } from './post/TarjetaPost';
export { default as PortadaPost } from './post/PortadaPost';
export { default as CajaCD } from './post/CajaCD';
export type { VarianteCaja } from './post/CajaCD';
export { default as PostVivo } from './post/PostVivo';
export { default as VisorPost } from './post/VisorPost';

/* Íconos SVG */
export * from './icons';
