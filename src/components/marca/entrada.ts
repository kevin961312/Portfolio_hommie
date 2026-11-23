/* ──────────────────────────────────────────────────────────────
   Entrada del sitio: coordina la cortina de carga con el logo y el menú.

   La cortina existe solo en la primera carga (el Navbar y la cortina
   viven fuera de las rutas, así que navegar no la repite). Fases:
     cortina  → la pantalla está tapada mientras cargan las imágenes
     abriendo → las franjas se separan; desde `inicio()` corre la
                coreografía (piezas del logo, giro, resto del menú)
     lista    → todo en su sitio
   Con `prefers-reduced-motion: reduce` se empieza directamente en `lista`.
   ────────────────────────────────────────────────────────────── */

export type FaseEntrada = 'cortina' | 'abriendo' | 'lista';

const reducido =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let fase: FaseEntrada = reducido ? 'lista' : 'cortina';
let inicio = 0;
const oyentes = new Set<() => void>();

const avisar = () => oyentes.forEach((fn) => fn());

export const entrada = {
  /** Fase actual (sirve como `getSnapshot` de `useSyncExternalStore`). */
  fase: (): FaseEntrada => fase,
  /** `performance.now()` del momento en que las franjas empezaron a abrirse. */
  inicio: () => inicio,
  suscribir(fn: () => void) {
    oyentes.add(fn);
    return () => {
      oyentes.delete(fn);
    };
  },
  /** Lo llama la cortina cuando empiezan a separarse las franjas. */
  abrir() {
    if (fase !== 'cortina') return;
    fase = 'abriendo';
    inicio = performance.now();
    avisar();
  },
  /** Lo llama la cortina al desaparecer del todo. */
  terminar() {
    if (fase === 'lista') return;
    if (fase === 'cortina') inicio = performance.now();
    fase = 'lista';
    avisar();
  },
};

/** Tiempos de la coreografía, en ms desde `entrada.inicio()`. */
export const TIEMPOS_ENTRADA = {
  /** Las piezas del logo empiezan a subir. */
  piezas: 500,
  /** El resto del menú (nombre y enlaces) aparece. */
  menu: 1100,
} as const;
