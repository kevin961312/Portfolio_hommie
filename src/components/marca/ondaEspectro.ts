/* ──────────────────────────────────────────────────────────────
   Espectro de audio circular (WebGL) para el fondo del sitio.

   Una onda de sonido luminosa enrollada alrededor del disco: miles de
   trazos radiales finísimos (≈1 px de dispositivo) cuya posición sigue
   una onda suave en el ángulo (suma de senos con frecuencias enteras,
   así cierra sin costura) que evoluciona despacio. El color va por
   bandas según la intensidad: crema en el punto más caliente → #FFD700
   → #D6B500 → #927B00 → #3F3500 → negro, con un halo difuso sin trazos.

   Todo se calcula por píxel en un solo fragment shader sobre un
   triángulo que cubre la pantalla: en la CPU cada cuadro solo cuesta
   subir 3 uniforms y un draw call. Con Canvas 2D, miles de trazos con
   degradado propio + una pasada de blur pasaban del presupuesto.
   ────────────────────────────────────────────────────────────── */

const VERTICES = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAGMENTOS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;   // tamaño del lienzo (px de dispositivo)
uniform vec2 uC;     // centro del disco (px de dispositivo, origen arriba-izquierda)
uniform float uR;    // radio del disco (px de dispositivo)
uniform float uT;    // tiempo (s)
uniform float uN1;   // trazos del anillo principal (entero)
uniform float uN2;   // trazos del anillo exterior (entero)
uniform float uS;    // 0 = portada arriba · 1 = disco en el menú (onda abierta y tenue)
uniform float uMovil; // 1 en pantallas ≤ 720 px: el texto va debajo del disco

const float TAU = 6.28318530718;

float hash(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

// Onda en el ángulo a ∈ [0,1): frecuencias enteras → periódica, sin costura.
float onda(float a, float t, float sem) {
  float x = a * TAU;
  float v = 0.36 * sin(4.0 * x + t * 0.11 + sem);
  v += 0.40 * sin(7.0 * x - t * 0.08 + sem * 1.7);
  v += 0.26 * sin(11.0 * x + t * 0.13 + sem * 2.3);
  v += 0.12 * sin(17.0 * x - t * 0.17 + sem * 3.1);
  v += 0.03 * sin(29.0 * x + t * 0.19 + sem * 0.6);
  // Zonas que «respiran»: unas suben mientras otras se calman.
  v *= 0.72 + 0.28 * sin(2.0 * x - t * 0.05 + sem * 2.9);
  return v;
}

// Rampa de la paleta del cliente por intensidad (0 negro … 1 crema).
vec3 rampa(float i) {
  vec3 c1 = vec3(0.247, 0.208, 0.000); // #3F3500
  vec3 c2 = vec3(0.573, 0.482, 0.000); // #927B00
  vec3 c3 = vec3(0.839, 0.710, 0.000); // #D6B500
  vec3 c4 = vec3(1.000, 0.843, 0.000); // #FFD700
  vec3 c5 = vec3(1.000, 0.945, 0.700); // crema caliente (solo el pico)
  vec3 c = mix(vec3(0.0), c1, smoothstep(0.00, 0.30, i));
  c = mix(c, c2, smoothstep(0.30, 0.55, i));
  c = mix(c, c3, smoothstep(0.55, 0.76, i));
  c = mix(c, c4, smoothstep(0.76, 0.92, i));
  c = mix(c, c5, smoothstep(0.92, 1.00, i));
  return c;
}

vec3 anillo(float a, float r, float n, float rc0, float amp, float w0, float sem, float t, float ganancia) {
  // Cada trazo toma la altura de la onda en su propio ángulo: escalones finos
  // como las barras de un espectro.
  float id = floor(a * n);
  float h = clamp(0.5 + 0.5 * onda((id + 0.5) / n, t, sem), 0.0, 1.0);
  float j = hash(id + sem * 17.0);
  h *= 0.985 + 0.015 * sin(t * (0.25 + 0.35 * j) + j * TAU);

  float rc = rc0 + amp * h;          // radio del núcleo de la banda
  float w = w0 * (0.6 + 0.8 * h);   // los picos son también más gruesos
  float d = r - rc;                  // + hacia afuera

  // Borde exterior definido; hacia adentro se apaga antes de tocar el disco.
  float k = d > 0.0 ? 0.3 : 0.62;
  float perfil = exp(-(d * d) / (w * w * k * k));

  // Trazo de ~1 px de dispositivo; si los trazos se juntan, relleno parejo
  // (evita moiré cerca del centro).
  float sep = r * TAU / n;
  float dist = abs(fract(a * n) - 0.5) * sep;
  float mascara = max(clamp(1.0 - dist, 0.0, 1.0), smoothstep(2.8, 1.4, sep));

  float i = min(pow(perfil, 0.8) * (0.62 + 0.5 * h), 1.0) * ganancia;
  vec3 col = rampa(i) * (0.5 + 0.62 * mascara);

  // Halo difuso (el «blur» de la referencia), sin trazos.
  float halo = exp(-(d * d) / (w * w * 5.0)) * (0.6 + 0.4 * h) * 0.14 * ganancia;
  return col + vec3(0.839, 0.710, 0.0) * halo;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) - uC;
  float r = length(p);
  float rd = uR * mix(1.0, 1.14, uS);
  if (r > rd * 3.6) {
    gl_FragColor = vec4(0.0);
    return;
  }
  float a = atan(p.y, p.x) / TAU + 0.5;

  vec3 col = anillo(a, r, uN1, rd * 1.22, rd * 0.50, rd * 0.24, 0.0, uT, 1.0);
  col += anillo(a, r, uN2, rd * 2.15, rd * 0.28, rd * 0.12, 4.7, uT * 0.8, 0.36);

  // Viñeta: lejos del disco se apaga del todo; con el disco en el menú,
  // toda la onda baja para no competir con el contenido.
  col *= (1.0 - smoothstep(rd * 1.6, rd * 3.4, r)) * mix(1.0, 0.3, uS);
  // Donde va el texto de la portada la onda baja: en escritorio, a los lados
  // del disco (columnas); en el teléfono, debajo (título y contacto).
  float lados = mix(0.5, 1.0, smoothstep(0.3, 0.85, abs(p.y) / max(r, 1.0)));
  float abajo = mix(1.0, 0.3, smoothstep(0.0, 0.6, p.y / max(r, 1.0)));
  col *= mix(lados, abajo, uMovil);
  col = clamp(col, 0.0, 1.0);
  // Alfa premultiplicado: se suma como luz sobre el negro de la página.
  gl_FragColor = vec4(col, max(col.r, col.g));
}
`;

export interface Onda {
  /** Tamaño en px CSS, DPR ya limitado, centro y radio del disco en px CSS. */
  redimensionar(ancho: number, alto: number, dpr: number, cx: number, cy: number, radio: number, movil: boolean): void;
  /** Dibuja un cuadro. `t` en segundos; `s` de 0 (portada) a 1 (disco en el menú). */
  dibujar(t: number, s: number): void;
  destruir(): void;
}

function compilar(gl: WebGLRenderingContext, tipo: number, fuente: string): WebGLShader | null {
  const shader = gl.createShader(tipo);
  if (!shader) return null;
  gl.shaderSource(shader, fuente);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Devuelve `null` si no hay WebGL: el fondo se queda con los surcos CSS. */
export function crearOnda(lienzo: HTMLCanvasElement): Onda | null {
  const gl = lienzo.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) return null;

  const vs = compilar(gl, gl.VERTEX_SHADER, VERTICES);
  const fs = compilar(gl, gl.FRAGMENT_SHADER, FRAGMENTOS);
  const programa = gl.createProgram();
  if (!vs || !fs || !programa) return null;
  gl.attachShader(programa, vs);
  gl.attachShader(programa, fs);
  gl.linkProgram(programa);
  if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) return null;
  gl.useProgram(programa);

  // Un triángulo que cubre toda la pantalla (sin la diagonal de dos triángulos).
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(programa, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = (nombre: string) => gl.getUniformLocation(programa, nombre);
  const uRes = u('uRes');
  const uC = u('uC');
  const uR = u('uR');
  const uT = u('uT');
  const uN1 = u('uN1');
  const uN2 = u('uN2');
  const uS = u('uS');
  const uMovil = u('uMovil');

  return {
    redimensionar(ancho, alto, dpr, cx, cy, radio, movil) {
      const w = Math.max(1, Math.round(ancho * dpr));
      const h = Math.max(1, Math.round(alto * dpr));
      if (lienzo.width !== w || lienzo.height !== h) {
        lienzo.width = w;
        lienzo.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
      gl.uniform2f(uC, cx * dpr, cy * dpr);
      gl.uniform1f(uR, radio * dpr);
      gl.uniform1f(uMovil, movil ? 1 : 0);
      // Separación de ~3 px de dispositivo en el núcleo de cada anillo
      // (≈1 px de trazo + 2 px de aire). Entero para que el ángulo cierre.
      const rDev = radio * dpr;
      gl.uniform1f(uN1, Math.round((Math.PI * 2 * rDev * 1.3) / 3));
      gl.uniform1f(uN2, Math.round((Math.PI * 2 * rDev * 2.1) / 3));
    },
    dibujar(t, s) {
      gl.uniform1f(uT, t);
      gl.uniform1f(uS, s);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destruir() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(programa);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      // Sin `loseContext()`: en StrictMode el efecto se monta dos veces sobre
      // el mismo lienzo y un contexto perdido dejaría el fondo sin onda.
    },
  };
}
