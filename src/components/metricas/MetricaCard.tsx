import type { Metrica } from '../../types';
import { formatearMetrica } from '../../lib/formato';
import { IconEye, IconCarousel, IconHeart, IconSparkle } from '../icons';
import styles from './MetricasImpacto.module.css';

const ICONOS = {
  alcance: IconEye,
  publicaciones: IconCarousel,
  interacciones: IconHeart,
  destacado: IconSparkle,
} as const;

/** Tarjeta de métrica: muestra el número final desde el primer momento (sin contar desde 0). */
export default function MetricaCard({ metrica }: { metrica: Metrica }) {
  const Icono = ICONOS[metrica.categoria];

  return (
    <article className={styles.card} data-categoria={metrica.categoria}>
      <span className={styles.cardIcon} aria-hidden="true">
        <Icono size={18} />
      </span>

      <p className={styles.cardValor}>
        {formatearMetrica(metrica.valor, metrica.compacto)}
        {metrica.sufijo && <span className={styles.cardSufijo}>{metrica.sufijo}</span>}
      </p>

      <h3 className={styles.cardEtiqueta}>{metrica.etiqueta}</h3>
      <p className={styles.cardDetalle}>{metrica.detalle}</p>
    </article>
  );
}
