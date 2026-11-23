import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IconGlobe, IconInstagram, IconLocation, IconMail, IconPhone, IconPlay, IconWhatsApp } from '../components/icons';
import MetricasImpacto from '../components/metricas/MetricasImpacto';
import PortadaDisco from '../components/marca/PortadaDisco';
import { usePerfil } from '../hooks/usePerfil';
import styles from './SobreMiPage.module.css';
import { useContenido } from '../hooks/useContenido';

export default function SobreMiPage() {
  const { perfilId, perfil, search } = usePerfil();
  const { sitio } = useContenido();

  // El título de la pestaña acompaña al perfil activo (útil al compartir el enlace).
  useEffect(() => {
    document.title = perfil.tituloDocumento;
  }, [perfil.tituloDocumento]);

  return (
    <>
    {/* Primera pantalla: el disco del menú, grande y fijo al centro; a su izquierda
        el nombre y el titular, y a su derecha el contacto. Sube al menú con el scroll. */}
    <PortadaDisco>
      <div className={styles.escenario}>
        <div className={styles.heroTexto} key={perfilId}>
          <h1 className={styles.nombre}>
            {sitio.portada.nombre} <span>{sitio.portada.apellido}</span>
          </h1>
          <p className={styles.rol}>{perfil.rol}</p>
          <p className={styles.titular}>{perfil.titular}</p>
        </div>

        <aside className={styles.contactoPortada} aria-label="Contacto">
          <h2 className={styles.contactoTitulo}>Contacto</h2>
          <ul className={styles.contactoLista}>
            {sitio.redes.map((r) => {
              const Icono = r.tipo === 'instagram' ? IconInstagram : r.tipo === 'tiktok' ? IconPlay : IconGlobe;
              const contenido = (
                <>
                  <Icono size={16} />
                  <span className={styles.contactoRed}>{r.nombre}</span>
                  <span className={styles.contactoUsuario}>@{r.usuario}</span>
                </>
              );
              return (
                <li key={r.usuario}>
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className={styles.contactoFila}>
                      {contenido}
                    </a>
                  ) : (
                    <span className={styles.contactoFila}>{contenido}</span>
                  )}
                </li>
              );
            })}
            {sitio.contacto.whatsapp.numero && (
              <li>
                <a href={sitio.contacto.whatsapp.url} target="_blank" rel="noopener noreferrer" className={styles.contactoFila}>
                  <IconWhatsApp size={16} />
                  <span className={styles.contactoRed}>WhatsApp</span>
                  <span className={styles.contactoUsuario}>{sitio.contacto.whatsapp.numero}</span>
                </a>
              </li>
            )}
            {sitio.contacto.telefono && (
              <li>
                <a href={`tel:${sitio.contacto.telefono.replace(/\s/g, '')}`} className={styles.contactoFila}>
                  <IconPhone size={16} />
                  <span className={styles.contactoUsuario}>{sitio.contacto.telefono}</span>
                </a>
              </li>
            )}
            {sitio.contacto.correo && (
              <li>
                <a href={`mailto:${sitio.contacto.correo}`} className={styles.contactoFila}>
                  <IconMail size={16} />
                  <span className={styles.contactoRed}>Correo</span>
                  <span className={styles.contactoUsuario}>
                    {/* Si no cabe, corta después de la @ y no a mitad de palabra. */}
                    {sitio.contacto.correo.split('@')[0]}@<wbr />
                    {sitio.contacto.correo.split('@')[1]}
                  </span>
                </a>
              </li>
            )}
            {sitio.contacto.ciudad && (
              <li>
                <span className={styles.contactoFila}>
                  <IconLocation size={16} />
                  <span className={styles.contactoUsuario}>{sitio.contacto.ciudad}</span>
                </span>
              </li>
            )}
          </ul>
        </aside>
      </div>
    </PortadaDisco>
    <div className={styles.page}>
      {/* «Sobre mí» completo en su caja, debajo de la portada. */}
      <section className={`${styles.sobreMiCaja} revelar`} aria-labelledby="titulo-sobre-mi" key={perfilId}>
        <h2 id="titulo-sobre-mi" className={styles.sobreMiTitulo}>Sobre mí</h2>
        <div className={styles.sobreMiTexto}>
          {perfil.sobreMi.map((parrafo) => (
            <p key={parrafo} className={styles.parrafo}>
              {parrafo}
            </p>
          ))}
        </div>
        <div className={styles.acciones}>
          <Link to={{ pathname: '/top-20', search }} className={styles.botonPrincipal}>
            <IconPlay size={15} /> Ver mi Top 20
          </Link>
          <Link to={{ pathname: '/posts-instagram', search }} className={styles.botonSecundario}>
            Ver todos los posts
          </Link>
        </div>
      </section>

      {/* Métricas e impacto: los valores cambian con el perfil activo */}
      <div className={`${styles.metricas} revelar`}>
        <MetricasImpacto metricas={perfil.metricas} nota="Cifras verificables en las secciones del portafolio" />
      </div>
    </div>
    </>
  );
}
