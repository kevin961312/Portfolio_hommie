import type { PostInstagram } from '../../types';
import { rutaPublica } from '../../lib/rutas';
import { ENCUADRE_FICHA, UMBRAL_TOP, creditosFicha, valorAlcance } from '../../lib/posts';
import styles from './CajaCD.module.css';

interface Props {
  /** Ficha de disco (`tema: 'fichas'`). Usa `portada`, `descripcion` (créditos) y `encuadre`. */
  post: PostInstagram;
  /** Abre la pieza en grande (VisorPost). */
  onAbrir: () => void;
  /**
   * Junto a tarjetas 4:5 en la misma fila: la caja ocupa un hueco 4:5 y se
   * apoya abajo, sobre la línea del estante, a la misma altura que ellas.
   */
  alineada?: boolean;
}

/**
 * Ficha de disco como caja de CD (jewel case, 142 × 125 mm): bisagra a la
 * izquierda, bandeja y el librillo cuadrado con la portada del reel.
 * Debajo, los créditos del librillo: disco, artista y «℗ año, ciudad»
 * (sacados del pie con `creditosFicha`). Al pasar el cursor o enfocarla,
 * el CD asoma por la derecha; al tocarla se abre igual que una TarjetaPost.
 */
export default function CajaCD({ post, onAbrir, alineada = false }: Props) {
  const { disco, artista, anio, ciudad } = creditosFicha(post);
  const nombre = artista ? `${disco}, de ${artista}` : disco;
  const encuadre = post.encuadre ?? ENCUADRE_FICHA;
  const lanzamiento = [anio, ciudad].filter(Boolean).join(', ');

  return (
    <div className={styles.ficha} data-alineada={alineada || undefined}>
      <div className={styles.objeto}>
        <button type="button" className={styles.estuche} onClick={onAbrir} aria-label={`Ver el reel: ${nombre}`}>
          <span className={styles.cd} aria-hidden="true" />
          <span className={styles.caja}>
            <span className={styles.bisagra} aria-hidden="true" />
            <span className={styles.librillo}>
              {post.portada ? (
                <img
                  src={rutaPublica(post.portada)}
                  alt={`Portada del reel: ${nombre}`}
                  className={styles.portada}
                  style={{ objectPosition: `50% ${encuadre}%` }}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className={styles.sinPortada}>{disco}</span>
              )}
            </span>
            {valorAlcance(post) >= UMBRAL_TOP && <span className={styles.sello}>Top</span>}
          </span>
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
      </div>
    </div>
  );
}
