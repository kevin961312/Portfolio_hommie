import styles from './Footer.module.css';
import { useContenido } from '../../hooks/useContenido';
import { IconWhatsApp } from '../icons';
import { CREDITO } from '../../lib/credito';

export default function Footer() {
  const { sitio } = useContenido();
  return (
    <footer className={styles.footer}>
      <p>© {new Date().getFullYear()} {sitio.nombre} · {sitio.profesion}</p>
      {/* Firma de quien hizo el sitio, con su contacto para otros proyectos. */}
      <p className={styles.credito}>
        Sitio hecho por <strong>{CREDITO.autor}</strong>
        <span aria-hidden="true"> · </span>
        <a href={CREDITO.whatsapp.url} target="_blank" rel="noopener noreferrer" className={styles.contacto}>
          <IconWhatsApp size={14} />
          ¿Quieres uno? {CREDITO.whatsapp.numero}
        </a>
      </p>
    </footer>
  );
}
