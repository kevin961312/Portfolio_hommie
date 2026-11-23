import { useEffect, useMemo, useRef, useState } from 'react';
import EncabezadoPagina from '../components/layout/EncabezadoPagina';
import CajaCD from '../components/post/CajaCD';
import VisorPost from '../components/post/VisorPost';
import { IconExternalLink, IconHeart } from '../components/icons';
import { formatearMetrica } from '../lib/formato';
import { ETIQUETA_TEMA, TEMAS, porAlcance, porFecha, tituloPost } from '../lib/posts';
import { useContenido } from '../hooks/useContenido';
import type { PostInstagram, TemaPost } from '../types';
import { usePerfil } from '../hooks/usePerfil';
import styles from './PostsInstagramPage.module.css';

type Tipo = 'video' | 'carrusel';
type Orden = 'likes' | 'recientes';

/** Posts que se suman en cada tanda al bajar: 2 filas de 4 en escritorio. */
const POR_TANDA = 8;

/** Pausa breve con el loader visible antes de mostrar la siguiente tanda. */
const PAUSA_TANDA_MS = 450;

/** Menú + barra de filtros (sticky) más un respiro, para no tapar el muro. */
const ALTO_BARRAS = 150;

/* Sin ninguno marcado se ven todos; tocar el marcado lo desmarca. */
const TIPOS: { id: Tipo; etiqueta: string }[] = [
  { id: 'video', etiqueta: 'Reels' },
  { id: 'carrusel', etiqueta: 'Carruseles' },
];

const cumpleTema = (p: PostInstagram, filtro: TemaPost | null) => !filtro || p.tema === filtro;

export default function PostsInstagramPage() {
  const { perfil } = usePerfil();
  const { posts: postsInstagram } = useContenido();
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [tema, setTema] = useState<TemaPost | null>(null);
  const [orden, setOrden] = useState<Orden>('likes');
  // Cuántos posts de `lista` se muestran; crece de a una tanda al bajar.
  const [mostrados, setMostrados] = useState(POR_TANDA);
  // Posición en `lista` del post abierto en grande.
  const [abierto, setAbierto] = useState<number | null>(null);
  const centinelaRef = useRef<HTMLDivElement>(null);
  const muroRef = useRef<HTMLUListElement>(null);
  const barraRef = useRef<HTMLDivElement>(null);
  const marcaBarraRef = useRef<HTMLSpanElement>(null);

  /* La barra de filtros solo lleva fondo cuando está pegada bajo el menú
     (tapa el muro que pasa por detrás); quieta, es transparente y deja ver
     la onda del fondo. Un marcador de 1 px justo encima avisa cuándo se
     pega: cuando sale de la pantalla por arriba. */
  useEffect(() => {
    const marca = marcaBarraRef.current;
    const barra = barraRef.current;
    if (!marca || !barra) return;
    const observador = new IntersectionObserver(
      ([entrada]) => barra.toggleAttribute('data-pegada', !entrada.isIntersecting && entrada.boundingClientRect.top < 64),
      { rootMargin: '-64px 0px 0px 0px' },
    );
    observador.observe(marca);
    return () => observador.disconnect();
  }, []);

  /* Cambiar filtro u orden vuelve a la primera tanda y, si ya se había
     bajado, sube al inicio del muro (si no, el loader del final seguiría
     a la vista y cargaría todas las tandas de golpe). */
  const reiniciarMuro = () => {
    setMostrados(POR_TANDA);
    const muro = muroRef.current;
    const tope = muro ? muro.getBoundingClientRect().top + window.scrollY - ALTO_BARRAS : 0;
    if (window.scrollY > tope) window.scrollTo({ top: tope });
  };
  const cambiarTipo = (t: Tipo) => {
    setTipo((actual) => (actual === t ? null : t));
    reiniciarMuro();
  };
  const cambiarTema = (t: TemaPost) => {
    setTema((actual) => (actual === t ? null : t));
    reiniciarMuro();
  };
  const cambiarOrden = (o: Orden) => {
    setOrden(o);
    reiniciarMuro();
  };

  // Al pasar de post en el visor, el muro ya muestra hasta ese post.
  const cambiarAbierto = (i: number) => {
    setAbierto(i);
    setMostrados((n) => Math.max(n, Math.ceil((i + 1) / POR_TANDA) * POR_TANDA));
  };

  useEffect(() => {
    document.title = `Posts de Instagram · ${perfil.tituloDocumento}`;
  }, [perfil.tituloDocumento]);

  const lista = useMemo(
    () =>
      postsInstagram
        .filter((p) => (!tipo || p.tipo === tipo) && cumpleTema(p, tema))
        .sort(orden === 'likes' ? porAlcance : porFecha),
    [postsInstagram, tipo, tema, orden],
  );
  // Conteo de cada tema dentro del formato elegido.
  const porTema = useMemo(() => {
    const cuenta = Object.fromEntries(TEMAS.map((t) => [t.id, 0])) as Record<TemaPost, number>;
    for (const p of postsInstagram) {
      if (tipo && p.tipo !== tipo) continue;
      if (p.tema) cuenta[p.tema] += 1;
    }
    return cuenta;
  }, [postsInstagram, tipo]);
  // Posición de cada post en `lista` (los que el filtro saca no están).
  const posicion = useMemo(() => new Map(lista.map((p, i) => [p.url, i])), [lista]);
  const hayMas = mostrados < lista.length;

  /* Scroll infinito: cuando el loader del final se acerca a la pantalla,
     se suma otra tanda tras una pausa breve. Se vuelve a observar en cada
     tanda: si el loader sigue a la vista (pantalla alta), carga otra. */
  useEffect(() => {
    const nodo = centinelaRef.current;
    if (!nodo || !hayMas || typeof IntersectionObserver === 'undefined') return;
    let espera = 0;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting || espera) return;
        espera = window.setTimeout(() => {
          espera = 0;
          setMostrados((n) => n + POR_TANDA);
        }, PAUSA_TANDA_MS);
      },
      { rootMargin: '200px 0px' },
    );
    observador.observe(nodo);
    return () => {
      observador.disconnect();
      clearTimeout(espera);
    };
  }, [hayMas, mostrados]);

  return (
    <div className={styles.page}>
      <EncabezadoPagina
        creditos="Redes sociales"
        titulo="Posts de"
        resaltado="Instagram"
        lead="Reels y carruseles producidos para redes sociales. Toca cualquiera para verlo en grande: ahí se reproduce el reel o se pasa el carrusel."
      />

      <span ref={marcaBarraRef} className={styles.marcaBarra} aria-hidden="true" />
      <div ref={barraRef} className={styles.barra}>
        <div className={styles.grupo} role="group" aria-label="Formato">
          {TIPOS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={styles.chip}
              aria-pressed={tipo === t.id}
              onClick={() => cambiarTipo(t.id)}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>
        <span className={styles.separador} aria-hidden="true" />
        <div className={styles.grupo} role="group" aria-label="Tema">
          {TEMAS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={styles.chip}
              data-tema={t.id}
              aria-pressed={tema === t.id}
              disabled={porTema[t.id] === 0 && tema !== t.id}
              onClick={() => cambiarTema(t.id)}
            >
              <span className={styles.punto} aria-hidden="true" />
              {t.etiqueta} · {porTema[t.id]}
            </button>
          ))}
        </div>
        <div className={styles.orden} role="group" aria-label="Ordenar">
          <button type="button" aria-pressed={orden === 'likes'} onClick={() => cambiarOrden('likes')}>
            Más vistos
          </button>
          <button type="button" aria-pressed={orden === 'recientes'} onClick={() => cambiarOrden('recientes')}>
            Recientes
          </button>
        </div>
      </div>

      <p className={styles.conteo} aria-live="polite">
        {lista.length} {lista.length === 1 ? 'publicación' : 'publicaciones'}
        {tema && ` · ${ETIQUETA_TEMA[tema]}`}
      </p>

      {lista.length === 0 && <p className={styles.vacio}>No hay publicaciones con estos filtros.</p>}

      {/* El muro es un estante: todo es un objeto de 142 × 125 mm (los
          reels, cajas de CD; los carruseles y las fotos, digipaks; los
          horizontales también, con la portada recortada en el estuche), así
          las filas quedan parejas. Las piezas nunca cambian de lugar en el
          DOM ni se desmontan: el orden se aplica con `order` del grid y el
          filtro y las tandas aún no mostradas solo las ocultan. */}
      <ul ref={muroRef} className={styles.muro} hidden={lista.length === 0}>
        {postsInstagram.map((p) => {
          const i = posicion.get(p.url);
          const visible = i !== undefined && i < mostrados;
          const abrir = () => i !== undefined && setAbierto(i);
          const meta = (
            <div className={styles.meta}>
              <span className={styles.likes}>
                <IconHeart size={13} /> {formatearMetrica(p.likes ?? 0, true)}
              </span>
              <span className={styles.cuenta}>{p.tipo === 'video' ? 'Reel' : p.tipo === 'carrusel' ? 'Carrusel' : 'Foto'} · @{p.cuenta ?? 'instagram'}</span>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.externo}
                aria-label={`Abrir en Instagram: ${tituloPost(p)}`}
              >
                <IconExternalLink size={14} />
              </a>
            </div>
          );
          return (
            <li key={p.url} className={`${styles.item} revelar`} hidden={!visible} style={i === undefined ? undefined : { order: i }}>
              <CajaCD post={p} onAbrir={abrir} />
              {meta}
            </li>
          );
        })}
      </ul>

      {/* Al llegar aquí se suma otra tanda; mientras tanto, el loader. */}
      {hayMas && (
        <div ref={centinelaRef} className={styles.masPosts} role="status">
          <span className={styles.giro} aria-hidden="true" />
          Cargando más publicaciones
        </div>
      )}

      <VisorPost posts={lista} indice={abierto} onCambiar={cambiarAbierto} onCerrar={() => setAbierto(null)} />
    </div>
  );
}
