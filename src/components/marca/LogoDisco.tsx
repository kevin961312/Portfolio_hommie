import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { entrada, TIEMPOS_ENTRADA } from './entrada';
import type { FaseEntrada } from './entrada';
import type { LogoPiezas } from './tipos';
import styles from './LogoDisco.module.css';

/* ──────────────────────────────────────────────────────────────
   Logo circular que gira como un disco a 33⅓ rpm.

   - El giro es una animación WAAPI (`rotate`, corre en el compositor).
     Arrancar y frenar no la pausan: se interpola su `playbackRate`
     (0 ↔ 1) durante unos cientos de ms, como un plato que acelera o
     una mano que lo detiene. Fuera de esas rampas no corre ningún JS.
   - En la primera carga, mientras está la <CortinaCarga>, las piezas
     están ocultas; al abrirse la cortina suben de izquierda a derecha
     y el disco arranca cuando casi todas han llegado.
   - Con `prefers-reduced-motion: reduce` aparece quieto y entero.
   El tamaño lo decide el contenedor: ocupa el 100 % de su caja.
   ────────────────────────────────────────────────────────────── */

/** Una vuelta a 33⅓ rpm: 60 s / 33,333 = 1,8 s. */
const VUELTA_MS = 1800;
/** El motor tarda esto en llegar a 33⅓ desde parado. */
const ARRANQUE_MS = 800;
/** La mano lo frena en este tiempo. */
const FRENADO_MS = 650;

/** Entrada de piezas (coreografía de open-rise adaptada). */
const SUBIDA = 0.065; // fracción del lado del logo (≈25 px con el logo grande)
const DURACION_PIEZA = 1500;
const BARRIDO = 820; // de la primera a la última tanda
const TANDAS = 12;
const EXPO_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

/**
 * Lleva la velocidad del plato a `objetivo` (0 = parado, 1 = 33⅓) en `ms`.
 * Interrumpible: parte de la velocidad actual y cancela la rampa anterior.
 */
function rampa(giro: Animation | null, cuadro: { current: number }, objetivo: number, ms: number) {
  if (!giro) return;
  cancelAnimationFrame(cuadro.current);
  const desde = giro.playbackRate;
  if (desde === objetivo) return;
  const t0 = performance.now();
  const paso = (t: number) => {
    const x = Math.min(1, (t - t0) / ms);
    // ease-out: el cambio de velocidad es fuerte al principio y se asienta
    giro.playbackRate = desde + (objetivo - desde) * (1 - (1 - x) * (1 - x));
    if (x < 1) cuadro.current = requestAnimationFrame(paso);
  };
  cuadro.current = requestAnimationFrame(paso);
}

const reducido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const faseServidor = (): FaseEntrada => 'lista';

interface Props {
  logo: LogoPiezas;
  /** Texto accesible. Sin él, el logo es decorativo (`aria-hidden`). */
  etiqueta?: string;
  className?: string;
  /** Si es false el disco no gira (p. ej. una versión estática). */
  girar?: boolean;
}

export default function LogoDisco({ logo, etiqueta, className, girar = true }: Props) {
  const raizRef = useRef<HTMLSpanElement>(null);
  const rotorRef = useRef<SVGSVGElement>(null);
  const giroRef = useRef<Animation | null>(null);
  const rampaRef = useRef(0);
  const manoRef = useRef(false);
  /** El motor ya arrancó: antes, soltar el disco no lo pone a girar. */
  const listoRef = useRef(false);
  const fase = useSyncExternalStore(entrada.suscribir, entrada.fase, faseServidor);
  // Solo en la primera carga con cortina las piezas empiezan ocultas.
  const [conEntrada] = useState(() => entrada.fase() === 'cortina');
  const cubierto = fase === 'cortina';

  /* Entrada de piezas y arranque del motor. */
  useEffect(() => {
    const raiz = raizRef.current;
    const rotor = rotorRef.current;
    const cuadroRampa = rampaRef;
    if (!raiz || !rotor || cubierto) return;
    const animaciones: Animation[] = [];
    let espera = 0;

    if (conEntrada && !reducido()) {
      const ya = performance.now() - entrada.inicio();
      const base = Math.max(0, TIEMPOS_ENTRADA.piezas - ya);
      const lado = Number(logo.viewBox.split(/\s+/)[2]) || 1000;
      const subida = lado * SUBIDA;
      const total = logo.piezas.length;
      rotor.querySelectorAll<SVGPathElement>('[data-turno]').forEach((pieza) => {
        const turno = Number(pieza.dataset.turno);
        const tanda = Math.min(TANDAS - 1, Math.floor((turno / total) * TANDAS));
        // Retrasos que se acortan: la ola acelera hacia la derecha.
        const x = tanda / (TANDAS - 1);
        const retraso = base + BARRIDO * (1 - Math.pow(1 - x, 1.5));
        const opciones = { delay: retraso, fill: 'backwards' as const };
        // La subida es larga (expo.out); la opacidad, corta y aparte.
        animaciones.push(
          pieza.animate(
            [{ transform: `translate(0px, ${subida}px)` }, { transform: 'translate(0px, 0px)' }],
            { ...opciones, duration: DURACION_PIEZA, easing: EXPO_OUT },
          ),
        );
        // La costura amarilla se enciende cuando su pieza oscura ya es casi
        // opaca: así el amarillo no se ve a través del oscuro a mitad de fundido.
        const costura = pieza.parentElement?.hasAttribute('data-costura');
        animaciones.push(
          pieza.animate([{ opacity: 0 }, { opacity: 1 }], {
            ...opciones,
            delay: retraso + (costura ? 200 : 0),
            duration: costura ? 300 : 350,
            easing: 'linear',
          }),
        );
      });
      // El brillo es decoración: se enciende cuando el disco ya está entero,
      // junto con el arranque del motor.
      const halo = raiz.querySelector('[data-halo]');
      if (halo) {
        animaciones.push(
          halo.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 900,
            delay: base + BARRIDO,
            easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
            fill: 'backwards',
          }),
        );
      }
      raiz.removeAttribute('data-oculto');
      // El motor arranca cuando la última tanda ya casi llegó (expo.out).
      espera = base + BARRIDO + 420;
    } else {
      raiz.removeAttribute('data-oculto');
    }

    if (!girar || reducido()) return () => animaciones.forEach((a) => a.cancel());

    const giro = rotor.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
      duration: VUELTA_MS,
      iterations: Infinity,
    });
    giro.playbackRate = 0;
    giroRef.current = giro;
    const listo = listoRef;
    listo.current = false;
    const temporizador = window.setTimeout(() => {
      listo.current = true;
      if (!manoRef.current) rampa(giro, rampaRef, 1, ARRANQUE_MS);
    }, espera);

    return () => {
      window.clearTimeout(temporizador);
      cancelAnimationFrame(cuadroRampa.current);
      animaciones.forEach((a) => a.cancel());
      giro.cancel();
      giroRef.current = null;
    };
    // De la fase solo importa salir de 'cortina' (no se repite al pasar a 'lista').
  }, [cubierto, conEntrada, girar, logo]);

  /* La mano sobre el disco: el ratón al pasar; el dedo o el lápiz al tocar. */
  const poner = (e: PointerEvent) => {
    if (e.type === 'pointerenter' && e.pointerType !== 'mouse') return;
    if (e.type === 'pointerdown' && e.pointerType === 'mouse') return;
    manoRef.current = true;
    rampa(giroRef.current, rampaRef, 0, FRENADO_MS);
  };
  const quitar = (e: PointerEvent) => {
    if (e.type === 'pointerleave' && e.pointerType !== 'mouse') return;
    if (e.type === 'pointerup' && e.pointerType === 'mouse') return;
    manoRef.current = false;
    if (listoRef.current) rampa(giroRef.current, rampaRef, 1, ARRANQUE_MS);
  };

  // Brillo amarillo justo por fuera del borde del disco.
  const lado = Number(logo.viewBox.split(/\s+/)[2]) || 1000;
  const radio = (logo.radio / lado) * 100; // % del lado
  const borde = radio / (radio + 5);
  const estiloHalo = {
    inset: `${50 - radio - 5}%`,
    background: `radial-gradient(closest-side, transparent ${borde * 100 - 2}%, var(--logo-brillo) ${borde * 100 + 1.5}%, transparent 100%)`,
  } as CSSProperties;

  return (
    <span
      ref={raizRef}
      className={`${styles.logo} ${className ?? ''}`}
      data-oculto={conEntrada || undefined}
      onPointerEnter={poner}
      onPointerLeave={quitar}
      onPointerDown={poner}
      onPointerUp={quitar}
      onPointerCancel={quitar}
      {...(etiqueta ? { role: 'img', 'aria-label': etiqueta } : { 'aria-hidden': true })}
    >
      <span className={styles.halo} style={estiloHalo} data-halo aria-hidden="true" />
      <svg
        ref={rotorRef}
        className={styles.rotor}
        viewBox={logo.viewBox}
        aria-hidden="true"
        focusable="false"
      >
        {/* Trazo del color de las letras bajo las piezas oscuras: rellena
            los huecos (contornos de las letras) y forma el aro exterior. */}
        <g className={styles.costura} strokeWidth={logo.trazo} data-costura>
          {logo.piezas.map((p, i) =>
            p.tipo === 'disco' ? <path key={i} d={p.d} data-turno={p.turno} /> : null,
          )}
        </g>
        {logo.piezas.map((p, i) => (
          <path
            key={i}
            d={p.d}
            data-turno={p.turno}
            className={p.tipo === 'disco' ? styles.disco : styles.letra}
          />
        ))}
      </svg>
    </span>
  );
}
