import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/* ──────────────────────────────────────────────────────────────
   BASE: ruta donde vive el sitio publicado.
   - '/' (por defecto): dominio propio (public/CNAME) o usuario.github.io.
   - '/repo/': repo de proyecto (usuario.github.io/repo/).
   El workflow de GitHub Actions la toma de `actions/configure-pages`;
   en local: `BASE=/repo/ npm run build`.
   ────────────────────────────────────────────────────────────── */
function normalizarBase(valor: string | undefined): string {
  const limpio = (valor ?? '').trim().replace(/^\/+|\/+$/g, '')
  return limpio ? `/${limpio}/` : '/'
}

const base = normalizarBase(process.env.BASE)

/**
 * Al compilar:
 * - emite `version.json` con el commit publicado (`GITHUB_SHA` en Actions,
 *   «local» fuera de CI) para confirmar qué versión está en línea;
 * - ajusta en `404.html` cuántos segmentos de la ruta son la base.
 */
function publicacion(): Plugin {
  let salida = 'docs'
  return {
    name: 'portafolio-publicacion',
    apply: 'build',
    configResolved(config) {
      salida = resolve(config.root, config.build.outDir)
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${JSON.stringify({ sha: process.env.GITHUB_SHA ?? 'local' }, null, 2)}\n`,
      })
    },
    closeBundle() {
      const ruta = join(salida, '404.html')
      if (!existsSync(ruta)) return
      const segmentos = base.split('/').filter(Boolean).length
      const html = readFileSync(ruta, 'utf8').replace(/var segmentos = \d+;/, `var segmentos = ${segmentos};`)
      writeFileSync(ruta, html)
    },
  }
}

/**
 * En `npm run dev` y `npm run preview`, `/admin` y `/admin/` abren el editor
 * (public/admin/index.html) en lugar de caer en la SPA. GitHub Pages ya lo
 * hace solo al servir el índice de la carpeta.
 */
function editorEnLocal(): Plugin {
  const reescribir = (req: { url?: string }, _res: unknown, siguiente: () => void) => {
    const [ruta, consulta] = (req.url ?? '').split('?')
    if (ruta === `${base}admin` || ruta === `${base}admin/`) {
      req.url = `${base}admin/index.html${consulta ? `?${consulta}` : ''}`
    }
    siguiente()
  }
  return {
    name: 'portafolio-editor-local',
    configureServer(server) {
      server.middlewares.use(reescribir)
    },
    configurePreviewServer(server) {
      server.middlewares.use(reescribir)
    },
  }
}

export default defineConfig({
  plugins: [react(), publicacion(), editorEnLocal()],
  base,
  build: {
    // Se conserva `docs/`: hoy GitHub Pages publica esa carpeta desde la rama.
    // Con el workflow de Actions (`.github/workflows/publicar.yml`) se sube
    // esta misma carpeta como artefacto; ver README «Publicación».
    outDir: 'docs',
  },
})
