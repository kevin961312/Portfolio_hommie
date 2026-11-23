/* ──────────────────────────────────────────────────────────────
   Progreso del acople del logo, atado al scroll (efecto open-rise).

   Un único oyente de scroll para todos los interesados (el logo del
   Navbar y el fondo de la portada): cada evento de scroll pide un solo
   `requestAnimationFrame` y en él se calcula el estado y se reparte.
   Sin scroll no corre nada: no hay bucle permanente.

   - `progreso`: 0 con la página arriba, 1 a los RECORRIDO_ACOPLE px.
     Con movimiento reducido salta de 0 a 1 a mitad de camino.
   - `oculto`: pasados UMBRAL_OCULTAR px, true al bajar y false al subir.
   - `medir`: true cuando cambió el tamaño de la ventana (hay que volver
     a medir las cajas del FLIP; quien escucha compara y, si nada cambió,
     como al esconderse la barra de direcciones del teléfono, no hace nada).

   Donde hay animaciones atadas al scroll (`animation-timeline: scroll()`,
   Chrome 115+, Safari 26+) el movimiento continuo (logo, brillo de la
   portada, nombre del menú) lo hace el CSS en el compositor, al mismo
   ritmo que el scroll aunque el hilo principal se atrase: ver
   `acopleEnCompositor()`. Este oyente queda para los estados discretos
   (`data-acoplado`, `data-oculto`) y como respaldo (otros navegadores o
   movimiento reducido), en el que solo se escribe `transform`.
   ────────────────────────────────────────────────────────────── */

/** Mismo valor que `animation-range` en Navbar.module.css y PortadaDisco.module.css. */
export const RECORRIDO_ACOPLE = 320;
export const UMBRAL_OCULTAR = 750;

const LINEA_SCROLL = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: scroll()');
let mqReducido: MediaQueryList | null = null;

/**
 * true si el CSS mueve el acople en el compositor (hay `animation-timeline`
 * y no se pidió movimiento reducido): entonces el JS no escribe transforms
 * por cuadro. Las reglas CSS van con la misma condición (`@supports` +
 * `prefers-reduced-motion: no-preference`).
 */
export function acopleEnCompositor() {
  if (!LINEA_SCROLL) return false;
  mqReducido ??= window.matchMedia('(prefers-reduced-motion: reduce)');
  return !mqReducido.matches;
}

export interface EstadoAcople {
  progreso: number;
  oculto: boolean;
  medir: boolean;
}

type Oyente = (estado: EstadoAcople) => void;

const oyentes = new Set<Oyente>();
let ultimoY = 0;
let oculto = false;
let cuadro = 0;
let medirPendiente = false;
let consultaReducida: MediaQueryList | null = null;

function calcular() {
  cuadro = 0;
  const y = Math.max(0, window.scrollY);
  const lineal = Math.min(1, y / RECORRIDO_ACOPLE);
  const progreso = consultaReducida?.matches ? (lineal >= 0.5 ? 1 : 0) : lineal;

  // Un margen de 6 px evita que el menú parpadee con el temblor del scroll.
  if (y <= UMBRAL_OCULTAR) oculto = false;
  else if (y > ultimoY + 6) oculto = true;
  else if (y < ultimoY - 6) oculto = false;
  if (Math.abs(y - ultimoY) > 6 || y <= UMBRAL_OCULTAR) ultimoY = y;

  const estado = { progreso, oculto, medir: medirPendiente };
  medirPendiente = false;
  oyentes.forEach((fn) => fn(estado));
}

const pedirCuadro = () => {
  if (!cuadro) cuadro = requestAnimationFrame(calcular);
};

const alCambiarTamano = () => {
  medirPendiente = true;
  pedirCuadro();
};

/** Se suscribe al acople; llama a `fn` en seguida con el estado actual. */
export function suscribirAcople(fn: Oyente) {
  oyentes.add(fn);
  if (oyentes.size === 1) {
    consultaReducida = window.matchMedia('(prefers-reduced-motion: reduce)');
    ultimoY = window.scrollY;
    window.addEventListener('scroll', pedirCuadro, { passive: true });
    window.addEventListener('resize', alCambiarTamano);
    consultaReducida.addEventListener('change', pedirCuadro);
  }
  // Estado inicial sincrónico, para pintar el primer cuadro ya en su sitio.
  const y = Math.max(0, window.scrollY);
  const lineal = Math.min(1, y / RECORRIDO_ACOPLE);
  fn({
    progreso: consultaReducida?.matches ? (lineal >= 0.5 ? 1 : 0) : lineal,
    oculto,
    medir: true,
  });

  return () => {
    oyentes.delete(fn);
    if (oyentes.size === 0) {
      window.removeEventListener('scroll', pedirCuadro);
      window.removeEventListener('resize', alCambiarTamano);
      consultaReducida?.removeEventListener('change', pedirCuadro);
      if (cuadro) cancelAnimationFrame(cuadro);
      cuadro = 0;
      oculto = false;
    }
  };
}
