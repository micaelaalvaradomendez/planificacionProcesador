import type { Estado } from './proceso';

/** Estados canónicos del Paso 1 */
export const ESTADOS = ['N','L','C','B','F'] as const;

/** Conjunto de transiciones legales mínimas */
const TRANSICIONES_LEGALES: Record<Estado, ReadonlyArray<Estado>> = {
  N: ['L'],          // arribo efectivo
  L: ['C'],          // despacho
  C: ['B', 'F', 'L'],// fin de ráfaga intermedia => B; fin total => F; preempción => L
  B: ['L'],          // fin de E/S
  F: []              // absorbente
};

/**
 * isTransicionLegal(from,to): true si (from→to) está permitido en el Paso 1.
 * Nota: cualquier transición no listada es ilegal (p.ej., C→N).
 */
export function isTransicionLegal(from: Estado, to: Estado): boolean {
  return TRANSICIONES_LEGALES[from]?.includes(to) ?? false;
}

/** Arroja error si la transición no es legal (útil para "gate/aceptación"). */
export function assertTransicionLegal(from: Estado, to: Estado): void {
  if (!isTransicionLegal(from, to)) {
    throw new Error(`Transición ilegal ${from}→${to}`);
  }
}

/**
 * Transición con validación (inmutable: retorna el nuevo estado).
 * Si necesitás mutar, podés usarla antes de asignar.
 */
export function transicionarEstado(from: Estado, to: Estado): Estado {
  assertTransicionLegal(from, to);
  return to;
}
