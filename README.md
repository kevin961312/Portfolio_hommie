# Los Discos del Homie · portafolio (React + Vite)

Portafolio de Los Discos del Homie, creador de contenido de rap: portada con el logo tocadiscos,
«Sobre mí» y contacto, métricas, Top 20 de Instagram, muro de posts. Rutas: `/`, `/top-20` y `/posts-instagram`.

```bash
npm install
npm run dev       # http://localhost:5173 (el editor queda en /admin/)
npm run validar   # revisa contenido/*.json y los campos del editor
npm run build     # valida y compila en docs/ (lo que publica GitHub Pages)
npm run preview   # revisa el build como en producción
npm run lint
```

Necesita Node ≥ 22.18 (el validador es un `.ts` que Node ejecuta sin compilar).

## Para usarla en un sitio nuevo

1. **`contenido/sitio.json`**: nombre, contacto, redes y cuentas de Instagram.
2. **`contenido/perfiles.json`**: textos del hero («Sobre mí») y métricas, y
   qué secciones ve cada perfil (`?perf=uno|dos|tres`).
3. Contenido de cada sección en `contenido/`: `posts.json` y
   `tiktok.json` (ver «Contenido editable»). Se puede editar a mano
   o desde el editor `/admin/` (ver «Cómo edita el cliente»).
4. Imágenes en `public/images/` (portadas de Instagram en `public/images/instagram/`). La portada no lleva foto:
   el protagonista es el logo.
5. Colores en `src/index.css` (`:root`: `--color-negro-*`, `--color-oro-*`, `--color-crema`)
   y uno por cuenta (`[data-cuenta='…']`). Tipografía: `--fuente-display` (Ultra, títulos en
   mayúsculas de 28 px o más y cifras grandes) y `--fuente-texto` (Archivo variable, texto,
   créditos e interfaz); ambas se cargan en `index.html` desde Google Fonts.
6. `index.html`: título y descripción. La base del sitio sale de la variable `BASE`
   (ver «Publicación»). Con dominio propio, crear `public/CNAME` con el dominio.
7. `public/admin/config.yml` y `.github/workflows/publicar.yml`: el repo del sitio
   (`kevin961312/Portfolio_hommie`); cambiarlo ahí si el sitio se muda.

## Estructura

```
contenido/               ← TODO el contenido editable (JSON validado con Zod)
src/
├── contenido/           esquema.ts (Zod) · cargar.ts (único que importa los JSON) ·
│                        armar.ts (JSON → datos listos) · contexto + ProveedorContenido
├── components/          ← piezas reutilizables (ver «Componentes»)
│   ├── index.ts         ← importa todo desde aquí
│   ├── layout/          Navbar, Footer, EncabezadoPagina
│   ├── marca/           LogoDisco, CortinaCarga, PortadaDisco, FondoOndas (logo tocadiscos, efecto open-rise y fondo de surcos)
│   ├── metricas/        MetricasImpacto, MetricaCard
│   ├── post/            TarjetaPost, PortadaPost, CajaCD, PostVivo, VisorPost   (Instagram)
│   └── icons/           íconos SVG (IconInstagram, IconPlay, …)
├── pages/               una página por ruta (arman los componentes con los datos)
├── data/                logo-disco.ts (piezas del logo; no es contenido editable)
├── hooks/               useContenido, usePerfil, useContadorAnimado (Top 20), useMediaQuery, …
├── lib/                 utilidades: calculos (métricas), formato, rutas, posts, instagram, perfiles
└── types/               tipos de los datos (los del contenido salen del esquema con z.infer)
public/                  imágenes, PDF, favicon, 404.html (SPA en GitHub Pages) y admin/ (editor)
scripts/                 validar-contenido.ts · logo/svg-a-logo.mjs (logo .ai → LogoDisco, SVG y favicon)
.github/workflows/       publicar.yml (GitHub Actions → Pages; inactivo hasta tener el repo del cliente)
```

## Contenido editable (`contenido/*.json`)

| Archivo | Qué guarda |
|---|---|
| `sitio.json` | Nombre, portada (nombre + parte resaltada), profesión, contacto (WhatsApp con número e indicativo, correo, teléfono, ciudad), redes, cuentas de Instagram (usuario, nombre, iniciales), y cuenta personal. |
| `perfiles.json` | `perfiles.principal / secundario / terciario`: `nombreCorto`, `rol`, `titular`, `sobreMi[]`, `metricas[]` (opcional), `secciones[]` y `tituloDocumento` (admite `{nombre}`). |
| `posts.json` | `posts[]`: posts de Instagram del muro y del Top 20 (`id`, `url`, `titulo`, `tipo`, `fecha`, `likes`, `alcance`, `alcanceEstimado`, `cuenta`, `tema`, `orientacion`, `tiktok`, `portada`, `descripcion` y, en las fichas, `encuadre` opcional: altura del recorte de la portada en la caja de CD, de 0 = arriba a 100 = abajo; sin él, 42). |
| `tiktok.json` | `videos[]` (`id`, `url`, `tipo`, `fecha`, `descripcion`, `reproducciones`, `likes`, `comentarios`, `compartidos`, `portada`). Hoy guarda solo los videos que no existen en Instagram; aún no tiene sección, pero alimenta las métricas de TikTok. |

Cómo fluye:

- `src/contenido/esquema.ts` (Zod) es la **fuente de verdad**: los tipos salen de él con
  `z.infer` y se reexportan en `src/types`. `npm run validar` (antes de cada build y en CI)
  valida los cuatro archivos, las referencias (las cuentas de los posts deben existir en
  `sitio.json`) y que los campos de `public/admin/config.yml` sean los mismos del esquema.
  Los errores salen en español con archivo, campo y qué arreglar.
- El contenido se lee **en build**: `src/contenido/cargar.ts` importa los JSON y
  `armar.ts` los prepara (cuentas por usuario, métricas resueltas).
  Zod no entra al sitio publicado: en desarrollo la misma validación corre con un import
  diferido y avisa en la consola.
- Páginas y componentes leen todo con `useContenido()`; ninguno importa `contenido/`.

### Métricas: calculadas o escritas a mano

Cada métrica de `perfiles.json` elige su número:

```json
{ "id": "pri-alcance", "etiqueta": "Interacciones digitales", "categoria": "alcance",
  "calculo": "totalInteracciones", "sufijo": "+", "compacto": true,
  "detalle": "Alcance acumulado en redes sociales" }
{ "id": "pri-plataformas", "etiqueta": "Plataformas", "categoria": "destacado",
  "valor": 2, "detalle": "Instagram · TikTok" }
```

- `valor` (número escrito a mano) manda sobre `calculo`. Sirve para lo que el sitio no puede
  contar solo: seguidores, vistas de TikTok, etc.
- `calculo` usa una cifra de `src/lib/calculos.ts` (funciones puras que reciben los datos):
  `totalPosts`, `totalReels`, `totalCarruseles`, `totalInteracciones`,
  `medianaInteracciones`, `picoInteracciones`, `mediaReels`, `picoCarrusel`,
  `totalAlbumes`, `totalFotos`, `totalVideosTiktok`, `totalReproduccionesTiktok`,
  `totalLikesTiktok`, `totalFichas`, `picoAlcance`. Se actualizan solas al agregar posts.
- `detalle` acepta esas mismas cifras entre llaves: `"{totalReels} reels · {totalCarruseles} carruseles"`.

Para una cifra nueva: agregar su id a `IDS_CALCULO` (esquema), su fórmula en
`calcularValores` y la opción en `config.yml`.

## Cómo edita el cliente (`/admin/`)

El editor es [Sveltia CMS](https://github.com/sveltia/sveltia-cms) (`public/admin/`): una
página estática que lee `config.yml` y guarda cada cambio como un commit en GitHub. Solo
edita datos de `contenido/*.json` (textos, contacto, métricas, posts, TikTok); el
diseño no se puede cambiar desde ahí.

1. Entrar a `https://<sitio>/admin/` (en el celular o el computador).
2. «Iniciar sesión con un token de acceso» y pegar un **token fino de GitHub**
   (fine-grained personal access token) limitado **solo a ese repo**, con el permiso
   **Contents: Read and write** (y nada más). Se crea en GitHub → Settings → Developer
   settings → Fine-grained tokens. El botón «Iniciar sesión con GitHub» necesita un
   servidor OAuth que este sitio no tiene: no usarlo.
3. Editar: «Datos y contacto», «Sobre mí y métricas» o «Posts y TikTok».
4. «Guardar». Sveltia hace el commit en `main`; el workflow valida, compila y publica en
   unos minutos (sumar hasta ~10 minutos de caché del navegador o del CDN). Si el contenido
   no es válido, la publicación falla y el sitio sigue mostrando la versión anterior.

Para probar sin GitHub: `npm run dev`, abrir `http://localhost:5173/admin/` y elegir
«Trabajar con un repositorio local» (Chrome o Edge) con la carpeta del repo.

Lo que el editor no expresa igual que el esquema (lo cubre `npm run validar`):
- reglas entre campos: una métrica necesita `valor` o `calculo`; las secciones deben incluir
  `/`; `cuentaPersonal` debe existir en las cuentas; ids y cuentas no repetidos;
- los marcadores `{…}` de `detalle` y `tituloDocumento`;
- el tipo de número: Sveltia guarda enteros (`value_type: int`) y el esquema acepta cualquier
  número ≥ 0;
- las imágenes subidas van a `public/images/subidas/` y se guardan como `/images/subidas/…`.

Guía corta para el cliente: [`GUIA-CLIENTE.md`](GUIA-CLIENTE.md).

## Publicación

`npm run build` deja el sitio en `docs/` (no se versiona: está en `.gitignore`).
GitHub Actions compila y sube esa carpeta a GitHub Pages en cada push a `main`.

- **Base:** `vite.config.ts` toma `BASE` (por defecto `/`). Dominio propio o
  `usuario.github.io` → `/`; repo de proyecto → `BASE=/repo/ npm run build`.
- **`404.html`** (enlaces profundos de la SPA): al compilar se ajusta solo cuántos segmentos
  de la ruta son la base (0 con `/`, 1 con `/repo/`).
- **`version.json`**: el build lo emite con el commit publicado (`GITHUB_SHA` en Actions,
  `"local"` fuera de CI). Sirve para confirmar qué versión está en línea:
  `https://<sitio>/version.json`.

### Publicación con GitHub Actions (`.github/workflows/publicar.yml`)

En cada push a `main`: `npm ci` → `npm run validar` → `npm run lint` → `configure-pages`
→ `npm run build` (con la base que da Pages) → `upload-pages-artifact@v4` →
`deploy-pages@v4`, con `concurrency: pages` (una publicación a la vez). Si algo falla, Pages
sigue sirviendo la versión anterior.

El job solo corre en `kevin961312/Portfolio_hommie` (el mismo repo que usa el editor
en `public/admin/config.yml`). Para activarlo la primera vez:

1. GitHub → Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. Hacer un push a `main` y comprobar `https://<sitio>/version.json` y un enlace profundo
   (`/top-20?perf=dos`).

## Componentes

Todos se importan desde `src/components`:

```tsx
import { TarjetaPost, VisorPost, EncabezadoPagina, IconPlay } from '../components';
```

Cada componente trae su `.module.css` al lado y usa las variables de color de
`src/index.css`, así que para llevarlo a otro proyecto se copia la carpeta, más
`index.css`, `types/`, los `hooks/` y `lib/` que importe.

### Instagram (`post/`)

| Componente | Qué hace | Props principales |
|---|---|---|
| `TarjetaPost` | Caja del muro: portada diseñada que al acercarse carga el post real (embed). | `post`, `onAbrir?`, `onTocado?`, `claveVivo?`, `ancha?` |
| `PortadaPost` | Portada dibujada con título, cuenta y likes (sin red). Por debajo de 273 px de ancho esconde la cabecera simulada y el pie (no bajan de 12 px). | `post`, `puesto?` |
| `CajaCD` | Ficha de disco como caja de CD (jewel case 142 × 125 mm): bisagra, bandeja y el librillo cuadrado con la portada del reel; debajo, disco, artista y «℗ año, ciudad» sacados del pie (`creditosFicha` en `lib/posts.ts`). Al pasar el cursor o enfocarla, el CD asoma un 14 % por la derecha (200 ms); al tocarla llama a `onAbrir` (VisorPost). En el muro se usa para los posts con `tema: 'fichas'`. | `post`, `onAbrir`, `alineada?` (junto a tarjetas 4:5: se apoya abajo, en la línea del estante) |
| `PostVivo` | Lo que se reproduce en la tarjeta según el post (ver «Cómo se reproduce un post»), con su estado de carga. | `post`, `interactivo?`, `onTocado?` |
| `VisorPost` | Visor a pantalla completa para recorrer una lista de posts. | `posts`, `indice`, `onCambiar`, `onCerrar` |

```tsx
const [abierto, setAbierto] = useState<number | null>(null);
{posts.map((p, i) => <TarjetaPost key={p.url} post={p} onAbrir={() => setAbierto(i)} />)}
<VisorPost posts={posts} indice={abierto} onCambiar={setAbierto} onCerrar={() => setAbierto(null)} />
```

El tipo `post` es `PostInstagram` (`src/types/index.ts`): `url`, `titulo`, `tipo`
(`'carrusel' | 'video' | 'imagen'`), `fecha`, `likes?`, `cuenta?`, `orientacion?`,
`tiktok?`. Con las URLs de ejemplo el embed no carga (se queda la portada con el
indicador de carga): al poner URLs reales de Instagram aparece el post.

#### Cómo se reproduce un post

Instagram bloquea el embed de los reels (con música con licencia el iframe queda
en 2 px: «el enlace puede estar dañado»), pero los carruseles sí se incrustan. Por
eso `PostVivo` decide según el post:

| Post | Qué se ve |
|---|---|
| Reel con `tiktok` (id del mismo video en TikTok) | El reproductor oficial `tiktok.com/player/v1/<id>` en una caja 9:16, con sus controles. No arranca solo: se pulsa play (el sonido nunca sale sin avisar). Solo se monta en la tarjeta con la que se puede interactuar (la central del Top 20, el visor); al salir de ella el iframe se destruye y el video se corta. Tocarlo pausa el avance automático del Top 20 (`onTocado`). |
| Reel sin `tiktok` | La portada y el botón «Ver en Instagram ↗» (pestaña nueva). Sin ícono de play: no promete una reproducción que no existe. |
| Carrusel o imagen | El embed de Instagram. Si el iframe no llega a 50 px de alto (15 s o 4 s después de cargar), cae al mismo respaldo «Ver en Instagram ↗». |
| Tarjeta de vista previa (muro, tarjetas laterales del Top 20) | Solo la portada de los reels; los carruseles cargan su embed. |

El campo `tiktok` de `contenido/posts.json` (string con el id numérico, el número
largo al final de `tiktok.com/@usuario/video/<id>`) se llena en el editor
(«ID del video en TikTok») y solo se usa en reels. En las piezas ya cargadas está
lleno: se emparejó cada reel de Instagram con el mismo video en TikTok.

### Estructura y métricas

| Componente | Qué hace | Props principales |
|---|---|---|
| `Navbar` | Menú con las secciones del perfil activo (menú hamburguesa en móvil) y el logo tocadiscos (en `/`, efecto open-rise). | — (lee `sitio` con `useContenido()`, el perfil y `data/logo-disco.ts`) |
| `Footer` | Pie con nombre y profesión. | — |
| `EncabezadoPagina` | Título de sección en Ultra con línea de créditos debajo, lead y cifras. | `creditos`, `titulo`, `resaltado?`, `lead`, `datos?`, `children?` |
| `MetricasImpacto` | Fila de tarjetas de métricas con el número final. | `metricas`, `titulo?`, `nota?` |
| `MetricaCard` | Una tarjeta de métrica (ícono según `categoria`). | `metrica` |

### Marca (`marca/`)

| Componente | Qué hace | Props principales |
|---|---|---|
| `LogoDisco` | Logo circular que gira como un vinilo a 33⅓ rpm (WAAPI); arranca acelerando, frena al pasar el cursor o tocarlo y en la primera carga sus piezas suben de izquierda a derecha. | `logo` (`LogoPiezas`), `etiqueta?`, `girar?`, `className?` |
| `CortinaCarga` | Cortina de la primera carga: línea que se llena con las imágenes y dos franjas inclinadas que se abren. Va una vez en `App.tsx`. | `minimo?` (800 ms), `maximo?` (4000 ms) |
| `FondoOndas` | Fondo fijo de todo el sitio: surcos de disco centrados en la pantalla y cuatro ondas muy tenues que salen de donde está el disco de la portada (12 s por onda; sin ondas con movimiento reducido). Va una vez en `App.tsx`. | — |
| `PortadaDisco` | Primera pantalla de la portada: fondo de surcos que se aleja (1 → 0,95) mientras el logo sube al menú. | `children?` |

En la portada, `SobreMiPage` pasa como `children` de `PortadaDisco` el «Sobre mí» (izquierda) y
el contacto (derecha, de `sitio.redes` y `sitio.contacto`, sin mostrar campos vacíos); el centro
reserva el diámetro del disco (`--radio-logo`) y en ≤720 px todo se apila bajo el disco.

El efecto open-rise lo arma el `Navbar`: en `/` el mismo `LogoDisco` del menú
está fijo, grande y centrado, y entre 0 y 320 px de scroll hace un FLIP atado
al scroll (translate + scale) hasta su hueco en el centro de la barra (`data-acoplado` al
llegar). Pasados 750 px la barra se esconde al bajar y vuelve al subir. Las
piezas comparten dos estados en `marca/acople.ts` (un solo oyente de scroll,
un `requestAnimationFrame` por evento) y `marca/entrada.ts` (fases de la
cortina). Con `prefers-reduced-motion` no hay cortina ni giro y el logo salta
al menú a mitad del recorrido.

Logo nuevo (un .ai/.pdf circular en blanco y negro):

```bash
pdftocairo -svg ruta/al/Logo.ai /tmp/logo.svg
node scripts/logo/svg-a-logo.mjs /tmp/logo.svg   # → src/data/logo-disco.ts, public/brand/logo-homie.svg, public/favicon.svg
```

Colores del logo: `--color-logo-letra`, `--color-logo-disco` y
`--color-logo-brillo` en `src/index.css` (si no están, usa el acento y un tono
casi negro).

Para agregar o quitar secciones: la ruta en `src/App.tsx`, el enlace en
`components/layout/Navbar.tsx` y la ruta en `secciones` de cada perfil.
