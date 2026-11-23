import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { IconMenu, IconClose } from '../icons';
import LogoDisco from '../marca/LogoDisco';
import { suscribirAcople } from '../marca/acople';
import { entrada } from '../marca/entrada';
import type { FaseEntrada } from '../marca/entrada';
import { usePerfil } from '../../hooks/usePerfil';
import styles from './Navbar.module.css';
import { useContenido } from '../../hooks/useContenido';
import { logoDisco } from '../../data/logo-disco';

const navItems = [
  { path: '/', label: 'Sobre mí' },
  { path: '/top-20', label: 'Top 20' },
  { path: '/posts-instagram', label: 'Posts de Instagram' },
];

/** Traslado del logo al cambiar de página (portada ↔ menú). */
const TRASLADO_MS = 700;
const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';

interface Caja {
  left: number;
  top: number;
  width: number;
}

/** Transform (con origen arriba a la izquierda) que lleva la caja `de` a `a`. */
const llevar = (de: Caja, a: Caja, p = 1) =>
  `translate3d(${(a.left - de.left) * p}px, ${(a.top - de.top) * p}px, 0) scale(${1 + (a.width / de.width - 1) * p})`;

const faseServidor = (): FaseEntrada => 'lista';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  // Todos los enlaces internos arrastran `?perf=` para no perder la
  // versión de HV al navegar entre secciones.
  const { perfil, search } = usePerfil();
  const { sitio } = useContenido();
  const { pathname } = useLocation();
  const enPortada = pathname === '/';

  const navRef = useRef<HTMLElement>(null);
  const ranuraRef = useRef<HTMLSpanElement>(null);
  const viajeroRef = useRef<HTMLSpanElement>(null);
  const nombreRef = useRef<HTMLSpanElement>(null);
  const menuAbiertoRef = useRef(false);
  /** Dónde se veía el logo en el último cuadro (para el traslado entre páginas). */
  const cajaVisibleRef = useRef<Caja | null>(null);
  const modoAnteriorRef = useRef<'portada' | 'menu' | null>(null);
  /** Traslado por tiempo entre portada y menú (se cancela si se interrumpe). */
  const trasladoRef = useRef<Animation | null>(null);
  /** Caja del logo grande sin transform (base del traslado en vuelo). */
  const grandeRef = useRef<Caja | null>(null);

  // Primera carga: el nombre y los enlaces esperan a la cortina.
  const fase = useSyncExternalStore(entrada.suscribir, entrada.fase, faseServidor);
  const [conEntrada] = useState(() => entrada.fase() === 'cortina');

  useEffect(() => {
    menuAbiertoRef.current = menuOpen;
    if (menuOpen) navRef.current?.removeAttribute('data-oculto');
  }, [menuOpen]);

  /* ── Efecto open-rise: el logo grande de la portada sube al menú ──
     El logo es UN solo elemento (`viajero`). En la portada está fijo,
     grande y centrado (su caja natural, por CSS) y un transform lo lleva
     hasta la ranura del menú según el scroll (FLIP: se miden las dos
     cajas y se interpola translate + scale). En las demás páginas vive
     quieto dentro de la ranura. */
  useLayoutEffect(() => {
    const nav = navRef.current;
    const ranura = ranuraRef.current;
    const viajero = viajeroRef.current;
    const nombre = nombreRef.current;
    if (!nav || !ranura || !viajero || !nombre) return;

    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const modo = enPortada ? 'portada' : 'menu';
    const anterior = modoAnteriorRef.current;
    const cambioDeModo = anterior !== null && anterior !== modo;
    modoAnteriorRef.current = modo;

    // Si se cambia de página a mitad de un traslado, el nuevo arranca
    // desde donde se ve el logo en ese instante (sin salto) y el viejo se
    // cancela antes de medir, para que su transform no ensucie las cajas.
    let enVuelo: Caja | null = null;
    const vuelo = trasladoRef.current;
    if (vuelo && vuelo.playState === 'running') {
      const base = anterior === 'portada' ? grandeRef.current : ranura.getBoundingClientRect();
      if (base) {
        const m = new DOMMatrix(getComputedStyle(viajero).transform);
        enVuelo = { left: base.left + m.e, top: base.top + m.f, width: base.width * m.a };
      }
    }
    vuelo?.cancel();
    trasladoRef.current = null;

    if (!enPortada) {
      // Viene de la portada: el logo viaja desde donde se veía hasta la ranura.
      const desde = enVuelo ?? cajaVisibleRef.current;
      const caja = viajero.getBoundingClientRect();
      cajaVisibleRef.current = caja;
      if (cambioDeModo && desde && !reducido && Math.abs(desde.width - caja.width) > 1) {
        trasladoRef.current = viajero.animate([{ transform: llevar(caja, desde) }, { transform: 'none' }], {
          duration: TRASLADO_MS,
          easing: EASE_IN_OUT,
        });
        // El nombre, que en la portada esperaba al disco, llega con él.
        nombre.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: TRASLADO_MS,
          easing: EASE_IN_OUT,
        });
      }
      return;
    }

    let grande: Caja = viajero.getBoundingClientRect();
    let acoplado: Caja = ranura.getBoundingClientRect();
    let primero = true;

    const medir = () => {
      viajero.style.transform = 'none';
      grande = viajero.getBoundingClientRect();
      acoplado = ranura.getBoundingClientRect();
      grandeRef.current = grande;
    };

    const quitar = suscribirAcople(({ progreso, oculto, medir: hayQueMedir }) => {
      if (hayQueMedir) medir();
      const transform = llevar(grande, acoplado, progreso);
      viajero.style.transform = transform;
      cajaVisibleRef.current = {
        left: grande.left + (acoplado.left - grande.left) * progreso,
        top: grande.top + (acoplado.top - grande.top) * progreso,
        width: grande.width + (acoplado.width - grande.width) * progreso,
      };
      // Acoplado: ya es parte del menú y se puede tocar.
      viajero.toggleAttribute('data-acoplado', progreso >= 1);
      // Solo a mitad de camino se promueve a capa (`will-change`); en los
      // extremos se suelta para que el disco quieto se vea nítido.
      viajero.toggleAttribute('data-escalando', progreso > 0 && progreso < 1);
      // El nombre fijo aparece cuando el disco ya casi llegó.
      const opacidadNombre = String(Math.min(1, Math.max(0, (progreso - 0.55) / 0.45)));
      nombre.style.opacity = opacidadNombre;
      nav.toggleAttribute('data-oculto', oculto && !menuAbiertoRef.current);

      // Viene de otra página: sale de la ranura hasta su sitio en la portada.
      if (primero) {
        primero = false;
        if (cambioDeModo && !reducido && progreso < 1) {
          trasladoRef.current = viajero.animate(
            [{ transform: llevar(grande, enVuelo ?? acoplado) }, { transform }],
            { duration: TRASLADO_MS, easing: EASE_IN_OUT },
          );
          // El nombre se apaga antes de que el disco se vaya (salida corta).
          nombre.animate([{ opacity: 1 }, { opacity: opacidadNombre }], {
            duration: 300,
            easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
          });
        }
      }
    });

    return () => {
      quitar();
      viajero.style.transform = '';
      viajero.removeAttribute('data-acoplado');
      viajero.removeAttribute('data-escalando');
      nombre.style.opacity = '';
      nav.removeAttribute('data-oculto');
    };
  }, [enPortada]);

  // El menú solo lista las secciones que este perfil expone.
  const itemsVisibles = navItems.filter((item) => perfil.secciones.includes(item.path));

  return (
    <nav
      ref={navRef}
      className={styles.navbar}
      data-entrada={conEntrada ? fase : undefined}
      data-portada={enPortada || undefined}
    >
      <div className={styles.inner}>
        {/* Tres columnas: nombre | disco (centro exacto de la barra) | enlaces.
            El disco es el enlace a inicio; el nombre lo repite en texto quieto
            (las letras del disco no se leen girando) y se esconde en móvil,
            donde no cabe sin chocar con el disco. */}
        <NavLink
          to={{ pathname: '/', search }}
          className={styles.brand}
          tabIndex={-1}
          aria-hidden="true"
        >
          <span className={styles.marcaTexto}>
            <span ref={nombreRef}>{sitio.nombre}</span>
          </span>
        </NavLink>

        <NavLink to={{ pathname: '/', search }} className={styles.disco} aria-label={sitio.nombre}>
          <span ref={ranuraRef} className={styles.ranura}>
            <span ref={viajeroRef} className={styles.viajero}>
              <LogoDisco logo={logoDisco} />
            </span>
          </span>
        </NavLink>

        <div className={styles.derecha}>
          <button
            className={styles.menuBtn}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <IconClose size={22} /> : <IconMenu size={22} />}
          </button>

          <ul className={`${styles.navList} ${menuOpen ? styles.open : ''}`}>
            {itemsVisibles.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={{ pathname: item.path, search }}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.active : ''}`
                  }
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
