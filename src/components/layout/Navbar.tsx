import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { IconMenu, IconClose } from '../icons';
import LogoDisco from '../marca/LogoDisco';
import { acopleEnCompositor, suscribirAcople } from '../marca/acople';
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

const igual = (a: Caja, b: Caja) =>
  Math.abs(a.left - b.left) < 0.5 && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.width - b.width) < 0.5;

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
     cajas y se interpola translate + scale). Donde se puede, la
     interpolación la hace una animación CSS atada al scroll
     (`animation-timeline: scroll()`, en el compositor) y el JS solo deja
     el destino en `--acople`. En las demás páginas vive quieto dentro de
     la ranura. */
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

    let grande: Caja = { left: 0, top: 0, width: 1 };
    let acoplado: Caja = { left: 0, top: 0, width: 1 };
    let primero = true;
    let enCompositorAntes: boolean | null = null;

    /* Cajas del FLIP sin quitar el transform: la grande sale de los
       `left/top/width` resueltos del logo fijo (no cambian con el transform
       ni con la animación) y la acoplada, de la ranura (que no se mueve).
       Devuelve false si nada cambió (p. ej. la barra de direcciones del
       teléfono que se esconde: dispara `resize`, pero las cajas usan svh/vw). */
    const medir = () => {
      const cs = getComputedStyle(viajero);
      const g = { left: parseFloat(cs.left), top: parseFloat(cs.top), width: parseFloat(cs.width) };
      const r = ranura.getBoundingClientRect();
      const a = { left: r.left, top: r.top, width: r.width };
      if (igual(g, grande) && igual(a, acoplado)) return false;
      grande = g;
      acoplado = a;
      grandeRef.current = grande;
      // Destino del FLIP para la animación CSS atada al scroll (se mueve en
      // el compositor) y para el estado acoplado.
      viajero.style.setProperty('--acople', llevar(grande, acoplado));
      return true;
    };

    const quitar = suscribirAcople(({ progreso, oculto, medir: hayQueMedir }) => {
      const cambio = hayQueMedir && medir();
      const enCompositor = acopleEnCompositor();
      const pasaAlCompositor = enCompositor && enCompositorAntes !== true;
      enCompositorAntes = enCompositor;
      const transform = llevar(grande, acoplado, progreso);
      if (!enCompositor) {
        // Respaldo (sin animaciones atadas al scroll o con movimiento
        // reducido): solo se escribe `transform`, sin lecturas por cuadro.
        viajero.style.transform = transform;
      } else if (cambio || pasaAlCompositor) {
        // El CSS lo mueve; el transform en línea es solo el del estado
        // acoplado (cuando la animación se apaga, ver `data-acoplado`).
        viajero.style.transform = llevar(grande, acoplado);
      }
      cajaVisibleRef.current = {
        left: grande.left + (acoplado.left - grande.left) * progreso,
        top: grande.top + (acoplado.top - grande.top) * progreso,
        width: grande.width + (acoplado.width - grande.width) * progreso,
      };
      // Acoplado: ya es parte del menú y se puede tocar. Además apaga la
      // animación y suelta la capa: el disco quieto se vuelve a pintar nítido
      // a su tamaño chico. Hasta entonces la capa es estable (sin
      // `will-change` que se pone y se quita a mitad del gesto).
      viajero.toggleAttribute('data-acoplado', progreso >= 1);
      // El nombre fijo aparece cuando el disco ya casi llegó (en el
      // compositor lo hace el CSS).
      const opacidadNombre = String(Math.min(1, Math.max(0, (progreso - 0.55) / 0.45)));
      if (!enCompositor) nombre.style.opacity = opacidadNombre;
      else if (pasaAlCompositor) nombre.style.opacity = '';
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
      viajero.style.removeProperty('--acople');
      viajero.removeAttribute('data-acoplado');
      nombre.style.opacity = '';
      nav.removeAttribute('data-oculto');
    };
  }, [enPortada]);

  // El menú solo lista las secciones que este perfil expone.
  const itemsVisibles = navItems.filter((item) => perfil.secciones.includes(item.path));
  /** Va gigante y apagado de fondo en la barra: en la portada, el nombre del
      sitio; en las demás páginas, el nombre de la sección. */
  const seccionActual = enPortada ? sitio.nombre : navItems.find((item) => item.path === pathname)?.label;

  /* Marca de agua a lo ancho de la barra: el CSS calcula el tamaño con
     unidades de contenedor (`cqw`) y el ancho del texto en `em`. Ese ancho
     se mide una vez por texto (y cuando carga la fuente); los cambios de
     tamaño de la ventana los resuelve el CSS solo. */
  const marcaRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const marca = marcaRef.current;
    if (!marca) return;
    const medirMarca = () => {
      const tamano = parseFloat(getComputedStyle(marca).fontSize);
      if (tamano > 0) marca.style.setProperty('--ancho-em', String(marca.scrollWidth / tamano));
    };
    medirMarca();
    document.fonts?.addEventListener('loadingdone', medirMarca);
    return () => document.fonts?.removeEventListener('loadingdone', medirMarca);
  }, [pathname, seccionActual]);

  return (
    <nav
      ref={navRef}
      className={styles.navbar}
      data-entrada={conEntrada ? fase : undefined}
      data-portada={enPortada || undefined}
    >
      {seccionActual && (
        <span className={styles.marcaAgua} aria-hidden="true">
          <span
            key={pathname}
            ref={marcaRef}
            style={{ '--letras': seccionActual.length } as CSSProperties}
          >
            {seccionActual}
          </span>
        </span>
      )}
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
