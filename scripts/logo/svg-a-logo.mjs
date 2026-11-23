#!/usr/bin/env node
/* ──────────────────────────────────────────────────────────────
   Convierte el SVG que da `pdftocairo` de un logo circular (blanco y
   negro) en las piezas que usa el componente <LogoDisco>:

     pdftocairo -svg ruta/al/Logo.ai /tmp/logo.svg
     node scripts/logo/svg-a-logo.mjs /tmp/logo.svg

   Genera:
   - src/data/logo-disco.ts      piezas en orden de pintado (datos del sitio)
   - public/brand/logo-homie.svg logo recoloreado para usar como imagen
   - public/favicon.svg          solo el sello central, legible a 16 px

   Cómo lee el logo: las piezas negras son el disco y los interiores de
   las letras; los contornos de las letras son los huecos entre piezas
   (transparentes) y algunos paths blancos. Para recolorear sin perder
   los huecos, debajo de cada pieza negra va un trazo del color de las
   letras que los rellena y, por fuera, forma el aro del disco.

   Opciones (variables de entorno):
     CX, CY, R   centro y radio del disco (por defecto, ajuste automático)
     TRAZO       grosor del trazo que rellena los huecos (por defecto 34)
     DISCO, LETRA, SELLO_R  colores del SVG público y radio del favicon
   ────────────────────────────────────────────────────────────── */
import fs from 'node:fs';
import path from 'node:path';

const entrada = process.argv[2];
if (!entrada) {
  console.error('Uso: node scripts/logo/svg-a-logo.mjs <logo-pdftocairo.svg>');
  process.exit(1);
}

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const TRAZO = Number(process.env.TRAZO ?? 34);
const DISCO = process.env.DISCO ?? '#0a0a0a';
const LETRA = process.env.LETRA ?? '#FFD700';

const raw = fs.readFileSync(entrada, 'utf8');

/** Redondea los números del path a 1 decimal y quita espacios sobrantes. */
const compactar = (d) =>
  d
    .replace(/-?\d+(\.\d+)?/g, (n) => String(Math.round(Number(n) * 10) / 10))
    .replace(/\s*([MLCZHVQSAmlczhvqsa])\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

const piezas = [...raw.matchAll(/<path([^>]*)\/>/g)].map(([, attrs]) => {
  const fill = attrs.match(/fill="([^"]*)"/)?.[1] ?? '';
  const d = attrs.match(/ d="([^"]*)"/)?.[1] ?? '';
  const blanco = /100%|#fff|white/i.test(fill);
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0);
  return { d: compactar(d), tipo: blanco ? 'letra' : 'disco', x: Math.min(...xs), puntos: nums };
});

/* Centro del disco: ajuste de círculo (Kasa) sobre el contorno exterior,
   descartando las letras que sobresalen. */
function ajustarCirculo() {
  const pts = [];
  for (const p of piezas) for (let k = 0; k + 1 < p.puntos.length; k += 2) pts.push([p.puntos[k], p.puntos[k + 1]]);
  const resolver = (P) => {
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
    for (const [x, y] of P) {
      const z = x * x + y * y;
      sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z;
    }
    const A = [[sxx, sxy, sx, sxz], [sxy, syy, sy, syz], [sx, sy, P.length, sz]];
    for (let i = 0; i < 3; i++)
      for (let j = i + 1; j < 3; j++) {
        const f = A[j][i] / A[i][i];
        for (let k = i; k < 4; k++) A[j][k] -= f * A[i][k];
      }
    const r = [0, 0, 0];
    for (let i = 2; i >= 0; i--) {
      let s = A[i][3];
      for (let k = i + 1; k < 3; k++) s -= A[i][k] * r[k];
      r[i] = s / A[i][i];
    }
    const X = r[0] / 2, Y = r[1] / 2;
    return [X, Y, Math.sqrt(r[2] + X * X + Y * Y)];
  };
  let cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  let cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  let R = 0;
  for (let it = 0; it < 6; it++) {
    const sect = new Map();
    for (const [x, y] of pts) {
      const a = Math.floor(((Math.atan2(y - cy, x - cx) + Math.PI) / (2 * Math.PI)) * 180) % 180;
      const r = Math.hypot(x - cx, y - cy);
      if (!sect.has(a) || r > sect.get(a)[2]) sect.set(a, [x, y, r]);
    }
    const borde = [...sect.values()].map(([x, y]) => [x, y]);
    [cx, cy, R] = resolver(borde);
    const res = borde.map(([x, y]) => Math.abs(Math.hypot(x - cx, y - cy) - R));
    const lim = [...res].sort((a, b) => a - b)[Math.floor(res.length * 0.7)];
    [cx, cy, R] = resolver(borde.filter((_, i) => res[i] <= lim));
  }
  return [cx, cy, R];
}

let [cx, cy, R] = ajustarCirculo();
if (process.env.CX) cx = Number(process.env.CX);
if (process.env.CY) cy = Number(process.env.CY);
if (process.env.R) R = Number(process.env.R);
cx = Math.round(cx);
cy = Math.round(cy);
R = Math.round(R);

/* Caja cuadrada centrada en el disco: el giro queda sin cabeceo. Deja
   sitio a las letras que sobresalen del círculo y al trazo exterior. */
const MEDIO = Math.round(R * 1.13 + TRAZO / 2);
const viewBox = `${cx - MEDIO} ${cy - MEDIO} ${MEDIO * 2} ${MEDIO * 2}`;

/* Orden de entrada: de izquierda a derecha por la x inicial de cada pieza. */
const ordenX = piezas.map((p, i) => [p.x, i]).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
const turno = new Array(piezas.length);
ordenX.forEach((i, pos) => (turno[i] = pos));

/* ── src/data/logo-disco.ts ─────────────────────────────────── */
const ts = `/* ──────────────────────────────────────────────────────────────
   Logo del sitio en piezas, para <LogoDisco> (src/components/marca/).
   Generado con scripts/logo/svg-a-logo.mjs a partir del .ai del logo;
   no editar a mano: volver a correr el script si cambia el logo.
   - \`disco\`: piezas del disco e interiores de letras (color oscuro).
   - \`letra\`: contornos y sello (color de acento).
   - \`turno\`: orden de entrada de izquierda a derecha (0 = primera).
   ────────────────────────────────────────────────────────────── */
import type { LogoPiezas } from '../components/marca/tipos';

export const logoDisco: LogoPiezas = {
  viewBox: '${viewBox}',
  centro: [${cx}, ${cy}],
  radio: ${R},
  trazo: ${TRAZO},
  piezas: [
${piezas.map((p, i) => `    { tipo: '${p.tipo}', turno: ${turno[i]}, d: '${p.d}' },`).join('\n')}
  ],
};
`;
fs.writeFileSync(path.join(raiz, 'src/data/logo-disco.ts'), ts);

/* ── public/brand/logo-homie.svg ────────────────────────────── */
const cuerpo = (letra, disco, lista = piezas) =>
  [
    `<g fill="${letra}" stroke="${letra}" stroke-width="${TRAZO}" stroke-linejoin="round">`,
    ...lista.filter((p) => p.tipo === 'disco').map((p) => `<path d="${p.d}"/>`),
    '</g>',
    ...lista.map((p) => `<path fill="${p.tipo === 'disco' ? disco : letra}" d="${p.d}"/>`),
  ].join('\n');

fs.mkdirSync(path.join(raiz, 'public/brand'), { recursive: true });
fs.writeFileSync(
  path.join(raiz, 'public/brand/logo-homie.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="Los Discos del Homie">\n${cuerpo(LETRA, DISCO)}\n</svg>\n`,
);

/* ── public/favicon.svg: el sello central como etiqueta de vinilo ── */
const caja = (p) => {
  const xs = p.puntos.filter((_, i) => i % 2 === 0), ys = p.puntos.filter((_, i) => i % 2 === 1);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};
// El sello es la pieza clara más grande cuyo centro cae cerca del centro del disco.
const sello = piezas
  .filter((p) => p.tipo === 'letra')
  .map((p) => ({ p, c: caja(p) }))
  .filter(({ c }) => Math.hypot((c[0] + c[2]) / 2 - cx, (c[1] + c[3]) / 2 - cy) < R * 0.2)
  .sort((a, b) => b.c[2] - b.c[0] - (a.c[2] - a.c[0]))[0];
let fx = cx, fy = cy, fr = Number(process.env.SELLO_R ?? 0);
if (sello) {
  const [x0, y0, x1, y1] = sello.c;
  fx = Math.round((x0 + x1) / 2);
  fy = Math.round((y0 + y1) / 2);
  fr = fr || Math.round(Math.max(x1 - x0, y1 - y0) / 2);
}
fr = fr || Math.round(R * 0.22);
const FM = Math.round(fr * 1.32);
fs.writeFileSync(
  path.join(raiz, 'public/favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fx - FM} ${fy - FM} ${FM * 2} ${FM * 2}">
<defs><clipPath id="c"><circle cx="${fx}" cy="${fy}" r="${fr + 2}"/></clipPath></defs>
<circle cx="${fx}" cy="${fy}" r="${FM - 4}" fill="${DISCO}"/>
<g clip-path="url(#c)">
${cuerpo(
  LETRA,
  DISCO,
  piezas.filter((p) => {
    const [x0, y0, x1, y1] = caja(p);
    return x1 > fx - fr && x0 < fx + fr && y1 > fy - fr && y0 < fy + fr;
  }),
)}
</g>
<circle cx="${fx}" cy="${fy}" r="${FM - 14}" fill="none" stroke="${LETRA}" stroke-width="16"/>
</svg>
`,
);

console.log(`viewBox ${viewBox} · centro ${cx},${cy} · radio ${R} · ${piezas.length} piezas`);
console.log(`favicon: sello en ${fx},${fy} r=${fr}`);
