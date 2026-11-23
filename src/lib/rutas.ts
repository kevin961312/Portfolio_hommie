/** Antepone `BASE_URL` (`/` con dominio propio) a un archivo de `public/`. */
export function rutaPublica(ruta: string): string {
  return `${import.meta.env.BASE_URL}${ruta.replace(/^\//, '')}`;
}
