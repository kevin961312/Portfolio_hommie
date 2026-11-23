import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import CortinaCarga from './components/marca/CortinaCarga';
import FondoOndas from './components/marca/FondoOndas';
import SobreMiPage from './pages/SobreMiPage';
import PostsInstagramPage from './pages/PostsInstagramPage';
import TopPage from './pages/TopPage';
import { usePerfil } from './hooks/usePerfil';
import { sincronizarDesdeUrl } from './lib/perfilStore';
import styles from './App.module.css';

/**
 * Mantiene `?perf=` presente en cada navegación interna de React Router.
 * Si un enlace llega sin el parámetro, lo repone con `replaceState`
 * (sin crear una entrada extra en el historial).
 */
function PerfilSync() {
  const { key } = useLocation();
  useEffect(() => {
    sincronizarDesdeUrl();
  }, [key]);
  return null;
}

/**
 * Aísla las secciones entre versiones de la HV: cada perfil declara sus
 * `secciones` y cualquier ruta fuera de esa lista redirige a la portada.
 * Así, una versión de la HV no da acceso a secciones ajenas ni escribiendo la ruta a mano.
 */
function GuardiaSecciones({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { perfil, search } = usePerfil();

  // Normaliza `/top-20/` → `/top-20` antes de comparar.
  const ruta = pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  if (!perfil.secciones.includes(ruta)) {
    return <Navigate to={{ pathname: '/', search }} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <PerfilSync />
      {/* Solo en la primera carga: está fuera de las rutas, navegar no la repite. */}
      <FondoOndas />
      <CortinaCarga />
      <div className={styles.layout}>
        <Navbar />
        <main className={styles.main}>
          <GuardiaSecciones>
            <Routes>
              <Route path="/" element={<SobreMiPage />} />
              <Route path="/top-20" element={<TopPage />} />

              <Route path="/posts-instagram" element={<PostsInstagramPage />} />
            </Routes>
          </GuardiaSecciones>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
