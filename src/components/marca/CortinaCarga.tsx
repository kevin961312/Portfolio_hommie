import { useEffect, useRef, useState } from 'react';
import { entrada } from './entrada';
import styles from './CortinaCarga.module.css';

/* ──────────────────────────────────────────────────────────────
   Cortina de la primera carga (coreografía de open-rise).

   1. Pantalla tapada por dos franjas oscuras inclinadas −8°. En la
      costura entre ambas, una línea de 1 px (el surco) se llena de
      izquierda a derecha según cargan las imágenes visibles y la fuente
      (mínimo `minimo` ms, máximo `maximo` ms aunque algo no cargue).
   2. Al completarse, la línea se vacía hacia la derecha y se desvanece.
   3. 0,3 s después las franjas se separan (arriba y abajo, expo.inOut,
      1,4 s; 1,8 s en pantallas estrechas) y `entrada.abrir()` da la
      salida al logo y al menú. Al terminar, la cortina se desmonta.

   Mientras tapa, la página no se desplaza y la carga empieza arriba.
   Va una sola vez en <App>, fuera de las rutas: navegar no la repite.
   Con movimiento reducido no se monta (la entrada empieza en 'lista').
   ────────────────────────────────────────────────────────────── */

const POWER2_IN = 'cubic-bezier(0.32, 0, 0.67, 0)';
const EXPO_IN_OUT = 'cubic-bezier(0.87, 0, 0.13, 1)';
/** Lo que tarda la transición CSS del relleno en llegar al 100 %. */
const LLENADO_MS = 400;
const VACIADO_MS = 500;
const ESPERA_FRANJAS_MS = 300;

interface Props {
  /** Tiempo mínimo con la cortina puesta. */
  minimo?: number;
  /** Tope: pasado este tiempo se abre aunque falte alguna imagen. */
  maximo?: number;
}

export default function CortinaCarga({ minimo = 800, maximo = 4000 }: Props) {
  const [activa, setActiva] = useState(() => entrada.fase() === 'cortina');
  const raizRef = useRef<HTMLDivElement>(null);
  const lineaRef = useRef<HTMLSpanElement>(null);
  const rellenoRef = useRef<HTMLSpanElement>(null);
  const arribaRef = useRef<HTMLSpanElement>(null);
  const abajoRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const raiz = raizRef.current;
    const linea = lineaRef.current;
    const relleno = rellenoRef.current;
    const arriba = arribaRef.current;
    const abajo = abajoRef.current;
    if (!activa || !raiz || !linea || !relleno || !arriba || !abajo) return;

    // Mientras tapa no se desplaza la página, y la entrada empieza arriba
    // aunque el navegador quisiera restaurar el scroll al recargar: si no,
    // el logo saldría ya acoplado (o con el menú oculto) y se perdería.
    const html = document.documentElement;
    const soltarScroll = () => {
      html.style.overflow = '';
      html.style.scrollbarGutter = '';
    };
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    // `scrollbar-gutter` mantiene el hueco de la barra: el logo no se corre al soltar.
    html.style.scrollbarGutter = 'stable';
    html.style.overflow = 'hidden';

    const t0 = performance.now();
    const temporizadores: number[] = [];
    const animaciones: Animation[] = [];
    let cerrada = false;
    let vivo = true;

    // Solo cuenta lo que se ve al abrir: imágenes de la primera pantalla y la fuente.
    const imagenes = Array.from(document.images).filter(
      (img) => !img.complete && img.getBoundingClientRect().top < window.innerHeight,
    );
    const total = imagenes.length + 1;
    let listos = 0;

    const abrir = () => {
      if (!vivo) return;
      raiz.dataset.abriendo = '';
      soltarScroll();
      entrada.abrir();
      const duracion = window.matchMedia('(max-width: 720px)').matches ? 1800 : 1400;
      const opciones: KeyframeAnimationOptions = { duration: duracion, easing: EXPO_IN_OUT, fill: 'forwards' };
      animaciones.push(arriba.animate([{ translate: '0 0' }, { translate: '0 -150%' }], opciones));
      const ultima = abajo.animate([{ translate: '0 0' }, { translate: '0 150%' }], opciones);
      animaciones.push(ultima);
      ultima.finished
        .then(() => {
          if (!vivo) return;
          setActiva(false);
          entrada.terminar();
        })
        .catch(() => {});
    };

    const cerrar = () => {
      if (cerrada) return;
      cerrada = true;
      relleno.style.transform = 'scaleX(1)';
      temporizadores.push(
        window.setTimeout(() => {
          // El surco se vacía hacia la derecha mientras se apaga.
          relleno.style.transformOrigin = 'right center';
          animaciones.push(
            relleno.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], {
              duration: VACIADO_MS,
              easing: POWER2_IN,
              fill: 'forwards',
            }),
            linea.animate([{ opacity: 1 }, { opacity: 0 }], {
              duration: VACIADO_MS,
              easing: POWER2_IN,
              fill: 'forwards',
            }),
          );
          temporizadores.push(window.setTimeout(abrir, ESPERA_FRANJAS_MS));
        }, LLENADO_MS),
      );
    };

    const revisar = () => {
      if (cerrada || listos < total) return;
      const falta = minimo - (performance.now() - t0);
      if (falta > 0) temporizadores.push(window.setTimeout(revisar, falta));
      else cerrar();
    };

    const avanzar = () => {
      listos = Math.min(total, listos + 1);
      if (!cerrada) relleno.style.transform = `scaleX(${listos / total})`;
      revisar();
    };

    imagenes.forEach((img) => {
      img.addEventListener('load', avanzar, { once: true });
      img.addEventListener('error', avanzar, { once: true });
    });
    (document.fonts?.ready ?? Promise.resolve()).then(() => vivo && avanzar());
    temporizadores.push(window.setTimeout(cerrar, maximo));

    return () => {
      vivo = false;
      soltarScroll();
      temporizadores.forEach((t) => window.clearTimeout(t));
      animaciones.forEach((a) => a.cancel());
      imagenes.forEach((img) => {
        img.removeEventListener('load', avanzar);
        img.removeEventListener('error', avanzar);
      });
    };
  }, [activa, minimo, maximo]);

  if (!activa) return null;

  return (
    <div ref={raizRef} className={styles.cortina} aria-hidden="true">
      <span ref={arribaRef} className={`${styles.franja} ${styles.arriba}`} />
      <span ref={abajoRef} className={`${styles.franja} ${styles.abajo}`} />
      <span ref={lineaRef} className={styles.linea}>
        <span ref={rellenoRef} className={styles.relleno} />
      </span>
    </div>
  );
}
