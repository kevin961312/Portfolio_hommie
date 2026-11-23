/* ──────────────────────────────────────────────────────────────
   Valida los JSON de `contenido/` con el esquema del sitio.

     npm run validar          (también corre antes de `npm run build` y en CI)

   Si algo está mal, termina con código 1 y explica en español qué
   archivo, qué campo y qué arreglar. También revisa que los campos del
   editor (`public/admin/config.yml`) sigan siendo los del esquema.
   Node ≥ 22.18 ejecuta este .ts sin compilar (type stripping).
   ────────────────────────────────────────────────────────────── */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse as leerYaml } from 'yaml';
import { ESQUEMAS, validarContenido } from '../src/contenido/esquema.ts';
import type { ArchivoContenido } from '../src/contenido/esquema.ts';

const carpeta = fileURLToPath(new URL('../contenido/', import.meta.url));
const archivos = Object.keys(ESQUEMAS) as ArchivoContenido[];

/** Línea y columna de una posición del texto (para errores de sintaxis). */
function lineaColumna(texto: string, posicion: number) {
  const antes = texto.slice(0, posicion).split('\n');
  return { linea: antes.length, columna: antes[antes.length - 1].length + 1 };
}

const errores: string[] = [];
const datos = {} as Record<ArchivoContenido, unknown>;

for (const archivo of archivos) {
  let texto: string;
  try {
    texto = readFileSync(carpeta + archivo, 'utf8');
  } catch {
    errores.push(`contenido/${archivo}: no se encontró el archivo.`);
    continue;
  }
  try {
    datos[archivo] = JSON.parse(texto);
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    const posicion = /position (\d+)/.exec(mensaje);
    const donde = posicion ? lineaColumna(texto, Number(posicion[1])) : null;
    errores.push(
      `contenido/${archivo}: el archivo no es un JSON válido${donde ? ` (línea ${donde.linea}, columna ${donde.columna})` : ''}. ` +
        'Revisa comas, comillas y llaves cerca de ese punto.',
    );
  }
}

// Solo se revisa el esquema si todos los archivos se pudieron leer.
if (errores.length === 0) errores.push(...validarContenido(datos));

/* ── Editor: los campos de config.yml deben ser las claves del esquema ── */

type CampoCms = { name: string; fields?: CampoCms[]; field?: CampoCms };
type ArbolCms = { [nombre: string]: ArbolCms | true };

function arbolCms(campos: CampoCms[]): ArbolCms {
  return Object.fromEntries(campos.map((c) => [c.name, c.fields ? arbolCms(c.fields) : true]));
}

/** Llega hasta el objeto que hay dentro de opcionales, listas y preprocesos de Zod. */
function formaObjeto(esquema: unknown): Record<string, unknown> | null {
  let s = esquema as { _zod?: { def: Record<string, unknown> } } | undefined;
  for (let i = 0; i < 10 && s?._zod; i++) {
    const def = s._zod.def as { type: string; shape?: Record<string, unknown>; in?: unknown; out?: { _zod: { def: { type: string } } }; innerType?: unknown; element?: unknown };
    if (def.type === 'object') return def.shape ?? null;
    if (def.type === 'pipe') s = (def.out?._zod.def.type === 'transform' ? def.in : def.out) as typeof s;
    else if (def.type === 'optional' || def.type === 'nullable') s = def.innerType as typeof s;
    else if (def.type === 'array') s = def.element as typeof s;
    else return null;
  }
  return null;
}

function compararCampos(esquema: unknown, cms: ArbolCms | true | undefined, ruta: string) {
  const forma = formaObjeto(esquema);
  if (!forma || cms === undefined || cms === true) return;
  for (const clave of Object.keys(forma)) {
    if (!(clave in cms)) errores.push(`public/admin/config.yml → ${ruta}.${clave}: falta este campo en el editor (sí está en el esquema).`);
    else compararCampos(forma[clave], cms[clave], `${ruta}.${clave}`);
  }
  for (const clave of Object.keys(cms)) {
    if (!(clave in forma)) errores.push(`public/admin/config.yml → ${ruta}.${clave}: el editor tiene este campo pero el esquema no lo conoce.`);
  }
}

try {
  const config = leerYaml(readFileSync(new URL('../public/admin/config.yml', import.meta.url), 'utf8')) as {
    collections: { files?: { file: string; fields: CampoCms[] }[] }[];
  };
  const editados = new Map<string, ArbolCms>();
  for (const coleccion of config.collections) {
    for (const f of coleccion.files ?? []) editados.set(f.file.replace(/^contenido\//, ''), arbolCms(f.fields));
  }
  for (const archivo of archivos) {
    const cms = editados.get(archivo);
    if (!cms) errores.push(`public/admin/config.yml: no hay una colección para contenido/${archivo}.`);
    else compararCampos(ESQUEMAS[archivo], cms, archivo);
  }
} catch (e) {
  errores.push(`public/admin/config.yml: no se pudo leer (${e instanceof Error ? e.message : String(e)}).`);
}

if (errores.length) {
  console.error(`\n✗ El contenido tiene ${errores.length} error(es); no se puede publicar así:\n`);
  for (const e of errores) console.error(`  • ${e}`);
  console.error('\nCorrige esos campos (en el editor /admin o en contenido/*.json) y vuelve a intentarlo.\n');
  process.exit(1);
}

console.log(`✓ Contenido válido (${archivos.map((a) => `contenido/${a}`).join(', ')}).`);
