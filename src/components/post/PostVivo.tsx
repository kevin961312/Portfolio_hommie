import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { PostInstagram } from '../../types';
import { limpiarUrlInstagram, procesarEmbedsInstagram } from '../../lib/instagram';
import { IconExternalLink } from '../icons';
import styles from './PostVivo.module.css';

/** El embed de Instagram no baja de este ancho (326 px + 2 de borde). */
const ANCHO_MINIMO_EMBED = 328;

/** Ni sube de este (540 px del blockquote). */
const ANCHO_MAXIMO_EMBED = 540;

/** Alto / ancho del video en un post horizontal (16:9). */
const PROPORCION_HORIZONTAL = 9 / 16;

/** Tiempo máximo con el loader visible antes de dejar solo la portada. */
const ESPERA_MAXIMA_MS = 15000;

/** Un embed de Instagram que no llegó a este alto (px) no se pudo incrustar. */
const ALTO_MINIMO_EMBED = 50;

/** Tras el `load` del iframe de Instagram se revisa su alto: embed.js lo ajusta enseguida. */
const REVISION_ALTO_MS = 4000;

/** Reproductor oficial de TikTok. Opciones: developers.tiktok.com/doc/embed-player */
const REPRODUCTOR_TIKTOK = 'https://www.tiktok.com/player/v1/';

/** Proporción del video de TikTok (ancho / alto). */
const PROPORCION_TIKTOK = 9 / 16;

/** El iframe del embed no llegó a medir nada (ausente o de 2 px). Si la tarjeta está oculta (`display: none`) no se puede juzgar. */
function embedSinAlto(iframe: HTMLIFrameElement | null | undefined) {
  if (!iframe) return true;
  return iframe.getClientRects().length > 0 && iframe.offsetHeight < ALTO_MINIMO_EMBED;
}

function urlReproductorTiktok(id: string) {
  const opciones = new URLSearchParams({
    autoplay: '0', // el sonido solo arranca cuando la persona toca play
    loop: '0',
    controls: '1',
    progress_bar: '1',
    play_button: '1',
    volume_control: '1',
    fullscreen_button: '1',
    timestamp: '1',
    music_info: '0',
    description: '0',
    rel: '0', // sin videos relacionados al terminar
    native_context_menu: '0',
    closed_caption: '0',
  });
  return `${REPRODUCTOR_TIKTOK}${id}?${opciones}`;
}

interface Props {
  post: PostInstagram;
  /** Si recibe toques: reproducir el reel o pasar el carrusel. */
  interactivo?: boolean;
  /** Se llama la primera vez que alguien toca el post (el foco entra al iframe). */
  onTocado?: () => void;
}

/**
 * Detecta que alguien tocó un iframe de otro dominio: no avisa a la página,
 * pero el foco entra en él. La ventana suele perder el foco en ese momento
 * (`blur`), pero no siempre (si no lo tenía antes), así que además se
 * revisa cada poco mientras el post esté en vivo. Avisa una sola vez.
 */
function useToqueEnIframe(
  contenedor: RefObject<HTMLElement | null>,
  activo: boolean,
  onTocado?: () => void,
) {
  const tocadoRef = useRef(onTocado);
  useEffect(() => {
    tocadoRef.current = onTocado;
  }, [onTocado]);

  useEffect(() => {
    if (!activo) return;
    let avisado = false;
    const revisar = () => {
      const enfocado = document.activeElement;
      if (!avisado && enfocado instanceof HTMLIFrameElement && contenedor.current?.contains(enfocado)) {
        avisado = true;
        tocadoRef.current?.();
      }
    };
    const alPerderFoco = () => window.setTimeout(revisar, 0);
    window.addEventListener('blur', alPerderFoco);
    const intervalo = window.setInterval(revisar, 300);
    return () => {
      window.removeEventListener('blur', alPerderFoco);
      clearInterval(intervalo);
    };
  }, [contenedor, activo]);
}

/** Loader sobre la portada mientras llega el post real. */
function Cargando() {
  return (
    <span className={styles.cargando} role="status" aria-label="Cargando publicación">
      <span className={styles.giro} />
    </span>
  );
}

/**
 * Respaldo cuando el post no se puede reproducir aquí: la portada (que ya
 * está debajo) y un botón que lleva a Instagram en otra pestaña. Solo se
 * dibuja en la tarjeta con la que se puede interactuar; en las demás basta
 * la portada.
 */
function VerEnInstagram({ post }: { post: PostInstagram }) {
  return (
    <div className={styles.respaldo}>
      <a
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.respaldoEnlace}
        aria-label={`Ver en Instagram (se abre en otra pestaña): ${post.titulo ?? post.id}`}
      >
        Ver en Instagram <IconExternalLink size={16} />
      </a>
    </div>
  );
}

/**
 * Reel con su par en TikTok: el reproductor oficial en una caja 9:16. Solo
 * se monta en la tarjeta con la que se puede interactuar: al salir de ella
 * el iframe se destruye y el video se corta. No arranca solo (sin sonido
 * por sorpresa): la persona pulsa play.
 */
function VivoTiktok({ post, id, interactivo, onTocado }: { post: PostInstagram; id: string; interactivo: boolean; onTocado?: () => void }) {
  const vivoRef = useRef<HTMLDivElement>(null);
  const [cargado, setCargado] = useState(false);
  const [agotado, setAgotado] = useState(false);
  const horizontal = post.orientacion === 'horizontal';

  useToqueEnIframe(vivoRef, interactivo, onTocado);

  // Si en este tiempo no cargó, se quita el loader y se ofrece Instagram.
  useEffect(() => {
    if (!interactivo || cargado) return;
    const espera = window.setTimeout(() => setAgotado(true), ESPERA_MAXIMA_MS);
    return () => clearTimeout(espera);
  }, [interactivo, cargado]);

  if (!interactivo) return null;
  if (agotado && !cargado) return <VerEnInstagram post={post} />;

  return (
    <>
      {!cargado && <Cargando />}
      <div ref={vivoRef} className={styles.tiktok} data-listo={cargado || undefined} data-horizontal={horizontal || undefined}>
        <iframe
          className={styles.tiktokMarco}
          src={urlReproductorTiktok(id)}
          title={`Video: ${post.titulo ?? post.id}`}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          style={horizontal ? undefined : { aspectRatio: PROPORCION_TIKTOK }}
          onLoad={() => setCargado(true)}
        />
      </div>
    </>
  );
}

/**
 * El post real de Instagram recortado a su imagen, sin el marco blanco:
 * el iframe sube lo que mide su cabecera y el contenedor (4:5, igual que
 * el post) esconde el pie. Lo de adentro del iframe no se puede tocar (es
 * otro dominio), solo recortarlo y escalarlo desde afuera. Es el camino de
 * los carruseles y las imágenes; los reels no se pueden incrustar.
 *
 * Si el embed no carga (el iframe se queda sin alto), cae al respaldo
 * «Ver en Instagram».
 */
function VivoInstagram({ post, interactivo, onTocado }: { post: PostInstagram; interactivo: boolean; onTocado?: () => void }) {
  const vivoRef = useRef<HTMLDivElement>(null);
  const embedRef = useRef<HTMLDivElement>(null);
  const [listo, setListo] = useState(false);
  const [agotado, setAgotado] = useState(false);
  const [fallo, setFallo] = useState(false);
  const horizontal = post.orientacion === 'horizontal';

  useToqueEnIframe(vivoRef, interactivo, onTocado);

  // Si en este tiempo no cargó, se quita el loader (Instagram bloqueado o caído)
  // y se revisa que el iframe haya llegado a medir algo.
  useEffect(() => {
    const espera = window.setTimeout(() => {
      setAgotado(true);
      if (embedSinAlto(embedRef.current?.querySelector('iframe'))) setFallo(true);
    }, ESPERA_MAXIMA_MS);
    return () => clearTimeout(espera);
  }, []);

  // Carga el embed y marca la portada lista un instante después del `load`.
  useEffect(() => {
    const nodo = embedRef.current;
    if (!nodo) return;
    let espera = 0;
    let revision = 0;
    const alCargar = () => {
      espera = window.setTimeout(() => setListo(true), 200);
      // Un embed bloqueado carga «bien» pero se queda en 2 px de alto.
      revision = window.setTimeout(() => {
        if (embedSinAlto(nodo.querySelector('iframe'))) setFallo(true);
      }, REVISION_ALTO_MS);
    };
    const engancharIframe = () => {
      const iframe = nodo.querySelector('iframe');
      if (!iframe) return false;
      iframe.addEventListener('load', alCargar, { once: true });
      return true;
    };
    // Se observa antes de procesar: si embed.js ya está cargado, cambia
    // el blockquote por el iframe en la misma llamada.
    const observador = new MutationObserver(() => {
      if (engancharIframe()) observador.disconnect();
    });
    observador.observe(nodo, { childList: true, subtree: true });
    procesarEmbedsInstagram();
    return () => {
      observador.disconnect();
      clearTimeout(espera);
      clearTimeout(revision);
    };
  }, []);

  /* Vertical: en tarjetas más angostas que el embed, en vez de cortarle
     los lados se encoge entero (--escala = ancho tarjeta / ancho embed).
     Horizontal: el video 16:9 se escala para cubrir el marco (sea 16:9,
     ancho o 4:5) y se centra; el sobrante queda fuera, como `cover`. */
  useEffect(() => {
    const vivo = vivoRef.current;
    if (!vivo || typeof ResizeObserver === 'undefined') return;
    const medir = () => {
      const ancho = vivo.clientWidth;
      if (!horizontal) {
        vivo.style.setProperty('--escala', String(Math.min(1, (ancho + 2) / ANCHO_MINIMO_EMBED)));
        return;
      }
      const alto = vivo.clientHeight;
      const anchoEmbed = Math.min(ANCHO_MAXIMO_EMBED, Math.max(ANCHO_MINIMO_EMBED, ancho));
      const altoVideo = anchoEmbed * PROPORCION_HORIZONTAL;
      const escala = Math.max(ancho / anchoEmbed, alto / altoVideo);
      vivo.style.setProperty('--ancho-embed', `${anchoEmbed}px`);
      vivo.style.setProperty('--escala', String(escala));
      vivo.style.setProperty('--dx', `${(ancho - anchoEmbed * escala) / 2}px`);
      vivo.style.setProperty('--dy', `${(alto - altoVideo * escala) / 2}px`);
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(vivo);
    return () => observador.disconnect();
  }, [horizontal, fallo]);

  // Sin embed: queda la portada y, si se puede tocar, el enlace a Instagram.
  if (fallo) return interactivo ? <VerEnInstagram post={post} /> : null;

  return (
    <>
      {/* Loader sobre la portada mientras llega el post real. Va fuera de
          `.vivo`, que es invisible hasta estar listo. Si Instagram no
          responde (bloqueado), se quita y queda solo la portada. */}
      {!listo && !agotado && <Cargando />}
      <div
        ref={vivoRef}
        className={styles.vivo}
        data-listo={listo || undefined}
        data-interactivo={interactivo || undefined}
        data-horizontal={horizontal || undefined}
      >
        {/* embed.js reemplaza el blockquote por un iframe; React solo monta
            y desmonta el div que lo envuelve. */}
        <div ref={embedRef} className={styles.embed}>
          <blockquote
            className="instagram-media"
            data-instgrm-permalink={limpiarUrlInstagram(post.url)}
            data-instgrm-version="14"
            style={{ margin: 0, width: '100%', minWidth: 0, maxWidth: 540, border: 0, padding: 0 }}
          />
        </div>
      </div>
    </>
  );
}

/**
 * Lo que se reproduce dentro de una tarjeta, según el tipo de post:
 *  - reel con `tiktok`: el reproductor de TikTok (solo en la tarjeta interactiva);
 *  - reel sin par en TikTok: la portada y «Ver en Instagram» (los reels no se
 *    pueden incrustar), nunca un play que no hace nada;
 *  - carrusel o imagen: el embed de Instagram.
 *
 * Va encima de una PortadaPost, que se ve mientras carga. El contenedor
 * tiene que ser `position: relative` y tener el tamaño de la tarjeta.
 *
 * Para cortar un reel que está sonando, el padre lo desmonta (o le cambia
 * la `key`): destruir el iframe es lo único que lo detiene seguro.
 */
export default function PostVivo({ post, interactivo = false, onTocado }: Props) {
  if (post.tipo === 'video') {
    return post.tiktok ? (
      <VivoTiktok post={post} id={post.tiktok} interactivo={interactivo} onTocado={onTocado} />
    ) : interactivo ? (
      <VerEnInstagram post={post} />
    ) : null;
  }
  return <VivoInstagram post={post} interactivo={interactivo} onTocado={onTocado} />;
}
