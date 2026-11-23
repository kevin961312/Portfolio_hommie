import { useEffect, useRef } from 'react';

/**
 * Franja central de la pantalla (~40 % del alto): el root del observador se
 * recorta un 30 % arriba y otro 30 % abajo.
 */
const FRANJA = '-30% 0px -30% 0px';

/** Parte de la pieza que debe caber en la franja para darla por «en foco». */
const UMBRAL = 0.9;

/* Un solo IntersectionObserver para todas las piezas de la página (cajas de
   CD y digipaks): se crea con la primera y se suelta con la última. Marca
   `data-en-foco` directo en el DOM, sin estado de React ni listeners de scroll. */
let observador: IntersectionObserver | null = null;
let observadas = 0;

function marcar(entradas: IntersectionObserverEntry[]) {
  for (const e of entradas) {
    const franja = e.rootBounds?.height ?? 0;
    // Si la pieza es más alta que la franja, basta con que la llene casi toda.
    const enFoco =
      e.isIntersecting &&
      (e.intersectionRatio >= UMBRAL || (franja > 0 && e.intersectionRect.height >= franja * UMBRAL));
    e.target.toggleAttribute('data-en-foco', enFoco);
  }
}

/** Solo en pantallas táctiles (sin cursor fino) y si se permite el movimiento. */
function aplica() {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return false;
  const conCursor = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return !conCursor && !reducido;
}

/**
 * En el teléfono no hay hover: la pieza que pasa por la franja central de la
 * pantalla al hacer scroll recibe `data-en-foco` y el CSS hace lo mismo que
 * con el cursor (el CD o la hoja del librillo asoman). Devuelve el `ref` del
 * elemento que se observa.
 */
export function useFocoCentral<T extends Element>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo || !aplica()) return;
    observador ??= new IntersectionObserver(marcar, { rootMargin: FRANJA, threshold: [0, 0.5, UMBRAL, 1] });
    observador.observe(nodo);
    observadas += 1;
    return () => {
      nodo.removeAttribute('data-en-foco');
      observador?.unobserve(nodo);
      observadas -= 1;
      if (observadas === 0) {
        observador?.disconnect();
        observador = null;
      }
    };
  }, []);

  return ref;
}
