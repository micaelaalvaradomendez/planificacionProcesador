// src/lib/stores/costosFactory.ts
import type { Costos } from '../model/costos';
import { makeCostos } from '../model/costos';

/**
 * Factory que centraliza la creación de costos desde la UI
 * Aplica defaults, valida y protege de valores negativos o undefined
 */
export function costosFromUI(input?: Partial<Costos>): Costos {
  // Centralizá acá cualquier normalización especial si en el futuro la UI cambia.
  return makeCostos(input);
}