import styles from './FondoOndas.module.css';

/* ──────────────────────────────────────────────────────────────
   Fondo fijo de todo el sitio: los surcos de un disco centrados en la
   pantalla y cuatro ondas que salen de donde está el disco grande de la
   portada, como el sonido saliendo del tocadiscos. Va detrás de todo,
   no se mueve con el scroll y su movimiento es muy lento y tenue.
   Solo se animan `transform` y `opacity` (no repinta el fondo).
   ────────────────────────────────────────────────────────────── */
export default function FondoOndas() {
  return (
    <div className={styles.fondo} aria-hidden="true">
      <span className={styles.surcos} />
      <span className={styles.ondas}>
        <span />
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}
