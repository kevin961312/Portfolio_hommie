import type { ReactNode } from 'react';
import { formatearMetrica } from '../../lib/formato';
import styles from './EncabezadoPagina.module.css';

export interface DatoEncabezado {
  valor: number;
  etiqueta: string;
  /** `true` → 346.386 se muestra como «346K». */
  compacto?: boolean;
}

interface Props {
  /** Línea de créditos bajo el título (p. ej. «Redes sociales»). */
  creditos: string;
  titulo: string;
  /** Palabra final del título (mismo color que el resto: el título va entero en ámbar). */
  resaltado?: string;
  lead: string;
  datos?: DatoEncabezado[];
  /** Botones o enlaces bajo el texto. */
  children?: ReactNode;
}

export function Contador({ valor, etiqueta, compacto }: DatoEncabezado) {
  // Número final desde el primer momento: no cuenta desde 0.
  return (
    <div className={styles.dato}>
      <span className={styles.datoValor}>{formatearMetrica(valor, compacto)}</span>
      <span className={styles.datoEtiqueta}>{etiqueta}</span>
    </div>
  );
}

/** Encabezado común de las secciones: título grande, texto y cifras animadas. */
export default function EncabezadoPagina({ creditos, titulo, resaltado, lead, datos, children }: Props) {
  return (
    <header className={styles.encabezado}>
      <h1 className={styles.titulo}>
        {titulo} {resaltado && <span>{resaltado}</span>}
      </h1>
      <p className={styles.creditos}>{creditos}</p>
      <p className={styles.lead}>{lead}</p>
      {datos && datos.length > 0 && (
        <div className={styles.datos}>
          {datos.map((d) => (
            <Contador key={d.etiqueta} {...d} />
          ))}
        </div>
      )}
      {children && <div className={styles.acciones}>{children}</div>}
    </header>
  );
}
