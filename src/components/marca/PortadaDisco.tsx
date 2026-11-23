import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { acopleEnCompositor, suscribirAcople } from './acople';
import styles from './PortadaDisco.module.css';

/* ──────────────────────────────────────────────────────────────
   Primera pantalla de la portada: el escenario sobre el que flota el
   logo grande del Navbar (efecto open-rise). No pinta el logo: lo pinta
   el Navbar, para que el disco del centro y el del menú sean el mismo
   elemento. Aquí solo va el brillo centrado donde está el disco (los
   surcos y las ondas son del fondo fijo de todo el sitio, `FondoOndas`),
   que se aleja de 1 a 0,95 mientras el logo sube al menú, y
   una marca de «baja» que se apaga en el mismo tramo. Donde hay
   `animation-timeline: scroll()` las dos cosas las hace el CSS en el
   compositor; si no, el oyente de `acople.ts`.
   `children` (opcional) se pinta abajo, sobre el fondo.
   ────────────────────────────────────────────────────────────── */

const ESCALA_FINAL = 0.95;

export default function PortadaDisco({ children }: { children?: ReactNode }) {
  const fondoRef = useRef<HTMLDivElement>(null);
  const pistaRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fondo = fondoRef.current;
    const pista = pistaRef.current;
    if (!fondo || !pista) return;
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)');
    let enCompositor = false;
    return suscribirAcople(({ progreso }) => {
      // Con animaciones atadas al scroll lo hace el CSS en el compositor.
      if (acopleEnCompositor()) {
        if (!enCompositor) {
          enCompositor = true;
          fondo.style.transform = '';
          fondo.style.willChange = '';
          pista.style.opacity = '';
        }
        return;
      }
      enCompositor = false;
      fondo.style.transform = reducido.matches ? '' : `scale(${1 - (1 - ESCALA_FINAL) * progreso})`;
      // Capa estable mientras se mueve (sin ponerla y quitarla a mitad del gesto).
      fondo.style.willChange = reducido.matches ? '' : 'transform';
      pista.style.opacity = String(Math.max(0, 1 - progreso * 2.5));
    });
  }, []);

  return (
    <section className={styles.portada}>
      <div ref={fondoRef} className={styles.fondo} aria-hidden="true">
      </div>
      {children}
      <span ref={pistaRef} className={styles.pista} aria-hidden="true">
        <span />
      </span>
    </section>
  );
}
