import { rutaPublica } from '../../lib/rutas';
import styles from './DiscoCargando.module.css';

interface Props {
  /** Diámetro en px. */
  tamano?: number;
}

/**
 * Indicador de carga: el disco del Homie girando como en el tocadiscos
 * (33⅓ rpm, una vuelta cada 1,8 s). Es decorativo: el texto o el
 * `aria-label` de quien lo usa dice qué se está cargando.
 */
export default function DiscoCargando({ tamano = 34 }: Props) {
  return (
    <img
      src={rutaPublica('/brand/logo-homie.svg')}
      alt=""
      aria-hidden="true"
      width={tamano}
      height={tamano}
      className={styles.disco}
      decoding="async"
    />
  );
}
