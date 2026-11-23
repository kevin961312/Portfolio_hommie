import type { PostInstagram } from '../../types';
import { rutaPublica } from '../../lib/rutas';
import { ENCUADRE_FICHA, ETIQUETA_TEMA, UMBRAL_TOP, creditosFicha, tituloPost, valorAlcance } from '../../lib/posts';
import { useFocoCentral } from '../../hooks/useFocoCentral';
import styles from './CajaCD.module.css';

/** `cd`: caja de CD (jewel case) para reels. `digipak`: estuche de cartón para carruseles y fotos. */
export type VarianteCaja = 'cd' | 'digipak';

interface Props {
  /**
   * Reel, carrusel o imagen. Si es ficha (`tema: 'fichas'`) usa los créditos
   * del pie; si no, el título, el tema y la fecha. Usa `portada`, `encuadre`
   * y, en el digipak, `fotos`.
   */
  post: PostInstagram;
  /** Abre la pieza en grande (VisorPost). */
  onAbrir: () => void;
  /** Sin ella: `cd` para los reels, `digipak` para carruseles e imágenes. */
  variante?: VarianteCaja;
  /**
   * Junto a tarjetas 4:5 en la misma fila: la caja ocupa un hueco 4:5 y se
   * apoya abajo, sobre la línea del estante, a la misma altura que ellas.
   */
  alineada?: boolean;
}

/**
 * Pieza del muro como objeto de una tienda de discos, siempre de 142 × 125 mm
 * (así las filas quedan parejas, como un estante):
 * - `cd`: caja de CD con bisagra, bandeja y el librillo cuadrado con la
 *   portada; al pasar el cursor el CD asoma por la derecha.
 * - `digipak`: estuche de cartón con la portada impresa en la tapa y «N fotos»;
 *   al pasar el cursor asoma una hoja del librillo.
 * En el teléfono asoman cuando la pieza cruza la franja central de la
 * pantalla (`useFocoCentral`). Al tocarla se abre igual que una TarjetaPost.
 */
export default function CajaCD({ post, onAbrir, variante, alineada = false }: Props) {
  const estuche = useFocoCentral<HTMLButtonElement>();
  const tipo: VarianteCaja = variante ?? (post.tipo === 'video' ? 'cd' : 'digipak');
  /* Fichas de discos: créditos del librillo (disco, artista, ℗ año). El
     resto (festivales, entrevistas, carruseles…) también va en caja, pero
     con su título, el tema y la fecha de publicación: no son discos. */
  const esFicha = post.tema === 'fichas';
  const creditos = creditosFicha(post);
  const disco = esFicha ? creditos.disco : tituloPost(post);
  const artista = esFicha ? creditos.artista : post.tema && ETIQUETA_TEMA[post.tema];
  const nombre = esFicha && artista ? `${disco}, de ${artista}` : disco;
  const encuadre = post.encuadre ?? ENCUADRE_FICHA;
  const lanzamiento = esFicha ? [creditos.anio, creditos.ciudad].filter(Boolean).join(', ') : '';
  const publicado = esFicha ? '' : formatearFecha(post.fecha);
  const pieza = post.tipo === 'video' ? 'el reel' : post.tipo === 'carrusel' ? 'el carrusel' : 'la foto';
  const fotos = tipo === 'digipak' && post.fotos ? `${post.fotos} ${post.fotos === 1 ? 'foto' : 'fotos'}` : '';

  const portada = post.portada ? (
    <img
      src={rutaPublica(post.portada)}
      alt={`Portada de ${pieza}: ${nombre}`}
      className={styles.portada}
      style={{ objectPosition: `50% ${encuadre}%` }}
      loading="lazy"
      decoding="async"
    />
  ) : (
    <span className={styles.sinPortada}>{disco}</span>
  );
  const sello = valorAlcance(post) >= UMBRAL_TOP && <span className={styles.sello}>Top</span>;

  return (
    <div className={styles.ficha} data-variante={tipo} data-alineada={alineada || undefined}>
      <div className={styles.objeto}>
        <button
          ref={estuche}
          type="button"
          className={styles.estuche}
          onClick={onAbrir}
          aria-label={`Ver ${pieza}: ${nombre}${fotos ? `, ${fotos}` : ''}`}
        >
          {tipo === 'cd' ? (
            <>
              <span className={styles.cd} aria-hidden="true" />
              <span className={styles.caja}>
                <span className={styles.bisagra} aria-hidden="true" />
                <span className={styles.librillo}>{portada}</span>
                {sello}
              </span>
            </>
          ) : (
            <>
              {/* Hoja del librillo, guardada en el bolsillo detrás de la tapa. */}
              <span className={styles.hoja} aria-hidden="true" />
              <span className={styles.carton}>
                <span className={styles.pliegue} aria-hidden="true" />
                <span className={styles.tapa}>{portada}</span>
                {fotos && (
                  <span className={styles.fotos} aria-hidden="true">
                    {fotos}
                  </span>
                )}
                {sello}
              </span>
            </>
          )}
        </button>
      </div>

      <div className={styles.creditos}>
        <p className={styles.disco}>{disco}</p>
        {artista && <p className={styles.artista}>{artista}</p>}
        {lanzamiento && (
          <p className={styles.lanzamiento}>
            <span aria-hidden="true">℗ </span>
            <span className={styles.srOnly}>Lanzado en </span>
            {lanzamiento}
          </p>
        )}
        {publicado && <p className={styles.lanzamiento}>{publicado}</p>}
      </div>
    </div>
  );
}

/** «2026-07-20» → «20 jul 2026». */
function formatearFecha(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  if (!a || !m || !d) return fecha;
  return new Date(a, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}
