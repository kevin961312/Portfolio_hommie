/** Una pieza del logo tal como la genera `scripts/logo/svg-a-logo.mjs`. */
export interface PiezaLogo {
  /** `disco`: fondo e interiores (oscuro). `letra`: contornos y sello (acento). */
  tipo: 'disco' | 'letra';
  /** Orden de entrada de izquierda a derecha (0 = la primera). */
  turno: number;
  /** Datos del path SVG. */
  d: string;
}

/** Logo circular en piezas, listo para <LogoDisco>. */
export interface LogoPiezas {
  /** Caja cuadrada centrada en el disco (así el giro no cabecea). */
  viewBox: string;
  /** Centro del disco en unidades del viewBox. */
  centro: [number, number];
  /** Radio del disco en unidades del viewBox. */
  radio: number;
  /** Grosor del trazo que rellena los huecos entre piezas. */
  trazo: number;
  /** Piezas en orden de pintado. */
  piezas: PiezaLogo[];
}
