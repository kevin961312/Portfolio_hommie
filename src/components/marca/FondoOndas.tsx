import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { crearOnda } from './ondaEspectro';
import styles from './FondoOndas.module.css';

/* ──────────────────────────────────────────────────────────────
   Fondo fijo de todo el sitio: «el disco suena». Un espectro de audio
   circular (WebGL, ver `ondaEspectro.ts`) alrededor del disco grande de
   la portada, sobre los surcos tenues de un vinilo. Va detrás de todo y
   no se mueve con el scroll; la onda ondula muy despacio.

   - Al bajar en la portada (el disco sube al menú) y en las demás
     páginas, la onda se abre un poco y se atenúa para no competir con
     el contenido.
   - 30 cuadros por segundo; se pausa con la pestaña oculta.
   - En pantallas táctiles (`pointer: coarse`) no dibuja mientras hay
     scroll (ni durante la inercia): la GPU del teléfono queda libre para
     el scroll y el logo que sube al menú. Al soltar, la onda alcanza su
     estado (abierta y tenue) con el mismo seguimiento suave.
   - La capa mide 100lvh: cuando la barra de direcciones del teléfono se
     esconde o aparece no cambia de tamaño (no se reestira el lienzo).
   - `prefers-reduced-motion`: un solo cuadro quieto (y se respeta si
     cambia en vivo).
   - Sin WebGL: quedan los surcos y los anillos CSS de antes.
   ────────────────────────────────────────────────────────────── */

const DPR_MAX = 1.5;
const MS_CUADRO = 1000 / 30;
/** Pausa táctil: se reanuda este tiempo después del último evento de scroll. */
const MS_REANUDAR = 140;
/** Instante del cuadro quieto en reduced motion (una forma equilibrada). */
const T_QUIETO = 37;

export default function FondoOndas() {
  const fondoRef = useRef<HTMLDivElement>(null);
  const lienzoRef = useRef<HTMLCanvasElement>(null);
  const anclaRef = useRef<HTMLSpanElement>(null);
  const { pathname } = useLocation();
  const enPortadaRef = useRef(pathname === '/');
  const avisarRutaRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    enPortadaRef.current = pathname === '/';
    avisarRutaRef.current?.();
  }, [pathname]);

  useEffect(() => {
    const fondo = fondoRef.current;
    const lienzo = lienzoRef.current;
    const ancla = anclaRef.current;
    if (!fondo || !lienzo || !ancla) return;

    let onda = crearOnda(lienzo);
    if (!onda) return;
    fondo.dataset.lienzo = '';

    const movimiento = window.matchMedia('(prefers-reduced-motion: reduce)');
    const tactil = window.matchMedia('(pointer: coarse)');
    let quieto = movimiento.matches;
    /** Alto de la capa (100lvh), medido en cada cambio de tamaño real. */
    let alto = window.innerHeight;
    let desplazando = false;
    let reanudar = 0;
    let raf = 0;
    let ultimo = 0;
    let s = -1;
    const inicio = performance.now();

    /** 0 con el disco grande en la portada · 1 con el disco en el menú. */
    const objetivo = () => {
      if (!enPortadaRef.current) return 1;
      const p = window.scrollY / (alto * 0.6);
      if (quieto) return p > 0.5 ? 1 : 0; // cambio de estado, sin transición
      return Math.min(1, Math.max(0, p));
    };

    // El centro y el radio salen del CSS (mismas fórmulas que el disco).
    const medir = () => {
      if (!onda) return;
      const caja = fondo.getBoundingClientRect();
      const a = ancla.getBoundingClientRect();
      alto = caja.height;
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
      // Mismo corte que el CSS (720 px): en el teléfono el texto va debajo del disco.
      const movil = caja.width <= 720;
      onda.redimensionar(caja.width, caja.height, dpr, a.left - caja.left, a.top - caja.top, a.width, movil);
    };

    const dibujar = (ahora: number) => {
      if (!onda) return;
      const meta = objetivo();
      // Seguimiento suave del scroll (sin saltos al cambiar de página).
      s = s < 0 || quieto ? meta : s + (meta - s) * 0.12;
      onda.dibujar(quieto ? T_QUIETO : T_QUIETO + (ahora - inicio) / 1000, s);
    };

    const cuadro = (ahora: number) => {
      raf = requestAnimationFrame(cuadro);
      if (desplazando || ahora - ultimo < MS_CUADRO - 2) return;
      ultimo = ahora;
      dibujar(ahora);
    };

    const arrancar = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (quieto || document.hidden) {
        dibujar(performance.now());
        return;
      }
      raf = requestAnimationFrame(cuadro);
    };

    const alCambiarMovimiento = () => {
      quieto = movimiento.matches;
      arrancar();
    };

    const alCambiarVisibilidad = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else {
        arrancar();
      }
    };

    // En reduced motion no hay bucle: se redibuja solo si cambia el estado.
    let estadoQuieto = objetivo();
    const alHacerScroll = () => {
      if (!quieto) {
        if (!tactil.matches) return;
        desplazando = true;
        window.clearTimeout(reanudar);
        reanudar = window.setTimeout(() => {
          desplazando = false;
        }, MS_REANUDAR);
        return;
      }
      const e = objetivo();
      if (e !== estadoQuieto) {
        estadoQuieto = e;
        dibujar(performance.now());
      }
    };
    avisarRutaRef.current = () => {
      if (quieto) dibujar(performance.now());
    };

    let espera = 0;
    const observador = new ResizeObserver(() => {
      window.clearTimeout(espera);
      espera = window.setTimeout(() => {
        medir();
        if (quieto) dibujar(performance.now());
      }, 150);
    });
    observador.observe(fondo);

    const alPerderContexto = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
      onda = null;
      delete fondo.dataset.lienzo; // vuelven los anillos CSS
    };
    lienzo.addEventListener('webglcontextlost', alPerderContexto);

    medir();
    arrancar();
    movimiento.addEventListener('change', alCambiarMovimiento);
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    window.addEventListener('scroll', alHacerScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(espera);
      window.clearTimeout(reanudar);
      observador.disconnect();
      movimiento.removeEventListener('change', alCambiarMovimiento);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      window.removeEventListener('scroll', alHacerScroll);
      lienzo.removeEventListener('webglcontextlost', alPerderContexto);
      avisarRutaRef.current = null;
      onda?.destruir();
      delete fondo.dataset.lienzo;
    };
  }, []);

  return (
    <div ref={fondoRef} className={styles.fondo} aria-hidden="true">
      <span className={styles.surcos} />
      <span className={styles.ondas}>
        <span />
        <span />
        <span />
        <span />
      </span>
      <canvas ref={lienzoRef} className={styles.lienzo} />
      {/* Punto de medida: su esquina es el centro del disco y su ancho, el radio. */}
      <span ref={anclaRef} className={styles.ancla} />
    </div>
  );
}
